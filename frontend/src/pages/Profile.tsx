// src/pages/Profile.tsx
import React, { useState, useRef } from 'react'
import { usersApi } from '../services/api'
import { useAuthStore } from '../store'
import { Page, Avatar, Spinner } from '../components/ui'
import { useToast } from '../components/ui'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const toast = useToast()
  const [tab, setTab] = useState<'info' | 'password' | 'danger'>('info')
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const checkTimer = useRef<any>(null)

  const stats = [
    { label: "JAMI O'YINLAR", value: user?.gamesPlayed ?? 0, icon: '🎮' },
    { label: "G'ALABALAR", value: user?.wins ?? 0, icon: '🏆' },
    { label: 'IMPOSTER BOLDIM', value: user?.timesImposter ?? 0, icon: '🎭' },
    { label: "IMPOSTER G'ALABASI", value: user?.imposterWins ?? 0, icon: '😈' },
  ]

  const handleNicknameChange = (val: string) => {
    setNickname(val.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))
    clearTimeout(checkTimer.current)
    if (val.length >= 3 && val !== user?.nickname) {
      setNicknameStatus('checking')
      checkTimer.current = setTimeout(async () => {
        try {
          const { available } = await usersApi.checkNickname(val)
          setNicknameStatus(available ? 'ok' : 'taken')
        } catch { setNicknameStatus('idle') }
      }, 600)
    } else {
      setNicknameStatus('idle')
    }
  }

  const handleSaveProfile = async () => {
    if (nicknameStatus === 'taken') { toast('Bu nickname band', 'error'); return }
    setSaving(true)
    try {
      const updated = await usersApi.update({ nickname })
      setUser(updated)
      toast('Saqlandi! ✓', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (!curPwd || newPwd.length < 8) { toast('Parollar to\'g\'ri emas', 'error'); return }
    setSaving(true)
    try {
      await usersApi.changePassword(curPwd, newPwd)
      setCurPwd(''); setNewPwd('')
      toast('Parol o\'zgartirildi ✓', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally { setSaving(false) }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('Fayl 5MB dan oshmasligi kerak', 'error'); return }
    try {
      const updated = await usersApi.uploadAvatar(file)
      setUser(updated)
      toast('Rasm yangilandi ✓', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <Page maxWidth={820}>
      <div style={{ padding: '32px 0 60px' }}>

        {/* Profile header card */}
        <div className="card animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar user={user} size={78} style={{ border: '2px solid var(--primary)', boxShadow: '0 0 18px var(--glow2)' }} />
            <button
              onClick={() => fileRef.current?.click()}
              title="Rasmni o'zgartirish"
              style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✏️</button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 30, letterSpacing: 3 }}>{user?.nickname}</h2>
            <p style={{ color: 'var(--muted2)', fontSize: 13, marginTop: 4 }}>{user?.email ?? user?.phoneNumber ?? 'Foydalanuvchi'}</p>
            <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="badge badge-red">PRO</span>
              <span className="badge badge-gray">Level 12</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', color: 'var(--muted2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            <div>A'ZO BO'LGAN</div>
            <div style={{ color: 'var(--text2)', marginTop: 4 }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uz') : '—'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
          {stats.map((s, i) => (
            <div key={i} className="card animate-fade-up" style={{ textAlign: 'center', padding: 18, animationDelay: `${i * .06}s` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, color: 'var(--accent)', letterSpacing: 2 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 4, letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Settings card */}
        <div className="card animate-fade-up" style={{ animationDelay: '.2s' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, gap: 0 }}>
            {(['info', 'password', 'danger'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '11px 18px', fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 700,
                color: tab === t ? 'var(--text)' : 'var(--muted2)',
                borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                transition: 'all .16s',
              }}>
                {t === 'info' ? '👤 MA\'LUMOTLAR' : t === 'password' ? '🔐 PAROL' : '⚠ XAVFLI ZONA'}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 7, letterSpacing: .5 }}>NICKNAME</label>
                <input className={`input ${nicknameStatus === 'taken' ? 'error' : ''}`} value={nickname} onChange={e => handleNicknameChange(e.target.value)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: nicknameStatus === 'ok' ? 'var(--green)' : nicknameStatus === 'taken' ? 'var(--accent)' : 'var(--muted)' }}>
                    {nicknameStatus === 'ok' ? '✓ Mavjud' : nicknameStatus === 'taken' ? '✗ Band' : nicknameStatus === 'checking' ? 'Tekshirilmoqda...' : '14 kunda bir marta o\'zgartirish'}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>{nickname.length}/20</span>
                </div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 7, letterSpacing: .5 }}>EMAIL / TELEFON</label>
                <input className="input" value={user?.email ?? user?.phoneNumber ?? ''} disabled style={{ opacity: .5 }} />
              </div>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving || nicknameStatus === 'taken'}>
                {saving ? <><Spinner size={14} /> Saqlanmoqda...</> : 'SAQLASH'}
              </button>
            </div>
          )}

          {tab === 'password' && (
            <div className="animate-fade-in">
              {[
                ['JORIY PAROL', curPwd, setCurPwd, 'Joriy parol'],
                ['YANGI PAROL', newPwd, setNewPwd, 'Kamida 8 belgi'],
              ].map(([label, val, setter, ph], i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 7, letterSpacing: .5 }}>{label as string}</label>
                  <input type="password" className="input" placeholder={ph as string} value={val as string} onChange={e => (setter as any)(e.target.value)} />
                </div>
              ))}
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}>
                {saving ? <><Spinner size={14} /> Saqlanmoqda...</> : 'PAROLNI YANGILASH'}
              </button>
            </div>
          )}

          {tab === 'danger' && (
            <div className="animate-fade-in">
              <div style={{ background: 'rgba(139,0,0,.06)', border: '1px solid rgba(139,0,0,.18)', borderRadius: 8, padding: 20 }}>
                <h4 style={{ fontFamily: 'var(--font-d)', letterSpacing: 2, marginBottom: 8, color: 'var(--accent)', fontSize: 18 }}>HISOBNI O'CHIRISH</h4>
                <p style={{ color: 'var(--muted2)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
                  Bu amalni qaytarib bo'lmaydi. Barcha ma'lumotlar, o'yin tarixi va statistika butunlay o'chiriladi.
                </p>
                <button className="btn btn-danger">HISOBNI O'CHIRISH</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
