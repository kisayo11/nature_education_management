import { NextResponse } from 'next/server';
import { getEmployeesAtDate } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const dept = searchParams.get('dept') || '전체';

    const employees = await getEmployeesAtDate(date, dept);
    return NextResponse.json({ success: true, count: employees.length, employees });
  } catch (error) {
    console.error('재직자 목록 조회 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
