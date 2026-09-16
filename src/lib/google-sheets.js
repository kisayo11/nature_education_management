import { getSheetsClient } from './google-auth';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

/**
 * 날짜 문자열('2021. 8. 2', '2026-03-25', '2026.03.25' 등)을 Date 객체 또는 YYYY-MM-DD 숫자로 정규화
 */
/**
 * 날짜 문자열 정규화 (시작일시 00:00:00, 종료일시 23:59:59)
 */
function parseDateStrToStartTime(str) {
  if (!str) return null;
  const s = String(str).trim();
  const match = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0).getTime();
  }
  return null;
}

function parseDateStrToEndTime(str) {
  if (!str) return null;
  const s = String(str).trim();
  const match = s.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 23, 59, 59, 999).getTime();
  }
  return null;
}

// 부서 유사어 매핑 사전 (실무 혼용 명칭 지원)
const DEPT_ALIASES = {
  '간호과': '간호부',
  '간호부': '간호과',
  '원무팀': '원무과',
  '원무과': '원무팀',
  '총무과': '총무팀',
  '총무팀': '총무과',
  '재활': '재활치료센터',
  '재활과': '재활치료센터',
  '재활팀': '재활치료센터',
  '재활센터': '재활치료센터',
  '영양과': '영양팀',
  '영양실': '영양팀',
  '조리팀': '영양팀',
  '조리실': '영양팀',
  '시설팀': '시설미화팀',
  '미화팀': '시설미화팀',
  '시설과': '시설미화팀',
  '시설관리': '시설미화팀',
  '심사실': '심사팀',
  '심사과': '심사팀',
  '약제부': '약제과',
  '방사선과': '방사선실',
  '진료과': '진료부',
};

function matchesTarget(emp, targetStr) {
  if (!targetStr) return true;
  const t = targetStr.trim();
  if (['전체', '전직원', '전 직원', '전체직원', '모든직원', '모든 직원', '전 부서', '전부서'].includes(t)) {
    return true;
  }

  // 쉼표, 슬래시, 앰퍼샌드, 플러스로 다중 부서/직종 분리
  const tokens = t.split(/[,/&+]/).map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) return true;

  return tokens.some((token) => {
    // 1. 부서 직접 포함/일치
    if (emp.department && (emp.department.includes(token) || token.includes(emp.department))) {
      return true;
    }
    // 2. 부서 유사어 매핑
    const alias = DEPT_ALIASES[token];
    if (alias && emp.department && (emp.department.includes(alias) || alias.includes(emp.department))) {
      return true;
    }
    // 3. 직종(job) 매칭 (예: '간호사', '치료사', '조리원' 등)
    if (emp.job && (emp.job.includes(token) || token.includes(emp.job))) {
      return true;
    }
    // 4. 직위(position) 매칭 (예: '과장', '팀장' 등)
    if (emp.position && (emp.position.includes(token) || token.includes(emp.position))) {
      return true;
    }
    return false;
  });
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

  const targetStartTime = parseDateStrToStartTime(targetDateStr) || Date.now();
  const targetEndTime = parseDateStrToEndTime(targetDateStr) || Date.now();

  // 1. 재직자현황(링크) 탭 읽기 (Col A ~ L)
  const empRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'재직자현황(링크)'!A3:L300",
  });

  // 2. 퇴사자현황(링크) 탭 읽기 (Col A ~ L)
  const retRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'퇴사자현황(링크)'!A4:L300",
  });

  const empRows = empRes.data.values || [];
  const retRows = retRes.data.values || [];

  const employeeMap = new Map(); // 이름+부서 기준 중복 방지

  // 재직자 탭 파싱
  // 실제 시트 컬럼 (0-based A열 기준):
  // Col D(3): 부서, Col E(4): 직위, Col F(5): 직종, Col G(6): 이름, Col H(7): 입사일, Col I(8): 퇴사일
  for (const row of empRows) {
    const dept = (row[3] || '').trim();
    const position = (row[4] || '').trim();
    const job = (row[5] || '').trim();
    let name = (row[6] || '').trim();
    let joinDateStr = (row[7] || '').trim();
    let leaveDateStr = (row[8] || '').trim();

    // 시트에서 가끔 성명과 입사일 열이 뒤바뀐 행(예: 6열에 날짜, 7열에 한글 이름) 자동 보정
    if (/^\d{4}\./.test(name) && /^[가-힣]{2,5}$/.test(joinDateStr)) {
      const tempName = joinDateStr;
      joinDateStr = leaveDateStr || name;
      name = tempName;
      leaveDateStr = '';
    }

    // 더미 행(마침표 등), 필수값 및 숫자로 시작하는 잘못된 행 검증
    if (!name || name.length < 2 || /^[\.\s\-_]+$/.test(name) || /^\d/.test(name)) continue;
    if (!dept) continue;

    const joinTime = parseDateStrToStartTime(joinDateStr);
    const leaveTime = parseDateStrToEndTime(leaveDateStr);

    // 판별 1: 입사일이 교육일 이후이면 대상 제외 (아직 미입사)
    if (joinTime && joinTime > targetEndTime) continue;

    // 판별 2: 퇴사일이 명시되어 있고 교육일 이전이면 대상 제외 (이미 퇴사)
    if (leaveTime && leaveTime < targetStartTime) continue;

    const key = `${dept}_${name}`;
    employeeMap.set(key, {
      name,
      department: dept,
      position,
      job,
      joinDate: joinDateStr,
      leaveDate: leaveDateStr,
      status: '재직',
    });
  }

  // 퇴사자 탭 파싱 (교육 당시에는 재직 중이었던 퇴사자 포함)
  // Col D(3): 부서, Col E(4): 직위, Col F(5): 직종, Col G(6): 이름, Col H(7): 입사일, Col I(8): 퇴사일
  for (const row of retRows) {
    const dept = (row[3] || '').trim();
    const position = (row[4] || '').trim();
    const job = (row[5] || '').trim();
    const name = (row[6] || '').trim();
    const joinDateStr = (row[7] || '').trim();
    const leaveDateStr = (row[8] || '').trim();

    if (!name || name.length < 2 || /^[\.\s\-_]+$/.test(name)) continue;

    const joinTime = parseDateStrToStartTime(joinDateStr);
    const leaveTime = parseDateStrToEndTime(leaveDateStr);

    // 교육일 당시 재직 여부 판별: 입사일 <= 교육일 <= 퇴사일
    if (joinTime && joinTime > targetEndTime) continue;
    if (leaveTime && leaveTime < targetStartTime) continue;

    // 퇴사일이 교육일 이후인 경우 -> 교육 당시에는 재직 중이었음
    if (leaveTime && leaveTime >= targetStartTime && (!joinTime || joinTime <= targetEndTime)) {
      const key = `${dept || '기타'}_${name}`;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          name,
          department: dept || '퇴사자(교육당시재직)',
          position,
          job,
          joinDate: joinDateStr,
          leaveDate: leaveDateStr,
          status: '교육당시재직(현재퇴사)',
        });
      }
    }
  }

  let result = Array.from(employeeMap.values());

  // 대상 필터 적용
  if (targetDepartment) {
    result = result.filter((emp) => matchesTarget(emp, targetDepartment));
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
