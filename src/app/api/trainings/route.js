import { NextResponse } from 'next/server';
import { getTrainings, addTraining } from '@/lib/google-sheets';
import { createDriveFolder, uploadFileToDrive } from '@/lib/google-drive';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    const trainings = await getTrainings(includeAll);
    return NextResponse.json({ success: true, trainings });
  } catch (error) {
    console.error('교육 목록 조회 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: '교육명을 입력해주세요.' }, { status: 400 });
    }

    // 1. 교육 전용 드라이브 하위 폴더 자동 생성
    const folderRes = await createDriveFolder(`[교육] ${body.name}`);
    const folderId = folderRes.folderId;

    // 2. 모바일 서명 접속 URL 및 QR 코드 생성
    // 호스트 주소(로컬 또는 배포 도메인)
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const trainingId = `TR-${Date.now().toString().slice(-6)}`;
    const signatureUrl = `${proto}://${host}/?trainingId=${trainingId}`;

    let qrCodeUrl = '';
    let qrDataUrl = '';

    try {
      // DataURL 및 Buffer 생성
      qrDataUrl = await QRCode.toDataURL(signatureUrl, { width: 400, margin: 2 });
      const qrBuffer = await QRCode.toBuffer(signatureUrl, { width: 400, margin: 2 });

      // 구글 드라이브 해당 교육 폴더에 QR 코드 PNG 업로드
      const qrUpload = await uploadFileToDrive({
        buffer: qrBuffer,
        filename: `[QR코드] ${body.name}.png`,
        mimeType: 'image/png',
        folderId,
      });
      qrCodeUrl = qrUpload.viewLink || qrUpload.directLink;
    } catch (qrErr) {
      console.warn('QR 코드 생성 오류(계속 진행):', qrErr.message);
    }

    // 3. 안내도 시트에 추가
    const newTraining = await addTraining({
      id: trainingId,
      name: body.name,
      datetime: body.datetime || '',
      target: body.target || '전체',
      status: '진행중',
      folderId,
      manager: body.manager || '',
      note: body.note || '',
      qrCodeUrl,
    });

    return NextResponse.json({
      success: true,
      training: newTraining,
      qrDataUrl,
      signatureUrl,
    });
  } catch (error) {
    console.error('교육 등록 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
