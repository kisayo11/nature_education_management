'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck, CheckSquare, ArrowLeft } from 'lucide-react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import AdminAuthModal from './AdminAuthModal';

export default function AdminGuard({ children, title = '서류관리 보안 구역' }) {
  const { isLoggedIn, isLoaded } = useAdminAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div style={{
        maxWidth: 600,
        margin: '100px auto',
        padding: '30px',
        textAlign: 'center',
        color: '#64748B',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid #E2E8F0',
          borderTopColor: 'var(--primary, #2B5A50)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 14px',
        }} />
        <p style={{ fontSize: 14, fontWeight: 500 }}>보안 인증 상태 확인 중...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{
        maxWidth: 500,
        margin: '60px auto',
        padding: '36px 28px',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        border: '1px solid #FED7AA',
        boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.08), 0 8px 10px -6px rgba(234, 88, 12, 0.04)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          backgroundColor: '#FFF7ED',
          border: '1px solid #FFEDD5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#EA580C',
          margin: '0 auto 18px',
        }}>
          <Lock size={28} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 8, letterSpacing: -0.4 }}>
          {title}
        </h2>

        <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6, marginBottom: 26 }}>
          신규 수료증 및 미이수자 관리대장은 직원의 개인정보가 포함되어 있어 <strong>관리자(원무과장) 계정 인증</strong> 후 이용하실 수 있습니다.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 700,
              color: '#ffffff',
              backgroundColor: 'var(--primary, #2B5A50)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(43, 90, 80, 0.25)',
              transition: 'opacity 0.15s',
            }}
          >
            <ShieldCheck size={18} />
            <span>관리자 계정 인증하기</span>
          </button>

          <Link
            href="/"
            style={{
              width: '100%',
              padding: '11px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxSizing: 'border-box',
            }}
          >
            <CheckSquare size={15} />
            <span>직원 온라인서명 화면으로 이동</span>
          </Link>
        </div>

        <AdminAuthModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="관리자 보안 인증"
          description="원무과장 계정 아이디와 비밀번호를 입력해주세요."
        />
      </div>
    );
  }

  return <>{children}</>;
}
