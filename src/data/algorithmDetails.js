/**
 * Warstwa szczegółów algorytmu — celowo ODDZIELONA od głównej bazy
 * (algorithms.js), żeby nie puchła. Trzymamy tu treść "premium" dla
 * modalu: alternatywne sekwencje i popularność.
 *
 * Osobiste rekordy NIE żyją tutaj — to realne pomiary z trybu treningu
 * (App → algorithmProgressStore), liczone osobno dla każdego wariantu.
 *
 * Braki są bezpieczne — getDetails() dokłada sensowny fallback.
 */
import { ALGORITHMS } from './algorithms'
import { splitOrientation } from '../lib/notation'

const DETAILS = {
  'oll-27': {
    popularity: 98,
    alternatives: [
      { label: 'Lewa ręka (mirror)', moves: "L' U' L U' L' U2 L" },
      { label: 'Wide / one-look', moves: "R U R' U R U2' R'" },
    ],
  },
  'oll-26': {
    popularity: 97,
    alternatives: [
      { label: 'Lewa ręka (mirror)', moves: "L' U2 L U L' U L" },
      { label: 'Wariant M-slice', moves: "R' U' R U' R' U2 R" },
    ],
  },
  'oll-33': {
    popularity: 88,
    alternatives: [{ label: 'Wersja z F (Suit Up mirror)', moves: "F' L' U' L U F" }],
  },
  'oll-45': {
    popularity: 90,
    alternatives: [{ label: 'Mirror (lewa)', moves: "f R U R' U' f'" }],
  },
  'pll-t': {
    popularity: 99,
    alternatives: [{ label: 'Wariant z r (wide)', moves: "r U R' U' r' F R F'" }],
  },
  'pll-ua': {
    popularity: 95,
    alternatives: [{ label: 'Wersja R U (bez slice)', moves: "R U' R U R U R U' R' U' R2" }],
  },
  'pll-h': {
    popularity: 93,
    alternatives: [{ label: 'Odbicie U/U2', moves: "M2 U' M2 U2 M2 U' M2" }],
  },
}

/**
 * Zwraca kompletne szczegóły dla danego algorytmu — zawsze wypełnione.
 * Fallback: popularność z trudności, wariant y-rotacji.
 */
export function getDetails(alg) {
  const d = DETAILS[alg.id] ?? {}
  return {
    popularity: d.popularity ?? Math.max(45, 100 - alg.difficulty * 11),
    alternatives: d.alternatives ?? [{ label: 'Wariant z y-rotacją', moves: `y ${alg.moves}` }],
  }
}

/**
 * Lista alternatyw DO WYŚWIETLENIA. Na czoło wstrzykujemy pozycję „Domyślny",
 * która ZAWSZE wskazuje na BAZOWĄ sekwencję z algorithms.js — nie na aktualnie
 * nadpisaną. Dzięki temu użytkownik wraca do oryginału tym samym przyciskiem
 * „Ustaw jako główny", którym wybiera warianty (żadnej osobnej ścieżki resetu).
 *
 * `alg.moves` bywa już nadpisane (App podaje efektywną sekwencję), więc bazę
 * czytamy po `id` wprost z ALGORITHMS, a nie z przekazanego obiektu.
 */
export function getAlternatives(alg) {
  const base = ALGORITHMS.find((a) => a.id === alg.id)
  const baseMoves = base?.moves ?? alg.moves
  return [{ label: 'Domyślny', moves: baseMoves, isDefault: true }, ...getDetails(alg).alternatives]
}

/**
 * Jedno źródło prawdy dla stanu „Aktywny" — używane i przez Modal, i przez
 * Drawer. Porównujemy sekwencję wariantu PO odcięciu wiodącej rotacji (główny
 * algorytm trzymamy już bez „y") z efektywną sekwencją algorytmu. Wcześniej
 * Drawer porównywał surowo (`alt.moves === alg.moves`) i rozjeżdżał się z Modalem.
 */
export function isAlternativeActive(alt, alg) {
  return splitOrientation(alt.moves).moves === alg.moves
}

/**
 * Wariant, który użytkownik ma teraz ustawiony jako główny. Gdy pasuje kilka
 * (np. „Domyślny" i „Wariant z y-rotacją" to po odcięciu „y" te same ruchy),
 * wygrywa pierwszy z listy — czyli „Domyślny".
 */
export function activeAlternative(alg) {
  const list = getAlternatives(alg)
  return list.find((alt) => isAlternativeActive(alt, alg)) ?? list[0]
}
