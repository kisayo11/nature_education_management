'use client';

import { useState } from 'react';
import { FileText, CheckCircle2, AlertCircle, ExternalLink, Download, RefreshCw, Upload, Image as ImageIcon, FilePenLine, X, Search, ChevronRight } from 'lucide-react';

export default function ReportPage() {
  const [formData, setFormData] = useState({
    department: '',
    position: '',
    author: '',
    createdAt: new Date().toISOString().split('T')[0],
    trainingName: '',
    location: '',
    datetime: '',
    duration: '',
    category: '',
    target: '',
    actualCount: '',
    budget: '',
    hostDept: '',
    instructor: '',
    content: '',
    evaluation: '',
  });

  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 계획서 불러오기 상태
  const [plans, setPlans] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planSearch, setPlanSearch] = useState('');

  // 통합 PDF 병합 로딩 상태
  const [mergingPdf, setMergingPdf] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 사진 업로드 핸들러
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result);
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoBase64(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photoBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '보고서 생성 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 계획서 모달 열기 및 데이터 조회
  const handleOpenPlanModal = async () => {
    setShowPlanModal(true);
    setLoadingPlans(true);
    try {
      const res = await fetch('/api/archive?type=plans');
      const data = await res.json();
      if (data.success && data.items) {
        setPlans(data.items);
      }
    } catch (e) {
      console.error('계획서 로드 실패:', e);
    } finally {
      setLoadingPlans(false);
    }
  };

  // 계획서 선택 시 폼에 1-클릭 자동 입력
  const handleSelectPlan = (plan) => {
    setFormData((prev) => ({
      ...prev,
      trainingName: plan.trainingName || prev.trainingName,
      location: plan.location || prev.location,
      datetime: plan.datetime || prev.datetime,
      duration: plan.duration || prev.duration,
      category: plan.category || prev.category,
      target: plan.target || prev.target,
      budget: plan.budget || prev.budget,
      hostDept: plan.hostDept || prev.hostDept,
      instructor: plan.instructor || prev.instructor,
      content: plan.content || prev.content,
      department: plan.department || prev.department,
      position: plan.position || prev.position,
      author: plan.author || prev.author,
    }));
    setShowPlanModal(false);
  };

  // 검색 필터링된 계획서 목록
  const filteredPlans = plans.filter((p) => {
    if (!planSearch.trim()) return true;
    const q = planSearch.toLowerCase();
    return (
      (p.trainingName || '').toLowerCase().includes(q) ||
      (p.author || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  // [결재용 통합 PDF] 보고서 + 서명부 병합 다운로드
  const handleDownloadCombinedPdf = async () => {
    if (!result?.docUrl) return;
    setMergingPdf(true);
    try {
      // 해당 교육명으로 서명부 문서 URL 조회
      const tRes = await fetch('/api/trainings');
      const tData = await tRes.json();
      const matched = (tData.trainings || []).find(
        (t) => t.name.trim().toLowerCase() === formData.trainingName.trim().toLowerCase()
      );

      const res = await fetch('/api/pdf/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDocUrl: result.docUrl,
          sigDocUrl: matched?.signatureDocUrl || null,
          filename: `[통합결재철] ${formData.trainingName}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || '통합 PDF 병합 중 오류가 발생했습니다.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `[통합결재철] ${formData.trainingName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert(e.message);
    } finally {
      setMergingPdf(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* 상단 타이틀 & 계획서 불러오기 버튼 */}
      <div style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
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
              ※ 참석자 서명부는 [문서 조회]에서 별도 열람 및 통합 PDF 병합이 가능합니다.
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginTop: 4, letterSpacing: -0.5 }}>
            교육 결과 보고서 작성
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', marginTop: 4 }}>
            실시된 교육 결과를 정리하고 평가 인증 제출용 Google Docs 문서를 자동 발행합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenPlanModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            borderRadius: 10,
            backgroundColor: 'var(--secondary)',
            color: 'var(--primary)',
            fontSize: 13,
            fontWeight: 700,
            border: '1.5px solid var(--primary-light)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <FilePenLine size={16} /> 📋 기존 계획서 불러오기
        </button>
      </div>

      {/* 성공 모달/알림 */}
      {result && (
        <div className="card" style={{
          marginBottom: 24,
          backgroundColor: '#F0FDF4',
          borderColor: '#86EFAC',
          borderWidth: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', fontWeight: 800, fontSize: 16 }}>
            <CheckCircle2 size={22} /> 교육 결과 보고서 생성 완료!
          </div>
          <p style={{ fontSize: 13, color: '#166534', marginTop: 6, marginBottom: 14 }}>
            교육결과보고서가 생성되었으며 [보고서_목록] 시트에 안전하게 기록되었습니다.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={result.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ fontSize: 13, padding: '10px 16px' }}
            >
              <ExternalLink size={15} /> 생성된 결과보고서 열람
            </a>
            <a
              href={result.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 10,
                backgroundColor: '#fff',
                border: '1px solid #86EFAC',
                color: '#166534',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Download size={15} /> PDF로 다운로드
            </a>
            <button
              type="button"
              onClick={handleDownloadCombinedPdf}
              disabled={mergingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 10,
                backgroundColor: '#DCFCE7',
                border: '1.5px solid #166534',
                color: '#166534',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={15} className={mergingPdf ? 'animate-spin' : ''} />
              {mergingPdf ? '통합 PDF 생성 중...' : '📑 결재용 [보고서+서명부] 통합 PDF 다운로드'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{
          marginBottom: 24,
          backgroundColor: '#FEF2F2',
          borderColor: '#FCA5A5',
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          fontWeight: 600,
        }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* 보고서 양식 폼 */}
      <form onSubmit={handleSubmit} className="card" style={{ padding: '30px 24px' }}>
        {/* 상단 양식 헤더 & 결재란 안내 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid var(--primary)',
          paddingBottom: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', letterSpacing: 1 }}>
            교 육 결 과 보 고 서
          </div>
          {/* 결재란 미리보기 */}
          <div style={{
            display: 'flex',
            border: '1px solid var(--input-border)',
            borderRadius: 6,
            overflow: 'hidden',
            fontSize: 12,
            textAlign: 'center',
          }}>
            <div style={{ width: 24, backgroundColor: 'var(--secondary)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
              결<br />재
            </div>
            <div style={{ width: 60, borderLeft: '1px solid var(--input-border)' }}>
              <div style={{ backgroundColor: '#F8FAF9', padding: '4px 0', borderBottom: '1px solid var(--input-border)', fontSize: 11 }}>담당자</div>
              <div style={{ height: 36 }}></div>
            </div>
            <div style={{ width: 60, borderLeft: '1px solid var(--input-border)' }}>
              <div style={{ backgroundColor: '#F8FAF9', padding: '4px 0', borderBottom: '1px solid var(--input-border)', fontSize: 11 }}>부서장</div>
              <div style={{ height: 36 }}></div>
            </div>
            <div style={{ width: 60, borderLeft: '1px solid var(--input-border)' }}>
              <div style={{ backgroundColor: '#F8FAF9', padding: '4px 0', borderBottom: '1px solid var(--input-border)', fontSize: 11 }}>병원장</div>
              <div style={{ height: 36 }}></div>
            </div>
          </div>
        </div>

        {/* 1. 기안자 정보 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 24,
          backgroundColor: '#F8FAF9',
          padding: 16,
          borderRadius: 10,
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 4 }}>부서</label>
            <input type="text" name="department" value={formData.department} onChange={handleChange} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 4 }}>직위</label>
            <input type="text" name="position" value={formData.position} onChange={handleChange} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 4 }}>작성일</label>
            <input type="date" name="createdAt" value={formData.createdAt} onChange={handleChange} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 4 }}>작성자</label>
            <input type="text" name="author" value={formData.author} onChange={handleChange} required />
          </div>
        </div>

        {/* 2. 교육 개요 테이블 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              교육명 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              name="trainingName"
              value={formData.trainingName}
              onChange={handleChange}
              placeholder="예: 2026년 상반기 감염관리 예방교육"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 장소</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 일시</label>
            <input type="date" name="datetime" value={formData.datetime} onChange={handleChange} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 시간</label>
            <input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="예: 1시간" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              교육 구분 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              name="category"
              list="category-options"
              value={formData.category}
              onChange={handleChange}
              placeholder="교육 구분을 직접 입력하거나 선택하세요"
              required
            />
            <datalist id="category-options">
              <option value="법정의무교육" />
              <option value="직무필수교육" />
              <option value="직무역량교육" />
              <option value="인증필수교육" />
              <option value="감염관리교육" />
              <option value="소방안전교육" />
              <option value="개인정보보호교육" />
              <option value="환자안전교육" />
              <option value="외부위탁교육" />
            </datalist>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 대상</label>
            <input type="text" name="target" value={formData.target} onChange={handleChange} placeholder="예: 전 직원, 간호과 등" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              실제 참가 인원 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input type="number" name="actualCount" value={formData.actualCount} onChange={handleChange} placeholder="예: 76" required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 금액 (집행액)</label>
            <input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder="예: 0원 또는 200,000원" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>주관 부서</label>
            <input type="text" name="hostDept" value={formData.hostDept} onChange={handleChange} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 강사</label>
            <input type="text" name="instructor" value={formData.instructor} onChange={handleChange} placeholder="" />
          </div>
        </div>

        {/* 3. 본문 내용 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            교육 내용 및 결과 요약 <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <textarea
            name="content"
            rows={5}
            value={formData.content}
            onChange={handleChange}
            placeholder="실시된 교육 내용 및 진행 사항을 작성해 주세요."
            required
          />
        </div>

        {/* 4. 총평 및 개선의견 (선택 사항 - 인증평가 PDCA 대비) */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>
                총평 및 개선의견
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                원하는 교육 유형을 클릭하면 맞춤 문구가 자동 입력됩니다.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 680 }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 4주기 의료기관 인증 기준에 따른 22개 필수 영역(환자안전문화, 감염·다제내성균, 화재소방, 환자권리, 질향상 등) 전반에 걸쳐 원내 규정과 현장 실무 지침 교육을 전 직원 대상으로 체계적으로 완료함.\n[개선의견] 온라인 이수에 머무르지 않고 낙상·신체보호대 관리, 손위생 수행률, 화재 대피 동선 등 핵심 지표가 임상 현장에서 실질적으로 준수되는지 부서별 자체 모니터링을 상시화하고 미비점은 지속 개선하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#F4ECF7',
                  color: '#8E44AD',
                  border: '1px solid #D2B4DE',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ★ 4주기 인증필수(22개)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 전 직원의 기본 법령 준수 의식 및 직장 내 상호존중 문화를 제고함.\n[개선의견] 미이수자(휴직·교대근무자) 대상 추가 보수교육을 독려하여 이수율 100%를 달성하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#EBF5FB',
                  color: '#2980B9',
                  border: '1px solid #AED6F1',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 법정교육
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 원내 유해요인 인지 및 부서별 안전보건 작업수칙 숙지 상태는 양호함.\n[개선의견] 환자 이송 및 조리·시설 작업 시 보호구 착용 상태를 불시 점검하고 근골격계 부담 작업을 현장 지도하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#FBEEE6',
                  color: '#D35400',
                  border: '1px solid #EDBB99',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 산업안전보건
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 정확한 환자확인 절차 및 낙상·욕창 고위험군 관리 지침을 숙지함.\n[개선의견] 야간 취약시간대 병동 라운딩을 강화하고 침상 난간 체결 등 낙상 예방활동 지표를 지속 모니터링하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#E8F8F5',
                  color: '#16A085',
                  border: '1px solid #A3E4D7',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 환자안전
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 표준주의 지침 및 손위생, 격리환자 관리 기본 수칙 숙지 상태를 확인함.\n[개선의견] 분기별 손위생 수행률 모니터링을 지속하고 격리병실 보호구 비치 및 환경소독 상태를 불시 점검하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#EAFAF1',
                  color: '#27AE60',
                  border: '1px solid #A9DFBF',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 감염관리
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 흉부압박 기본 수기 및 자동심장충격기(AED) 사용법 실습을 원활히 마침.\n[개선의견] 최초 발견자의 신속한 코드블루 전파 및 병동별 응급카트 물품 완비 상태를 주기적으로 재확인하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#FDEDEC',
                  color: '#C0392B',
                  border: '1px solid #FADBD8',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 심폐소생술(CPR)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  evaluation: '[총평] 소화설비 작동법 및 자위소방대 편성 임무(초기진화/통보/피난)를 확인함.\n[개선의견] 거동불가 환자 특성을 반영하여 병동별 피난유도 동선을 재정비하고 방화문 물품 적치를 상시 단속하겠음.'
                }))}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#FEF9E7',
                  color: '#B7950B',
                  border: '1px solid #F9E79F',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 소방교육
              </button>
            </div>
          </div>
          <textarea
            name="evaluation"
            rows={4}
            value={formData.evaluation}
            onChange={handleChange}
            placeholder="교육 총평 및 개선/환류 조치 계획을 자유롭게 입력하거나 상단의 교육별 추천 버튼을 클릭하세요."
          />
        </div>

        {/* 5. 현장 사진 첨부 (옵션) */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            교육 현장 사진 (선택 사항)
          </label>
          <div style={{
            border: '2px dashed var(--input-border)',
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
            backgroundColor: '#F8FAF9',
          }}>
            {photoPreview ? (
              <div>
                <img
                  src={photoPreview}
                  alt="교육 현장 사진 미리보기"
                  style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, objectFit: 'contain', marginBottom: 12 }}
                />
                <div>
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={{
                      fontSize: 12,
                      color: 'var(--error)',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--error)',
                    }}
                  >
                    사진 삭제하기
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <ImageIcon size={36} color="var(--text-sub)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>교육 진행 사진 등록</div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 14 }}>
                  JPG, PNG 이미지를 첨부하시면 구글 드라이브에 안전하게 보관됩니다.
                </div>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 8,
                  backgroundColor: '#fff',
                  border: '1.5px solid var(--primary)',
                  color: 'var(--primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  <Upload size={14} /> 파일 선택
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '15px', fontSize: 16 }}
        >
          {loading ? (
            <>
              <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
              보고서 생성 및 드라이브 저장 중...
            </>
          ) : (
            '교육결과보고서 생성하기'
          )}
        </button>
      </form>

      {/* 기존 계획서 불러오기 모달 */}
      {showPlanModal && (
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
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FilePenLine size={18} color="var(--primary)" />
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>기존 교육계획서 불러오기</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                style={{ color: 'var(--text-sub)', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
              보고서를 작성할 계획서를 선택하면 일시, 장소, 강사, 교육내용 등이 폼에 자동으로 채워집니다.
            </p>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="교육명, 작성자, 구분으로 검색..."
                style={{ padding: '10px 10px 10px 36px', fontSize: 13 }}
              />
              <Search size={16} color="var(--text-sub)" style={{ position: 'absolute', left: 12, top: 12 }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {loadingPlans ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sub)' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <div>계획서 목록을 불러오는 중...</div>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-sub)', fontSize: 13 }}>
                  작성된 계획서가 없거나 검색 결과가 없습니다.
                </div>
              ) : (
                filteredPlans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPlan(p)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--input-border)',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--secondary)', padding: '2px 6px', borderRadius: 4 }}>
                          {p.category || '교육'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                          {p.department} · {p.author}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                        {p.trainingName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                        일시: {p.datetime || '상시'} | 강사: {p.instructor || '-'}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--primary)" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
