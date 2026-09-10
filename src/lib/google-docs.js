import { getDocsClient, getDriveClient } from './google-auth';

/**
 * 템플릿 구글 문서를 복사하고 텍스트 치환 및 사진 삽입을 수행합니다.
 */
export async function createDocumentFromTemplate({
  templateDocId,
  newTitle,
  replacements,
  photoFileId = null,
  folderId = null,
}) {
  const drive = getDriveClient();
  const docs = getDocsClient();

  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  // 1. 템플릿 문서 복사
  const copyRes = await drive.files.copy({
    fileId: templateDocId,
    requestBody: {
      name: newTitle,
      parents: targetFolder ? [targetFolder] : [],
    },
    fields: 'id, name, webViewLink',
  });

  const newDocId = copyRes.data.id;
  const webViewLink = copyRes.data.webViewLink;

  // 2. 텍스트 치환 일괄 요청 작성
  const requests = [];

  for (const [key, value] of Object.entries(replacements)) {
    requests.push({
      replaceAllText: {
        containsText: {
          text: key,
          matchCase: true,
        },
        replaceText: String(value || ''),
      },
    });
  }

  // 3. 문서 업데이트 실행
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: newDocId,
      requestBody: { requests },
    });
  }

  // 4. 사진 파일 링크 처리 (보고서)
  if (photoFileId) {
    try {
      await docs.documents.batchUpdate({
        documentId: newDocId,
        requestBody: {
          requests: [
            {
              replaceAllText: {
                containsText: { text: '{{교육사진}}', matchCase: true },
                replaceText: `[현장 사진 링크: https://drive.google.com/file/d/${photoFileId}/view]`,
              },
            },
          ],
        },
      });
    } catch (photoErr) {
      console.warn('사진 삽입 처리 경고:', photoErr.message);
    }
  }

  return {
    docId: newDocId,
    docTitle: newTitle,
    docUrl: webViewLink,
    pdfUrl: `https://docs.google.com/document/d/${newDocId}/export?format=pdf`,
  };
}

/**
 * 교육참석 서명부(출석부) GDoc 문서를 자동 생성합니다.
 */
export async function createSignatureAttendanceDoc({
  trainingName,
  datetime,
  target,
  signatures,
  folderId,
}) {
  const drive = getDriveClient();
  const docs = getDocsClient();
  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const docTitle = `[서명부] ${trainingName} (${signatures.length}명 참석)`;

  // 1. 빈 구글 문서 생성
  const fileRes = await drive.files.create({
    requestBody: {
      name: docTitle,
      mimeType: 'application/vnd.google-apps.document',
      parents: targetFolder ? [targetFolder] : [],
    },
    fields: 'id, name, webViewLink',
  });

  const docId = fileRes.data.id;
  const docUrl = fileRes.data.webViewLink;

  // 2. 헤더 텍스트 삽입
  const headerText = `${trainingName} 참석 서명부\n\n` +
    `• 교육일시: ${datetime || '일시 미지정'}\n` +
    `• 교육대상: ${target || '전 직원'}\n` +
    `• 총 참석자: ${signatures.length}명\n` +
    `• 출력일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n`;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: headerText,
          },
        },
      ],
    },
  });

  // 3. 표(Table) 삽입
  // 행 수 = 헤더 1행 + 서명자 수(최소 1행)
  const rowCount = Math.max(signatures.length + 1, 2);
  const colCount = 6;

  // 현재 문서 끝 위치 조회
  const curDoc = await docs.documents.get({ documentId: docId });
  const docContent = curDoc.data.body?.content || [];
  const lastIndex = docContent[docContent.length - 1]?.endIndex - 1 || 1;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertTable: {
            rows: rowCount,
            columns: colCount,
            location: { index: lastIndex },
          },
        },
      ],
    },
  });

  // 4. 표 셀 채우기
  // 다시 문서를 읽어 생성된 table의 각 셀 위치 파악
  const updatedDoc = await docs.documents.get({ documentId: docId });
  const elements = updatedDoc.data.body?.content || [];
  let tableElement = null;

  for (const el of elements) {
    if (el.table) {
      tableElement = el.table;
      break;
    }
  }

  if (tableElement) {
    const tableRows = tableElement.tableRows || [];
    const cellUpdates = [];

    // 0행: 헤더
    const headers = ['연번', '소속 부서', '직종', '성명', '서명 일시', '서명 확인'];
    if (tableRows[0]) {
      tableRows[0].tableCells.forEach((cell, cIdx) => {
        const startIdx = cell.content[0]?.startIndex || cell.startIndex;
        cellUpdates.push({
          index: startIdx,
          text: headers[cIdx] || '',
        });
      });
    }

    // 1행 ~ N행: 서명 데이터
    signatures.forEach((sig, rIdx) => {
      const row = tableRows[rIdx + 1];
      if (row) {
        const rowValues = [
          String(rIdx + 1),
          sig.department || '',
          sig.job || '',
          sig.name || '',
          sig.signedAt || '',
          sig.imageUrl ? `서명완료 (링크)` : '서명완료',
        ];

        row.tableCells.forEach((cell, cIdx) => {
          const startIdx = cell.content[0]?.startIndex || cell.startIndex;
          cellUpdates.push({
            index: startIdx,
            text: rowValues[cIdx] || '',
          });
        });
      }
    });

    // 인덱스 큰 순서대로 정렬하여 역순 삽입 (인덱스 보존)
    cellUpdates.sort((a, b) => b.index - a.index);

    const cellRequests = cellUpdates.map((u) => ({
      insertText: {
        location: { index: u.index },
        text: u.text,
      },
    }));

    if (cellRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: cellRequests },
      });
    }
  }

  return {
    docId,
    docTitle,
    docUrl,
    pdfUrl: `https://docs.google.com/document/d/${docId}/export?format=pdf`,
  };
}
