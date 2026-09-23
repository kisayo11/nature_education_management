'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  FilePenLine,
  FileText,
  Search,
  Award,
  ClipboardList,
  Lock,
  LogOut,
  UserCheck,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import AdminAuthModal from './AdminAuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAdminAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 페이지 이동 시 모바일 메뉴 자동 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 모바일 메뉴 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // 트랙별 활성화 상태
  const isTrack1 = pathname === '/';
  const isTrack2 = pathname === '/plan' || pathname === '/report' || pathname === '/archive';
  const isTrack3 = pathname === '/certificate' || pathname === '/non-attendees';

  const track2Items = [
    { href: '/plan', label: '계획서 작성', desc: '연간·분기 교육 계획안 수립', icon: FilePenLine },
    { href: '/report', label: '보고서 작성', desc: '실시 결과 및 참석 집계 보고', icon: FileText },
    { href: '/archive', label: '문서 조회', desc: '이전 교육 문서 및 서명부 열람', icon: Search },
  ];

  const track3Items = [
    { href: '/certificate', label: '신규 수료증', desc: '신규입사자 수료증 자동 발급', icon: Award },
    { href: '/non-attendees', label: '미이수자 관리대장', desc: '불참자 사유 및 재교육 대장', icon: ClipboardList },
  ];

  return (
    <>
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 16px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          {/* [좌측] 병원 공식 로고 및 시스템명 */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              textDecoration: 'none',
            }}
          >
            <img
              src="/logo.png"
              alt="네이처요양병원"
              style={{
                height: 34,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{
              borderLeft: '1.5px solid #E2E8F0',
              paddingLeft: 8,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--primary, #2B5A50)',
                letterSpacing: -0.3,
                whiteSpace: 'nowrap',
              }}>
                교육관리시스템
              </span>
            </div>
          </Link>

          {/* ========================================================= */}
          {/* [데스크톱 전용] 3대 트랙 네비게이션 (모바일에서는 완전히 숨김) */}
          {/* ========================================================= */}
          <nav className="desktop-nav" style={{
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}>
            {/* 트랙 1: 직원 온라인서명 */}
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isTrack1 ? 800 : 600,
                color: isTrack1 ? '#ffffff' : 'var(--primary, #2B5A50)',
                backgroundColor: isTrack1 ? 'var(--primary, #2B5A50)' : '#F0FDF4',
                border: isTrack1 ? '1px solid var(--primary, #2B5A50)' : '1px solid #BBF7D0',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                boxShadow: isTrack1 ? '0 2px 6px rgba(43, 90, 80, 0.2)' : 'none',
              }}
            >
              <CheckSquare size={15} />
              <span>직원 온라인서명</span>
            </Link>

            <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 2px' }} />

            {/* 트랙 2: 서류작성 및 조회 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              backgroundColor: '#F8FAFC',
              padding: '3px 4px',
              borderRadius: 8,
              border: isTrack2 ? '1px solid #94A3B8' : '1px solid #E2E8F0',
            }}>
              {track2Items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 9px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--primary, #2B5A50)' : '#475569',
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={14} color={isActive ? 'var(--primary, #2B5A50)' : '#64748B'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 2px' }} />

            {/* 트랙 3: 서류관리 (보안) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              backgroundColor: '#FEF9F5',
              padding: '3px 4px',
              borderRadius: 8,
              border: isTrack3 ? '1px solid #F97316' : '1px solid #FED7AA',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px 0 6px',
                color: '#EA580C',
              }} title="관리자 보안 구역">
                <Lock size={12} />
              </div>
              {track3Items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 9px',
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#C2410C' : '#9A3412',
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      border: isActive ? '1px solid #FDBA74' : '1px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={14} color={isActive ? '#EA580C' : '#9A3412'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* [데스크톱 전용] 관리자 인증 상태 */}
          <div className="desktop-auth" style={{ alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isLoggedIn ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 8,
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#166534' }}>
                  <UserCheck size={14} />
                  <span>{user?.name || '관리자'} 님</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="로그아웃"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 5px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#991B1B',
                    backgroundColor: '#FEE2E2',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <LogOut size={11} />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Lock size={12} color="#64748B" />
                <span>관리자 인증</span>
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* [모바일 전용] 햄버거 메뉴 버튼 & 인증 상태 뱃지 */}
          {/* ========================================================= */}
          <div className="mobile-header-actions" style={{
            alignItems: 'center',
            gap: 8,
          }}>
            {isLoggedIn ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#166534',
              }}>
                <UserCheck size={13} />
                <span>{user?.name || '원무과장'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                }}
              >
                <Lock size={11} />
                <span>인증</span>
              </button>
            )}

            {/* 햄버거 토글 버튼 */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="메뉴 토글"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                backgroundColor: mobileMenuOpen ? 'var(--primary, #2B5A50)' : '#ffffff',
                color: mobileMenuOpen ? '#ffffff' : '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* [모바일 전용] 슬라이드 다운 메뉴 드로어 (전체 화면 최적화) */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 60,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            padding: '20px 16px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            animation: 'slideDown 0.25s ease-out',
          }}>
            {/* 상단 사용자 상태 카드 */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: isLoggedIn ? '#F0FDF4' : '#F8FAFC',
              border: isLoggedIn ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isLoggedIn ? '#DCFCE7' : '#E2E8F0',
                  color: isLoggedIn ? '#15803D' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isLoggedIn ? <UserCheck size={18} /> : <Lock size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                    {isLoggedIn ? (user?.name || '원무과장') + ' 님 로그인됨' : '관리자 미인증 상태'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {isLoggedIn ? '서류관리(수료증/미이수자) 권한 보유' : '서류관리 접근 시 인증이 필요합니다.'}
                  </div>
                </div>
              </div>

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#991B1B',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <LogOut size={12} />
                  <span>로그아웃</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: 'var(--primary, #2B5A50)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  인증하기
                </button>
              )}
            </div>

            {/* [트랙 1] 직원 전용 온라인 서명 */}
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', marginBottom: 8, letterSpacing: -0.2 }}>
                트랙 1 · 직원 전용
              </div>
              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderRadius: 12,
                  backgroundColor: isTrack1 ? 'var(--primary, #2B5A50)' : '#F0FDF4',
                  color: isTrack1 ? '#ffffff' : 'var(--primary, #2B5A50)',
                  border: isTrack1 ? '1px solid var(--primary, #2B5A50)' : '1px solid #BBF7D0',
                  textDecoration: 'none',
                  boxShadow: isTrack1 ? '0 4px 12px rgba(43, 90, 80, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckSquare size={18} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>직원 온라인서명 창구</div>
                    <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>참석한 교육 선택 후 간편 전자 서명</div>
                  </div>
                </div>
                <ChevronRight size={18} opacity={0.7} />
              </Link>
            </div>

            {/* [트랙 2] 서류작성 및 조회 */}
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', marginBottom: 8, letterSpacing: -0.2 }}>
                트랙 2 · 교육 행정 결재 및 조회
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                backgroundColor: '#F8FAFC',
                padding: '8px',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
              }}>
                {track2Items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        backgroundColor: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? 'var(--primary, #2B5A50)' : '#334155',
                        border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                        boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: isActive ? '#ECFDF5' : '#EEF2F6',
                          color: isActive ? 'var(--primary, #2B5A50)' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 600 }}>{item.label}</div>
                          <div style={{ fontSize: 10.5, color: '#64748B' }}>{item.desc}</div>
                        </div>
                      </div>
                      <ChevronRight size={14} color="#94A3B8" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* [트랙 3] 서류관리 (보안) */}
            <div>
              <div style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: '#C2410C',
                marginBottom: 8,
                letterSpacing: -0.2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Lock size={12} />
                <span>트랙 3 · 서류관리 (관리자 보안 구역)</span>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                backgroundColor: '#FEF9F5',
                padding: '8px',
                borderRadius: 12,
                border: '1px solid #FED7AA',
              }}>
                {track3Items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        backgroundColor: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#C2410C' : '#7C2D12',
                        border: isActive ? '1px solid #FDBA74' : '1px solid transparent',
                        boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: isActive ? '#FFF7ED' : '#FFEDD5',
                          color: '#EA580C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Icon size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 600 }}>{item.label}</div>
                          <div style={{ fontSize: 10.5, color: '#9A3412' }}>{item.desc}</div>
                        </div>
                      </div>
                      <ChevronRight size={14} color="#EA580C" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          {/* 외부 터치 시 닫기 */}
          <div style={{ flex: 1 }} onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 관리자 로그인 모달 */}
      <AdminAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="관리자 계정 인증"
        description="원무과장 관리자 계정으로 로그인합니다."
      />

      <style jsx global>{`
        /* 데스크톱 기본 스타일 */
        .desktop-nav {
          display: flex !important;
        }
        .desktop-auth {
          display: flex !important;
        }
        .mobile-header-actions {
          display: none !important;
        }

        /* 모바일 반응형 스타일 (화면 가로폭 960px 미만) */
        @media (max-width: 960px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-auth {
            display: none !important;
          }
          .mobile-header-actions {
            display: flex !important;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
