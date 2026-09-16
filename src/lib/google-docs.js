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

  // 5. 병원 공식 로고 삽입 (계획서 및 보고서 상단)
  try {
    const logoUri = 'https://drive.google.com/thumbnail?id=1ucXzGQcDpM_dBHf3vyj9H4bvs5AI57wd&sz=w600';
    await docs.documents.batchUpdate({
      documentId: newDocId,
      requestBody: {
        requests: [
          {
            insertInlineImage: {
              uri: logoUri,
              location: { index: 1 },
              objectSize: {
                width: { magnitude: 110, unit: 'PT' },
                height: { magnitude: 32, unit: 'PT' },
              },
            },
          },
        ],
      },
    });
  } catch (logoErr) {
    console.warn('병원 로고 삽입 중 알림 (계속 진행):', logoErr.message);
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
  oldDocUrl,
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

  // 2. 헤더 텍스트 삽입 (상세 bullet 헤더 제거, 깔끔한 서식 제목 적용)
  const headerText = `${trainingName} 참석 서명부\n\n`;

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

  // 서명부 상단 병원 공식 로고 삽입
  try {
    const logoUri = 'https://drive.google.com/thumbnail?id=1ucXzGQcDpM_dBHf3vyj9H4bvs5AI57wd&sz=w600';
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertInlineImage: {
              uri: logoUri,
              location: { index: 1 },
              objectSize: {
                width: { magnitude: 110, unit: 'PT' },
                height: { magnitude: 32, unit: 'PT' },
              },
            },
            insertText: {
              location: { index: 2 },
              text: '\n',
            },
          },
        ],
      },
    });
  } catch (logoErr) {
    console.warn('서명부 로고 삽입 알림 (계속 진행):', logoErr.message);
  }

  // 3. 표(Table) 삽입
  // 행 수 = 헤더 1행 + 서명자 수(최소 1행)
  const rowCount = Math.max(signatures.length + 1, 2);
  const colCount = 5; // 서명일시 열 제거 (연번, 소속 부서, 직종, 성명, 자필 서명)

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

    // 0행: 헤더 (서명일시 제거)
    const headers = ['연번', '소속 부서', '직종', '성명', '자필 서명'];
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

  // 이전 서명부 문서가 존재하는 경우 구글 드라이브에 중복 파일이 쌓이지 않도록 휴지통으로 정리
  if (oldDocUrl) {
    try {
      const match = oldDocUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1] && match[1] !== docId) {
        await drive.files.update({
          fileId: match[1],
          requestBody: { trashed: true },
        });
      }
    } catch (cleanErr) {
      console.warn('이전 서명부 문서 휴지통 정리 중 알림:', cleanErr.message);
    }
  }

  return {
    docId,
    docTitle,
    docUrl,
    pdfUrl: `https://docs.google.com/document/d/${docId}/export?format=pdf`,
  };
}
