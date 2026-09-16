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
  QrCode as QrIcon
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

  // 서명부 GDoc 생성 로딩 상태
  const [docGenerating, setDocGenerating] = useState(false);

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
          const sRes = await fetch(`/api/archive?type=signatures&trainingId=${selectedTrainingId}&q=${encodeURIComponent(searchQuery)}`);
          const sData = await sRes.json();
          if (sData.success) {
            setItems(sData.items || []);
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
    </div>
  );
}
