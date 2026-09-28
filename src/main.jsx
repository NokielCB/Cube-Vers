import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ProgressProvider } from './context/ProgressContext'
import { SessionProvider } from './context/SessionContext'
import { SocialProvider } from './context/SocialContext'
import './index.css'

// Domyślne ustawienia cache. staleTime = przez ile dane są „świeże" i NIE są
// ponownie pobierane (chroni bazę przed lawiną ciężkich zapytań analitycznych
// przy każdym wejściu na zakładkę). Szczegóły w wyjaśnieniu mentora.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — analityka nie zmienia się co sekundę
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <ProgressProvider>
            <SessionProvider>
              <SocialProvider>
                <App />
              </SocialProvider>
            </SessionProvider>
          </ProgressProvider>
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
