import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = process.env.NEW_HIRE_SPREADSHEET_ID || '1s-APvWy5S_N2IR6AbcKvJht9lqMmIdwzXf5A8G37ai8';
const SHEET_ACCOUNTS = '사용자계정';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: '아이디와 비밀번호를 모두 입력해 주세요.' }, { status: 400 });
    }

    const sheets = getSheetsClient();

    // 사용자계정 시트 조회 [번호, 아이디, 비번, 사용자]
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_ACCOUNTS}'!A2:D`,
    });

    const rows = res.data.values || [];
    let matchedUser = null;

    for (const row of rows) {
      const id = (row[1] || '').trim();
      const pw = (row[2] || '').trim();
      const userName = (row[3] || '').trim();

      if (id === String(username).trim() && pw === String(password).trim()) {
        matchedUser = {
          username: id,
          name: userName || id,
        };
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 간단한 세션 토큰 생성 (시간 기반 base64)
    const token = Buffer.from(`${matchedUser.username}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      user: matchedUser,
      token,
      message: `${matchedUser.name} 님, 인증되었습니다.`,
    });
  } catch (error) {
    console.error('관리자 로그인 검증 오류:', error);
    return NextResponse.json({ success: false, error: '계정 확인 중 오류가 발생했습니다: ' + error.message }, { status: 500 });
  }
}
