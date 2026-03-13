// src/pages/GameChat.tsx
import React, { useState, useRef, useEffect } from 'react'
import { Room } from '../services/api'
import { useAuthStore, useGameStore } from '../store'
import { useGameSocket } from '../hooks/useGame'
import { Avatar, Countdown } from '../components/ui'
import { useToast } from '../components/ui'

export default function GameChat({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const { user } = useAuthStore()
  const game = useGameStore()
  const { sendMessage, skipTurn, castVote, triggerVoting } = useGameSocket(room.id)
  const toast = useToast()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isMyTurn = game.currentTurnUserId === user?.id
  const activePlayers = game.players.filter(p => !p.isEliminated)
  const isVoting = game.phase === 'voting'

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [game.messages])

  useEffect(() => {
    if (isMyTurn && inputRef.current) inputRef.current.focus()
  }, [isMyTurn])

  const handleSend = async () => {
    if (!input.trim() || !isMyTurn) return
    setSending(true)
    try {
      await sendMessage(input.trim())
      setInput('')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setSending(false) }
  }

  const handleVote = async (targetPlayerId: string) => {
    try { await castVote(targetPlayerId) }
    catch (e: any) { toast(e.message, 'error') }
  }

  const currentTurnPlayer = game.players.find(p => p.userId === game.currentTurnUserId)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 60 }}>

      {/* ── Top bar ── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: 52,
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
      }}>
        {/* Game timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>VAQT</span>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: 22, letterSpacing: 2 }}>
            <Countdown endsAt={game.gameEndsAt} danger={60} />
          </span>
        </div>

        {/* My word */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>SO'ZINGIZ: </span>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: 16, letterSpacing: 3, color: game.isImposter ? 'var(--accent)' : 'var(--green)' }}>
            {game.myWord}
          </span>
          {game.isImposter && <span className="badge badge-red" style={{ marginLeft: 8 }}>IMPOSTER</span>}
        </div>

        {/* Turn avatars */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {activePlayers.slice(0, 6).map((p, i) => (
            <div key={p.userId} style={{ position: 'relative' }} title={p.nickname}>
              <Avatar user={p} size={30} style={{
                border: `2px solid ${p.userId === game.currentTurnUserId ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: p.userId === game.currentTurnUserId ? '0 0 8px var(--glow)' : 'none',
                animation: p.userId === game.currentTurnUserId ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              {p.userId === game.currentTurnUserId && (
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent)', whiteSpace: 'nowrap', background: 'var(--bg)', padding: '1px 3px' }}>
                  <Countdown endsAt={game.turnEndsAt} danger={15} />s
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Voting btn */}
        {!isVoting && (
          <button className="btn btn-outline" style={{ fontSize: 10, padding: '6px 12px', flexShrink: 0 }} onClick={triggerVoting}>
            🗳️ OVOZ
          </button>
        )}

        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '6px 10px', flexShrink: 0 }} onClick={onLeave}>CHIQISH</button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 180, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '12px 14px 8px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 2 }}>O'YINCHILAR</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {game.players.map((p, i) => (
              <div key={p.userId} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px',
                borderRadius: 6, marginBottom: 4,
                background: p.userId === game.currentTurnUserId ? 'rgba(139,0,0,.08)' : 'transparent',
                border: `1px solid ${p.userId === game.currentTurnUserId ? 'rgba(139,0,0,.2)' : 'transparent'}`,
                opacity: p.isEliminated ? 0.4 : 1,
              }}>
                <Avatar user={p} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: p.isEliminated ? 'line-through' : 'none' }}>
                    {p.nickname}
                    {p.userId === user?.id ? ' (siz)' : ''}
                  </div>
                  {p.userId === game.currentTurnUserId && !p.isEliminated && (
                    <div style={{ fontSize: 8, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>NAVBATI</div>
                  )}
                </div>

                {/* Vote button in voting phase */}
                {isVoting && p.userId !== user?.id && !p.isEliminated && (
                  <button
                    onClick={() => handleVote(p.userId)}
                    className={game.myVote === p.userId ? 'btn btn-danger' : 'btn btn-outline'}
                    style={{ padding: '3px 7px', fontSize: 9, flexShrink: 0 }}
                    title="Ovoz berish"
                  >
                    {game.myVote === p.userId ? '✓' : '🗳️'}
                    {game.voteCounts[p.userId] ? ` ${game.voteCounts[p.userId]}` : ''}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Voting indicator */}
          {isVoting && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'rgba(139,0,0,.07)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)', letterSpacing: 1, textAlign: 'center' }}>
                🗳️ OVOZ BERISH<br />
                <span style={{ color: 'var(--muted2)' }}>IXTIYORIY</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

          {/* Turn indicator */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              background: isMyTurn ? 'rgba(139,0,0,.12)' : 'rgba(50,50,50,.3)',
              border: `1px solid ${isMyTurn ? 'rgba(139,0,0,.3)' : 'var(--border)'}`,
              borderRadius: 20, padding: '4px 14px', fontSize: 11, color: isMyTurn ? 'var(--accent)' : 'var(--muted2)',
              fontFamily: 'var(--font-mono)', letterSpacing: 1,
            }}>
              {isMyTurn
                ? '⚡ SIZNING NAVBATINGIZ'
                : `⏳ ${currentTurnPlayer?.nickname ?? '...'} yozmoqda`}
            </span>
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {game.messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 20 }}>
                O'yin boshlandi. Navbat tartibida yozing...
              </div>
            )}
            {game.messages.map((msg, i) => {
              if (msg.isSystem) return (
                <div key={msg.id} style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: 'var(--font-mono)', background: 'var(--surface2)', padding: '3px 12px', borderRadius: 20 }}>
                    {msg.message}
                  </span>
                </div>
              )
              const isMe = msg.userId === user?.id
              return (
                <div key={msg.id} className="animate-msg-in" style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 9, animationDelay: `${i === game.messages.length - 1 ? 0 : 0}s` }}>
                  <Avatar user={{ nickname: msg.nickname, avatarUrl: msg.avatarUrl }} size={30} style={{ flexShrink: 0, alignSelf: 'flex-end' }} />
                  <div style={{ maxWidth: '68%' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted2)', marginBottom: 3, textAlign: isMe ? 'right' : 'left', fontFamily: 'var(--font-mono)' }}>
                      {msg.nickname} · {new Date(msg.timestamp).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{
                      background: isMe ? 'var(--primary)' : 'var(--surface2)',
                      border: `1px solid ${isMe ? 'rgba(255,255,255,.07)' : 'var(--border)'}`,
                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      padding: '9px 13px', fontSize: 14, lineHeight: 1.5,
                    }}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8 }}>
            {isMyTurn && !isVoting ? (
              <>
                <input
                  ref={inputRef}
                  className="input"
                  placeholder="Xabaringizni yozing... (Enter - yuborish)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  maxLength={500}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || sending} style={{ padding: '0 20px', flexShrink: 0 }}>
                  {sending ? '...' : '→'}
                </button>
                <button className="btn btn-ghost" onClick={() => skipTurn()} style={{ flexShrink: 0, fontSize: 11, padding: '0 12px' }} title="O'tkazib yuborish">
                  SKIP
                </button>
              </>
            ) : isVoting ? (
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: 'var(--muted2)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                🗳️ Chap paneldan ovoz bering
              </div>
            ) : (
              <div style={{ flex: 1, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                ⏳ {currentTurnPlayer?.nickname}ning navbati...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
