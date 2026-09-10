import { getSheetsClient } from './google-auth';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

/**
 * 날짜 문자열('2021. 8. 2', '2026-03-25', '2026.03.25' 등)을 Date 객체 또는 YYYY-MM-DD 숫자로 정규화
 */
function parseDateStrToTime(str) {
  if (!str) return null;
  const s = String(str).trim();
  // 정규식으로 년, 월, 일 추출
  const match = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day).getTime();
  }
  return null;
}

/**
 * [1] 서명 안내도(진행 중인 교육 목록) 조회
 */
export async function getTrainings(includeAll = false) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'서명_안내도'!A2:J100",
  });

  const rows = res.data.values || [];
  const trainings = rows.map((row) => ({
    id: row[0] || '',
    name: row[1] || '',
    datetime: row[2] || '',
    target: row[3] || '전체',
    status: row[4] || '진행중',
    folderId: row[5] || '',
    manager: row[6] || '',
    note: row[7] || '',
    signatureDocUrl: row[8] || '',
    qrCodeUrl: row[9] || '',
  })).filter((t) => t.id && t.name);

  if (includeAll) return trainings;
  // 진행중인 것만 반환
  return trainings.filter((t) => t.status === '진행중');
}

/**
 * 신규 교육 등록 (서명_안내도 추가)
 */
export async function addTraining(data) {
  const sheets = getSheetsClient();
  const newId = `TR-${Date.now().toString().slice(-6)}`;
  const row = [
    newId,
    data.name,
    data.datetime,
    data.target || '전체',
    data.status || '진행중',
    data.folderId || '',
    data.manager || '',
    data.note || '',
    data.signatureDocUrl || '',
    data.qrCodeUrl || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'서명_안내도'!A:J",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return { id: newId, ...data };
}

/**
 * 특정 교육의 서명부 GDoc URL 업데이트
 */
export async function updateTrainingDocUrl(trainingId, docUrl) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'서명_안내도'!A2:J100",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === trainingId);
  if (rowIndex === -1) return false;

  // 실제 시트 행 번호 = rowIndex + 2 (1-based + header)
  const actualRow = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'서명_안내도'!I${actualRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[docUrl]] },
  });

  return true;
}

/**
 * [2] 교육일시 기준 재직자 명단 자동 산출
 * @param {string} targetDateStr - 교육일시 (예: '2026-03-25')
 * @param {string} [targetDepartment] - 교육 대상 부서 ('전체' 또는 특정 부서명)
 */
export async function getEmployeesAtDate(targetDateStr, targetDepartment = '전체') {
  const sheets = getSheetsClient();

  const targetTime = parseDateStrToTime(targetDateStr) || new Date().getTime();

  // 1. 재직자현황(링크) 탭 읽기
  const empRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'재직자현황(링크)'!B3:I300",
  });

  // 2. 퇴사자현황(링크) 탭 읽기
  const retRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'퇴사자현황(링크)'!B4:I300",
  });

  const empRows = empRes.data.values || [];
  const retRows = retRes.data.values || [];

  const employeeMap = new Map(); // 이름+부서 기준 중복 방지

  // 재직자 탭 파싱
  // Row: [순번, ?, 부서, 직위, 직종, 이름, 입사일, 퇴사일]
  // 인덱스: 0:순번, 1:?, 2:부서, 3:직위, 4:직종, 5:이름, 6:입사일, 7:퇴사일
  for (const row of empRows) {
    const dept = (row[2] || '').trim();
    const position = (row[3] || '').trim();
    const job = (row[4] || '').trim();
    const name = (row[5] || '').trim();
    const joinDateStr = (row[6] || '').trim();
    const leaveDateStr = (row[7] || '').trim();

    if (!name || !dept) continue;

    const joinTime = parseDateStrToTime(joinDateStr);
    const leaveTime = parseDateStrToTime(leaveDateStr);

    // 판별 1: 입사일이 교육일 이전이어야 함
    if (joinTime && joinTime > targetTime) continue;

    // 판별 2: 퇴사일이 명시되어 있다면, 교육일 당시에는 아직 퇴사 전이어야 함
    if (leaveTime && leaveTime < targetTime) continue;

    const key = `${dept}_${name}`;
    employeeMap.set(key, {
      name,
      department: dept,
      position,
      job,
      status: '재직',
    });
  }

  // 퇴사자 탭 파싱 (교육 당시에는 재직 중이었던 퇴사자 포함)
  for (const row of retRows) {
    const dept = (row[2] || '').trim();
    const position = (row[3] || '').trim();
    const job = (row[4] || '').trim();
    const name = (row[5] || '').trim();
    const joinDateStr = (row[6] || '').trim();
    const leaveDateStr = (row[7] || '').trim();

    if (!name) continue;

    const joinTime = parseDateStrToTime(joinDateStr);
    const leaveTime = parseDateStrToTime(leaveDateStr);

    // 입사일 이전 교육인 경우 패스
    if (joinTime && joinTime > targetTime) continue;

    // 퇴사일이 교육일 이후인 경우 -> 교육 당시에는 재직 중이었음!
    if (leaveTime && leaveTime >= targetTime) {
      const key = `${dept}_${name}`;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          name,
          department: dept || '기타',
          position,
          job,
          status: '교육당시재직(현재퇴사)',
        });
      }
    }
  }

  let result = Array.from(employeeMap.values());

  // 부서 필터 적용
  if (targetDepartment && targetDepartment !== '전체') {
    const deptList = targetDepartment.split(',').map((d) => d.trim());
    result = result.filter((emp) => deptList.some((d) => emp.department.includes(d) || d.includes(emp.department)));
  }

  // 부서명, 이름순 정렬
  result.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));

  return result;
}

