import { useCallback, useEffect, useState } from 'react'
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  loadPlayers,
  savePlayers,
  newPlayerId,
} from '../data/localDuelStore'

/**
 * useLocalDuelRoster — stan listy graczy trybu Local Duel + akcje. Każda zmiana
 * zapisuje się do localStorage (patrz localDuelStore), więc nazwy i bilans W/L
 * przeżywają odświeżenie strony.
 *
 * Limity pilnowane w akcjach: nie da się mieć <2 ani >3 graczy.
 */
export function useLocalDuelRoster() {
  const [players, setPlayers] = useState(loadPlayers)

  useEffect(() => {
    savePlayers(players)
  }, [players])

  const addPlayer = useCallback(() => {
    setPlayers((prev) =>
      prev.length >= MAX_PLAYERS
        ? prev
        : [...prev, { id: newPlayerId(), name: `Gracz ${prev.length + 1}`, wins: 0, losses: 0 }],
    )
  }, [])

  const renamePlayer = useCallback((id, name) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }, [])

  const removePlayer = useCallback((id) => {
    setPlayers((prev) => (prev.length <= MIN_PLAYERS ? prev : prev.filter((p) => p.id !== id)))
  }, [])

  // Zapis wyniku pojedynku: +1 zwycięstwo zwycięzcy, +1 porażka przegranemu.
  const recordResult = useCallback((winnerId, loserId) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === winnerId) return { ...p, wins: p.wins + 1 }
        if (p.id === loserId) return { ...p, losses: p.losses + 1 }
        return p
      }),
    )
  }, [])

  const resetScores = useCallback(() => {
    setPlayers((prev) => prev.map((p) => ({ ...p, wins: 0, losses: 0 })))
  }, [])

  return {
    players,
    addPlayer,
    renamePlayer,
    removePlayer,
    recordResult,
    resetScores,
    maxPlayers: MAX_PLAYERS,
    minPlayers: MIN_PLAYERS,
  }
}
