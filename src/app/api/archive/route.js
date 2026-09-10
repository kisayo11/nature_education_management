import { NextResponse } from 'next/server';
import { getPlans, getReports, getSignatures, getTrainings } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'plans'; // plans | reports | signatures
    const query = (searchParams.get('q') || '').toLowerCase().trim();

    if (type === 'plans') {
      let plans = await getPlans();
      if (query) {
        plans = plans.filter(
          (p) =>
            p.trainingName.toLowerCase().includes(query) ||
            p.author.toLowerCase().includes(query) ||
            p.department.toLowerCase().includes(query) ||
            p.createdAt.includes(query)
        );
      }
      return NextResponse.json({ success: true, items: plans });
    }

    if (type === 'reports') {
      let reports = await getReports();
      if (query) {
        reports = reports.filter(
          (r) =>
            r.trainingName.toLowerCase().includes(query) ||
            r.author.toLowerCase().includes(query) ||
            r.department.toLowerCase().includes(query) ||
            r.createdAt.includes(query)
        );
      }
      return NextResponse.json({ success: true, items: reports });
    }

    if (type === 'signatures') {
      const trainingId = searchParams.get('trainingId');
      if (trainingId) {
        let sigs = await getSignatures(trainingId);
        if (query) {
          sigs = sigs.filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.department.toLowerCase().includes(query)
          );
        }
        return NextResponse.json({ success: true, items: sigs });
      }
      // 교육 목록 반환 (각 교육별 서명부 선택용)
      const trainings = await getTrainings(true);
      return NextResponse.json({ success: true, trainings });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 조회 유형입니다.' }, { status: 400 });
  } catch (error) {
    console.error('문서 조회 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
