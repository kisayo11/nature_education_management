'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  RefreshCw,
  Sparkles,
  ClipboardList,
  Calendar,
  Check,
  FileText,
} from 'lucide-react';

export default function NonAttendeesPage() {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [trainingName, setTrainingName] = useState('');
  const [author, setAuthor] = useState('원무과장');
  const [department, setDepartment] = useState('원무과');

  // 등록된 교육 목록 (자동 불러오기용)
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [fetchingNonAttendees, setFetchingNonAttendees] = useState(false);

  // 미이수자 행 목록
  const [items, setItems] = useState([
    { department: '', name: '', date: '', reason: '휴가/연차', customReason: '', nextDate: '' },
  ]);

  // 일괄 적용 상태
  const [bulkReason, setBulkReason] = useState('휴가/연차');
  const [bulkNextDate, setBulkNextDate] = useState('');

  // 제출 결과 및 로딩
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 교육 목록 로드
  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        const res = await fetch('/api/archive?type=signatures');
        const data = await res.json();
        if (data.success && data.trainings) {
          setTrainings(data.trainings);
          if (data.trainings.length > 0) {
            setSelectedTrainingId(data.trainings[0].id);
            setTrainingName(data.trainings[0].name);
          }
        }
      } catch (err) {
        console.error('교육 목록 로드 실패:', err);
      }
    };
    fetchTrainings();
  }, []);

  // 교육 선택 변경 시 교육명 자동 세팅
  const handleTrainingSelect = (e) => {
    const tId = e.target.value;
    setSelectedTrainingId(tId);
    const matched = trainings.find((t) => t.id === tId);
    if (matched) {
      setTrainingName(matched.name);
    }
  };

  // 선택한 교육의 실제 미이수자 자동 추출 및 행 자동 완성
  const handleAutoLoadNonAttendees = async () => {
    if (!selectedTrainingId) {
      alert('진행된 교육을 선택해주세요.');
      return;
    }
    const targetTraining = trainings.find((t) => t.id === selectedTrainingId);
    if (!targetTraining) return;

    setFetchingNonAttendees(true);
    try {
      // 1. 해당 교육 당시 재직자 명단 조회
      const empRes = await fetch(
        `/api/employees?date=${encodeURIComponent(targetTraining.datetime || '')}&dept=${encodeURIComponent(targetTraining.target || '전체')}`
      );
      const empData = await empRes.json();
      const employees = empData.success ? empData.employees || [] : [];

      // 2. 해당 교육 실제 서명자 목록 조회
      const sigRes = await fetch(`/api/archive?type=signatures&trainingId=${selectedTrainingId}`);
      const sigData = await sigRes.json();
      const signatures = sigData.success ? sigData.items || [] : [];

      // 3. 미이수자(대상자 중 서명하지 않은 직원) 필터링
      const nonAtts = employees.filter((emp) => {
        return !signatures.some((sig) => {
          const empName = (emp.name || '').replace(/\s+/g, '');
          const sigName = (sig.name || '').replace(/\s+/g, '');
          if (empName !== sigName) return false;
          const eDept = (emp.department || '').trim();
          const sDept = (sig.department || '').trim();
          if (!eDept || !sDept) return true;
          return eDept === sDept || sDept.includes(eDept) || eDept.includes(sDept);
        });
      });

      if (nonAtts.length === 0) {
        alert('🎉 해당 교육의 모든 직원이 서명을 완료하여 미이수자가 없습니다!');
        setFetchingNonAttendees(false);
        return;
      }

      const trainingDateOnly = (targetTraining.datetime || '').split(' ')[0] || '';

      const generatedRows = nonAtts.map((emp) => ({
        department: emp.department || '',
        name: emp.name || '',
        date: trainingDateOnly,
        reason: '휴가/연차',
        customReason: '',
        nextDate: '',
      }));

      setItems(generatedRows);
      alert(`성공: '${targetTraining.name}' 교육의 미이수자 총 ${nonAtts.length}명을 자동으로 불러왔습니다.`);
    } catch (err) {
      console.error('미이수자 자동 추출 오류:', err);
      alert('미이수자 명단을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setFetchingNonAttendees(false);
    }
  };

  // 행 추가
  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      { department: '', name: '', date: '', reason: '휴가/연차', customReason: '', nextDate: '' },
    ]);
  };

  // 행 삭제
  const handleRemoveRow = (index) => {
    if (items.length <= 1) {
      setItems([{ department: '', name: '', date: '', reason: '휴가/연차', customReason: '', nextDate: '' }]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 행 값 수정
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // 사유 전체 일괄 적용
  const handleApplyBulkReason = () => {
    if (!bulkReason) return;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        reason: bulkReason,
      }))
    );
  };

  // 차기 교육일 전체 일괄 적용
  const handleApplyBulkNextDate = () => {
    if (!bulkNextDate) return;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        nextDate: bulkNextDate,
      }))
    );
  };

  // 최종 관리대장 구글 문서 생성 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // 공백 행 제외 및 사유 정리
    const validItems = items
      .filter((it) => it.name.trim() || it.department.trim())
      .map((it) => ({
        department: it.department.trim(),
        name: it.name.trim(),
        date: it.date.trim(),
        reason: it.reason === '직접입력' ? it.customReason.trim() : it.reason,
        nextDate: it.nextDate.trim(),
      }));

    if (validItems.length === 0) {
      setError('최소 1명 이상의 미이수자 정보를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/non-attendees/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          trainingName,
          author,
          department,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '관리대장 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* 상단 타이틀 & 결재 문서 안내 배너 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--primary)',
            backgroundColor: 'var(--secondary)',
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid var(--input-border)',
          }}>
            📋 교육 행정 결재 문서 (담당자용)
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
            ※ 교육 불참/미이수 직원의 사유 및 차기 교육 일정을 기록하고 관리대장 문서를 자동 발행합니다.
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginTop: 4, letterSpacing: -0.5 }}>
          교육 미이수자 관리대장 작성
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', marginTop: 4 }}>
          병원 필수 인증 및 교육 규정에 따라 미이수자 명단, 미이수 사유, 다음 예정 교육일을 Google Docs 대장으로 생성합니다.
        </p>
      </div>

      {/* 성공 모달/결과 안내 카드 */}
      {result && (
        <div className="card" style={{
          marginBottom: 24,
          backgroundColor: '#F0FDF4',
          borderColor: '#86EFAC',
          borderWidth: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', fontWeight: 800, fontSize: 16 }}>
            <CheckCircle2 size={22} /> 교육 미이수자 관리대장 생성 완료!
          </div>
          <p style={{ fontSize: 13, color: '#166534', marginTop: 6, marginBottom: 14 }}>
            Google Docs 문서로 규격 대장이 생성되었으며, 구글 드라이브에 안전하게 보관되었습니다.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={result.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ExternalLink size={16} /> Google Docs 열람 및 편집
            </a>
            <a
              href={result.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid var(--input-border)',
                backgroundColor: '#fff',
                color: 'var(--text-main)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Download size={16} /> PDF 즉시 다운로드
            </a>
            <Link
              href="/archive"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid var(--input-border)',
                backgroundColor: '#fff',
                color: 'var(--primary)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <FileText size={16} /> 문서 조회 보관함 이동
            </Link>
            <button
              type="button"
              onClick={() => setResult(null)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid var(--input-border)',
                backgroundColor: '#fff',
                color: 'var(--text-sub)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              새로 작성하기
            </button>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="card" style={{
          marginBottom: 20,
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          fontWeight: 600,
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 섹션 1: 대장 기본 정보 및 자동 연동 도구 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="var(--primary)" /> 관리대장 기본 정보
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label>대장 해당 연도</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="예: 2026"
                  required
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-sub)' }}>년</span>
              </div>
            </div>

            <div>
              <label>작성자 성명</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="작성자 성명"
                required
              />
            </div>

            <div>
              <label>작성 부서</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 원무과"
                required
              />
            </div>
          </div>

          {/* 교육 자동 연동 박스 */}
          <div style={{
            backgroundColor: '#FAFDFB',
            border: '1.5px dashed var(--primary)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} /> 원내 교육 연동 (미이수자 1초 자동 추출)
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                해당 교육의 전체 재직자 중 아직 서명하지 않은 인원을 자동으로 불러옵니다.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '2 1 280px' }}>
                <select value={selectedTrainingId} onChange={handleTrainingSelect}>
                  <option value="">-- 연동할 교육을 선택하세요 --</option>
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.datetime ? `${t.datetime.split(' ')[0]}` : ''} / {t.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAutoLoadNonAttendees}
                disabled={fetchingNonAttendees}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={14} className={fetchingNonAttendees ? 'animate-spin' : ''} />
                {fetchingNonAttendees ? '미이수자 추출 중...' : '미이수자 자동 불러오기'}
              </button>
            </div>
          </div>
        </div>

        {/* 섹션 2: 일괄 적용 도구 바 */}
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid var(--input-border)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' }}>⚡ 일괄 적용:</span>

            {/* 사유 일괄 적용 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, width: 'auto' }}
              >
                <option value="휴가/연차">휴가/연차</option>
                <option value="당직 근무">당직 근무</option>
                <option value="오프(Off)">오프(Off)</option>
                <option value="병가">병가</option>
                <option value="출장">출장</option>
                <option value="개인 사정">개인 사정</option>
              </select>
              <button
                type="button"
                onClick={handleApplyBulkReason}
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  backgroundColor: '#fff',
                  border: '1px solid var(--input-border)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                사유 전체적용
              </button>
            </div>

            {/* 차기 교육일 일괄 적용 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <input
                type="text"
                placeholder="예: 2026. 09. 30"
                value={bulkNextDate}
                onChange={(e) => setBulkNextDate(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, width: 140 }}
              />
              <button
                type="button"
                onClick={handleApplyBulkNextDate}
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  backgroundColor: '#fff',
                  border: '1px solid var(--input-border)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                차기교육일 전체적용
              </button>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
            현재 작성 인원: <strong>{items.filter((it) => it.name.trim()).length}명</strong>
          </div>
        </div>

        {/* 섹션 3: 관리대장 표 (이미지 양식 그대로 구현) */}
        <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--input-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>미이수자 명단 입력 (총 {items.length}행)</h2>
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: '#fff',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> 행 추가
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--input-border)', textAlign: 'center' }}>
                  <th style={{ padding: '10px 8px', width: 55 }}>번호</th>
                  <th style={{ padding: '10px 8px', width: 130 }}>부서</th>
                  <th style={{ padding: '10px 8px', width: 110 }}>성명</th>
                  <th style={{ padding: '10px 8px', width: 140 }}>교육일</th>
                  <th style={{ padding: '10px 8px' }}>미 이수 사유</th>
                  <th style={{ padding: '10px 8px', width: 150 }}>다음 예정 교육일</th>
                  <th style={{ padding: '10px 8px', width: 45 }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--input-border)' }}>
                    {/* 번호 */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-sub)' }}>
                      {index + 1}
                    </td>

                    {/* 부서 */}
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={item.department}
                        onChange={(e) => handleItemChange(index, 'department', e.target.value)}
                        placeholder="부서명"
                        style={{ padding: '6px 8px', fontSize: 13 }}
                      />
                    </td>

                    {/* 성명 */}
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="직원명"
                        style={{ padding: '6px 8px', fontSize: 13, fontWeight: 700 }}
                      />
                    </td>

                    {/* 교육일 */}
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={item.date}
                        onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                        placeholder="예: 2026. 9. 16"
                        style={{ padding: '6px 8px', fontSize: 13 }}
                      />
                    </td>

                    {/* 미 이수 사유 */}
                    <td style={{ padding: '6px 6px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={item.reason}
                          onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: 13, flex: item.reason === '직접입력' ? '0 0 110px' : '1' }}
                        >
                          <option value="휴가/연차">휴가/연차</option>
                          <option value="당직 근무">당직 근무</option>
                          <option value="오프(Off)">오프(Off)</option>
                          <option value="병가">병가</option>
                          <option value="출장">출장</option>
                          <option value="개인 사정">개인 사정</option>
                          <option value="직접입력">직접입력</option>
                        </select>
                        {item.reason === '직접입력' && (
                          <input
                            type="text"
                            value={item.customReason}
                            onChange={(e) => handleItemChange(index, 'customReason', e.target.value)}
                            placeholder="사유 기재"
                            style={{ padding: '6px 8px', fontSize: 13, flex: 1 }}
                          />
                        )}
                      </div>
                    </td>

                    {/* 다음 예정 교육일 */}
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="text"
                        value={item.nextDate}
                        onChange={(e) => handleItemChange(index, 'nextDate', e.target.value)}
                        placeholder="예: 2026. 9. 30"
                        style={{ padding: '6px 8px', fontSize: 13 }}
                      />
                    </td>

                    {/* 삭제 */}
                    <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        title="행 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '12px 18px', backgroundColor: '#F8FAFC', borderTop: '1px solid var(--input-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
              ※ 생성 시 양식 사진과 동일하게 최소 15행 규격으로 빈 행이 깔끔하게 패딩되어 Google Docs로 자동 인쇄/출력됩니다.
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: '#fff',
                border: '1px solid var(--input-border)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> 행 추가
            </button>
          </div>
        </div>

        {/* 하단 생성 제출 버튼 */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: 15,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={18} className="animate-spin" /> 구글 문서(Google Docs) 관리대장 생성 중...
            </>
          ) : (
            <>
              <Check size={18} /> 교육 미이수자 관리대장 생성 (Google Docs 문서 발행)
            </>
          )}
        </button>
      </form>
    </div>
  );
}
