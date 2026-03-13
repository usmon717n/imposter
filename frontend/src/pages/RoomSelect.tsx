// src/pages/RoomSelect.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { roomsApi } from '../services/api'
import { useAuthStore } from '../store'
import { Page, BgOrbs } from '../components/ui'
import { useToast } from '../components/ui'

export default function RoomSelect() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu')
  const [duration, setDuration] = useState<5 | 10 | 15>(10)
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    try {
      const room = await roomsApi.create({ durationMinutes: duration, maxPlayers })
      navigate(`/room/${room.roomCode}`)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (joinCode.length < 6) { toast('6 ta belgili kodni kiriting', 'error'); return }
    setLoading(true)
    try {
      const room = await roomsApi.join(joinCode.toUpperCase())
      navigate(`/room/${room.roomCode}`)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, position: 'relative' }}>
      <BgOrbs />
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '40px 20px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 60, animation: 'float 2.5s ease-in-out infinite', marginBottom: 14 }}>🎭</div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 48, letterSpacing: 8, textShadow: '0 0 36px var(--glow)' }}>IMPOSTER</h1>
          <p style={{ color: 'var(--muted2)', fontSize: 14, marginTop: 8 }}>Minimal 3 kishi · Maksimal 10 kishi</p>
        </div>

        {view === 'menu' && (
          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Create */}
            <button onClick={() => setView('create')} style={{
              background: 'var(--primary)', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 'var(--radius-lg)', padding: '20px 24px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
              transition: 'all .25s', boxShadow: '0 0 18px var(--glow2)',
              textAlign: 'left',
            }}
              onMouseEnter={e => { (e.currentTarget as any).style.transform = 'translateY(-3px)'; (e.currentTarget as any).style.boxShadow = '0 8px 30px var(--glow)' }}
              onMouseLeave={e => { (e.currentTarget as any).style.transform = 'none'; (e.currentTarget as any).style.boxShadow = '0 0 18px var(--glow2)' }}
            >
              <span style={{ fontSize: 30 }}>🏠</span>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, letterSpacing: 3, color: '#fff' }}>XONA YARATISH</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>Sozlamalarni belgilab do'stlaringizni taklif qiling</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 20, color: 'rgba(255,255,255,.5)' }}>→</span>
            </button>

            {/* Join */}
            <button onClick={() => setView('join')} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '20px 24px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
              transition: 'all .25s', textAlign: 'left',
            }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'var(--primary)'; (e.currentTarget as any).style.boxShadow = '0 0 14px var(--glow2)' }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border)'; (e.currentTarget as any).style.boxShadow = 'none' }}
            >
              <span style={{ fontSize: 30 }}>🚪</span>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, letterSpacing: 3 }}>XONAGA KIRISH</div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 3 }}>Kod orqali mavjud xonaga qo'shiling</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--muted)' }}>→</span>
            </button>

            {/* Rules */}
            <div className="card" style={{ marginTop: 8 }}>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 16, letterSpacing: 3, marginBottom: 14, color: 'var(--muted2)' }}>QOIDALAR</h3>
              {[
                ['1', 'Xona yarating va do\'stlaringizni taklif qiling'],
                ['2', 'Hamma so\'z oladi — bitta kishi boshqa so\'z (Imposter)'],
                ['3', 'Chat orqali navbatma-navbat yozing — Imposterni toping'],
                ['4', 'Ovoz berish orqali Imposterni chiqarib yuboring'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(139,0,0,.2)', border: '1px solid rgba(139,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', flexShrink: 0 }}>{n}</div>
                  <p style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.55, paddingTop: 2 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="card animate-fade-up">
            <button className="btn btn-ghost" style={{ marginBottom: 20, padding: '6px 0', fontSize: 12 }} onClick={() => setView('menu')}>← Orqaga</button>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 24, letterSpacing: 4, marginBottom: 22 }}>XONA SOZLAMALARI</h2>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 12, letterSpacing: .5 }}>O'YIN DAVOMIYLIGI</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {([5, 10, 15] as const).map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{
                    flex: 1, padding: '12px 0', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${duration === d ? 'var(--primary)' : 'var(--border)'}`,
                    background: duration === d ? 'rgba(139,0,0,.1)' : 'var(--surface2)',
                    color: duration === d ? 'var(--accent)' : 'var(--muted2)',
                    fontFamily: 'var(--font-d)', fontSize: 18, letterSpacing: 2,
                    boxShadow: duration === d ? '0 0 10px var(--glow2)' : 'none',
                    transition: 'all .18s',
                  }}>{d} <span style={{ fontSize: 11 }}>daq</span></button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 26 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 10, letterSpacing: .5 }}>
                MAKSIMAL O'YINCHILAR: <span style={{ color: 'var(--accent)' }}>{maxPlayers}</span>
              </label>
              <input type="range" min={3} max={10} value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)}
                style={{ width: '100%', accentColor: 'var(--primary)', height: 3, cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
                <span>3 MIN</span><span>10 MAX</span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={handleCreate} disabled={loading}>
              {loading ? 'Yaratilmoqda...' : 'XONA YARATISH →'}
            </button>
          </div>
        )}

        {view === 'join' && (
          <div className="card animate-fade-up">
            <button className="btn btn-ghost" style={{ marginBottom: 20, padding: '6px 0', fontSize: 12 }} onClick={() => setView('menu')}>← Orqaga</button>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 24, letterSpacing: 4, marginBottom: 8 }}>XONAGA KIRISH</h2>
            <p style={{ color: 'var(--muted2)', fontSize: 13, marginBottom: 22 }}>6 ta belgidan iborat xona kodini kiriting</p>
            <input
              className="input"
              placeholder="A B C 1 2 3"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              style={{ textAlign: 'center', letterSpacing: 14, fontSize: 24, fontFamily: 'var(--font-d)', marginBottom: 18 }}
              autoFocus
            />
            <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={handleJoin} disabled={loading || joinCode.length < 6}>
              {loading ? 'Kirilmoqda...' : 'KIRISH →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
