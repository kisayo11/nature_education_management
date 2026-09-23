'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePenLine, FileText, CheckSquare, Search, ClipboardList, Award } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const isSignPage = pathname === '/';
  const isAdminDocPage = pathname === '/plan' || pathname === '/report' || pathname === '/non-attendees' || pathname === '/archive' || pathname === '/certificate';

  const adminItems = [
    { href: '/plan', label: '계획서 작성', icon: FilePenLine },
    { href: '/report', label: '보고서 작성', icon: FileText },
    { href: '/non-attendees', label: '미이수자 관리대장', icon: ClipboardList },
    { href: '/certificate', label: '신규 수료증', icon: Award },
    { href: '/archive', label: '문서 조회', icon: Search },
  ];

  return (
    <header style={{
      backgroundColor: '#fff',
      borderBottom: '1px solid var(--input-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '0 16px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* 네이처요양병원 공식 로고 */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="네이처요양병원"
            style={{
              height: 38,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <div style={{ borderLeft: '1.5px solid var(--input-border)', paddingLeft: 10, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', letterSpacing: -0.3 }}>교육관리시스템</span>
          </div>
        </Link>

        {/* 2대 트랙 분리 네비게이션: [직원 서명] vs [교육 행정 결재] */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* [트랙 1] 직원 전용: 온라인 참석 서명 */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: isSignPage ? 800 : 600,
              color: isSignPage ? '#fff' : 'var(--primary)',
              backgroundColor: isSignPage ? 'var(--primary)' : 'var(--secondary)',
              border: isSignPage ? '1px solid var(--primary)' : '1px solid var(--input-border)',
              transition: 'all 0.2s',
              boxShadow: isSignPage ? '0 2px 6px rgba(43, 90, 80, 0.25)' : 'none',
            }}
          >
            <CheckSquare size={16} />
            <span>✍️ 직원 온라인 서명</span>
          </Link>

          {/* 시각적 구분선 */}
          <div style={{ width: 1, height: 26, backgroundColor: 'var(--input-border)', margin: '0 2px' }} className="nav-divider" />

          {/* [트랙 2] 담당자/행정 전용: 교육 행정 결재 문서 (계획서, 보고서, 보관함) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#F8FAFC',
            padding: '3px 6px',
            borderRadius: 10,
            border: '1px solid var(--input-border)',
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: isAdminDocPage ? 'var(--primary)' : 'var(--text-sub)',
              padding: '0 6px',
              letterSpacing: -0.3,
            }} className="admin-group-label">
              행정결재:
            </span>
            {adminItems.map((item) => {
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
                    padding: '6px 11px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary)' : 'var(--text-sub)',
                    backgroundColor: isActive ? '#fff' : 'transparent',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    border: isActive ? '1px solid var(--input-border)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} color={isActive ? 'var(--primary)' : 'var(--text-sub)'} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .admin-group-label {
            display: none;
          }
        }
        @media (max-width: 600px) {
          .nav-label {
            display: none;
          }
          .nav-divider {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
