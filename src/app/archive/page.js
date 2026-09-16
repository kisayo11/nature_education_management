'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Search,
  FilePenLine,
  FileText,
  CheckSquare,
  ExternalLink,
  Download,
  RefreshCw,
  Eye,
  QrCode as QrIcon,
  Users,
  Copy,
  Check,
  X,
  TrendingUp,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('plans'); // plans | reports | signatures
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 서명부 조회용 교육 목록 및 선택된 교육
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [selectedTraining, setSelectedTraining] = useState(null);

  // 재직자 목록 & 전체 서명 및 이수 통계 상태
  const [employees, setEmployees] = useState([]);
  const [allSignatures, setAllSignatures] = useState([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('전체');
  const [showNonAttendeesModal, setShowNonAttendeesModal] = useState(false);
  const [modalTab, setModalTab] = useState('nonAttendees'); // nonAttendees | attended | all
  const [modalSearch, setModalSearch] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // 서명부 GDoc 생성 로딩 상태
  const [docGenerating, setDocGenerating] = useState(false);

  // 통합 PDF 병합 로딩 상태
  const [mergingPdf, setMergingPdf] = useState(null);

  // 서명 이미지 확대 모달
  const [previewImage, setPreviewImage] = useState(null);

  // QR 모달
  const [qrModal, setQrModal] = useState(null);

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'signatures') {
        // 교육 목록 조회
        const tRes = await fetch('/api/archive?type=signatures');
        const tData = await tRes.json();
        if (tData.success && tData.trainings) {
          setTrainings(tData.trainings);
          const currentId = selectedTrainingId || (tData.trainings[0]?.id || '');
          if (!selectedTrainingId && currentId) {
            setSelectedTrainingId(currentId);
          }
          const matched = tData.trainings.find((t) => t.id === currentId);
          setSelectedTraining(matched || null);
        }

        // 특정 교육 서명 목록 조회
        if (selectedTrainingId) {
          // 통계/이수율 계산용 전체 서명 조회
          const allSigRes = await fetch(`/api/archive?type=signatures&trainingId=${selectedTrainingId}`);
          const allSigData = await allSigRes.json();
          const fullSigs = allSigData.success ? allSigData.items || [] : [];
          setAllSignatures(fullSigs);

          // 검색 필터링된 서명 목록
          if (searchQuery) {
            const sRes = await fetch(`/api/archive?type=signatures&trainingId=${selectedTrainingId}&q=${encodeURIComponent(searchQuery)}`);
            const sData = await sRes.json();
            setItems(sData.success ? sData.items || [] : []);
          } else {
            setItems(fullSigs);
          }
        }
      } else {
        const res = await fetch(`/api/archive?type=${activeTab}&q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.items || []);
        }
      }
    } catch (err) {
      console.error('조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedTrainingId]);

  useEffect(() => {
    const matched = trainings.find((t) => t.id === selectedTrainingId);
    setSelectedTraining(matched || null);
    setSelectedDeptFilter('전체');
  }, [selectedTrainingId, trainings]);

  // 서명부 탭일 때 재직자 명단 조회하여 이수율 계산
  useEffect(() => {
    if (activeTab === 'signatures' && selectedTraining) {
      const fetchEmployees = async () => {
        try {
          const res = await fetch(`/api/employees?date=${encodeURIComponent(selectedTraining.datetime || '')}&dept=${encodeURIComponent(selectedTraining.target || '전체')}`);
          const data = await res.json();
          if (data.success && data.employees) {
            setEmployees(data.employees);
          }
        } catch (e) {
          console.error('재직자 목록 로드 오류:', e);
        }
      };
      fetchEmployees();
    } else {
      setEmployees([]);
    }
  }, [activeTab, selectedTraining]);

  // 부서 유사어 매핑
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
    '영양과': '영양팀',
    '영양실': '영양팀',
    '조리팀': '영양팀',
    '조리실': '영양팀',
    '시설팀': '시설미화팀',
    '미화팀': '시설미화팀',
    '심사실': '심사팀',
    '약제부': '약제과',
    '방사선과': '방사선실',
    '진료과': '진료부',
  };

  // 직원이 실제 서명했는지 확인 (이름 공백 무시 & 부서 유연 매칭)
  const isEmployeeSigned = (emp) => {
    const empName = (emp.name || '').replace(/\s+/g, '');
    const empDept = (emp.department || '').trim();
    return allSignatures.some((sig) => {
      const sigName = (sig.name || '').replace(/\s+/g, '');
      if (sigName !== empName) return false;
      const sigDept = (sig.department || '').trim();
      if (!sigDept || !empDept) return true;
      if (sigDept === empDept) return true;
      if (sigDept.includes(empDept) || empDept.includes(sigDept)) return true;
      const alias = DEPT_ALIASES[empDept];
      if (alias && (sigDept.includes(alias) || alias.includes(sigDept))) return true;
      return false;
    });
  };

  // 부서 필터가 적용된 대상 직원 목록
  const targetEmployees = selectedDeptFilter === '전체'
    ? employees
    : employees.filter((e) => e.department === selectedDeptFilter);

  const attendedEmployees = targetEmployees.filter(isEmployeeSigned);
  const nonAttendees = targetEmployees.filter((emp) => !isEmployeeSigned(emp));

  const totalTargetCount = targetEmployees.length > 0 ? targetEmployees.length : allSignatures.length;
  const attendanceRate = totalTargetCount > 0 ? Math.min(Math.round((attendedEmployees.length / totalTargetCount) * 100), 100) : 0;

  // 부서별 이수율 통계 (전체 대상자 기준)
  const deptList = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const deptStats = deptList.map((dept) => {
    const total = employees.filter((e) => e.department === dept).length;
    const signed = employees.filter((e) => e.department === dept && isEmployeeSigned(e)).length;
    const rate = total > 0 ? Math.round((signed / total) * 100) : 0;
    return { dept, total, signed, rate };
  }).sort((a, b) => a.rate - b.rate || b.total - a.total);

  // 미이수자 공지 텍스트 1-클릭 복사
  const handleCopyNotice = () => {
    const grouped = {};
    nonAttendees.forEach((emp) => {
      const d = emp.department || '기타';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(`${emp.name}(${emp.job || emp.position || '직원'})`);
    });

    let text = `[네이처요양병원] 교육 미이수자 명단 안내\n`;
    text += `• 교육명: ${selectedTraining?.name || '재직자 교육'}\n`;
    text += `• 기준: ${selectedTraining?.datetime ? `${selectedTraining.datetime} 기준 재직자` : '전 직원'}\n`;
    text += `• 미서명 인원: 총 ${nonAttendees.length}명 / 대상 ${totalTargetCount}명 (현재 이수율: ${attendanceRate}%)\n\n`;
    for (const [dept, names] of Object.entries(grouped)) {
      text += `▪ ${dept} (${names.length}명): ${names.join(', ')}\n`;
    }
    text += `\n* 아직 서명하지 않으신 직원분들께서는 원내 서명 링크에서 서명을 완료해 주시기 바랍니다.`;

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // 검색 엔터 또는 실행
  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  // 서명부 GDoc 생성
  const handleGenerateDoc = async () => {
    if (!selectedTrainingId) return;
    setDocGenerating(true);
    try {
      const res = await fetch('/api/signature/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId: selectedTrainingId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('교육참석 서명부 문서가 성공적으로 생성되었습니다!');
        loadData();
      } else {
        alert(data.error || '생성 실패');
      }
    } catch (err) {
      alert('네트워크 통신 오류');
    } finally {
      setDocGenerating(false);
    }
  };

  // QR 코드 보기
  const handleShowQr = async () => {
    if (!selectedTraining) return;
    const host = window.location.host;
    const proto = window.location.protocol;
    const url = `${proto}//${host}/?trainingId=${selectedTraining.id}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    setQrModal({
      name: selectedTraining.name,
      url,
      qrDataUrl,
    });
  };

  // [결재용 통합 PDF] 보고서 + 서명부 원클릭 병합 다운로드
  const handleDownloadMergedPdf = async (rpt) => {
    setMergingPdf(rpt.id || rpt.trainingName);
    try {
      // 1. 교육 목록 중 이름이 일치하는 교육의 서명부 URL 확인
      let tList = trainings;
      if (!tList || tList.length === 0) {
        const tRes = await fetch('/api/archive?type=signatures');
        const tData = await tRes.json();
        if (tData.success && tData.trainings) {
          tList = tData.trainings;
          setTrainings(tList);
        }
      }

      const matchedTraining = (tList || []).find(
        (t) => t.name.trim().toLowerCase() === rpt.trainingName.trim().toLowerCase()
      );

      const res = await fetch('/api/pdf/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDocUrl: rpt.docUrl,
          sigDocUrl: matchedTraining?.signatureDocUrl || null,
          filename: `[통합결재철] ${rpt.trainingName}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'PDF 병합 처리 중 오류가 발생했습니다.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `[통합결재철] ${rpt.trainingName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert(e.message);
    } finally {
      setMergingPdf(null);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* 상단 타이틀 */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', letterSpacing: -0.5 }}>
          교육 문서 및 서명부 통합 조회
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', marginTop: 4 }}>
          교육실시계획서, 교육결과보고서, 교육참석 서명부 문서를 검색하고 열람 및 관리할 수 있습니다.
        </p>
      </div>

      {/* 2대 트랙 분리 탭 네비게이션: [교육 행정 문서] vs [직원 서명 관리] */}
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        borderBottom: '1px solid var(--input-border)',
        paddingBottom: 10,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* 트랙 1: 교육 행정 결재 문서 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#F8FAFC',
          padding: '4px 8px',
          borderRadius: 12,
          border: '1px solid var(--input-border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', padding: '0 4px' }}>
            📁 교육 행정 문서:
          </span>
          <button
            type="button"
            onClick={() => { setActiveTab('plans'); setItems([]); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === 'plans' ? 700 : 500,
              backgroundColor: activeTab === 'plans' ? 'var(--primary)' : '#fff',
              color: activeTab === 'plans' ? '#fff' : 'var(--text-sub)',
              border: activeTab === 'plans' ? 'none' : '1px solid var(--input-border)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <FilePenLine size={15} /> 계획서 목록
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('reports'); setItems([]); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === 'reports' ? 700 : 500,
              backgroundColor: activeTab === 'reports' ? 'var(--primary)' : '#fff',
              color: activeTab === 'reports' ? '#fff' : 'var(--text-sub)',
              border: activeTab === 'reports' ? 'none' : '1px solid var(--input-border)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <FileText size={15} /> 보고서 목록
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, height: 28, backgroundColor: 'var(--input-border)' }} />

        {/* 트랙 2: 직원 서명 및 이수율 관리 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#F0FDF4',
          padding: '4px 8px',
          borderRadius: 12,
          border: '1px solid #BBF7D0',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#166534', padding: '0 4px' }}>
            ✍️ 참석 서명 관리:
          </span>
          <button
            type="button"
            onClick={() => { setActiveTab('signatures'); setItems([]); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === 'signatures' ? 800 : 600,
              backgroundColor: activeTab === 'signatures' ? '#166534' : '#fff',
              color: activeTab === 'signatures' ? '#fff' : '#166534',
              border: activeTab === 'signatures' ? 'none' : '1px solid #86EFAC',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <CheckSquare size={15} /> 교육참석 서명부 & 이수율
          </button>
        </div>
      </div>

      {/* 검색 바 & 서명부 전용 액션 툴바 */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {activeTab === 'signatures' && (
          <div style={{ minWidth: 260, flex: '1 1 260px' }}>
            <select
              value={selectedTrainingId}
              onChange={(e) => setSelectedTrainingId(e.target.value)}
              style={{ fontWeight: 700 }}
            >
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: '2 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="작성자명, 부서명, 교육명 등으로 검색..."
              style={{ paddingLeft: 38 }}
            />
            <Search size={18} color="var(--text-sub)" style={{ position: 'absolute', left: 12, top: 14 }} />
          </div>
          <button type="submit" className="btn-primary" style={{ flexShrink: 0, padding: '0 18px' }}>
            검색
          </button>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '0 14px',
              borderRadius: 10,
              backgroundColor: '#fff',
              border: '1px solid var(--input-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={16} color="var(--text-sub)" className={loading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {/* 서명부 탭일 때: 실시간 이수율(%) 대시보드 & 디테일 현황 바 */}
      {activeTab === 'signatures' && selectedTraining && (
        <div className="card" style={{ padding: '18px 22px', marginBottom: 20, backgroundColor: '#FAFDFB', border: '1px solid #D1FAE5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <TrendingUp size={20} color="var(--primary)" />
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedDeptFilter === '전체' ? '전체 교육 이수율' : `[${selectedDeptFilter}] 이수율`}:{' '}
                  <strong style={{ color: attendanceRate >= 80 ? 'var(--success)' : attendanceRate >= 50 ? '#D97706' : 'var(--primary)', fontSize: 20 }}>
                    {attendanceRate}%
                  </strong>
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: 600 }}>
                  ({attendedEmployees.length}명 서명 완료 / 대상 {totalTargetCount}명)
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>📅 <strong>기준일:</strong> {selectedTraining.datetime || '현재 기준'}</span>
                <span>🎯 <strong>교육대상:</strong> {selectedTraining.target || '전체'}</span>
                <span>👥 <strong>재직 대상자:</strong> 총 {employees.length}명 (부서 {deptList.length}개)</span>
                {allSignatures.length > attendedEmployees.length && (
                  <span style={{ color: '#0369A1' }}>ℹ️ 명부 외 추가 서명자: {allSignatures.length - attendedEmployees.length}명</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setModalTab('nonAttendees');
                  setShowNonAttendeesModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: nonAttendees.length > 0 ? '#FEF2F2' : '#F1F5F9',
                  color: nonAttendees.length > 0 ? 'var(--error)' : 'var(--text-sub)',
                  border: `1px solid ${nonAttendees.length > 0 ? '#FECACA' : 'var(--input-border)'}`,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <UserX size={15} /> 미이수자 확인 ({nonAttendees.length}명)
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalTab('all');
                  setShowNonAttendeesModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <CheckSquare size={15} /> 대상자 명부 전체 ({totalTargetCount}명)
              </button>
            </div>
          </div>

          {/* 프로그레스 바 */}
          <div style={{ width: '100%', height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              width: `${attendanceRate}%`,
              height: '100%',
              backgroundColor: attendanceRate >= 80 ? 'var(--success)' : attendanceRate >= 50 ? '#F59E0B' : 'var(--primary)',
              borderRadius: 5,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* 부서별 실시간 이수율 필터 칩 */}
          {deptStats.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>
                부서별 실시간 이수율 (클릭 시 해당 부서 필터링):
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDeptFilter('전체')}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: selectedDeptFilter === '전체' ? '2px solid var(--primary)' : '1px solid var(--input-border)',
                    backgroundColor: selectedDeptFilter === '전체' ? 'var(--primary)' : '#fff',
                    color: selectedDeptFilter === '전체' ? '#fff' : 'var(--text-main)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  전체 보기 ({employees.length}명)
                </button>
                {deptStats.map((d) => {
                  const isSelected = selectedDeptFilter === d.dept;
                  return (
                    <button
                      key={d.dept}
                      type="button"
                      onClick={() => setSelectedDeptFilter(isSelected ? '전체' : d.dept)}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: isSelected ? '2px solid #0F172A' : '1px solid transparent',
                        backgroundColor: d.rate === 100 ? '#DCFCE7' : d.rate >= 50 ? '#E0F2FE' : '#FEE2E2',
                        color: d.rate === 100 ? '#166534' : d.rate >= 50 ? '#0369A1' : '#991B1B',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {d.dept} {d.signed}/{d.total} ({d.rate}%)
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 서명부 탭일 때 상단 GDoc 발행 & QR 툴바 */}
      {activeTab === 'signatures' && selectedTraining && (
        <div style={{
          backgroundColor: '#F8FAF9',
          border: '1px solid var(--input-border)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>선택된 교육:</span>
            <strong style={{ marginLeft: 6, fontSize: 15, color: 'var(--primary)' }}>{selectedTraining.name}</strong>
            <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-sub)' }}>
              (서명 인원: <strong>{items.length}명</strong>)
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleShowQr}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: '#fff',
                border: '1px solid var(--input-border)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              <QrIcon size={15} /> 참석용 QR코드
            </button>

            <button
              type="button"
              onClick={handleGenerateDoc}
              disabled={docGenerating}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              {docGenerating ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  서명부 문서 생성 중...
                </>
              ) : (
                <>
                  <FileText size={15} />
                  {selectedTraining.signatureDocUrl ? '서명부 문서 최신화' : '서명부 문서 생성'}
                </>
              )}
            </button>

            {selectedTraining.signatureDocUrl && (
              <a
                href={selectedTraining.signatureDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #86EFAC',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#166534',
                }}
              >
                <ExternalLink size={15} /> 생성된 서명부 문서 열람
              </a>
            )}
          </div>
        </div>
      )}

      {/* 목록 테이블 뷰 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-sub)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            <div>데이터를 불러오는 중...</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-sub)' }}>
            <p style={{ fontWeight: 600, fontSize: 16 }}>조회된 데이터가 없습니다.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>검색어를 변경하거나 새 문서를 작성해 주세요.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {activeTab === 'plans' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAF9', borderBottom: '1.5px solid var(--input-border)', color: 'var(--text-sub)', fontSize: 12, fontWeight: 700 }}>
                    <th style={{ padding: '14px 16px' }}>작성일</th>
                    <th style={{ padding: '14px 16px' }}>부서</th>
                    <th style={{ padding: '14px 16px' }}>작성자</th>
                    <th style={{ padding: '14px 16px' }}>교육명</th>
                    <th style={{ padding: '14px 16px' }}>교육일시</th>
                    <th style={{ padding: '14px 16px' }}>예정인원</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>문서 열람</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((plan, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--input-border)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--text-sub)' }}>{plan.createdAt}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{plan.department}</td>
                      <td style={{ padding: '14px 16px' }}>{plan.author} ({plan.position})</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>{plan.trainingName}</td>
                      <td style={{ padding: '14px 16px' }}>{plan.datetime}</td>
                      <td style={{ padding: '14px 16px' }}>{plan.expectedCount}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {plan.docUrl && (
                          <a
                            href={plan.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--primary)',
                              backgroundColor: 'var(--secondary)',
                              padding: '5px 10px',
                              borderRadius: 6,
                            }}
                          >
                            <ExternalLink size={13} /> 문서 열람
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'reports' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAF9', borderBottom: '1.5px solid var(--input-border)', color: 'var(--text-sub)', fontSize: 12, fontWeight: 700 }}>
                    <th style={{ padding: '14px 16px' }}>작성일</th>
                    <th style={{ padding: '14px 16px' }}>부서</th>
                    <th style={{ padding: '14px 16px' }}>작성자</th>
                    <th style={{ padding: '14px 16px' }}>교육명</th>
                    <th style={{ padding: '14px 16px' }}>교육일시</th>
                    <th style={{ padding: '14px 16px' }}>참가인원</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>문서 열람</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((rpt, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--input-border)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--text-sub)' }}>{rpt.createdAt}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{rpt.department}</td>
                      <td style={{ padding: '14px 16px' }}>{rpt.author} ({rpt.position})</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>{rpt.trainingName}</td>
                      <td style={{ padding: '14px 16px' }}>{rpt.datetime}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--success)' }}>{rpt.actualCount}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {rpt.docUrl && (
                            <a
                              href={rpt.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--primary)',
                                backgroundColor: 'var(--secondary)',
                                padding: '5px 10px',
                                borderRadius: 6,
                              }}
                            >
                              <ExternalLink size={13} /> 문서 열람
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadMergedPdf(rpt)}
                            disabled={mergingPdf === (rpt.id || rpt.trainingName)}
                            title="교육결과보고서와 참석서명부를 하나의 결재용 PDF로 병합 다운로드"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#166534',
                              backgroundColor: '#DCFCE7',
                              border: '1px solid #86EFAC',
                              padding: '5px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={13} className={mergingPdf === (rpt.id || rpt.trainingName) ? 'animate-spin' : ''} />
                            {mergingPdf === (rpt.id || rpt.trainingName) ? '병합 중...' : '통합 PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'signatures' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAF9', borderBottom: '1.5px solid var(--input-border)', color: 'var(--text-sub)', fontSize: 12, fontWeight: 700 }}>
                    <th style={{ padding: '14px 16px' }}>연번</th>
                    <th style={{ padding: '14px 16px' }}>부서</th>
                    <th style={{ padding: '14px 16px' }}>직종</th>
                    <th style={{ padding: '14px 16px' }}>성명</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>자필 서명</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sig, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--input-border)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--text-sub)' }}>{idx + 1}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{sig.department}</td>
                      <td style={{ padding: '14px 16px' }}>{sig.job || '-'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{sig.name}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        {sig.imageUrl ? (
                          <button
                            onClick={() => setPreviewImage(sig.imageUrl)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              color: 'var(--primary)',
                              backgroundColor: '#fff',
                              border: '1px solid var(--input-border)',
                              padding: '4px 8px',
                              borderRadius: 6,
                            }}
                          >
                            <Eye size={13} /> 서명 확인
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>서명 완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 서명 이미지 확대 모달 */}
      {previewImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>자필 서명 확인</h3>
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid var(--input-border)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <img
                src={previewImage}
                alt="자필 서명"
                style={{ width: '100%', height: 'auto', maxHeight: 200, objectFit: 'contain' }}
              />
            </div>
            <button
              onClick={() => setPreviewImage(null)}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* QR 모달 */}
      {qrModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 380, textAlign: 'center', padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>교육 참석 QR 코드</h3>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16 }}>{qrModal.name}</div>
            <img
              src={qrModal.qrDataUrl}
              alt="QR코드"
              style={{ width: 220, height: 220, margin: '0 auto 16px', borderRadius: 10, border: '1px solid var(--input-border)' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={qrModal.qrDataUrl}
                download={`[QR] ${qrModal.name}.png`}
                className="btn-primary"
                style={{ flex: 1, fontSize: 13, padding: '10px' }}
              >
                <Download size={14} /> 다운로드
              </a>
              <button
                type="button"
                onClick={() => setQrModal(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  border: '1px solid var(--input-border)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 교육 대상자 및 이수 현황 상세 모달 */}
      {showNonAttendeesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 22 }}>
            {/* 모달 상단 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color="var(--primary)" />
                  교육 대상자 및 이수 현황 상세
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                  {selectedTraining?.name} ({selectedTraining?.datetime ? `${selectedTraining.datetime} 기준` : '전체'})
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNonAttendeesModal(false);
                  setModalSearch('');
                }}
                style={{ color: 'var(--text-sub)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 탭 전환 바 (미이수자 / 이수 완료자 / 전체 대상자) */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, borderBottom: '1px solid var(--input-border)', paddingBottom: 8 }}>
              <button
                type="button"
                onClick={() => setModalTab('nonAttendees')}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: modalTab === 'nonAttendees' ? '#FEE2E2' : '#F1F5F9',
                  color: modalTab === 'nonAttendees' ? '#991B1B' : 'var(--text-sub)',
                  border: modalTab === 'nonAttendees' ? '1px solid #FECACA' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <UserX size={14} /> 미이수자 ({nonAttendees.length}명)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('attended')}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: modalTab === 'attended' ? '#DCFCE7' : '#F1F5F9',
                  color: modalTab === 'attended' ? '#166534' : 'var(--text-sub)',
                  border: modalTab === 'attended' ? '1px solid #BBF7D0' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <UserCheck size={14} /> 이수 완료 ({attendedEmployees.length}명)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('all')}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: modalTab === 'all' ? '#EFF6FF' : '#F1F5F9',
                  color: modalTab === 'all' ? '#1D4ED8' : 'var(--text-sub)',
                  border: modalTab === 'all' ? '1px solid #BFDBFE' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckSquare size={14} /> 전체 명부 ({targetEmployees.length}명)
              </button>
            </div>

            {/* 모달 내 검색 인풋 */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="직원 이름, 부서, 직종 검색..."
                style={{ width: '100%', padding: '8px 12px 8px 34px', fontSize: 13, borderRadius: 8 }}
              />
              <Search size={16} color="var(--text-sub)" style={{ position: 'absolute', left: 10, top: 11 }} />
              {modalSearch && (
                <button
                  type="button"
                  onClick={() => setModalSearch('')}
                  style={{ position: 'absolute', right: 10, top: 8, color: 'var(--text-sub)', fontSize: 12 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* 명단 리스트 본문 */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 탭 1: 미이수자 탭 */}
              {modalTab === 'nonAttendees' && (
                <>
                  {nonAttendees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--success)', fontWeight: 700 }}>
                      🎉 모든 대상 직원이 서명을 완료했습니다! (이수율 100%)
                    </div>
                  ) : (
                    deptList.map((dept) => {
                      let deptNon = nonAttendees.filter((emp) => emp.department === dept);
                      if (modalSearch.trim()) {
                        const q = modalSearch.toLowerCase().trim();
                        deptNon = deptNon.filter(
                          (emp) => emp.name.toLowerCase().includes(q) || (emp.job && emp.job.toLowerCase().includes(q)) || dept.toLowerCase().includes(q)
                        );
                      }
                      if (deptNon.length === 0) return null;
                      return (
                        <div key={dept} style={{ border: '1px solid #FECACA', borderRadius: 8, padding: 12, backgroundColor: '#FFF5F5' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{dept}</span>
                            <span style={{ fontSize: 12, color: 'var(--error)' }}>{deptNon.length}명 미서명</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {deptNon.map((emp, i) => (
                              <span key={i} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, backgroundColor: '#fff', border: '1px solid #FCA5A5', color: 'var(--text-main)' }}>
                                <strong>{emp.name}</strong> <small style={{ color: 'var(--text-sub)' }}>({emp.job || emp.position || '직원'})</small>
                                {emp.status === '교육당시재직(현재퇴사)' && (
                                  <small style={{ color: '#D97706', marginLeft: 4 }}>[퇴사]</small>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* 탭 2: 이수 완료자 탭 */}
              {modalTab === 'attendees' && (
                <>
                  {attendedEmployees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sub)', fontWeight: 600 }}>
                      아직 서명을 완료한 대상 직원이 없습니다.
                    </div>
                  ) : (
                    deptList.map((dept) => {
                      let deptAtt = attendedEmployees.filter((emp) => emp.department === dept);
                      if (modalSearch.trim()) {
                        const q = modalSearch.toLowerCase().trim();
                        deptAtt = deptAtt.filter(
                          (emp) => emp.name.toLowerCase().includes(q) || (emp.job && emp.job.toLowerCase().includes(q)) || dept.toLowerCase().includes(q)
                        );
                      }
                      if (deptAtt.length === 0) return null;
                      return (
                        <div key={dept} style={{ border: '1px solid #BBF7D0', borderRadius: 8, padding: 12, backgroundColor: '#F0FDF4' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{dept}</span>
                            <span style={{ fontSize: 12, color: '#166534' }}>{deptAtt.length}명 완료</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {deptAtt.map((emp, i) => (
                              <span key={i} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, backgroundColor: '#fff', border: '1px solid #86EFAC', color: '#15803D' }}>
                                ✓ <strong>{emp.name}</strong> <small style={{ color: 'var(--text-sub)' }}>({emp.job || emp.position || '직원'})</small>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* 탭 3: 전체 대상 명부 탭 */}
              {modalTab === 'all' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {targetEmployees
                    .filter((emp) => {
                      if (!modalSearch.trim()) return true;
                      const q = modalSearch.toLowerCase().trim();
                      return emp.name.toLowerCase().includes(q) ||
                        emp.department.toLowerCase().includes(q) ||
                        (emp.job && emp.job.toLowerCase().includes(q));
                    })
                    .map((emp, i) => {
                      const signed = isEmployeeSigned(emp);
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid var(--input-border)',
                            backgroundColor: signed ? '#F0FDF4' : '#fff',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', width: 85 }}>
                              {emp.department}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>
                              {emp.name}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                              {emp.job || emp.position || ''}
                            </span>
                            {emp.status === '교육당시재직(현재퇴사)' && (
                              <span style={{ fontSize: 11, color: '#D97706', backgroundColor: '#FEF3C7', padding: '1px 5px', borderRadius: 4 }}>
                                교육당시재직
                              </span>
                            )}
                          </div>
                          <div>
                            {signed ? (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, backgroundColor: '#DCFCE7', color: '#166534' }}>
                                ✓ 이수 완료
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                                미서명
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* 하단 액션 바 */}
            <div style={{ display: 'flex', gap: 10 }}>
              {modalTab === 'nonAttendees' && nonAttendees.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyNotice}
                  className="btn-primary"
                  style={{ flex: 1, padding: '11px', fontSize: 13 }}
                >
                  {copiedNotice ? <Check size={16} /> : <Copy size={16} />}
                  {copiedNotice ? '클립보드에 복사 완료!' : '📋 미이수자 공지 복사 (카톡/사내망용)'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowNonAttendeesModal(false);
                  setModalSearch('');
                }}
                style={{
                  flex: modalTab === 'nonAttendees' && nonAttendees.length > 0 ? '0 0 100px' : '1',
                  padding: '11px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--input-border)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
