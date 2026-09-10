import { getDriveClient } from './google-auth';
import { Readable } from 'stream';

/**
 * Base64 이미지(또는 Buffer)를 구글 드라이브 지정 폴더에 파일로 업로드합니다.
 */
export async function uploadFileToDrive({ base64Data, buffer, filename, mimeType = 'image/png', folderId }) {
  const drive = getDriveClient();

  let fileBuffer = buffer;
  if (!fileBuffer && base64Data) {
    // data:image/png;base64,... 헤더 제거
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    fileBuffer = Buffer.from(cleanBase64, 'base64');
  }

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: filename,
    parents: targetFolder ? [targetFolder] : [],
  };

  const media = {
    mimeType,
    body: stream,
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink',
  });

  // 해당 파일에 공개 또는 링크 있는 사용자 읽기 권한 부여 (필요 시)
  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permError) {
    // 권한 설정 실패해도 계속 진행
    console.warn('파일 공개 권한 설정 경고:', permError.message);
  }

  return {
    fileId: res.data.id,
    fileName: res.data.name,
    viewLink: res.data.webViewLink,
    directLink: `https://drive.google.com/thumbnail?id=${res.data.id}&sz=w800`,
  };
}

/**
 * 교육별 하위 폴더 생성 유틸리티
 */
export async function createDriveFolder(folderName, parentFolderId) {
  const drive = getDriveClient();
  const targetParent = parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: targetParent ? [targetParent] : [],
    },
    fields: 'id, name, webViewLink',
  });

  return {
    folderId: res.data.id,
    folderName: res.data.name,
    folderLink: res.data.webViewLink,
  };
}
