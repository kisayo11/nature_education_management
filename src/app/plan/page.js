'use client';

import { useState } from 'react';
import { FilePenLine, CheckCircle2, AlertCircle, ExternalLink, Download, RefreshCw } from 'lucide-react';

export default function PlanPage() {
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
    expectedCount: '',
    budget: '',
    hostDept: '',
    instructor: '',
    content: '',
    requests: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '계획서 생성 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* 상단 타이틀 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
          <FilePenLine size={16} /> 교육 양식
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginTop: 4, letterSpacing: -0.5 }}>
          교육 실시 계획서 작성
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', marginTop: 4 }}>
          내용을 작성하고 제출하면 양식이 보관됩니다.
        </p>
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
            <CheckCircle2 size={22} /> 교육실시계획서 생성 완료!
          </div>
          <p style={{ fontSize: 13, color: '#166534', marginTop: 6, marginBottom: 14 }}>
            교육실시계획서가 생성되었으며 [계획서_목록] 시트에 안전하게 기록되었습니다.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={result.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ fontSize: 13, padding: '10px 16px' }}
            >
              <ExternalLink size={15} /> 생성된 계획서 열람
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

      {/* 계획서 양식 폼 */}
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
            교 육 실 시 계 획 서
          </div>
          {/* 결재란 미리보기 표시 */}
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>예정 인원</label>
            <input type="number" name="expectedCount" value={formData.expectedCount} onChange={handleChange} placeholder="예: 80" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 금액 (예산)</label>
            <input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder="예: 0원 또는 강사료 20만원" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>주관 부서</label>
            <input type="text" name="hostDept" value={formData.hostDept} onChange={handleChange} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 강사</label>
            <input type="text" name="instructor" value={formData.instructor} onChange={handleChange} placeholder="예: " />
          </div>
        </div>

        {/* 3. 본문 내용 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              교육 내용 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              name="content"
              rows={5}
              value={formData.content}
              onChange={handleChange}
              placeholder="교육내용을 입력해 주세요."
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              요청 사항 (협조사항)
            </label>
            <textarea
              name="requests"
              rows={3}
              value={formData.requests}
              onChange={handleChange}
              placeholder="부서별 참석 인원 배정 및 사전 준비 사항 등"
            />
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
              계획서 생성 및 스프레드시트 기록 중...
            </>
          ) : (
            '교육실시계획서 생성'
          )}
        </button>
      </form>
    </div>
  );
}
