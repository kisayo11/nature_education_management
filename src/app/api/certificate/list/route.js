import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = process.env.NEW_HIRE_SPREADSHEET_ID || '1s-APvWy5S_N2IR6AbcKvJht9lqMmIdwzXf5A8G37ai8';
const SHEET_DATA_NAME = '시트1';
const SHEET_ROSTER_NAME = '직원명부_연동_재직자';

// 주민번호(6자리-7자리)로 생년월일 텍스트(YYYY년 MM월 DD일) 계산
function rrnToBirthDate(rrn) {
  if (!rrn) return '';
  const clean = String(rrn).replace(/[^0-9]/g, '');
  if (clean.length < 7) return '';
  
  const yy = clean.substring(0, 2);
  const mm = clean.substring(2, 4);
  const dd = clean.substring(4, 6);
  const genderCode = clean.charAt(6);

  let prefix = '19';
  if (['3', '4', '7', '8'].includes(genderCode)) prefix = '20';
  else if (['9', '0'].includes(genderCode)) prefix = '18';

  return `${prefix}${yy}년 ${mm}월 ${dd}일`;
}

// 입사일 포맷 표준화 (YYYY-MM-DD)
function normalizeJoinDate(val) {
  if (!val) return '';
  const str = String(val).trim().replace(/\./g, '-').replace(/\s+/g, '');
  const parts = str.split('-').filter(Boolean);
  if (parts.length >= 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

// GET: 신규입사자 수료증 DB 목록 조회 + 미동기화 신규자 수 반환
export async function GET() {
  try {
    const sheets = getSheetsClient();

    // 1. 시트1 데이터 조회
    const sheet1Res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_DATA_NAME}'!A1:I`,
    });

    const rows = sheet1Res.data.values || [];
    const list = [];

    // 1행은 헤더이므로 index 1부터 시작
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const no = r[0] || String(i);
      const name = r[1] || '';
      if (!name) continue; // 이름이 없으면 스킵

      const rrn = r[2] || '';
      const birth = r[3] || '';
      const joinDate = normalizeJoinDate(r[4] || '');
      const safetyCertNo = r[5] || '';
      const safetyPdfUrl = r[6] || '';
      const onboardCertNo = r[7] || '';
      const onboardPdfUrl = r[8] || '';

      const safetyDone = Boolean(safetyCertNo && safetyPdfUrl);
      const onboardDone = Boolean(onboardCertNo && onboardPdfUrl);
      let status = 'pending';
      if (safetyDone && onboardDone) status = 'complete';
      else if (safetyDone || onboardDone) status = 'partial';

      list.push({
        rowIndex: i + 1, // 시트 실제 행 번호 (1-indexed)
        no,
        name,
        rrn,
        birth,
        joinDate,
        safetyCertNo,
        safetyPdfUrl,
        onboardCertNo,
        onboardPdfUrl,
        safetyDone,
        onboardDone,
        status,
      });
    }

    // 2. 직원명부_연동_재직자 시트에서 아직 시트1에 없는 신규자 탐색
    let unsyncedList = [];
    try {
      const rosterRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_ROSTER_NAME}'!A2:K`,
      });

      const rosterRows = rosterRes.data.values || [];
      const existingNames = new Set(list.map((item) => item.name.trim()));

      // 2행이 헤더였으므로 3행(인덱스 1)부터 데이터:
      // G열(인덱스 6): 이름, H열(인덱스 7): 입사일, K열(인덱스 10): 주민등록번호
      for (let i = 1; i < rosterRows.length; i++) {
        const row = rosterRows[i];
        if (!row || row.length < 8) continue;
        const name = (row[6] || '').trim();
        const joinDate = normalizeJoinDate(row[7] || '');
        const rrn = (row[10] || '').trim();

        if (name && joinDate && !existingNames.has(name)) {
          unsyncedList.push({
            name,
            joinDate,
            rrn,
            birth: rrnToBirthDate(rrn),
            dept: row[3] || '',
            job: row[5] || '',
          });
        }
      }
    } catch (rosterErr) {
      console.warn('직원명부 조회 실패:', rosterErr.message);
    }

    return NextResponse.json({
      success: true,
      data: list,
      unsyncedList,
      unsyncedCount: unsyncedList.length,
      stats: {
        total: list.length,
        complete: list.filter((i) => i.status === 'complete').length,
        partial: list.filter((i) => i.status === 'partial').length,
        pending: list.filter((i) => i.status === 'pending').length,
      },
    });
  } catch (error) {
    console.error('수료증 목록 조회 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 직원명부_연동_재직자 시트에서 신규입사자를 시트1로 자동 동기화(추가)
export async function POST(request) {
  try {
    const { action } = await request.json();
    if (action !== 'sync') {
      return NextResponse.json({ success: false, error: '올바르지 않은 요청입니다.' }, { status: 400 });
    }

    const sheets = getSheetsClient();

    // 1. 현재 시트1 목록 조회
    const sheet1Res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_DATA_NAME}'!A1:I`,
    });
    const currentRows = sheet1Res.data.values || [];
    const existingNames = new Set();
    let maxNo = 0;

    for (let i = 1; i < currentRows.length; i++) {
      const name = (currentRows[i][1] || '').trim();
      if (name) existingNames.add(name);
      const noVal = parseInt(currentRows[i][0], 10);
      if (!isNaN(noVal) && noVal > maxNo) maxNo = noVal;
    }

    // 2. 직원명부에서 미등록 인원 찾기
    const rosterRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_ROSTER_NAME}'!A2:K`,
    });
    const rosterRows = rosterRes.data.values || [];
    const newRowsToAppend = [];

    for (let i = 1; i < rosterRows.length; i++) {
      const row = rosterRows[i];
      if (!row || row.length < 8) continue;
      const name = (row[6] || '').trim();
      const joinDate = normalizeJoinDate(row[7] || '');
      const rrn = (row[10] || '').trim();

      if (name && joinDate && !existingNames.has(name)) {
        maxNo += 1;
        const birth = rrnToBirthDate(rrn);
        // [번호, 이름, 주민번호, 생년월일, 입사일, 산안수료번호, 산안url, 배치전수료번호, 배치전url]
        newRowsToAppend.push([
          String(maxNo),
          name,
          rrn,
          birth,
          joinDate,
          '',
          '',
          '',
          '',
        ]);
        existingNames.add(name); // 중복 방지
      }
    }

    if (newRowsToAppend.length === 0) {
      return NextResponse.json({
        success: true,
        message: '추가할 신규 입사자가 없습니다. 이미 최신 상태입니다.',
        addedCount: 0,
      });
    }

    // 3. 시트1 하단에 새 행 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_DATA_NAME}'!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newRowsToAppend,
      },
    });

    return NextResponse.json({
      success: true,
      message: `신규 입사자 ${newRowsToAppend.length}명이 시트에 추가되었습니다!`,
      addedCount: newRowsToAppend.length,
      addedNames: newRowsToAppend.map((r) => r[1]),
    });
  } catch (error) {
    console.error('신규입사자 동기화 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
