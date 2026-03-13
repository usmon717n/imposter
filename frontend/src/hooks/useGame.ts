// src/hooks/useGame.ts
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../services/socket'
import { roomsApi } from '../services/api'
import { useGameStore } from '../store'
import { useAuthStore } from '../store'

export function useGameSocket(roomId: string | undefined) {
  const game = useGameStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!roomId) return
    socket.connect()

    const unsubs = [
      // Room events
      socket.on('room_state', (data: any) => {
        game.setRoom(data)
      }),

      socket.on('player_joined', ({ player }: any) => {
        game.addPlayer(player)
        game.addSystemMessage(`${player.nickname} xonaga qo'shildi`)
      }),

      socket.on('player_left', ({ userId }: any) => {
        const p = game.players.find(x => x.userId === userId)
        if (p) game.addSystemMessage(`${p.nickname} xonadan chiqdi`)
        game.removePlayer(userId)
      }),

      socket.on('player_disconnected', ({ userId }: any) => {
        game.setPlayerConnected(userId, false)
        const p = game.players.find(x => x.userId === userId)
        if (p) game.addSystemMessage(`${p.nickname} uzildi`)
      }),

      // Game events
      socket.on('game_started', (data: any) => {
        game.setGameStarted({
          word: data.word,
          isImposter: data.isImposter,
          players: data.players,
          durationSeconds: data.durationSeconds,
        })
      }),

      socket.on('game_phase_changed', (data: any) => {
        game.setTurn(data.currentTurnUserId, data.turnEndsAt)
        if (data.phase === 'playing') game.setPhase('playing')
      }),

      // Chat
      socket.on('new_message', (data: any) => {
        game.addMessage({
          id: data.id,
          userId: data.userId,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
          message: data.message,
          timestamp: data.timestamp,
        })
      }),

      socket.on('turn_changed', (data: any) => {
        game.setTurn(data.currentTurnUserId, data.turnEndsAt)
      }),

      socket.on('turn_skipped', (data: any) => {
        game.setTurn(data.nextTurnUserId, data.turnEndsAt)
        if (data.autoSkipped) {
          const p = game.players.find(x => x.userId === data.skippedUserId)
          if (p) game.addSystemMessage(`${p.nickname} navbatini o'tkazib yubordi`)
        }
      }),

      // Voting
      socket.on('voting_started', (data: any) => {
        game.setPhase('voting')
        game.addSystemMessage(`${data.startedBy} ovoz berishni boshladi`)
      }),

      socket.on('vote_cast', (data: any) => {
        game.setVoteCounts(data.voteCounts)
      }),

      socket.on('voting_resolved', (data: any) => {
        if (data.eliminatedUserId) {
          game.eliminatePlayer(data.eliminatedUserId)
          game.addSystemMessage(
            data.wasImposter
              ? `✅ ${data.eliminatedNickname} IMPOSTER edi! O'yinchilar yutdi!`
              : `❌ ${data.eliminatedNickname} oddiy o'yinchi edi. O'yin davom etadi.`
          )
        }
        if (!data.gameEnded) {
          game.setPhase('playing')
        }
      }),

      socket.on('game_ended', (data: any) => {
        game.setGameEnded({
          winner: data.winner,
          imposterUserId: data.imposterUserId,
          imposterNickname: data.imposterNickname,
          commonWord: data.commonWord,
          imposterWord: data.imposterWord,
        })
      }),
    ]

    return () => { unsubs.forEach(fn => fn()) }
  }, [roomId])

  // Actions
  const startGame = useCallback(async () => {
    if (!roomId) return
    const res = await socket.startGame(roomId)
    if (!res.success) throw new Error(res.error)
  }, [roomId])

  const sendMessage = useCallback(async (message: string) => {
    if (!roomId) return
    const res = await socket.sendMessage(roomId, message)
    if (!res.success) throw new Error(res.error)
  }, [roomId])

  const skipTurn = useCallback(() => {
    if (!roomId) return
    socket.skipTurn(roomId)
  }, [roomId])

  const castVote = useCallback(async (targetPlayerId: string) => {
    if (!roomId) return
    game.setMyVote(targetPlayerId)
    const res = await socket.castVote(roomId, targetPlayerId)
    if (!res.success) throw new Error(res.error)
  }, [roomId])

  const triggerVoting = useCallback(async () => {
    if (!roomId) return
    await socket.startVoting(roomId)
    game.setPhase('voting')
  }, [roomId])

  const leaveRoom = useCallback(async () => {
    if (!roomId) return
    await socket.leaveRoom(roomId)
    await roomsApi.leave(roomId)
    game.reset()
    navigate('/')
  }, [roomId])

  return { startGame, sendMessage, skipTurn, castVote, triggerVoting, leaveRoom }
}

// Timer hook
export function useCountdown(endsAt: string | null) {
  const [secs, setSecs] = require('react').useState(0)

  require('react').useEffect(() => {
    if (!endsAt) { setSecs(0); return }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
      setSecs(diff)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [endsAt])

  return secs
}
