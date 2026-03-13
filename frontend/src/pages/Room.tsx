// src/pages/Room.tsx
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { roomsApi, Room as RoomType } from '../services/api'
import { socket } from '../services/socket'
import { useAuthStore, useGameStore } from '../store'
import { useGameSocket } from '../hooks/useGame'
import { Page, Avatar, BgOrbs, Spinner, Countdown } from '../components/ui'
import { useToast } from '../components/ui'
import GameChat from './GameChat'

// ─── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ room, onStart, onLeave }: { room: RoomType; onStart: () => void; onLeave: () => void }) {
  const { user } = useAuthStore()
  const game = useGameStore()
  const toast = useToast()
  const [inviteNick, setInviteNick] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)
  const isHost = room.hostId === user?.id
  const players = game.players.length > 0 ? game.players : room.players.map(p => ({ userId: p.userId, nickname: p.nickname, avatarUrl: p.avatarUrl, turnOrder: p.turnOrder }))
  const canStart = players.length >= 3

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInvite = async () => {
    if (!inviteNick.trim()) return
    setInviting(true)
    try {
      await roomsApi.invite(room.id, inviteNick)
      toast(`${inviteNick} ga taklif yuborildi`, 'success')
      setInviteNick('')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setInviting(false) }
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, maxWidth: 680, margin: '0 auto', padding: '80px 20px 40px', position: 'relative', zIndex: 1 }}>
      <BgOrbs />

      <div className="card animate-fade-up" style={{ position: 'relative', zIndex: 1 }}>
        {/* Room code */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, marginBottom: 10 }}>XONA KODI</div>
          <div style={{
            fontFamily: 'var(--font-d)', fontSize: 48, letterSpacing: 14,
            color: 'var(--accent)', textShadow: '0 0 28px var(--glow)',
            background: 'var(--surface2)', padding: '14px 28px', borderRadius: 8,
            border: '1px solid rgba(139,0,0,.3)', display: 'inline-block',
          }}>{room.roomCode}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            <span className="badge badge-gray">{room.durationMinutes} daqiqa</span>
            <span className="badge badge-gray">Maks {room.maxPlayers} kishi</span>
          </div>
        </div>

        {/* Invite row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 8, letterSpacing: .4, fontWeight: 700 }}>🔗 HAVOLA</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 10, wordBreak: 'break-all', lineHeight: 1.5 }}>
              {window.location.origin}/room/{room.roomCode}
            </div>
            <button className="btn btn-outline" style={{ width: '100%', fontSize: 11 }} onClick={copyLink}>
              {copied ? '✓ NUSXA OLINDI' : 'NUSXA OLISH'}
            </button>
          </div>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 8, letterSpacing: .4, fontWeight: 700 }}>👤 NICKNAME ORQALI</div>
            <input className="input" placeholder="Nickname..." value={inviteNick} onChange={e => setInviteNick(e.target.value)} style={{ marginBottom: 8, padding: '7px 10px', fontSize: 12 }} />
            <button className="btn btn-outline" style={{ width: '100%', fontSize: 11 }} onClick={handleInvite} disabled={inviting}>
              {inviting ? <Spinner size={12} /> : 'TAKLIF YUBORISH'}
            </button>
          </div>
        </div>

        {/* Players */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 2, marginBottom: 12 }}>
            O'YINCHILAR ({players.length}/{room.maxPlayers}) {!canStart && `— kamida 3 kerak`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p, i) => (
              <div key={p.userId} className="animate-slide-l" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: 'var(--surface2)', borderRadius: 6,
                border: `1px solid ${p.userId === room.hostId ? 'rgba(139,0,0,.3)' : 'var(--border)'}`,
                animationDelay: `${i * .07}s`,
              }}>
                <Avatar user={p} size={34} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{p.nickname}</span>
                {p.userId === room.hostId && <span className="badge badge-red">HOST</span>}
                {p.userId === user?.id && <span className="badge badge-gray">SIZ</span>}
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, i) => (
              <div key={`e${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 6, border: '1px dashed var(--border)', opacity: .4 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--border)' }} />
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>Kutilmoqda...</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onLeave}>CHIQISH</button>
          {isHost && (
            <button className="btn btn-primary" style={{ flex: 2, padding: '12px 0' }} onClick={onStart} disabled={!canStart}>
              {!canStart ? `KAM O'YINCHI (${players.length}/3)` : "O'YINNI BOSHLASH →"}
            </button>
          )}
          {!isHost && <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: 13 }}>⏳ Host o'yinni boshlashini kuting...</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Word Reveal ──────────────────────────────────────────────────────────────
