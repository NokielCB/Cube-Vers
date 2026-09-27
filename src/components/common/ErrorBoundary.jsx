import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * ErrorBoundary — łapie runtime errory w poddrzewie i zamiast wywalać
 * całą aplikację (biały ekran) pokazuje elegancki, szklany fallback.
 *
 * Musi być KLASĄ — React udostępnia getDerivedStateFromError /
 * componentDidCatch wyłącznie dla komponentów klasowych. Nie istnieje
 * hookowy odpowiednik.
 *
 * W App owijamy nim widok i nadajemy `key={activeTab}`, dzięki czemu
 * błąd na jednej zakładce nie "przykleja się" po przełączeniu.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    // aktualizuje stan → następny render pokaże fallback
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // miejsce na logowanie do zewnętrznego serwisu (Sentry itp.)
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md px-6 pt-24">
          <div className="tile p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900/[0.04] text-ink-500">
              <AlertTriangle size={22} strokeWidth={1.5} />
            </div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink-950">
              Coś poszło nie tak
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Napotkaliśmy nieoczekiwany błąd, ale reszta aplikacji działa dalej.
            </p>
            <button
              onClick={this.handleReset}
              className="mt-6 rounded-full bg-ink-950 px-5 py-2 text-xs font-medium text-alabaster-50 transition-opacity duration-200 hover:opacity-90"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
