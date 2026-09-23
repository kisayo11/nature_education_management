import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getDriveClient, getSheetsClient } from '@/lib/google-auth';
import { generateCertificatePdf } from '@/lib/certificate-generator';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = process.env.NEW_HIRE_SPREADSHEET_ID || '1s-APvWy5S_N2IR6AbcKvJht9lqMmIdwzXf5A8G37ai8';
const FOLDER_ID = process.env.NEW_HIRE_DRIVE_FOLDER_ID || '16uk91h8SA5VcB2EBBFwzx14xNJogQnIF';
const SHEET_DATA_NAME = '시트1';

// 구글 드라이브에 PDF 업로드 및 공개 링크 반환 함수
async function uploadPdfToDrive(drive, fileName, buffer) {
  const fileMetadata = {
    name: fileName,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(buffer),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = res.data.id;

  // 누구나 링크로 열람 가능하도록 권한 설정
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permErr) {
    console.warn('드라이브 권한 설정 경고 (조직 정책에 따름):', permErr.message);
  }

  return {
    fileId,
    url: res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}

export async function POST(request) {
  try {
    const { targets } = await request.json();

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ success: false, error: '발급할 대상자가 선택되지 않았습니다.' }, { status: 400 });
    }

    const drive = getDriveClient();
    const sheets = getSheetsClient();
    const results = [];

    for (const target of targets) {
      const { rowIndex, name, birth, joinDate, safetyCertNo, onboardCertNo } = target;

      try {
        // 1. 산업안전보건교육 (8시간) PDF 생성 및 업로드
        const safetyResult = await generateCertificatePdf({
          type: 'safety',
          name,
          birth,
          joinDate,
          certNo: safetyCertNo,
        });

        const safetyFileName = `${name}_신규채용자_산업안전보건교육_수료증.pdf`;
        const safetyUpload = await uploadPdfToDrive(drive, safetyFileName, safetyResult.pdfBytes);

        // 2. 요양병원 신규직원 배치전교육 (15시간) PDF 생성 및 업로드
        const onboardResult = await generateCertificatePdf({
          type: 'preplacement',
          name,
          birth,
          joinDate,
          certNo: onboardCertNo,
        });

        const onboardFileName = `${name}_요양병원_신규직원_배치전교육_수료증.pdf`;
        const onboardUpload = await uploadPdfToDrive(drive, onboardFileName, onboardResult.pdfBytes);

        // 3. 구글 시트1 해당 행 업데이트 (F열~I열)
        // F: 산안수료번호, G: 산안URL, H: 배치전수료번호, I: 배치전URL
        const updateRange = `'${SHEET_DATA_NAME}'!F${rowIndex}:I${rowIndex}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: updateRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              safetyResult.certNo,
              safetyUpload.url,
              onboardResult.certNo,
              onboardUpload.url,
            ]],
          },
        });

        results.push({
          rowIndex,
          name,
          success: true,
          safetyCertNo: safetyResult.certNo,
          safetyPdfUrl: safetyUpload.url,
          onboardCertNo: onboardResult.certNo,
          onboardPdfUrl: onboardUpload.url,
        });
      } catch (personErr) {
        console.error(`${name} 님 수료증 발급 중 오류:`, personErr);
        results.push({
          rowIndex,
          name,
          success: false,
          error: personErr.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `총 ${targets.length}명 중 ${successCount}명의 수료증(2종) 발급이 완료되었습니다.`,
      results,
      successCount,
    });
  } catch (error) {
    console.error('수료증 일괄 발급 처리 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