/**
 * [3] 서명 제출 및 중복 확인
 */
export async function getSignatures(trainingId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'서명_기록'!A2:H1000",
  });

  const rows = res.data.values || [];
  return rows
    .filter((r) => r[1] === trainingId)
    .map((r) => ({
      id: r[0],
      trainingId: r[1],
      trainingName: r[2],
      signedAt: r[3],
      department: r[4],
      job: r[5],
      name: r[6],
      imageUrl: r[7],
    }));
}

export async function addSignatureRecord(data) {
  const sheets = getSheetsClient();
  const sigId = `SIG-${Date.now()}`;
  const row = [
    sigId,
    data.trainingId,
    data.trainingName,
    data.signedAt || new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    data.department,
    data.job || '',
    data.name,
    data.imageUrl || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'서명_기록'!A:H",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return { sigId, ...data };
}

/**
 * [4] 계획서_목록 CRUD
 */
export async function getPlans() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'계획서_목록'!A2:R500",
  });

  const rows = res.data.values || [];
  return rows.map((r) => ({
    id: r[0] || '',
    createdAt: r[1] || '',
    department: r[2] || '',
    position: r[3] || '',
    author: r[4] || '',
    trainingName: r[5] || '',
    location: r[6] || '',
    datetime: r[7] || '',
    duration: r[8] || '',
    category: r[9] || '',
    target: r[10] || '',
    expectedCount: r[11] || '',
    budget: r[12] || '',
    hostDept: r[13] || '',
    instructor: r[14] || '',
    content: r[15] || '',
    requests: r[16] || '',
    docUrl: r[17] || '',
  })).reverse(); // 최신순
}

export async function addPlanRecord(data) {
  const sheets = getSheetsClient();
  const planId = `PLN-${Date.now().toString().slice(-6)}`;
  const row = [
    planId,
    data.createdAt || new Date().toISOString().split('T')[0],
    data.department || '',
    data.position || '',
    data.author || '',
    data.trainingName || '',
    data.location || '',
    data.datetime || '',
    data.duration || '',
    data.category || '',
    data.target || '',
    data.expectedCount || '',
    data.budget || '',
    data.hostDept || '',
    data.instructor || '',
    data.content || '',
    data.requests || '',
    data.docUrl || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'계획서_목록'!A:R",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return { planId, ...data };
}

/**
 * [5] 보고서_목록 CRUD
 */
export async function getReports() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'보고서_목록'!A2:R500",
  });

  const rows = res.data.values || [];
  return rows.map((r) => ({
    id: r[0] || '',
    createdAt: r[1] || '',
    department: r[2] || '',
    position: r[3] || '',
    author: r[4] || '',
    trainingName: r[5] || '',
    location: r[6] || '',
    datetime: r[7] || '',
    duration: r[8] || '',
    category: r[9] || '',
    target: r[10] || '',
    actualCount: r[11] || '',
    budget: r[12] || '',
    hostDept: r[13] || '',
    instructor: r[14] || '',
    content: r[15] || '',
    photoUrl: r[16] || '',
    docUrl: r[17] || '',
  })).reverse(); // 최신순
}

export async function addReportRecord(data) {
  const sheets = getSheetsClient();
  const reportId = `RPT-${Date.now().toString().slice(-6)}`;
  const row = [
    reportId,
    data.createdAt || new Date().toISOString().split('T')[0],
    data.department || '',
    data.position || '',
    data.author || '',
    data.trainingName || '',
    data.location || '',
    data.datetime || '',
    data.duration || '',
    data.category || '',
    data.target || '',
    data.actualCount || '',
    data.budget || '',
    data.hostDept || '',
    data.instructor || '',
    data.content || '',
    data.photoUrl || '',
    data.docUrl || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'보고서_목록'!A:R",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return { reportId, ...data };
}
