/**
 * localDuelStore — trwałe dane trybu LOCAL DUEL w localStorage, żeby
 * „pamiętały się" między sesjami:
 *   - lista graczy (nazwy + bilans W/L),
 *   - historia ostatnich pojedynków (pasek pod areną).
 *
 * Reguły: minimum 2 graczy (pojedynek to 1v1), maksimum 3 „w pamięci".
 * Kanoniczny kształt gracza: { id, name, wins, losses }.
 * Kanoniczny wpis historii: { ts, winnerId, loserId, winnerName, loserName,
 * winnerTime, loserTime, gap } — nazwy to migawka z chwili pojedynku.
 */

const KEY = 'cubeverse_local_duel_players'
const HISTORY_KEY = 'cubeverse_local_duel_history'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 3
// Pod areną widać tylko kilka ostatnich wpisów — limit chroni localStorage
// przed puchnięciem w nieskończoność.
export const MAX_HISTORY = 50

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

/** Czy wpis historii ma wszystko, czego potrzebuje pasek pod areną? */
function isValidDuel(d) {
  return (
    Number.isFinite(d?.ts) &&
    typeof d.winnerName === 'string' &&
    typeof d.loserName === 'string' &&
    Number.isFinite(d.winnerTime) &&
    Number.isFinite(d.loserTime)
  )
}

/** Wczytuje historię (od najnowszego); uszkodzone wpisy odrzucamy. */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter(isValidDuel).slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

export function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)))
  } catch {
    /* brak dostępu do localStorage — pomijamy */
  }
}