function WordReveal({ onReady }: { onReady: () => void }) {
  const { myWord, isImposter } = useGameStore()
  const [shown, setShown] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <BgOrbs />
      <div className="animate-fade-up" style={{ textAlign: 'center', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 56, marginBottom: 20, animation: 'float 2.5s ease-in-out infinite' }}>
          {isImposter ? '😈' : '🔵'}
        </div>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 24, letterSpacing: 5, marginBottom: 8, color: 'var(--muted2)' }}>
          {isImposter ? 'SEN IMPOSTERSAN!' : 'SIZNING SO\'ZINGIZ:'}
        </h2>
        {!shown ? (
          <button className="btn btn-outline" style={{ marginTop: 20, padding: '14px 36px', fontSize: 13 }} onClick={() => setShown(true)}>
            SO'ZNI KO'RISH 👁️
          </button>
        ) : (
          <div className="animate-fade-up">
            <div style={{
              fontFamily: 'var(--font-d)', fontSize: 52, letterSpacing: 7,
              color: isImposter ? 'var(--accent)' : 'var(--green)',
              textShadow: `0 0 36px ${isImposter ? 'var(--glow)' : 'rgba(34,197,94,.4)'}`,
              background: 'var(--surface)', padding: '18px 36px',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${isImposter ? 'rgba(139,0,0,.4)' : 'rgba(34,197,94,.25)'}`,
              margin: '18px 0',
            }}>{myWord}</div>
            {isImposter && <p style={{ color: 'var(--muted2)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>Siz Impostersan. Boshqalar har xil so'z oldi.<br />Chalg'itishga harakat qil!</p>}
            <button className="btn btn-primary" style={{ padding: '13px 36px', fontSize: 13 }} onClick={onReady}>
              O'YINGA KIRISH →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Result ───────────────────────────────────────────────────────────────────
function Result({ onPlayAgain, onLeave }: { onPlayAgain: () => void; onLeave: () => void }) {
  const { winner, imposterNickname, commonWord, imposterWord } = useGameStore()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <BgOrbs />
      <div className="animate-fade-up" style={{ textAlign: 'center', maxWidth: 500, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 68, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>🎭</div>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 44, letterSpacing: 5, color: 'var(--accent)', textShadow: '0 0 36px var(--glow)', marginBottom: 8 }}>O'YIN TUGADI</h2>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: 22, letterSpacing: 4, color: winner === 'players' ? 'var(--green)' : 'var(--accent)', marginBottom: 28 }}>
          {winner === 'players' ? "O'YINCHILAR YUTDI! 🏆" : 'IMPOSTER YUTDI! 😈'}
        </p>
        <div className="card" style={{ marginBottom: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: 1, marginBottom: 14, fontWeight: 700 }}>IMPOSTER KIM EDI?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'rgba(139,0,0,.07)', borderRadius: 8, border: '1px solid rgba(139,0,0,.2)' }}>
            <Avatar user={{ nickname: imposterNickname ?? '?' }} size={46} style={{ border: '2px solid var(--accent)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, letterSpacing: 3 }}>{imposterNickname ?? '???'}</div>
              <span className="badge badge-red">IMPOSTER</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: "O'YINCHILAR SO'ZI", val: commonWord, c: 'var(--green)' },
            { label: "IMPOSTER SO'ZI", val: imposterWord, c: 'var(--accent)' },
          ].map(w => (
            <div key={w.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>{w.label}</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 26, letterSpacing: 4, color: w.c }}>{w.val ?? '?'}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onLeave}>CHIQISH</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onPlayAgain}>QAYTA O'YNASH →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Room page ───────────────────────────────────────────────────────────
export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()
  const game = useGameStore()
  const { startGame, leaveRoom } = useGameSocket(game.room?.id)
  const [room, setRoom] = useState<RoomType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadRoom()
  }, [code])

  const loadRoom = async () => {
    try {
      const r = code ? await roomsApi.getByCode(code) : null
      if (!r) { navigate('/room'); return }
      setRoom(r)
      game.setRoom(r)
      game.setPhase('lobby')
      // Connect socket and join room
      socket.connect()
      await socket.joinRoom(r.roomCode)
    } catch (e: any) {
      toast(e.message, 'error')
      navigate('/room')
    } finally { setLoading(false) }
  }

  const handleStart = async () => {
    try {
      await startGame()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const handleLeave = async () => {
    await leaveRoom()
    navigate('/')
  }

  const handlePlayAgain = () => {
    game.reset()
    navigate('/room')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <BgOrbs />
      <Spinner size={32} />
      <p style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Xona yuklanmoqda...</p>
    </div>
  )

  const currentRoom = (game.room ?? room) as RoomType

  if (game.phase === 'word_reveal') return <WordReveal onReady={() => game.setPhase('playing')} />
  if (game.phase === 'playing' || game.phase === 'voting') return <GameChat room={currentRoom} onLeave={handleLeave} />
  if (game.phase === 'result') return <Result onPlayAgain={handlePlayAgain} onLeave={handleLeave} />
  return <Lobby room={currentRoom} onStart={handleStart} onLeave={handleLeave} />
}
