import { NextResponse } from 'next/server';
import { getSignatures, addSignatureRecord, getTrainings } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

// 특정 교육의 서명 완료자 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainingId = searchParams.get('trainingId');

    if (!trainingId) {
      return NextResponse.json({ success: false, error: 'trainingId가 필요합니다.' }, { status: 400 });
    }

    const signatures = await getSignatures(trainingId);
    return NextResponse.json({ success: true, count: signatures.length, signatures });
  } catch (error) {
    console.error('서명 목록 조회 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 서명 제출 처리
export async function POST(request) {
  try {
    const body = await request.json();
    const { trainingId, trainingName, department, job, name, signatureBase64 } = body;

    if (!trainingId || !name || !department || !signatureBase64) {
      return NextResponse.json({ success: false, error: '필수 입력 항목이 누락되었습니다.' }, { status: 400 });
    }

    // 1. 중복 서명 검증 (동일 교육 + 동일 부서 + 동일 이름)
    const existingSignatures = await getSignatures(trainingId);
    const isDuplicate = existingSignatures.some(
      (sig) => sig.name.trim() === name.trim() && sig.department.trim() === department.trim()
    );

    if (isDuplicate) {
      return NextResponse.json(
        { success: false, error: `${name}님은 이미 본 교육에 서명을 완료하셨습니다.` },
        { status: 409 }
      );
    }

    // 2. 해당 교육의 전용 서명 저장 폴더 ID 찾기
    const allTrainings = await getTrainings(true);
    const training = allTrainings.find((t) => t.id === trainingId);
    const targetFolderId = training?.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 3. 구글 드라이브에 서명 이미지 파일(PNG) 업로드
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const safeName = name.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const filename = `서명_${dateStr}_${department}_${safeName}.png`;

    const uploadRes = await uploadFileToDrive({
      base64Data: signatureBase64,
      filename,
      mimeType: 'image/png',
      folderId: targetFolderId,
    });

    // 4. 서명_기록 시트에 한 줄 추가
    const signedAt = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const record = await addSignatureRecord({
      trainingId,
      trainingName: trainingName || training?.name || '',
      signedAt,
      department,
      job: job || '',
      name,
      imageUrl: uploadRes.viewLink || uploadRes.directLink,
    });

    return NextResponse.json({
      success: true,
      message: '서명이 안전하게 저장되었습니다.',
      record,
    });
  } catch (error) {
    console.error('서명 제출 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
