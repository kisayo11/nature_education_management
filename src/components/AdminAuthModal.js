'use client';

import { useState } from 'react';
import { Lock, ShieldCheck, X, AlertCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/lib/useAdminAuth';

export default function AdminAuthModal({ isOpen, onClose, onSuccess, title, description, canClose = true }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAdminAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        login(data.user);
        if (onSuccess) onSuccess(data.user);
        if (onClose) onClose();
      } else {
        setError(data.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      setError('서버 연결 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        animation: 'fadeInUp 0.2s ease-out',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}>
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B', letterSpacing: -0.3 }}>
                {title || '관리자 보안 인증'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                {description || '개인정보 보호를 위해 담당자 계정 인증이 필요합니다.'}
              </p>
            </div>
          </div>
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {error && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              관리자 아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                color: '#1E293B',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                color: '#1E293B',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: canClose ? 'none' : '1',
                padding: '9px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: 'var(--primary, #2B5A50)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(43, 90, 80, 0.2)',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              <span>{loading ? '인증 중...' : '확인 및 로그인'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
