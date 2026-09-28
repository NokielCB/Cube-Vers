import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { localRepo } from '../data/localRepo'
import { migrateLegacyMeta } from '../data/legacySessionMeta'
import { importLocalProgress } from '../data/progressMigration'

/**
 * AuthContext — globalny stan sesji z TRZEMA trybami (poza ładowaniem):
 *   'anon'   — nikt nie wybrał ścieżki (pokazujemy ekran logowania),
 *   'guest'  — świadomy tryb Gościa (dane w localStorage),
 *   'authed' — zalogowany użytkownik (dane w chmurze).
 *
 * Sesję zalogowanego trzyma httpOnly cookie; przy starcie pytamy /me.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | anon | guest | authed

  // Przy montowaniu sprawdzamy, czy jest ważna sesja w chmurze.
  useEffect(() => {
    let alive = true
    api
      .me()
      .then((data) => {
        if (!alive) return
        setUser(data.user)
        setStatus('authed')
      })
      .catch(() => alive && setStatus('anon')) // brak sesji → ekran logowania
    return () => {
      alive = false
    }
  }, [])

  const continueAsGuest = useCallback(() => setStatus('guest'), [])

  /**
   * Migracja danych Gościa → chmura. Wywoływana po rejestracji: jeśli w
   * localStorage są lokalne ułożenia lub sesje, wysyłamy je na konto (serwer
   * podmienia lokalne id sesji na nowe) i czyścimy lokalną kopię. To samo
   * robimy z postępem nauki (statusy algorytmów + rekordy z treningu).
   * Best-effort — błąd migracji nie blokuje wejścia do apki, a dane Gościa
   * zostają wtedy w przeglądarce (nic nie ginie).
   */
  const migrateGuestData = useCallback(async () => {
    // Postęp nauki idzie osobnym żądaniem — błąd jednego importu nie blokuje drugiego.
    await importLocalProgress().catch((err) =>
      console.error('[Auth] Import postępu nauki Gościa nie powiódł się:', err),
    )
    // Stare kary/sesje Gościa (sprzed przeniesienia ich do danych) muszą trafić
    // do lokalnych czasów PRZED eksportem — po imporcie czasy dostają nowe id
    // i stare wpisy nie miałyby już do czego się przypiąć.
    await migrateLegacyMeta(localRepo, localRepo.exportAll()).catch(() => false)
    const local = localRepo.exportAll()
    const sessions = localRepo.exportSessions()
    if (!local.length && !sessions.length) return { imported: 0 }
    try {
      const res = await api.importSolves(local, sessions)
      localRepo.clear()
      return res
    } catch (err) {
      console.error('[Auth] Import danych Gościa nie powiódł się:', err)
      return { imported: 0, error: true }
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { user } = await api.login(credentials)
    setUser(user)
    setStatus('authed')
    return user
  }, [])

  const register = useCallback(
    async (payload) => {
      const { user } = await api.register(payload)
      // Konto istnieje + sesja ustawiona → przenosimy dorobek Gościa.
      await migrateGuestData()
      setUser(user)
      setStatus('authed')
      return user
    },
    [migrateGuestData],
  )

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
    setStatus('anon')
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const { user } = await api.updateUser(payload)
    setUser(user)
    return user
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authed',
      isGuest: status === 'guest',
      continueAsGuest,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, status, continueAsGuest, login, register, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>.')
  return ctx
}
