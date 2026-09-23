'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import {
  Award,
  Search,
  RefreshCw,
  UserPlus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  Layers,
  Sparkles,
  Users,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function CertificatePage() {
  const { isLoggedIn } = useAdminAuth();
  const [list, setList] = useState([]);
  const [stats, setStats] = useState({ total: 0, complete: 0, partial: 0, pending: 0 });
  const [unsyncedList, setUnsyncedList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 필터 및 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | complete

  // 선택된 항목 (rowIndex 기준)
  const [selectedRows, setSelectedRows] = useState([]);

  // 데이터 로드
  const fetchList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/certificate/list');
      const json = await res.json();
      if (json.success) {
        setList(json.data || []);
        setStats(json.stats || { total: 0, complete: 0, partial: 0, pending: 0 });
        setUnsyncedList(json.unsyncedList || []);
      } else {
        alert('데이터 로드 실패: ' + json.error);
      }
    } catch (err) {
      console.error(err);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchList();
    }
  }, [isLoggedIn]);

  // 재직자 명부에서 신규 입사자 동기화
  const handleSyncRoster = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/certificate/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        await fetchList();
      } else {
        alert('동기화 실패: ' + json.error);
      }
    } catch (err) {
      alert('동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 선택 또는 단건 발급 실행
  const handleGenerate = async (targetItems) => {
    if (!targetItems || targetItems.length === 0) {
      alert('발급할 대상자를 선택해 주세요.');
      return;
    }

    const confirmMsg = targetItems.length === 1
      ? `[${targetItems[0].name}] 님의 2종 수료증(산업안전 8h, 배치전 15h)을 발급하시겠습니까?`
      : `선택한 ${targetItems.length}명의 신규입사자 수료증(1인당 2종)을 고속 일괄 발급하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    setIsGenerating(true);
    setProgressMsg(`총 ${targetItems.length}명 수료증 생성 및 구글 드라이브 업로드 중...`);

    try {
      const res = await fetch('/api/certificate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetItems }),
      });
      const json = await res.json();

      if (json.success) {
        alert(json.message);
        setSelectedRows([]);
        await fetchList();
      } else {
        alert('발급 실패: ' + json.error);
      }
    } catch (err) {
      console.error(err);
      alert('발급 중 통신 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  // 필터링된 목록
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      // 1. 검색어 필터
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.birth.toLowerCase().includes(query) ||
        item.joinDate.toLowerCase().includes(query);

      // 2. 상태 필터
      let matchStatus = true;
      if (statusFilter === 'pending') {
        matchStatus = item.status === 'pending' || item.status === 'partial';
      } else if (statusFilter === 'complete') {
        matchStatus = item.status === 'complete';
      }

      return matchQuery && matchStatus;
    });
  }, [list, searchQuery, statusFilter]);

  // 체크박스 선택 토글
  const toggleSelectRow = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((r) => r !== rowIndex) : [...prev, rowIndex]
    );
  };

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedRows.length === filteredList.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredList.map((item) => item.rowIndex));
    }
  };

  return (
    <AdminGuard title="신규 수료증 발급 및 관리">
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* 헤더 타이틀 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'var(--secondary)',
              color: 'var(--primary)',
            }}>
              <Award size={20} />
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
              신규입사자 수료증 발급 시스템
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)' }}>
            산업안전보건교육(8시간) 및 요양병원 배치전교육(15시간) 2종 수료증을 고속으로 자동 생성하고 구글 드라이브에 안전하게 보관합니다.
          </p>
        </div>

        {/* 최상단 액션 버튼 그룹 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={fetchList}
            disabled={isLoading || isGenerating || isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              backgroundColor: '#fff',
              border: '1px solid var(--input-border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>새로고침</span>
          </button>

          <button
            onClick={handleSyncRoster}
            disabled={isLoading || isGenerating || isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              backgroundColor: unsyncedList.length > 0 ? '#EBF8FF' : '#fff',
              border: unsyncedList.length > 0 ? '1.5px solid #3182CE' : '1px solid var(--input-border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              color: unsyncedList.length > 0 ? '#2B6CB0' : 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: unsyncedList.length > 0 ? '0 2px 6px rgba(49, 130, 206, 0.2)' : 'none',
            }}
          >
            <UserPlus size={15} color={unsyncedList.length > 0 ? '#2B6CB0' : 'var(--text-sub)'} />
            <span>재직자 명부에서 신규자 가져오기</span>
            {unsyncedList.length > 0 && (
              <span style={{
                backgroundColor: '#E53E3E',
                color: '#fff',
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 12,
                fontWeight: 800,
              }}>
                +{unsyncedList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 요약 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ backgroundColor: '#fff', padding: '16px 18px', borderRadius: 12, border: '1px solid var(--input-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 600, marginBottom: 4 }}>등록된 총 입사자</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{stats.total}명</div>
          </div>
          <Users size={32} color="var(--primary-light)" style={{ opacity: 0.8 }} />
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px 18px', borderRadius: 12, border: '1px solid var(--input-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 600, marginBottom: 4 }}>2종 전원 발급 완료</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#38A169' }}>{stats.complete}명</div>
          </div>
          <CheckCircle2 size={32} color="#38A169" style={{ opacity: 0.8 }} />
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px 18px', borderRadius: 12, border: '1px solid var(--input-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 600, marginBottom: 4 }}>발급 대기 (미발행)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stats.pending > 0 ? '#DD6B20' : 'var(--text-sub)' }}>{stats.pending}명</div>
          </div>
          <AlertCircle size={32} color={stats.pending > 0 ? '#DD6B20' : 'var(--text-sub)'} style={{ opacity: 0.8 }} />
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px 18px', borderRadius: 12, border: '1px solid var(--input-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 600, marginBottom: 4 }}>발급 대기 신규직원</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: unsyncedList.length > 0 ? '#3182CE' : 'var(--text-sub)' }}>
              {unsyncedList.length > 0 ? `${unsyncedList.length}명 대기` : '동기화 완료'}
            </div>
          </div>
          <UserPlus size={32} color={unsyncedList.length > 0 ? '#3182CE' : 'var(--text-sub)'} style={{ opacity: 0.8 }} />
        </div>
      </div>

      {/* 미동기화 신규 입사자 알림 배너 */}
      {unsyncedList.length > 0 && (
        <div style={{
          backgroundColor: '#EBF8FF',
          border: '1px solid #BEE3F8',
          borderRadius: 10,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#3182CE" />
            <span style={{ fontSize: 13, color: '#2B6CB0', fontWeight: 600 }}>
              <strong>직원명부(재직자)</strong>에 새로 추가된 신규 입사자가 <strong>{unsyncedList.length}명</strong> 있습니다: ({unsyncedList.map(u => u.name).join(', ')})
            </span>
          </div>
          <button
            onClick={handleSyncRoster}
            disabled={isSyncing}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3182CE',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isSyncing ? '가져오는 중...' : '지금 목록에 추가하기'}
          </button>
        </div>
      )}

      {/* 필터 및 일괄 발급 컨트롤 바 */}
      <div style={{
        backgroundColor: '#fff',
        padding: '14px 18px',
        borderRadius: 12,
        border: '1px solid var(--input-border)',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {/* 좌측: 검색 & 탭 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-sub)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="이름, 입사일, 생년월일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 12px 7px 32px',
                border: '1px solid var(--input-border)',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                width: 210,
              }}
            />
          </div>

          <div style={{ display: 'flex', backgroundColor: 'var(--secondary)', padding: 3, borderRadius: 8 }}>
            {[
              { id: 'all', label: '전체' },
              { id: 'pending', label: '미발행만' },
              { id: 'complete', label: '발급완료' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  backgroundColor: statusFilter === tab.id ? '#fff' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--primary)' : 'var(--text-sub)',
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 우측: 일괄 발급 버튼 */}
        <div>
          <button
            onClick={() => {
              const targets = list.filter((item) => selectedRows.includes(item.rowIndex));
              handleGenerate(targets);
            }}
            disabled={selectedRows.length === 0 || isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              backgroundColor: selectedRows.length > 0 ? 'var(--primary)' : '#EDF2F7',
              color: selectedRows.length > 0 ? '#fff' : '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: selectedRows.length > 0 ? '0 2px 8px rgba(43, 90, 80, 0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Award size={16} />
            <span>선택 대상자 수료증 일괄 발급 ({selectedRows.length}명)</span>
          </button>
        </div>
      </div>

      {/* 발급 진행 중 오버레이 모달 */}
      {isGenerating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '28px 36px',
            borderRadius: 16,
            textAlign: 'center',
            maxWidth: 420,
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}>
            <Award size={48} color="var(--primary)" style={{ animation: 'bounce 1s infinite', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
              수료증 PDF 초고속 생성 중...
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16 }}>
              {progressMsg || 'Pretendard 폰트 합성 및 구글 드라이브 업로드를 진행하고 있습니다.'}
            </p>
            <div style={{
              width: '100%',
              height: 8,
              backgroundColor: 'var(--secondary)',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                width: '60%',
                height: '100%',
                backgroundColor: 'var(--primary)',
                animation: 'loadingSlide 1.5s infinite ease-in-out',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* 메인 명단 테이블 */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid var(--input-border)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAF9', borderBottom: '1px solid var(--input-border)', color: 'var(--text-sub)', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px', width: 44, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedRows.length === filteredList.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </th>
                <th style={{ padding: '12px 10px', width: 50, textAlign: 'center' }}>번호</th>
                <th style={{ padding: '12px 14px', width: 90 }}>이름</th>
                <th style={{ padding: '12px 14px', width: 110 }}>입사일</th>
                <th style={{ padding: '12px 14px', width: 140 }}>생년월일</th>
                <th style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🛡️ 산업안전보건교육 (8h)</span>
                  </div>
                </th>
                <th style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏥 요양병원 배치전교육 (15h)</span>
                  </div>
                </th>
                <th style={{ padding: '12px 14px', width: 110, textAlign: 'center' }}>발급 관리</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 60, textAlign: 'center', color: 'var(--text-sub)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                    신규입사자 명단을 불러오고 있습니다...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 60, textAlign: 'center', color: 'var(--text-sub)' }}>
                    조회된 입사자 명단이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedRows.includes(item.rowIndex);
                  const isComplete = item.status === 'complete';

                  return (
                    <tr
                      key={item.rowIndex}
                      style={{
                        borderBottom: '1px solid var(--input-border)',
                        backgroundColor: isSelected ? '#F0FDF4' : '#fff',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* 선택 체크박스 */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.rowIndex)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>

                      {/* 번호 */}
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 600 }}>
                        {item.no}
                      </td>

                      {/* 이름 */}
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {item.name}
                      </td>

                      {/* 입사일 */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-sub)' }}>
                        {item.joinDate}
                      </td>

                      {/* 생년월일 */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-sub)' }}>
                        {item.birth}
                      </td>

                      {/* 산업안전보건교육 상태 */}
                      <td style={{ padding: '12px 16px' }}>
                        {item.safetyDone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#276749', backgroundColor: '#C6F6D5', padding: '3px 7px', borderRadius: 4, fontWeight: 700 }}>
                              {item.safetyCertNo.split(' ')[1] || '발급완료'}
                            </span>
                            <a
                              href={item.safetyPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: 12,
                                textDecoration: 'none',
                              }}
                            >
                              <span>PDF 보기</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#C53030', backgroundColor: '#FED7D7', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                            미발행 ⚠️
                          </span>
                        )}
                      </td>

                      {/* 배치전교육 상태 */}
                      <td style={{ padding: '12px 16px' }}>
                        {item.onboardDone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#276749', backgroundColor: '#C6F6D5', padding: '3px 7px', borderRadius: 4, fontWeight: 700 }}>
                              {item.onboardCertNo.split(' ')[1] || '발급완료'}
                            </span>
                            <a
                              href={item.onboardPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: 12,
                                textDecoration: 'none',
                              }}
                            >
                              <span>PDF 보기</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#C53030', backgroundColor: '#FED7D7', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                            미발행 ⚠️
                          </span>
                        )}
                      </td>

                      {/* 단건 발급 액션 */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleGenerate([item])}
                          disabled={isGenerating}
                          style={{
                            padding: '6px 12px',
                            border: isComplete ? '1px solid var(--input-border)' : '1px solid var(--primary)',
                            borderRadius: 6,
                            backgroundColor: isComplete ? '#fff' : 'var(--secondary)',
                            color: isComplete ? 'var(--text-sub)' : 'var(--primary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isComplete ? '재발급' : '즉시발급'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes loadingSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </AdminGuard>
  );
}