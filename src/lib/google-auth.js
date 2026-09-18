import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

let authClient = null;

export function getGoogleAuth() {
  if (authClient) return authClient;

  // 1. [우선순위 1] 서비스 계정 (Service Account - 토큰 만료 없이 영구 안정 동작)
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

  // 2. [대안 2] OAuth2 Refresh Token
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    authClient = oauth2Client;
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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // 드라이브 업로드는 서비스 계정(쿼터 0바이트)이 아닌 원무과장님 계정(OAuth2)을 우선 사용
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

