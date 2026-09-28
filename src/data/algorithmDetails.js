/**
 * Warstwa szczegółów algorytmu — celowo ODDZIELONA od głównej bazy
 * (algorithms.js), żeby nie puchła. Trzymamy tu treść "premium" dla
 * modalu: alternatywne sekwencje i popularność.
 *
 * Osobiste rekordy NIE żyją tutaj — to realne pomiary z trybu treningu
 * (ProgressContext), liczone osobno dla każdego wariantu.
 *
 * Każdy wariant jest sprawdzony symulatorem: rozwiązuje TEN SAM przypadek
 * co sekwencja domyślna (z dokładnością do AUF). Zmiana `moves` istniejącego
 * wariantu „gubi" jego rekord — sekwencja jest kluczem PB.
 *
 * Braki są bezpieczne — getDetails() dokłada sensowny fallback.
 */
import { ALGORITHMS } from './algorithms'
import { splitOrientation } from '../lib/notation'

const DETAILS = {
  'oll-1': {
    alternatives: [
      { label: 'Od innej strony · wide · z D', moves: "y R U' R2 D' r U' r' D R2 U R'" },
      { label: 'Ze slice · wide', moves: "f R U R' U' R f' U' r' U' R U M'" },
    ],
  },
  'oll-2': {
    alternatives: [
      { label: 'Od innej strony · wide · z D', moves: "y' R U' R2 D' r U r' D R2 U R'" },
      { label: 'Ze slice · wide', moves: "F R U R' U' S R U R' U' f'" },
    ],
  },
  'oll-3': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y' f R U R' U' f' U' F R U R' U' F'" },
      { label: 'Ze slice · wide · krótszy (10)', moves: "r' R2 U R' U r U2 r' U M'" },
    ],
  },
  'oll-4': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y' f R U R' U' f' U F R U R' U' F'" },
      { label: 'Ze slice', moves: "R' F R F' U' S R' U' R U R S'" },
    ],
  },
  'oll-5': {
    alternatives: [
      { label: 'Od innej strony · lewą ręką · wide', moves: "y2 l' U2 L U L' U l" },
      { label: 'Od innej strony · wide', moves: "y2 R' F2 r U r' F R" },
    ],
  },
  'oll-6': {
    alternatives: [
      { label: 'Z D', moves: "F U' R2 D R' U' R D' R2 U F'" },
      { label: 'Od innej strony · lewą ręką · wide', moves: "y2 l U2 L' U' L U' l'" },
    ],
  },
  'oll-7': {
    alternatives: [
      { label: 'Ze slice', moves: "S' R U R' U R U2 R' U S" },
      { label: 'Lewą ręką', moves: "L' U2 L U2 L F' L' F" },
    ],
  },
  'oll-8': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y2 r' U' R U' R' U2 r" },
      { label: 'Lewą ręką · wide', moves: "l' U' L U' L' U2 l" },
    ],
  },
  'oll-9': {
    alternatives: [
      { label: 'Ze slice · krótszy (9)', moves: "R U2 R' U' S' R U' R' S" },
      { label: 'Od innej strony · wide · krótszy (10)', moves: "y2 F' U' F r U' r' U r U r'" },
    ],
  },
  'oll-10': {
    alternatives: [
      { label: 'Od innej strony · krótszy (10)', moves: "y F U F' R' F R U' R' F' R" },
      { label: 'Od innej strony · ze slice · krótszy (10)', moves: "y M' R' U2 R U R' U R U M" },
    ],
  },
  'oll-11': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y2 r U R' U R' F R F' R U2 r'" },
      { label: 'Ze slice', moves: "S R U R' U R U2 R' U2 S'" },
    ],
  },
  'oll-12': {
    alternatives: [
      { label: 'Od innej strony · ze slice', moves: "y' M' R' U' R U' R' U2 R U' M" },
      { label: 'Inna sekwencja', moves: "F R U R' U' F' U F R U R' U' F'" },
    ],
  },
  'oll-13': {
    alternatives: [
      { label: 'Krótszy (10)', moves: "F U R U2 R' U' R U R' F'" },
      { label: 'Wide · krótszy (10)', moves: "r U' r' U' r U r' F' U F" },
    ],
  },
  'oll-14': {
    alternatives: [
      { label: 'Wide', moves: "r U R' U' r' F R2 U R' U' F'" },
      { label: 'Lewą ręką · wide', moves: "l' U l U l' U' l F U' F'" },
    ],
  },
  'oll-15': {
    alternatives: [
      { label: 'Wide', moves: "r' U' r R' U' R U r' U r" },
      { label: 'Od innej strony · lewą ręką · wide', moves: "y2 l' U' l L' U' L U l' U l" },
    ],
  },
  'oll-16': {
    alternatives: [
      { label: 'Ze slice · wide · krótszy (9)', moves: "r U M U R' U' r U' r'" },
      { label: 'Od innej strony', moves: "y2 R' F R U R' U' F' R U' R' U2 R" },
    ],
  },
  'oll-17': {
    alternatives: [
      { label: 'Inna sekwencja', moves: "R U R' U R' F R F' U2 R' F R F'" },
      { label: 'Od innej strony · ze slice · wide', moves: "y2 F R' F' R2 r' U R U' R' U' M'" },
    ],
  },
  'oll-18': {
    alternatives: [
      { label: 'Od innej strony · ze slice · wide · krótszy (12)', moves: "y R U2 R2 F R F' U2 M' U R U' r'" },
      { label: 'Wide · krótszy (13)', moves: "r U R' U R U2 r2 U' R U' R' U2 r" },
    ],
  },
  'oll-19': {
    alternatives: [
      { label: 'Ze slice', moves: "M U R U R' U' M' R' F R F'" },
      { label: 'Inna sekwencja', moves: "R' U2 F R U R' U' F2 U2 F R" },
    ],
  },
  'oll-20': {
    alternatives: [
      { label: 'Ze slice · wide', moves: "r U R' U' M2 U R U' R' U' M'" },
      { label: 'Ze slice', moves: "M' U2 M U2 M' U M U2 M' U2 M" },
    ],
  },
  'oll-21': {
    alternatives: [
      { label: 'Od innej strony', moves: "y R U2 R' U' R U R' U' R U' R'" },
      { label: 'Od innej strony (2)', moves: "y F R U R' U' R U R' U' R U R' U' F'" },
    ],
  },
  'oll-22': {
    alternatives: [
      { label: 'Inna sekwencja', moves: "R' U2 R2 U R2 U R2 U2 R'" },
      { label: 'Ze slice · wide', moves: "f R U R' U' S' R U R' U' F'" },
    ],
  },
  'oll-23': {
    alternatives: [
      { label: 'Od innej strony · z D', moves: "y2 R2 D' R U2 R' D R U2 R" },
      { label: 'Inna sekwencja', moves: "R U R' U R U2 R2 U' R U' R' U2 R" },
    ],
  },
  'oll-24': {
    alternatives: [
      { label: 'Wide · krótszy (8)', moves: "r U R' U' r' F R F'" },
      { label: 'Od innej strony · wide · krótszy (8)', moves: "y2 R' F' r U R U' r' F" },
    ],
  },
  'oll-25': {
    alternatives: [
      { label: 'Z D', moves: "R U2 R D R' U2 R D' R2" },
      { label: 'Od innej strony · wide · krótszy (8)', moves: "y F' r U R' U' r' F R" },
    ],
  },
  'oll-26': {
    popularity: 97,
    alternatives: [
      { label: 'Inna sekwencja', moves: "R' U' R U' R' U2 R" },
      { label: 'Od innej strony · lewą ręką', moves: "y2 L' U' L U' L' U2 L" },
    ],
  },
  'oll-27': {
    popularity: 98,
    alternatives: [
      { label: 'Od innej strony', moves: "y' R' U2 R U R' U R" },
      { label: 'Od innej strony · lewą ręką', moves: "y L' U2 L U L' U L" },
    ],
  },
  'oll-28': {
    alternatives: [
      { label: 'Wide', moves: "r U R' U' r' R U R U' R'" },
      { label: 'Ze slice · krótszy (8)', moves: "R' F R S R' F' R S'" },
    ],
  },
  'oll-29': {
    alternatives: [
      { label: 'Od innej strony', moves: "y R U R' U' R U' R' F' U' F R U R'" },
      { label: 'Od innej strony · ze slice', moves: "y S' R U R' U' R' F R F' U S" },
    ],
  },
  'oll-30': {
    alternatives: [
      { label: 'Od innej strony · wide · z D', moves: "y' r' D' r U' r' D r2 U' r' U r U r'" },
      { label: 'Od innej strony', moves: "y2 F R' F R2 U' R' U' R U R' F2" },
    ],
  },
  'oll-31': {
    alternatives: [
      { label: 'Od innej strony · lewą ręką · ze slice · wide', moves: "y2 S' L' U' L U L F' L' f" },
      { label: 'Od innej strony · ze slice · wide · krótszy (8)', moves: "y S R U R' U' f' U' F" },
    ],
  },
  'oll-32': {
    alternatives: [
      { label: 'Od innej strony · lewą ręką', moves: "y2 L U F' U' L' U L F L'" },
      { label: 'Z B', moves: "R U B' U' R' U R B R'" },
    ],
  },
  'oll-33': {
    popularity: 88,
    alternatives: [
      { label: 'Od innej strony · lewą ręką', moves: "y2 L' U' L U L F' L' F" },
      { label: 'Od innej strony · wide', moves: "y2 r' F' r U r U' r' F" },
    ],
  },
  'oll-34': {
    alternatives: [
      { label: 'Od innej strony', moves: "y2 R U R2 U' R' F R U R U' F'" },
      { label: 'Wide', moves: "F R U R' U' R' F' r U R U' r'" },
    ],
  },
  'oll-35': {
    alternatives: [
      { label: 'Inna sekwencja', moves: "R U2 R2 F R F' R U2 R'" },
      { label: 'Wide', moves: "f R U R' U' f' R U R' U R U2 R'" },
    ],
  },
  'oll-36': {
    alternatives: [
      { label: 'Od innej strony · krótszy (10)', moves: "y R U R2 F' U' F U R2 U2 R'" },
      { label: 'Od innej strony · lewą ręką', moves: "y2 L' U' L U' L' U L U L F' L' F" },
    ],
  },
  'oll-37': {
    alternatives: [
      { label: 'Inna sekwencja', moves: "F R U' R' U' R U R' F'" },
      { label: 'Od innej strony · wide', moves: "y F' r U r' U' r' F r" },
    ],
  },
  'oll-38': {
    alternatives: [
      { label: 'Od innej strony · ze slice · wide · krótszy (10)', moves: "y F R U' R' S U' R U R' f'" },
      { label: 'Wide', moves: "r U R' U' r' F R U R U' R' F'" },
    ],
  },
  'oll-39': {
    alternatives: [
      { label: 'Od innej strony', moves: "y' R U R' F' U' F U R U2 R'" },
      { label: 'Od innej strony · lewą ręką', moves: "y L F' L' U' L U F U' L'" },
    ],
  },
  'oll-40': {
    alternatives: [
      { label: 'Od innej strony', moves: "y R' F R U R' U' F' U R" },
      { label: 'Wide · z D', moves: "R r D r' U r D' r' U' R'" },
    ],
  },
  'oll-41': {
    alternatives: [
      { label: 'Od innej strony · z D · krótszy (10)', moves: "y2 F U R2 D R' U' R D' R2 F'" },
      { label: 'Od innej strony · ze slice · krótszy (9)', moves: "y' S U' R' F' U' F U R S'" },
    ],
  },
  'oll-42': {
    alternatives: [
      { label: 'Inna sekwencja', moves: "R' U' R U' R' U2 R F R U R' U' F'" },
      { label: 'Od innej strony · ze slice · krótszy (9)', moves: "y F S' R U R' U' F' U S" },
    ],
  },
  'oll-43': {
    alternatives: [
      { label: 'Od innej strony · lewą ręką', moves: "y2 F' U' L' U L F" },
      { label: 'Lewą ręką · wide', moves: "f' L' U' L U f" },
    ],
  },
  'oll-44': {
    alternatives: [
      { label: 'Wide', moves: "f R U R' U' f'" },
      { label: 'Od innej strony · z B', moves: "y R U B U' B' R'" },
    ],
  },
  'oll-45': {
    popularity: 90,
    alternatives: [
      { label: 'Od innej strony', moves: "y R' F' U' F U R" },
      { label: 'Od innej strony · wide', moves: "y2 f U R U' R' f'" },
    ],
  },
  'oll-46': {
    alternatives: [
      { label: 'Inna sekwencja', moves: "R' F' U' F R U' R' U2 R" },
      { label: 'Od innej strony', moves: "y F R U R' U' F' U' R U R' U R U2 R'" },
    ],
  },
  'oll-47': {
    alternatives: [
      { label: 'Lewą ręką · krótszy (10)', moves: "F' L' U' L U L' U' L U F" },
      { label: 'Inna sekwencja', moves: "R' U' R' F R F' R' F R F' U R" },
    ],
  },
  'oll-48': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y2 f U R U' R' U R U' R' f'" },
      { label: 'Inna sekwencja', moves: "R U2 R' U' R U R' U2 R' F R F'" },
    ],
  },
  'oll-49': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y2 r U' r2 U r2 U r2 U' r" },
      { label: 'Lewą ręką · wide', moves: "l U' l2 U l2 U l2 U' l" },
    ],
  },
  'oll-50': {
    alternatives: [
      { label: 'Wide', moves: "r' U r2 U' r2 U' r2 U r'" },
      { label: 'Od innej strony · z B', moves: "y2 R' F R2 B' R2 F' R2 B R'" },
    ],
  },
  'oll-51': {
    alternatives: [
      { label: 'Wide', moves: "f R U R' U' R U R' U' f'" },
      { label: 'Od innej strony', moves: "y' R' U' R' F R F' R U' R' U2 R" },
    ],
  },
  'oll-52': {
    alternatives: [
      { label: 'Z B', moves: "R U R' U R U' B U' B' R'" },
      { label: 'Wide', moves: "R U R' U R d' R U' R' F'" },
    ],
  },
  'oll-53': {
    alternatives: [
      { label: 'Od innej strony · lewą ręką · wide', moves: "y2 l' U' L U' L' U L U' L' U2 l" },
      { label: 'Od innej strony · wide', moves: "y r' U2 R U R' U' R U R' U r" },
    ],
  },
  'oll-54': {
    alternatives: [
      { label: 'Od innej strony · wide', moves: "y' r U2 R' U' R U R' U' R U' r'" },
      { label: 'Od innej strony · wide (2)', moves: "y' r U r' R U R' U' R U R' U' r U' r'" },
    ],
  },
  'oll-55': {
    alternatives: [
      { label: 'Od innej strony · krótszy (12)', moves: "y R' F U R U' R2 F' R2 U R' U' R" },
      { label: 'Krótszy (11)', moves: "R U2 R2 U' R U' R' U2 F R F'" },
    ],
  },
  'oll-56': {
    alternatives: [
      { label: 'Ze slice · wide · krótszy (12)', moves: "r U r' U R U' R' M' U R U2 r'" },
      { label: 'Wide · krótszy (12)', moves: "F R U R' U' R F' r U R' U' r'" },
    ],
  },
  'oll-57': {
    alternatives: [
      { label: 'Od innej strony · ze slice · krótszy (8)', moves: "y R U' R' S' R U R' S" },
      { label: 'Od innej strony · ze slice · krótszy (8) (2)', moves: "y R U R' S' R U' R' S" },
    ],
  },
  'pll-t': {
    popularity: 99,
    alternatives: [
      { label: "Zakończenie F' L' U L", moves: "R U R' U' R' F R2 U' R' U F' L' U L" },
      { label: 'Wariant z u (wide)', moves: "R2 u R2 u' R2 F2 u' F2 u F2" },
    ],
  },
  'pll-ua': {
    popularity: 95,
    alternatives: [
      { label: 'Wersja R U (bez slice)', moves: "R U' R U R U R U' R' U' R2" },
      { label: 'Wersja R U — cube.academy', moves: "R U R' U R' U' R2 U' R' U R' U R" },
    ],
  },
  'pll-h': {
    popularity: 93,
    alternatives: [{ label: 'Odbicie U/U2', moves: "M2 U' M2 U2 M2 U' M2" }],
  },
  'pll-jb': {
    alternatives: [
      { label: 'Wariant R/L (bez F)', moves: "R U2 R' U' R U2 L' U R' U' L" },
      { label: 'Wariant z r (wide)', moves: "r' F R F' r U2 R' U R U2 R'" },
    ],
  },
  'pll-y': {
    alternatives: [
      { label: "Wariant F R' F", moves: "F R' F R2 U' R' U' R U R' F' R U R' U' F'" },
      { label: "Krótki (R2 U')", moves: "R2 U' R2 U' R2 U F U F' R2 F U' F'" },
    ],
  },
  'pll-aa': {
    alternatives: [
      { label: 'Start z l (bez pierwszego x)', moves: "l' U R' D2 R U' R' D2 R2 x'" },
      { label: "Wariant z x' (od drugiej strony)", moves: "y x' R2 D2 R' U' R D2 R' U R' x" },
    ],
  },
  'pll-ab': {
    alternatives: [
      { label: 'Bez rotacji (B, D)', moves: "R' B' R U' R D R' U R D' R2 B R" },
      { label: "Wariant z x' (od drugiej strony)", moves: "y x' R U' R D2 R' U R D2 R2 x" },
    ],
  },
  'pll-e': {
    alternatives: [
      { label: 'Bez rotacji x (R, D)', moves: "y R' U' R' D' R U' R' D R U R' D' R U R' D R2" },
      { label: 'Wariant z F (bez D)', moves: "R2 U F' R' U R U' R' U R U' R' U R U' F U' R2" },
    ],
  },
  'pll-f': {
    alternatives: [
      { label: 'Krótki (14 ruchów)', moves: "R' U R U' R2 F' U' F U R F R' F' R2" },
      { label: 'Wariant z R2 F', moves: "y R2 F R F' R' U' F' U F R2 U R' U' R" },
    ],
  },
  'pll-ga': {
    alternatives: [
      { label: 'Wariant z u (wide)', moves: "R2 u R' U R' U' R u' R2 F' U F" },
      { label: "Start od D'", moves: "D' R2 U R' U R' U' R U' R2 U' D R' U R" },
    ],
  },
  'pll-gb': {
    alternatives: [
      { label: 'Start od D', moves: "D R' U' R U D' R2 U R' U R U' R U' R2" },
      { label: 'Wariant z u (wide)', moves: "y F' U' F R2 u R' U R U' R u' R2" },
    ],
  },
  'pll-gc': {
    alternatives: [
      { label: 'Wariant z u (wide)', moves: "R2 u' R U' R U R' u R2 f R' f'" },
      { label: 'Start od D', moves: "D R2 U' R U' R U R' U R2 D' U R U' R'" },
    ],
  },
  'pll-gd': {
    alternatives: [
      { label: "Start od D'", moves: "D' R U R' U' D R2 U' R U' R' U R' U R2" },
      { label: 'Wariant z u (wide)', moves: "R U R' y' R2 u' R U' R' U R' u R2" },
    ],
  },
  'pll-ja': {
    alternatives: [
      { label: 'Lewa ręka (L F)', moves: "L' U' L F L' U' L U L F' L2 U L" },
      { label: 'Wariant R/L', moves: "R U' L' U R' U2 L U' L' U2 L" },
      { label: 'Z x i r — cube.academy', moves: "x R2 F R F' R U2 r' U r U2 x'" },
    ],
  },
  'pll-na': {
    alternatives: [
      { label: 'Krótszy (R F)', moves: "R F U' R' U R U F' R2 F' R U R U' R' F" },
      { label: "Powtórzenia r' D r U2", moves: "r' D r U2 r' D r U2 r' D r U2 r' D r U2 r' D r" },
    ],
  },
  'pll-nb': {
    alternatives: [
      { label: 'Wariant R/L', moves: "R' U L' U2 R U' L R' U L' U2 R U' L" },
      { label: 'Wariant z r (wide)', moves: "r' D' F r U' r' F' D r2 U r' U' r' F r F'" },
      { label: "Zakończenie f R f' — cube.academy", moves: "R' U R U' R' F' U' F R U R' U' R U' f R f'" },
    ],
  },
  'pll-ra': {
    alternatives: [
      { label: 'Wariant z F (bez D)', moves: "y R U R' F' R U2 R' U2 R' F R U R U2 R'" },
      { label: 'Lewa ręka', moves: "L U2 L' U2 L F' L' U' L U L F L2" },
    ],
  },
  'pll-rb': {
    alternatives: [
      { label: 'Wariant z D', moves: "R' U2 R' D' R U' R' D R U R U' R' U' R" },
      { label: 'Wariant z R2 F', moves: "y R2 F R U R U' R' F' R U2 R' U2 R" },
    ],
  },
  'pll-ub': {
    alternatives: [
      { label: 'Wersja R U (bez slice)', moves: "R' U R' U' R' U' R' U R U R2" },
      { label: 'Wariant R2 U', moves: "y2 R2 U R U R' U' R' U' R' U R'" },
    ],
  },
  'pll-v': {
    alternatives: [
      { label: 'Wariant z f (wide)', moves: "R' U R U' R' f' U' R U2 R' U' R U' R' f R" },
      { label: 'Wariant z y w środku', moves: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
    ],
  },
  'pll-z': {
    alternatives: [
      { label: "Start od M'", moves: "M' U' M2 U' M2 U' M' U2 M2" },
      { label: "Odbicie U'", moves: "y M2 U' M2 U' M' U2 M2 U2 M'" },
    ],
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
