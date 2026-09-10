'use client';

import { useState } from 'react';
import { FileText, CheckCircle2, AlertCircle, ExternalLink, Download, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

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
  });

  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* 상단 타이틀 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
          <FileText size={16} /> 교육양식
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginTop: 4, letterSpacing: -0.5 }}>
          교육결과보고서작성
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', marginTop: 4 }}>
          교육 실시 후 결과를 생성합니다.
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
            <CheckCircle2 size={22} /> 교육결과보고서 생성 완료!
          </div>
          <p style={{ fontSize: 13, color: '#166534', marginTop: 6, marginBottom: 14 }}>
            구글 문서가 생성되었으며 [보고서_목록] 시트에 안전하게 기록되었습니다.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={result.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ fontSize: 13, padding: '10px 16px' }}
            >
              <ExternalLink size={15} /> 생성된 구글 문서 바로보기
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>교육 구분</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              <option value="법정의무교육">법정의무교육</option>
              <option value="원내자체교육">직무필수교육</option>
              <option value="직무역량교육">직무역량교육</option>
              <option value="인증필수교육">인증필수교육</option>
              <option value="외부위탁교육">외부위탁교육</option>
            </select>
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
            rows={6}
            value={formData.content}
            onChange={handleChange}
            placeholder="실시된 교육 내용을 작성해 주세요."
            required
          />
        </div>

        {/* 4. 현장 사진 첨부 (옵션) */}
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
              구글 문서 생성 및 드라이브 저장 중...
            </>
          ) : (
            '교육결과보고서 생성하기 (GDoc 자동발행)'
          )}
        </button>
      </form>
    </div>
  );
}
