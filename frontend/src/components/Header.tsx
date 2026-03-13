// src/components/Header.tsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'
import { Avatar, OnlineDot } from './ui'

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [drop, setDrop] = useState(false)

  const handleLogout = async () => {
    await authApi.logout()
    logout()
    setDrop(false)
    navigate('/')
  }

  const isGame = location.pathname.startsWith('/room')

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      height: 60,
      background: 'rgba(8,8,8,0.93)',
      backdropFilter: 'blur(22px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{
          width: 30, height: 30, background: 'var(--primary)', borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          boxShadow: '0 0 10px var(--glow)',
        }}>🎭</div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: 20, letterSpacing: 3 }}>
          IMPOSTER<span style={{ color: 'var(--accent)' }}>.</span>UZ
        </span>
      </div>

      {/* Online */}
      {!isGame && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <OnlineDot />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>1,247 online</span>
        </div>
      )}

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDrop(d => !d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                padding: '5px 12px 5px 6px', borderRadius: 6,
                background: drop ? 'var(--surface2)' : 'transparent',
                border: '1px solid ' + (drop ? 'var(--border)' : 'transparent'),
                transition: 'all .15s',
              }}
            >
              <Avatar user={user} size={28} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{user.nickname}</span>
              <span style={{ color: 'var(--muted)', fontSize: 9, transition: 'transform .2s', transform: drop ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>

            {drop && (
              <div className="animate-fade-up" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 176,
                boxShadow: '0 10px 36px rgba(0,0,0,.65)',
              }}>
                {([
                  ['👤', 'Profil', () => { navigate('/profile'); setDrop(false) }],
                  ['🎮', 'O\'yin tarixi', () => setDrop(false)],
                  ['divider'],
                  ['🚪', 'Chiqish', handleLogout, true],
                ] as any[]).map((item, i) =>
                  item[0] === 'divider'
                    ? <div key={i} className="divider" style={{ margin: '4px 0' }} />
                    : (
                      <button key={i} onClick={item[2]} className="btn btn-ghost" style={{
                        width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 6,
                        display: 'flex', gap: 9, alignItems: 'center',
                        color: item[3] ? 'var(--accent)' : 'var(--text)',
                        textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 600,
                      }}>
                        <span>{item[0]}</span>{item[1]}
                      </button>
                    )
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate('/login')}>Kirish</button>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate('/register')}>Ro'yxat</button>
          </div>
        )}
      </div>
    </header>
  )
}
