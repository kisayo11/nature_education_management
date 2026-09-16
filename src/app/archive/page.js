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
  TrendingUp
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

  // 재직자 목록 & 미이수자 통계 상태
  const [employees, setEmployees] = useState([]);
  const [showNonAttendeesModal, setShowNonAttendeesModal] = useState(false);
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

          // 특정 교육 서명 목록 조회
          if (currentId) {
            const sRes = await fetch(`/api/archive?type=signatures&trainingId=${currentId}&q=${encodeURIComponent(searchQuery)}`);
            const sData = await sRes.json();
            if (sData.success) {
              setItems(sData.items || []);
            }
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

  // 미이수자 계산 (대상자 중 아직 서명하지 않은 직원)
  const nonAttendees = employees.filter((emp) => {
    return !items.some((sig) => {
      const empName = (emp.name || '').replace(/\s+/g, '');
      const sigName = (sig.name || '').replace(/\s+/g, '');
      if (empName !== sigName) return false;
      const empDept = (emp.department || '').trim();
      const sigDept = (sig.department || '').trim();
      if (!empDept || !sigDept) return true;
      return empDept === sigDept || sigDept.includes(empDept) || empDept.includes(sigDept);
    });
  });

  const totalTargetCount = employees.length > 0 ? employees.length : items.length;
  const attendanceRate = totalTargetCount > 0 ? Math.min(Math.round((items.length / totalTargetCount) * 100), 100) : 0;

  // 부서별 이수율 통계
  const deptList = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const deptStats = deptList.map((dept) => {
    const total = employees.filter((e) => e.department === dept).length;
    const signed = items.filter((s) => {
      const sDept = (s.department || '').trim();
      return sDept === dept || sDept.includes(dept) || dept.includes(sDept);
    }).length;
    const rate = total > 0 ? Math.round((signed / total) * 100) : 0;
    return { dept, total, signed, rate };
  }).sort((a, b) => a.rate - b.rate || b.total - a.total);

  // 미이수자 공지 텍스트 1-클릭 복사
  const handleCopyNotice = () => {
    const grouped = {};
    nonAttendees.forEach((emp) => {
      const d = emp.department || '기타';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(`${emp.name}(${emp.job || '직원'})`);
    });

    let text = `[네이처요양병원] 교육 미이수자 명단 안내\n`;
    text += `• 교육명: ${selectedTraining?.name || '재직자 교육'}\n`;
    text += `• 미서명 인원: 총 ${nonAttendees.length}명 / 대상 ${totalTargetCount}명 (현재 이수율: ${attendanceRate}%)\n\n`;
    for (const [dept, names] of Object.entries(grouped)) {
      text += `▪ ${dept} (${names.length}명): ${names.join(', ')}\n`;
    }
    text += `\n* 참석하신 직원분들께서는 서명을 완료해 주시기 바랍니다.`;

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

      {/* 탭 네비게이션 */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--input-border)',
        paddingBottom: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => { setActiveTab('plans'); setItems([]); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: activeTab === 'plans' ? 700 : 500,
            backgroundColor: activeTab === 'plans' ? 'var(--primary)' : '#fff',
            color: activeTab === 'plans' ? '#fff' : 'var(--text-sub)',
            border: activeTab === 'plans' ? 'none' : '1px solid var(--input-border)',
          }}
        >
          <FilePenLine size={16} /> 교육실시계획서 목록
        </button>

        <button
          onClick={() => { setActiveTab('reports'); setItems([]); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: activeTab === 'reports' ? 700 : 500,
            backgroundColor: activeTab === 'reports' ? 'var(--primary)' : '#fff',
            color: activeTab === 'reports' ? '#fff' : 'var(--text-sub)',
            border: activeTab === 'reports' ? 'none' : '1px solid var(--input-border)',
          }}
        >
          <FileText size={16} /> 교육결과보고서 목록
        </button>

        <button
          onClick={() => { setActiveTab('signatures'); setItems([]); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: activeTab === 'signatures' ? 700 : 500,
            backgroundColor: activeTab === 'signatures' ? 'var(--primary)' : '#fff',
            color: activeTab === 'signatures' ? '#fff' : 'var(--text-sub)',
            border: activeTab === 'signatures' ? 'none' : '1px solid var(--input-border)',
          }}
        >
          <CheckSquare size={16} /> 교육참석 서명부
        </button>
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

      {/* 서명부 탭일 때: 실시간 이수율(%) 대시보드 & 미이수자 추출 바 */}
      {activeTab === 'signatures' && selectedTraining && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16, backgroundColor: '#FAFDFB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--primary)" />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
                교육 이수율 현황: <strong style={{ color: attendanceRate >= 80 ? 'var(--success)' : 'var(--primary)', fontSize: 16 }}>{attendanceRate}%</strong>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                ({items.length}명 서명 완료 / 대상 {totalTargetCount}명)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowNonAttendeesModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: nonAttendees.length > 0 ? '#FEF2F2' : '#F1F5F9',
                color: nonAttendees.length > 0 ? 'var(--error)' : 'var(--text-sub)',
                border: `1px solid ${nonAttendees.length > 0 ? '#FECACA' : 'var(--input-border)'}`,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Users size={14} /> 미이수자 확인 ({nonAttendees.length}명)
            </button>
          </div>

          {/* 프로그레스 바 */}
          <div style={{ width: '100%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              width: `${attendanceRate}%`,
              height: '100%',
              backgroundColor: attendanceRate >= 80 ? 'var(--success)' : 'var(--primary)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* 부서별 이수율 미니 칩 */}
          {deptStats.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {deptStats.map((d) => (
                <span
                  key={d.dept}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: d.rate === 100 ? '#DCFCE7' : d.rate >= 70 ? '#E0F2FE' : '#FEE2E2',
                    color: d.rate === 100 ? '#166534' : d.rate >= 70 ? '#0369A1' : '#991B1B',
                    fontWeight: 600,
                  }}
                >
                  {d.dept}: {d.signed}/{d.total} ({d.rate}%)
                </span>
              ))}
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

      {/* 미이수자 명단 모달 */}
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
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} color="var(--error)" />
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>
                  교육 미이수자 명단 ({nonAttendees.length}명)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNonAttendeesModal(false)}
                style={{ color: 'var(--text-sub)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 14 }}>
              아직 {selectedTraining?.name} 서명을 완료하지 않은 직원 목록입니다. 공지 복사를 눌러 부서 메신저나 단톡방에 바로 안내할 수 있습니다.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nonAttendees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--success)', fontWeight: 700 }}>
                  🎉 모든 대상 직원이 서명을 완료했습니다! (이수율 100%)
                </div>
              ) : (
                deptList.map((dept) => {
                  const deptNonAttendees = nonAttendees.filter((emp) => emp.department === dept);
                  if (deptNonAttendees.length === 0) return null;
                  return (
                    <div key={dept} style={{ border: '1px solid var(--input-border)', borderRadius: 8, padding: 12, backgroundColor: '#fff' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{dept}</span>
                        <span style={{ fontSize: 12, color: 'var(--error)' }}>{deptNonAttendees.length}명 미이수</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {deptNonAttendees.map((emp, i) => (
                          <span key={i} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, backgroundColor: '#F1F5F9', color: 'var(--text-main)' }}>
                            {emp.name} <small style={{ color: 'var(--text-sub)' }}>({emp.job || '직원'})</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleCopyNotice}
                className="btn-primary"
                style={{ flex: 1, padding: '11px', fontSize: 13 }}
              >
                {copiedNotice ? <Check size={16} /> : <Copy size={16} />}
                {copiedNotice ? '클립보드에 복사 완료!' : '📋 공지용 텍스트 복사하기'}
              </button>
              <button
                type="button"
                onClick={() => setShowNonAttendeesModal(false)}
                style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid var(--input-border)', fontSize: 13, fontWeight: 600 }}
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
