/**
 * localDuelStore — trwała lista graczy trybu LOCAL DUEL (nazwy + bilans W/L).
 * Trzymana w localStorage, żeby wyniki „pamiętały się" między sesjami.
 *
 * Reguły: minimum 2 graczy (pojedynek to 1v1), maksimum 3 „w pamięci".
 * Kanoniczny kształt gracza: { id, name, wins, losses }.
 */

const KEY = 'cubeverse_local_duel_players'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 3

export function newPlayerId() {
  return crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function defaultPlayers() {
  return [
    { id: newPlayerId(), name: 'Gracz 1', wins: 0, losses: 0 },
    { id: newPlayerId(), name: 'Gracz 2', wins: 0, losses: 0 },
  ]
}

export function loadPlayers() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : null
    if (Array.isArray(list) && list.length >= MIN_PLAYERS) {
      // Sanityzacja + twardy limit 3 graczy.
      return list.slice(0, MAX_PLAYERS).map((p) => ({
        id: p.id ?? newPlayerId(),
        name: typeof p.name === 'string' && p.name.trim() ? p.name : 'Gracz',
        wins: Number.isFinite(p.wins) ? p.wins : 0,
        losses: Number.isFinite(p.losses) ? p.losses : 0,
      }))
    }
  } catch {
    /* uszkodzony wpis — wracamy do domyślnych */
  }
  return defaultPlayers()
}

export function savePlayers(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* brak dostępu do localStorage — pomijamy */
  }
}
