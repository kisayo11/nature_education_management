import { NextResponse } from 'next/server';
import { createDocumentFromTemplate } from '@/lib/google-docs';
import { addPlanRecord } from '@/lib/google-sheets';

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.trainingName || !data.author) {
      return NextResponse.json({ success: false, error: '교육명과 작성자는 필수입니다.' }, { status: 400 });
    }

    const templateId = process.env.TEMPLATE_PLAN_DOC_ID;
    const today = data.createdAt || new Date().toISOString().split('T')[0];
    const newTitle = `[계획서] ${data.trainingName} (${today})`;

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
      '{{예정인원}}': data.expectedCount ? `${data.expectedCount}명` : '',
      '{{교육금액}}': data.budget || '0원',
      '{{주관부서}}': data.hostDept || '',
      '{{교육강사}}': data.instructor || '',
      '{{교육내용}}': data.content || '',
      '{{요청사항}}': data.requests || '',
    };

    // 1. GDoc 템플릿 복사 & 텍스트 치환
    const docRes = await createDocumentFromTemplate({
      templateDocId: templateId,
      newTitle,
      replacements,
    });

    // 2. 계획서_목록 시트에 메타데이터 저장
    const planRecord = await addPlanRecord({
      ...data,
      docUrl: docRes.docUrl,
    });

    return NextResponse.json({
      success: true,
      message: '교육실시계획서가 성공적으로 생성되었습니다.',
      planId: planRecord.planId,
      docUrl: docRes.docUrl,
      pdfUrl: docRes.pdfUrl,
    });
  } catch (error) {
    console.error('계획서 생성 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
