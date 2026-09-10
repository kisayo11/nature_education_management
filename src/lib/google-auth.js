import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

let authClient = null;

export function getGoogleAuth() {
  if (authClient) return authClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // 1. [우선순위 1] OAuth2 Refresh Token (원무과장님 유료 개인 드라이브 용량 사용 - 파일 생성 쿼터 무제한)
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    authClient = oauth2Client;
    return authClient;
  }

  // 2. [대안 2] 서비스 계정 (Service Account)
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (email && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    authClient = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: SCOPES,
    });
    return authClient;
  }

  throw new Error('Google 인증 정보가 설정되지 않았습니다.');
}

export function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

export function getDocsClient() {
  const auth = getGoogleAuth();
  return google.docs({ version: 'v1', auth });
}

export function getDriveClient() {
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}
