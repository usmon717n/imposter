// src/pages/Home.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { Page } from '../components/ui'

const GAMES = [
  { id: 'imposter', name: 'IMPOSTER', desc: 'So\'z orqali Imposterni top', players: 847, live: true, emoji: '🔴' },
  { id: 'ox',       name: 'OX',       desc: 'Tez fikrli reaktsiya o\'yini', players: 0, live: false, emoji: '⭕' },
  { id: 'alias',    name: 'ALIAS',    desc: 'So\'z izohlash o\'yini', players: 0, live: false, emoji: '💬' },
  { id: 'taboo',    name: 'TABOO',    desc: 'Taqiqlangan so\'zlar', players: 0, live: false, emoji: '🚫' },
]

const STATS = [
  { label: "JAMI O'YINLAR", value: '48,291' },
  { label: "BUGUN O'YINDI", value: '3,847' },
  { label: "O'YINCHILAR", value: '12,500+' },
  { label: 'REKORD', value: '2,341 online' },
]

export default function Home() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [spotlight, setSpotlight] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setSpotlight(i => (i + 1) % GAMES.length), 3200)
    return () => clearInterval(t)
  }, [])

  const handlePlay = (game: typeof GAMES[0]) => {
    if (!game.live) return
    if (!user) { navigate('/login'); return }
    navigate('/room')
  }

  return (
    <Page>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 0 60px' }}>
        <div className="animate-fade-up" style={{ marginBottom: 18 }}>
          <span className="badge badge-red" style={{ fontSize: 10, padding: '3px 10px' }}>
            🔴 LIVE — 1,247 O'YINCHI ONLAYN
          </span>
        </div>
        <h1 className="animate-fade-up" style={{
          fontFamily: 'var(--font-d)',
          fontSize: 'clamp(56px, 9vw, 110px)',
          letterSpacing: 6,
          lineHeight: .92,
          animationDelay: '.1s',
          textShadow: '0 0 60px rgba(139,0,0,.28)',
        }}>
          O'YIN<br />
          <span style={{ color: 'var(--accent)', textShadow: '0 0 40px var(--glow)' }}>PLATFORMASI</span>
        </h1>
        <p className="animate-fade-up" style={{ color: 'var(--muted2)', fontSize: 15, marginTop: 20, letterSpacing: 1, animationDelay: '.25s' }}>
          Do'stlaringiz bilan onlayn o'ynang · Imposter kim ekanini toping
        </p>
      </div>

      {/* Games grid */}
      <section style={{ marginBottom: 70 }}>
        <h2 style={{
          fontFamily: 'var(--font-d)', fontSize: 28, letterSpacing: 5,
          color: 'var(--muted2)', textAlign: 'center', marginBottom: 30,
        }}>O'YINLAR</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 18 }}>
          {GAMES.map((g, i) => {
            const active = spotlight === i
            const hover = hovered === i
            return (
              <div
                key={g.id}
                className="animate-card-in"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handlePlay(g)}
                style={{
                  animationDelay: `${.08 + i * .09}s`,
                  background: hover && g.live ? 'rgba(139,0,0,.07)' : 'var(--surface)',
                  border: `1px solid ${active && g.live ? 'var(--primary)' : hover && g.live ? 'rgba(139,0,0,.35)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 26,
                  cursor: g.live ? 'pointer' : 'default',
                  transition: 'all .28s',
                  transform: hover && g.live ? 'translateY(-4px)' : 'none',
                  boxShadow: active && g.live ? '0 0 28px var(--glow2), inset 0 0 1px var(--primary)' : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {active && g.live && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--accent),transparent)', animation: 'glow 2s ease-in-out infinite' }} />
                )}
                <div style={{ fontSize: 34, marginBottom: 14 }}>{g.emoji}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                  <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 24, letterSpacing: 3 }}>{g.name}</h3>
                  <span className={`badge ${g.live ? 'badge-green' : 'badge-gray'}`}>{g.live ? 'LIVE' : 'SOON'}</span>
                </div>
                <p style={{ color: 'var(--muted2)', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>{g.desc}</p>
                {g.live ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{g.players.toLocaleString()} o'yinchi</span>
                    <button className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 11 }} onClick={e => { e.stopPropagation(); handlePlay(g) }}>
                      O'YNASH →
                    </button>
                  </div>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', opacity: .5 }}>Tez kunda...</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Stats */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        margin: '0 -20px',
        padding: '28px 20px',
        display: 'flex', justifyContent: 'center', gap: 'clamp(28px,5vw,72px)', flexWrap: 'wrap',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 30, color: 'var(--accent)', letterSpacing: 2 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Page>
  )
}
