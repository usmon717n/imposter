// src/pages/Auth.tsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi, setTokens } from '../services/api'
import { useAuthStore } from '../store'
import { BgOrbs, Spinner } from '../components/ui'
import { useToast } from '../components/ui'

type Mode = 'login' | 'register'
type Step = 'main' | 'otp' | 'nickname'
type Method = 'google' | 'phone'

export default function Auth({ mode }: { mode: Mode }) {
  const [step, setStep] = useState<Step>('main')
  const [method, setMethod] = useState<Method>('google')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setUser } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const isReg = mode === 'register'

  const finishAuth = (data: any) => {
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    if (data.needsNickname || data.user?.needsNickname) {
      setStep('nickname')
    } else {
      toast('Xush kelibsiz, ' + data.user.nickname + '! 🎭', 'success')
      navigate('/')
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = authApi.googleUrl()
  }

  const handleSendOtp = async () => {
    setError('')
    const cleaned = '+998' + phone.replace(/\D/g, '')
    if (cleaned.length < 13) { setError('To\'g\'ri telefon raqam kiriting'); return }
    setLoading(true)
    try {
      await authApi.sendOtp(cleaned)
      setStep('otp')
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    setError('')
    if (otp.length < 6) { setError('6 raqamli kodni kiriting'); return }
    setLoading(true)
    try {
      const cleaned = '+998' + phone.replace(/\D/g, '')
      const data = await authApi.verifyOtp(cleaned, otp)
      finishAuth(data)
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const handleSetNickname = async () => {
    setError('')
    if (nickname.length < 3) { setError('Nickname kamida 3 belgi bo\'lishi kerak'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) { setError('Faqat harf, raqam va _ ishlating'); return }
    setLoading(true)
    try {
      const data = await authApi.setNickname(nickname)
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      toast('Xush kelibsiz, ' + nickname + '! 🎭', 'success')
      navigate('/')
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px', position: 'relative' }}>
      <BgOrbs />
      <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🎭</div>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 30, letterSpacing: 4 }}>
            {step === 'nickname' ? 'NICKNAME TANLANG' : isReg ? "RO'YXAT" : 'KIRISH'}
          </h2>
          <p style={{ color: 'var(--muted2)', fontSize: 13, marginTop: 7, lineHeight: 1.5 }}>
            {step === 'nickname'
              ? 'O\'yindagi noyob ismingizni tanlang'
              : isReg ? "Hoziroq ro'yxatdan o'ting va o'ynang" : 'Hisobingizga kiring'}
          </p>
        </div>

        {/* Error */}
        {error && <div className="error-box" style={{ marginBottom: 18 }}>⚠ {error}</div>}

        {/* Step: Nickname */}
        {step === 'nickname' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 7, letterSpacing: .5 }}>NICKNAME</label>
            <input
              className="input"
              placeholder="masalan: ShadowWolf47"
              value={nickname}
              onChange={e => setNickname(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
              onKeyDown={e => e.key === 'Enter' && handleSetNickname()}
              maxLength={20}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', margin: '7px 0 22px' }}>
              <span>3–20 belgi · harf, raqam, _</span>
              <span>{nickname.length}/20</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: 13 }} onClick={handleSetNickname} disabled={loading}>
              {loading ? <Spinner /> : 'DAVOM ETISH →'}
            </button>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div>
            <p style={{ color: 'var(--muted2)', fontSize: 13, marginBottom: 18 }}>
              <b style={{ color: 'var(--text)' }}>+998{phone}</b> raqamiga 6 raqamli kod yuborildi
            </p>
            <input
              className="input"
              placeholder="_ _ _ _ _ _"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              style={{ letterSpacing: 14, textAlign: 'center', fontSize: 22, marginBottom: 18 }}
              autoFocus
            />
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10, padding: 13 }} onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
              {loading ? <Spinner /> : 'TASDIQLASH'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { setStep('main'); setOtp(''); setError('') }}>← Orqaga</button>
          </div>
        )}

        {/* Step: Main */}
        {step === 'main' && (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, background: 'var(--surface2)', borderRadius: 6, padding: 3, marginBottom: 22 }}>
              {(['google', 'phone'] as Method[]).map(m => (
                <button key={m} onClick={() => setMethod(m)} style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 5,
                  background: method === m ? 'var(--primary)' : 'transparent',
                  color: method === m ? '#fff' : 'var(--muted2)',
                  cursor: 'pointer', transition: 'all .18s',
                  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12,
                  boxShadow: method === m ? '0 0 10px var(--glow2)' : 'none',
                }}>
                  {m === 'google' ? '🔵 Google' : '📱 Telefon'}
                </button>
              ))}
            </div>

            {method === 'google' ? (
              <button
                onClick={handleGoogleLogin}
                style={{
                  width: '100%', padding: '13px 18px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', transition: 'all .18s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11,
                  fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--text)', fontSize: 14,
                }}
                onMouseEnter={e => { (e.currentTarget as any).style.borderColor = '#4285F4'; (e.currentTarget as any).style.boxShadow = '0 0 14px rgba(66,133,244,.2)' }}
                onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border)'; (e.currentTarget as any).style.boxShadow = 'none' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google orqali {isReg ? "ro'yxatdan o'tish" : 'kirish'}
              </button>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 7, letterSpacing: .5 }}>TELEFON RAQAM</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '11px 12px', fontSize: 13, color: 'var(--muted2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>🇺🇿 +998</div>
                  <input
                    className="input"
                    placeholder="90 123 45 67"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    autoFocus
                  />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, padding: 13 }} onClick={handleSendOtp} disabled={loading || phone.length < 9}>
                  {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner /> Yuborilmoqda...</span> : 'KOD YUBORISH →'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'main' && (
          <>
            <div className="divider" style={{ margin: '22px 0' }} />
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {isReg ? 'Hisobingiz bormi?' : 'Hisobingiz yo\'qmi?'}{' '}
              <Link to={isReg ? '/login' : '/register'} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                {isReg ? 'Kirish' : "Ro'yxat"}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
