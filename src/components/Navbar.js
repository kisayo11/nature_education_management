'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePenLine, FileText, CheckSquare, Search } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '참석 서명', icon: CheckSquare },
    { href: '/plan', label: '계획서 작성', icon: FilePenLine },
    { href: '/report', label: '보고서 작성', icon: FileText },
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
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* 로고 */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 16
          }}>
            N
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)', letterSpacing: -0.5 }}>네이처요양병원</div>
            <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: -2 }}>교육관리시스템 2026</div>
          </div>
        </Link>

        {/* 네비게이션 메뉴 */}
        <nav style={{ display: 'flex', gap: 6 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-sub)',
                  backgroundColor: isActive ? 'var(--secondary)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={16} color={isActive ? 'var(--primary)' : 'var(--text-sub)'} />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <style jsx global>{`
        @media (max-width: 600px) {
          .nav-label {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
