import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/google-auth';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

function extractDocId(urlOrId) {
  if (!urlOrId) return null;
  const match = String(urlOrId).match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(String(urlOrId))) return String(urlOrId);
  return null;
}

export async function POST(request) {
  try {
    const { reportDocUrl, sigDocUrl, filename = '통합결재철_교육결과보고서' } = await request.json();

    const reportDocId = extractDocId(reportDocUrl);
    const sigDocId = extractDocId(sigDocUrl);

    if (!reportDocId && !sigDocId) {
      return NextResponse.json({ success: false, error: '병합할 문서 URL 또는 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    const drive = getDriveClient();
    const mergedPdf = await PDFDocument.create();

    const targetDocIds = [reportDocId, sigDocId].filter(Boolean);

    for (const docId of targetDocIds) {
      try {
        const exportRes = await drive.files.export(
          { fileId: docId, mimeType: 'application/pdf' },
          { responseType: 'arraybuffer' }
        );

        const pdfDoc = await PDFDocument.load(exportRes.data);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      } catch (docErr) {
        console.warn(`문서(${docId}) PDF 내보내기/병합 중 오류:`, docErr.message);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return NextResponse.json({ success: false, error: 'PDF 병합에 실패했습니다. 문서를 열람할 수 있는지 확인해 주세요.' }, { status: 500 });
    }

    const mergedPdfBytes = await mergedPdf.save();
    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);

    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${safeFilename}.pdf`,
      },
    });
  } catch (error) {
    console.error('PDF 병합 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
