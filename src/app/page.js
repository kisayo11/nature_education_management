'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SignaturePad from 'signature_pad';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Send,
  QrCode as QrIcon,
  FileText,
  ExternalLink,
  Download,
  Printer
} from 'lucide-react';

function SignatureContent() {
  const searchParams = useSearchParams();
  const initialTrainingId = searchParams.get('trainingId');

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState(null);

  // 폼 입력 상태
  const [department, setDepartment] = useState('');
  const [name, setName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [filteredNames, setFilteredNames] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 알림 토스트
  const [toast, setToast] = useState(null);

  // 신규 교육 생성 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrainingName, setNewTrainingName] = useState('');
  const [newTrainingDate, setNewTrainingDate] = useState('');
  const [newTrainingTarget, setNewTrainingTarget] = useState('전체');
  const [createdQr, setCreatedQr] = useState(null); // 방금 생성된 QR 정보

  // QR 코드 보기 모달
  const [viewQrModal, setViewQrModal] = useState(null);

  // 서명부 GDoc 생성 상태 (진행 중인 trainingId 저장)
  const [docGenerating, setDocGenerating] = useState(null);
  const [generatedDoc, setGeneratedDoc] = useState(null);

  // 서명 캔버스
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);

  // 1. 진행 중인 교육 목록 불러오기
  const loadTrainings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trainings');
      const data = await res.json();
      if (data.success) {
        setTrainings(data.trainings);
        // URL 파라미터로 trainingId가 전달된 경우 자동 선택
        if (initialTrainingId) {
          const match = data.trainings.find((t) => t.id === initialTrainingId);
          if (match) {
            setSelectedTraining(match);
          }
        }
      }
    } catch (err) {
      showToast('교육 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
  }, [initialTrainingId]);

  // 2. 교육 선택 시 재직자 목록 로드
  useEffect(() => {
    if (!selectedTraining) return;

    const fetchEmpData = async () => {
      try {
        const res = await fetch(`/api/employees?date=${encodeURIComponent(selectedTraining.datetime)}&dept=${encodeURIComponent(selectedTraining.target || '전체')}`);
        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error('재직자 로드 실패:', err);
      }
    };

    fetchEmpData();

    setTimeout(() => {
      initCanvas();
    }, 100);
  }, [selectedTraining]);

  // 부서 목록 도출
  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  // 부서 변경 시 이름 필터링
  useEffect(() => {
    if (!department) {
      setFilteredNames(employees.map((e) => e.name));
    } else {
      setFilteredNames(employees.filter((e) => e.department === department).map((e) => e.name));
    }
  }, [department, employees]);

  // 중복 서명 검사
  useEffect(() => {
    if (!selectedTraining || !name.trim()) {
      setIsDuplicate(false);
      return;
    }

    const checkDuplicate = async () => {
      try {
        const res = await fetch(`/api/signature?trainingId=${selectedTraining.id}`);
        const data = await res.json();
        if (data.success) {
          const dup = data.signatures.some(
            (s) => s.name.trim() === name.trim() && (!department || s.department.trim() === department.trim())
          );
          setIsDuplicate(dup);
        }
      } catch (e) {
        // 무시
      }
    };

    const timer = setTimeout(checkDuplicate, 300);
    return () => clearTimeout(timer);
  }, [name, department, selectedTraining]);

  // 서명 캔버스 초기화
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d').scale(ratio, ratio);

    if (!sigPadRef.current) {
      sigPadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(26, 29, 28)',
        minWidth: 1.5,
        maxWidth: 3.5,
      });
    } else {
      sigPadRef.current.clear();
    }
  };

  const clearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 서명 제출
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('이름을 입력해주세요.', 'error');
      return;
    }
    if (!department) {
      showToast('소속 부서를 선택해주세요.', 'error');
      return;
    }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      showToast('서명 칸에 직접 서명해 주세요.', 'error');
      return;
    }
    if (isDuplicate) {
      showToast('이미 서명을 완료하셨습니다.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const signatureBase64 = sigPadRef.current.toDataURL('image/png');
      const emp = employees.find((e) => e.name === name.trim() && e.department === department);

      const res = await fetch('/api/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: selectedTraining.id,
          trainingName: selectedTraining.name,
          department,
          job: emp?.job || '',
          name: name.trim(),
          signatureBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('서명이 안전하게 저장되었습니다!', 'success');
        setName('');
        clearSignature();
        setTimeout(() => {
          setSelectedTraining(null);
        }, 1800);
      } else {
        showToast(data.error || '저장 실패', 'error');
      }
    } catch (err) {
      showToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 새 교육 등록 및 QR 생성
  const handleCreateTraining = async (e) => {
    e.preventDefault();
    if (!newTrainingName.trim()) return;

    try {
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTrainingName,
          datetime: newTrainingDate || new Date().toISOString().split('T')[0],
          target: newTrainingTarget || '전체',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('새 교육 및 QR 코드가 생성되었습니다!');
        setCreatedQr({
          trainingName: newTrainingName,
          qrDataUrl: data.qrDataUrl,
          signatureUrl: data.signatureUrl,
        });
        setNewTrainingName('');
        setNewTrainingDate('');
        loadTrainings();
      } else {
        showToast(data.error || '개설 실패', 'error');
      }
    } catch (e) {
      showToast('교육 개설 오류', 'error');
    }
  };

  // 교육별 QR코드 보기 모달 띄우기
  const handleShowQr = async (training) => {
    const host = window.location.host;
    const proto = window.location.protocol;
    const url = `${proto}//${host}/?trainingId=${training.id}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    setViewQrModal({
      name: training.name,
      url,
      qrDataUrl,
    });
  };

  // 서명부 GDoc 생성 및 최신화
  const handleGenerateDoc = async (trainingId) => {
    setDocGenerating(trainingId);
    setGeneratedDoc(null);
    try {
      const res = await fetch('/api/signature/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`서명부 문서가 최신화되었습니다! (${data.attendanceCount ?? 0}명 참석)`);
        setGeneratedDoc(data);
        loadTrainings(); // 시트 URL 업데이트 반영
      } else {
        showToast(data.error || '서명부 생성 실패', 'error');
      }
    } catch (err) {
      showToast('네트워크 오류', 'error');
    } finally {
      setDocGenerating(null);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '16px 16px 60px' }}>
      {/* 알림 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 75,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? '#FFF5F5' : '#F0FDF4',
          border: `1.5px solid ${toast.type === 'error' ? 'var(--error)' : 'var(--success)'}`,
          color: toast.type === 'error' ? 'var(--error)' : 'var(--success)',
          padding: '13px 22px',
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          zIndex: 9999,
          fontSize: 14,
          fontWeight: 600,
          width: 'max-content',
          maxWidth: 'min(90vw, 420px)',
          boxSizing: 'border-box',
          wordBreak: 'keep-all',
          lineHeight: 1.45,
        }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <span style={{ flex: 1, lineHeight: 1.45, letterSpacing: -0.2 }}>
            {toast.message}
          </span>
        </div>
      )}

      {!selectedTraining ? (
        /* --- 뷰 1: 교육 선택 목록 --- */
        <div>
          {/* 상단 배너 */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
            borderRadius: 20,
            padding: '24px 20px',
            color: '#fff',
            marginBottom: 20,
            boxShadow: '0 8px 20px rgba(43, 90, 80, 0.2)',
          }}>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>네이처요양병원 재직자 교육</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>참석 서명하기</h1>
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
              참석하신 교육 과정을 선택하시면 바로 전자 서명이 진행됩니다.
            </p>
          </div>

          {/* 목록 헤더 & 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-sub)' }}>
              진행 중인 교육 ({trainings.length})
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={loadTrainings}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--text-sub)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  backgroundColor: '#fff',
                  border: '1px solid var(--input-border)',
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> 새로고침
              </button>
              <button
                onClick={() => { setShowAddModal(true); setCreatedQr(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#fff',
                  backgroundColor: 'var(--primary)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                <Plus size={14} /> 교육 개설
              </button>
            </div>
          </div>

          {/* 교육 카드 목록 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-sub)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              <div>진행 중인 교육 과정을 불러오는 중...</div>
            </div>
          ) : trainings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)' }}>
              <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>현재 활성화된 교육이 없습니다.</p>
              <p style={{ fontSize: 13 }}>우측 상단의 [+ 교육 개설] 버튼을 눌러 새 교육을 시작하세요.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {trainings.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px 18px',
                    gap: 12,
                  }}
                >
                  <div
                    onClick={() => setSelectedTraining(t)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--primary)',
                        backgroundColor: 'var(--secondary)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        marginBottom: 6,
                      }}>
                        {t.target ? `대상: ${t.target}` : '전체 대상'}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', letterSpacing: -0.3 }}>
                        {t.name}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>
                        일시: {t.datetime || '상시 진행'}
                      </div>
                    </div>
                    <ChevronRight size={20} color="var(--primary)" />
                  </div>

                  {/* 하단 유틸 버튼 바: QR코드 보기 & 서명부 GDoc */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                    borderTop: '1px dashed var(--input-border)',
                    paddingTop: 10,
                  }}>
                    <button
                      type="button"
                      onClick={() => handleShowQr(t)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--primary)',
                        backgroundColor: 'var(--secondary)',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      <QrIcon size={13} /> QR코드
                    </button>

                    {t.signatureDocUrl ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <a
                          href={t.signatureDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#166534',
                            backgroundColor: '#DCFCE7',
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          <FileText size={13} /> 서명부 열람
                        </a>
                        <button
                          type="button"
                          onClick={() => handleGenerateDoc(t.id)}
                          disabled={Boolean(docGenerating)}
                          title="새로 들어온 서명을 반영하여 서명부 문서 최신화"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--primary)',
                            backgroundColor: 'var(--secondary)',
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          <RefreshCw size={12} className={docGenerating === t.id ? 'animate-spin' : ''} />
                          {docGenerating === t.id ? '최신화 중...' : '최신화'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGenerateDoc(t.id)}
                        disabled={Boolean(docGenerating)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-sub)',
                          backgroundColor: '#F1F5F9',
                          padding: '4px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {docGenerating === t.id ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" /> 생성 중...
                          </>
                        ) : (
                          <>
                            <FileText size={13} /> 서명부 생성
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* --- 뷰 2: 서명 입력 화면 --- */
        <div>
          <button
            onClick={() => setSelectedTraining(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-sub)',
              marginBottom: 16,
            }}
          >
            <ArrowLeft size={18} /> 교육 목록으로 돌아가기
          </button>

          <div className="card" style={{ padding: '24px 20px' }}>
            <div style={{
              backgroundColor: 'var(--secondary)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>참석 교육명</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{selectedTraining.name}</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 소속 부서 선택 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  소속 부서 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setName('');
                  }}
                  required
                >
                  <option value="">부서를 선택해주세요</option>
                  {departments.length > 0 ? (
                    departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  ) : (
                    <>
                      <option value="간호과">간호과</option>
                      <option value="원무과">원무과</option>
                      <option value="재활치료센터">재활치료센터</option>
                      <option value="영양팀">영양팀</option>
                      <option value="약제과">약제과</option>
                      <option value="진료부">진료부</option>
                      <option value="행정부">행정부</option>
                      <option value="헤모필리아센터">헤모필리아센터</option>
                    </>
                  )}
                </select>
              </div>

              {/* 성명 입력 & 자동완성 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  성명 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  list="name-suggestions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하거나 선택하세요"
                  required
                />
                <datalist id="name-suggestions">
                  {filteredNames.map((n, idx) => (
                    <option key={idx} value={n} />
                  ))}
                </datalist>

                {/* 중복 서명 경고 */}
                {isDuplicate && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: 'var(--error)',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <AlertCircle size={15} />
                    {name}님은 이미 본 교육에 서명을 완료하셨습니다.
                  </div>
                )}
              </div>

              {/* 서명 캔버스 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    자필 서명 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--text-sub)',
                    }}
                  >
                    <RotateCcw size={13} /> 다시 쓰기
                  </button>
                </div>

                <div style={{
                  border: '1.5px solid var(--input-border)',
                  borderRadius: 10,
                  backgroundColor: '#fff',
                  height: 180,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', touchAction: 'none' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 12,
                    fontSize: 11,
                    color: '#94A3B8',
                    pointerEvents: 'none',
                  }}>
                    네모 칸 안에 정자로 서명해 주세요
                  </div>
                </div>
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={submitting || isDuplicate}
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                onPointerDown={() => {
                  if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                  }
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    안전하게 저장하는 중...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    서명 제출하기
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 새 교육 개설 모달 */}
      {showAddModal && (
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
          zIndex: 1000,
          padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>새 교육 과정 개설</h2>

            {createdQr ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                  🎉 교육 개설 및 QR 생성 완료!
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 14 }}>
                  직원들이 스마트폰 카메라로 아래 QR을 찍으면 바로 서명 페이지로 접속됩니다.
                </div>
                <img
                  src={createdQr.qrDataUrl}
                  alt="교육 참석 QR코드"
                  style={{ width: 220, height: 220, borderRadius: 12, border: '1px solid var(--input-border)', margin: '0 auto 14px' }}
                />
                <div style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--primary)', marginBottom: 16, padding: '8px', backgroundColor: 'var(--secondary)', borderRadius: 8 }}>
                  {createdQr.signatureUrl}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={createdQr.qrDataUrl}
                    download={`[QR코드] ${createdQr.trainingName}.png`}
                    className="btn-primary"
                    style={{ flex: 1, fontSize: 13, padding: '10px' }}
                  >
                    <Download size={14} /> QR 이미지 저장
                  </a>
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setCreatedQr(null); }}
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
            ) : (
              <form onSubmit={handleCreateTraining} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>교육 명칭 *</label>
                  <input
                    type="text"
                    value={newTrainingName}
                    onChange={(e) => setNewTrainingName(e.target.value)}
                    placeholder="예: 2026년 상반기 감염관리 교육"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>교육 일시</label>
                  <input
                    type="date"
                    value={newTrainingDate}
                    onChange={(e) => setNewTrainingDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>참석 대상</label>
                  <input
                    type="text"
                    value={newTrainingTarget}
                    onChange={(e) => setNewTrainingTarget(e.target.value)}
                    placeholder="전체 또는 간호과, 원무과 등"
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 10,
                      border: '1px solid var(--input-border)',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    개설 및 QR 생성
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QR코드 개별 보기 모달 */}
      {viewQrModal && (
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
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16 }}>{viewQrModal.name}</div>
            <img
              src={viewQrModal.qrDataUrl}
              alt="QR코드"
              style={{ width: 220, height: 220, margin: '0 auto 16px', borderRadius: 10, border: '1px solid var(--input-border)' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={viewQrModal.qrDataUrl}
                download={`[QR] ${viewQrModal.name}.png`}
                className="btn-primary"
                style={{ flex: 1, fontSize: 13, padding: '10px' }}
              >
                <Download size={14} /> 다운로드
              </a>
              <button
                type="button"
                onClick={() => setViewQrModal(null)}
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

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function SignaturePage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div>}>
      <SignatureContent />
    </Suspense>
  );
}
