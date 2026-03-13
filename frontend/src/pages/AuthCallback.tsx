// src/pages/AuthCallback.tsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, setTokens } from '../services/api'
import { useAuthStore } from '../store'
import { LoadingPage } from '../components/ui'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  useEffect(() => {
    const { needsNickname } = authApi.handleCallback()
    // Fetch user info
    authApi.me().then(user => {
      setUser(user)
      if (needsNickname) navigate('/register?step=nickname')
      else navigate('/')
    }).catch(() => navigate('/login'))
  }, [])

  return <LoadingPage text="Google orqali kirilmoqda..." />
}
