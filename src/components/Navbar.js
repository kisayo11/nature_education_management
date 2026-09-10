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
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* 네이처요양병원 공식 로고 */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo.png"
            alt="네이처요양병원"
            style={{
              height: 40,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <div style={{ borderLeft: '1.5px solid var(--input-border)', paddingLeft: 10, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', letterSpacing: -0.3 }}>교육관리시스템</span>
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
