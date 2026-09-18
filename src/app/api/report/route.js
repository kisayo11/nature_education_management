import { NextResponse } from 'next/server';
import { createDocumentFromTemplate } from '@/lib/google-docs';
import { addReportRecord } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.trainingName || !data.author) {
      return NextResponse.json({ success: false, error: '교육명과 작성자는 필수입니다.' }, { status: 400 });
    }

    const templateId = process.env.TEMPLATE_REPORT_DOC_ID;
    const today = data.createdAt || new Date().toISOString().split('T')[0];
    const newTitle = `[보고서] ${data.trainingName} (${today})`;

    // 현장 사진 업로드 처리 (옵션)
    let photoUrl = '';
    let photoFileId = null;

    if (data.photoBase64) {
      try {
        const photoRes = await uploadFileToDrive({
          base64Data: data.photoBase64,
          filename: `교육사진_${data.trainingName}_${today}.jpg`,
          mimeType: 'image/jpeg',
        });
        photoUrl = photoRes.viewLink || photoRes.directLink;
        photoFileId = photoRes.fileId;
      } catch (photoErr) {
        console.warn('현장 사진 업로드 실패(계속 진행):', photoErr.message);
      }
    }

    // 교육 내용 및 총평/개선의견 합성
    let fullContent = data.content || '';
    if (data.evaluation && data.evaluation.trim()) {
      fullContent = `${fullContent}\n\n[총평 및 개선의견]\n${data.evaluation.trim()}`;
    }

    // 치환할 태그 맵
    const replacements = {
      '{{부서}}': data.department || '',
      '{{직위}}': data.position || '',
      '{{작성일}}': data.createdAt || today,
      '{{작성자}}': data.author || '',
      '{{교육명}}': data.trainingName || '',
      '{{교육장소}}': data.location || '',
      '{{교육일시}}': data.datetime || '',
      '{{교육시간}}': data.duration || '',
      '{{교육구분}}': data.category || '',
      '{{교육대상}}': data.target || '',
      '{{참가인원}}': data.actualCount ? `${data.actualCount}명` : '',
      '{{교육금액}}': data.budget || '0원',
      '{{주관부서}}': data.hostDept || '',
      '{{교육강사}}': data.instructor || '',
      '{{교육내용}}': fullContent,
      '{{총평}}': data.evaluation || '',
      '{{개선의견}}': data.evaluation || '',
      '{{총평및개선의견}}': data.evaluation || '',
      '{{교육사진}}': photoUrl ? `[현장 사진 링크: ${photoUrl}]` : '사진 없음',
    };

    // 1. GDoc 템플릿 복사 & 텍스트 치환
    const docRes = await createDocumentFromTemplate({
      templateDocId: templateId,
      newTitle,
      replacements,
      photoFileId,
    });

    // 2. 보고서_목록 시트에 메타데이터 저장
    const reportRecord = await addReportRecord({
      ...data,
      photoUrl,
      docUrl: docRes.docUrl,
    });

    return NextResponse.json({
      success: true,
      message: '교육결과보고서가 성공적으로 생성되었습니다.',
      reportId: reportRecord.reportId,
      docUrl: docRes.docUrl,
      pdfUrl: docRes.pdfUrl,
      photoUrl,
    });
  } catch (error) {
    console.error('보고서 생성 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
