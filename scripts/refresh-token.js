const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { google } = require('googleapis');

// 1. .env.local 파일 읽기
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local 파일을 찾을 수 없습니다.');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
const getEnvVal = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const clientId = getEnvVal('GOOGLE_CLIENT_ID');
const clientSecret = getEnvVal('GOOGLE_CLIENT_SECRET');

if (!clientId || !clientSecret) {
  console.error('❌ GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET이 설정되지 않았습니다.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000';
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // 항상 새 refresh_token 발급
  scope: SCOPES,
});

// 2. 임시 인증 콜백 서버 실행
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, REDIRECT_URI);
  const code = reqUrl.searchParams.get('code');
  const error = reqUrl.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>❌ 인증 실패: ${error}</h2><p>창을 닫고 다시 시도해 주세요.</p>`);
    console.error('인증 실패:', error);
    server.close();
    process.exit(1);
    return;
  }

  if (!code && !error) {
    res.writeHead(204);
    res.end();
    return;
  }

  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      const newRefreshToken = tokens.refresh_token;

      if (!newRefreshToken) {
        throw new Error('Refresh Token이 반환되지 않았습니다. prompt=consent가 필요합니다.');
      }

      // .env.local 파일 갱신
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /^GOOGLE_REFRESH_TOKEN=.*$/m,
          `GOOGLE_REFRESH_TOKEN=${newRefreshToken}`
        );
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN=${newRefreshToken}`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h1 style="color: #10b981;">🎉 인증 성공!</h1>
          <p style="font-size: 18px; color: #374151;">새 Google Refresh Token이 <b>.env.local</b>에 자동으로 저장되었습니다.</p>
          <p style="color: #6b7280;">이제 이 브라우저 창을 닫고 교육실시계획서를 생성하시면 됩니다.</p>
        </div>
      `);

      console.log('\n=============================================');
      console.log('🎉 구글 인증 성공!');
      console.log('✅ 새 GOOGLE_REFRESH_TOKEN이 .env.local에 저장되었습니다.');
      console.log('=============================================\n');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>❌ 토큰 교환 오류</h2><p>${err.message}</p>`);
      console.error('토큰 교환 실패:', err.message);
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3000, () => {
  console.log('=============================================');
  console.log('구글 인증 로그인 브라우저를 엽니다...');
  console.log('만약 브라우저가 자동으로 열리지 않으면 아래 링크를 클릭하세요:');
  console.log(authUrl);
  console.log('=============================================');

  // 윈도우 기본 브라우저 실행
  exec(`start "" "${authUrl}"`);
});
