/**
 * Warstwa szczegółów algorytmu — celowo ODDZIELONA od głównej bazy
 * (algorithms.js), żeby nie puchła. Trzymamy tu treść "premium" dla
 * bocznego panelu: alternatywne sekwencje, wskazówki fingertricku,
 * popularność i osobisty rekord (seed demo).
 *
 * Braki są bezpieczne — getDetails() dokłada sensowny fallback.
 */
import { ALGORITHMS } from './algorithms'
import { splitOrientation } from '../lib/notation'

// pb: ms (seed demo — docelowo z realnych pomiarów per-alg)
const DETAILS = {
  'oll-27': {
    popularity: 98,
    pb: 812,
    tips: 'Klasyczny trigger R U R\' napędzaj palcem wskazującym prawej ręki na U; ostatnie R U2 R\' zrób jednym płynnym ruchem nadgarstka, bez regripu.',
    alternatives: [
      { label: 'Lewa ręka (mirror)', moves: "L' U' L U' L' U2 L" },
      { label: 'Wide / one-look', moves: "R U R' U R U2' R'" },
    ],
  },
  'oll-26': {
    popularity: 97,
    pb: 934,
    tips: 'Otwórz od R U2 kciukiem i wskazującym; sekwencję U\' R U\' R\' domknij bez przekładania dłoni — to najszybszy anti-Sune.',
    alternatives: [
      { label: 'Lewa ręka (mirror)', moves: "L' U2 L U L' U L" },
      { label: 'Wariant M-slice', moves: "R' U' R U' R' U2 R" },
    ],
  },
  'oll-33': {
    popularity: 88,
    pb: 1102,
    tips: 'F R U R\' U\' F\' to "sexy move" w środku — trzymaj kostkę stabilnie kciukami z tyłu i pracuj wyłącznie wskazującymi.',
    alternatives: [{ label: 'Wersja z F (Suit Up mirror)', moves: "F' L' U' L U F" }],
  },
  'oll-45': {
    popularity: 90,
    pb: 998,
    tips: 'Najprostszy OLL: F R U R\' U\' F\'. Idealny do treningu jednego, czystego trigger-a — bez rotacji całej kostki.',
    alternatives: [{ label: 'Mirror (lewa)', moves: "f R U R' U' f'" }],
  },
  'pll-t': {
    popularity: 99,
    pb: 1043,
    tips: 'T-Perm: pierwsze R U R\' U\' prawą ręką, potem R\' F R2 przełóż płynnie; ostatnie U\' R U R\' F\' domknij lewym kciukiem na F.',
    alternatives: [{ label: 'Wariant z r (wide)', moves: "r U R' U' r' F R F'" }],
  },
  'pll-ua': {
    popularity: 95,
    pb: 889,
    tips: 'U-Perm na M-slice: prowadź slice prawym palcem serdecznym, U-y kciukiem. Płynność ważniejsza niż siła.',
    alternatives: [{ label: 'Wersja R U (bez slice)', moves: "R U' R U R U R U' R' U' R2" }],
  },
  'pll-h': {
    popularity: 93,
    pb: 741,
    tips: 'H-Perm to czysta symetria M2 U M2 — trenuj równy rytm slice\'ów, oba M2 tym samym palcem.',
    alternatives: [{ label: 'Odbicie U/U2', moves: "M2 U' M2 U2 M2 U' M2" }],
  },
}

/**
 * Zwraca kompletne szczegóły dla danego algorytmu — zawsze wypełnione.
 * Fallback: popularność z trudności, wariant y-rotacji, ogólny tip.
 */
export function getDetails(alg) {
  const d = DETAILS[alg.id] ?? {}
  return {
    popularity: d.popularity ?? Math.max(45, 100 - alg.difficulty * 11),
    pb: d.pb ?? null,
    tips:
      d.tips ??
      'Prowadź sekwencję płynnymi trigger-ami (R U R\' U\'), minimalizuj rotacje nadgarstka i unikaj zbędnych regripów.',
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
