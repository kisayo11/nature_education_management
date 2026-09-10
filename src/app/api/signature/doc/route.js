import { NextResponse } from 'next/server';
import { getTrainings, getSignatures, updateTrainingDocUrl } from '@/lib/google-sheets';
import { createSignatureAttendanceDoc } from '@/lib/google-docs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { trainingId } = await request.json();

    if (!trainingId) {
      return NextResponse.json({ success: false, error: 'trainingId가 필요합니다.' }, { status: 400 });
    }

    // 1. 교육 정보 조회
    const allTrainings = await getTrainings(true);
    const training = allTrainings.find((t) => t.id === trainingId);

    if (!training) {
      return NextResponse.json({ success: false, error: '해당 교육을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 해당 교육의 서명 완료자 명단 조회
    const signatures = await getSignatures(trainingId);

    // 3. 서명부 GDoc 문서 생성 (표 포함)
    const docRes = await createSignatureAttendanceDoc({
      trainingName: training.name,
      datetime: training.datetime,
      target: training.target,
      signatures,
      folderId: training.folderId,
    });

    // 4. 통합 DB 스프레드시트 '서명_안내도'의 I열(서명문서URL) 업데이트
    await updateTrainingDocUrl(trainingId, docRes.docUrl);

    return NextResponse.json({
      success: true,
      message: '교육참석 서명부 문서가 성공적으로 생성되었습니다.',
      docUrl: docRes.docUrl,
      pdfUrl: docRes.pdfUrl,
      attendanceCount: signatures.length,
    });
  } catch (error) {
    console.error('서명부 GDoc 생성 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
