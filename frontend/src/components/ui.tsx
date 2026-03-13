// src/components/ui.tsx
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'

// ─── Avatar ───────────────────────────────────────────────────────────────────
export const Avatar: React.FC<{ user?: { nickname?: string; avatarUrl?: string } | null; size?: number; style?: React.CSSProperties }> = ({ user, size = 36, style }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, ...style }}>
    {user?.avatarUrl
      ? <img src={user.avatarUrl} alt={user.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : <span>{user?.nickname?.[0]?.toUpperCase() ?? '?'}</span>}
  </div>
)

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <div className="spinner" style={{ width: size, height: size }} />
)

// ─── Background Orbs ─────────────────────────────────────────────────────────
export const BgOrbs: React.FC = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    {[
      { w: 450, top: '5%', left: '-12%', delay: '0s' },
      { w: 320, top: '65%', right: '-8%', delay: '3.5s' },
      { w: 220, top: '38%', left: '48%', delay: '7s' },
    ].map((o, i) => (
      <div key={i} className="bg-orb" style={{
        width: o.w, height: o.w, top: o.top, left: o.left, right: (o as any).right,
        background: 'radial-gradient(circle, rgba(139,0,0,0.18) 0%, transparent 68%)',
        animation: `orbFloat 9s ease-in-out infinite`,
        animationDelay: o.delay,
      }} />
    ))}
  </div>
)

// ─── Online Dot ───────────────────────────────────────────────────────────────
export const OnlineDot: React.FC<{ color?: string }> = ({ color = '#22c55e' }) => (
  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
)

// ─── Toast system ─────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
const ToastCtx = createContext<(msg: string, type?: Toast['type']) => void>(() => {})

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export const Page: React.FC<{ children: React.ReactNode; center?: boolean; maxWidth?: number }> = ({ children, center, maxWidth = 1100 }) => (
  <div style={{
    minHeight: '100vh',
    paddingTop: 60,
    position: 'relative',
    display: center ? 'flex' : undefined,
    alignItems: center ? 'center' : undefined,
    justifyContent: center ? 'center' : undefined,
  }}>
    <BgOrbs />
    <div style={{ position: 'relative', zIndex: 1, maxWidth, margin: '0 auto', padding: '0 20px', width: '100%' }}>
      {children}
    </div>
  </div>
)

// ─── Loading page ─────────────────────────────────────────────────────────────
export const LoadingPage: React.FC<{ text?: string }> = ({ text = 'Yuklanmoqda...' }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
    <Spinner size={32} />
    <p style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{text}</p>
  </div>
)

// ─── Countdown timer ─────────────────────────────────────────────────────────
export const Countdown: React.FC<{ endsAt: string | null; danger?: number; style?: React.CSSProperties }> = ({ endsAt, danger = 30, style }) => {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!endsAt) return
    const upd = () => setSecs(Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)))
    upd()
    const t = setInterval(upd, 1000)
    return () => clearInterval(t)
  }, [endsAt])
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const isDanger = secs <= danger && secs > 0
  return (
    <span style={{
      fontFamily: 'var(--font-d)', fontSize: 'inherit',
      color: isDanger ? 'var(--accent)' : undefined,
      animation: isDanger ? 'timerPulse 1s ease-in-out infinite' : undefined,
      ...style,
    }}>{mm}:{ss}</span>
  )
}
