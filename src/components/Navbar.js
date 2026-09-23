'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import AdminAuthModal from './AdminAuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAdminAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 트랙별 활성화 상태
  const isTrack1 = pathname === '/';
  const isTrack2 = pathname === '/plan' || pathname === '/report' || pathname === '/archive';
  const isTrack3 = pathname === '/certificate' || pathname === '/non-attendees';

  const track2Items = [
    { href: '/plan', label: '계획서 작성', shortLabel: '계획서', icon: FilePenLine },
    { href: '/report', label: '보고서 작성', shortLabel: '보고서', icon: FileText },
    { href: '/archive', label: '문서 조회', shortLabel: '문서조회', icon: Search },
  ];

  const track3Items = [
    { href: '/certificate', label: '신규 수료증', shortLabel: '수료증', icon: Award },
    { href: '/non-attendees', label: '미이수자 관리대장', shortLabel: '미이수자', icon: ClipboardList },
  ];

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 16px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        whiteSpace: 'nowrap',
      }}>
        {/* [좌측] 병원 로고 및 시스템 타이틀 */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="네이처요양병원"
            style={{
              height: 36,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <div style={{ borderLeft: '1.5px solid #E2E8F0', paddingLeft: 8, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary, #2B5A50)', letterSpacing: -0.3 }}>
              교육관리시스템
            </span>
          </div>
        </Link>

        {/* [중앙] 3대 트랙 카테고리 네비게이션 (1열 배치, nowrap 보장) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {/* [트랙 1] 직원 온라인 서명 */}
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
              flexShrink: 0,
            }}
          >
            <CheckSquare size={15} />
            <span>직원 온라인서명</span>
          </Link>

          {/* 트랙 구분선 */}
          <div style={{ width: 1, height: 20, backgroundColor: '#CBD5E1', margin: '0 2px', flexShrink: 0 }} className="nav-divider" />

          {/* [트랙 2] 서류작성 및 조회 (계획서, 보고서, 문서조회) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: '#F8FAFC',
            padding: '3px 4px',
            borderRadius: 8,
            border: isTrack2 ? '1px solid #94A3B8' : '1px solid #E2E8F0',
            flexShrink: 0,
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
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} color={isActive ? 'var(--primary, #2B5A50)' : '#64748B'} />
                  <span className="nav-full-label">{item.label}</span>
                  <span className="nav-short-label">{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>

          {/* 트랙 구분선 */}
          <div style={{ width: 1, height: 20, backgroundColor: '#CBD5E1', margin: '0 2px', flexShrink: 0 }} className="nav-divider" />

          {/* [트랙 3] 서류관리 (신규 수료증, 미이수자 대장 - 보안) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: '#FEF9F5',
            padding: '3px 4px',
            borderRadius: 8,
            border: isTrack3 ? '1px solid #F97316' : '1px solid #FED7AA',
            flexShrink: 0,
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
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} color={isActive ? '#EA580C' : '#9A3412'} />
                  <span className="nav-full-label">{item.label}</span>
                  <span className="nav-short-label">{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* [우측] 관리자 인증 상태 및 로그인 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
      </div>

      {/* 관리자 로그인 모달 */}
      <AdminAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="관리자 계정 인증"
        description="원무과장 관리자 계정으로 로그인합니다."
      />

      <style jsx global>{`
        .nav-short-label {
          display: none;
        }
        @media (max-width: 1080px) {
          .nav-full-label {
            display: none !important;
          }
          .nav-short-label {
            display: inline !important;
          }
        }
        @media (max-width: 768px) {
          .nav-divider {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
