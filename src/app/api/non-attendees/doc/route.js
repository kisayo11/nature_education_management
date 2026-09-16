import { NextResponse } from 'next/server';
import { createNonAttendeesDoc } from '@/lib/google-docs';
import { addNonAttendeesRecord } from '@/lib/google-sheets';

export async function POST(request) {
  try {
    const data = await request.json();

    const year = data.year || new Date().getFullYear();
    const trainingName = data.trainingName || '';
    const author = data.author || '';
    const department = data.department || '원무과';
    const items = Array.isArray(data.items) ? data.items : [];

    // 1. 구글 문서(GDoc) 관리대장 생성
    const docRes = await createNonAttendeesDoc({
      year,
      trainingName,
      items,
    });

    // 2. 구글 스프레드시트에 기록 저장
    const record = await addNonAttendeesRecord({
      year,
      trainingName,
      author,
      department,
      itemCount: items.length,
      docUrl: docRes.docUrl,
      pdfUrl: docRes.pdfUrl,
    });

    return NextResponse.json({
      success: true,
      message: '교육 미이수자 관리대장이 성공적으로 생성되었습니다.',
      ledgerId: record.ledgerId,
      docUrl: docRes.docUrl,
      pdfUrl: docRes.pdfUrl,
      docTitle: docRes.docTitle,
    });
  } catch (error) {
    console.error('미이수자 관리대장 생성 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
