import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { visualMove } from '../../lib/moves'

/**
 * MiniCube — lekka kostka 3×3 pokazująca JEDEN ruch, z 1-sekundowym cooldownem.
 *
 * ─────────────── OPTYMALIZACJA WIELU MAŁYCH CANVASÓW ───────────────
 * `frameloop="demand"`: R3F renderuje klatkę tylko po `invalidate()`. Kafelek
 * bez interakcji rysuje ułożoną kostkę raz i zasypia — zero kosztu GPU. Hover
 * budzi pętlę; w każdej klatce animacji sami wołamy `invalidate()`. Brak cieni,
 * brak OrbitControls, niższe dpr → miniatura jest tania.
 *
 * ─────────────── KADR KAMERY ───────────────
 * Kostka (z rotacjami całości) zakreśla narożnikami promień ~2 j. Dobieramy
 * DYSTANS + `fov` tak, by przy 90° obrocie nic nie wychodziło poza kadr —
 * z zapasem (white space). Kadr zależy od pionowego fov i dystansu, więc jest
 * niezależny od rozdzielczości; szerokość dobiera aspect kontenera.
 *
 * ─────────────── COOLDOWN (1 s) ───────────────
 * Cykl życia sterujemy stanem Reacta (`phase`) + `setTimeout`, NIE w pętli
 * rAF. Po zakończeniu animacji kostka ZATRZYMUJE się na stanie końcowym (nie
 * wraca od razu do ułożonej!), a my odczekujemy 1 s — użytkownik widzi, co
 * ruch zmienił. Timer sprzątamy w cleanupie (clearTimeout), więc odmontowanie
 * kafelka w trakcie odliczania nie zostawia wiszącego callbacku (brak leaków).
 */

const STICKER = { R: '#A6544B', L: '#C08552', U: '#F4F3EE', D: '#C9A961', F: '#5F7A63', B: '#4C6B82' }
const BODY = '#1A1A1A'
const AXIS_VEC = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}

const INITIAL = []
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++) if (x || y || z) INITIAL.push({ x, y, z })

function Cubelet({ data, meshRef }) {
  const faces = [
    data.x === 1 ? STICKER.R : BODY,
    data.x === -1 ? STICKER.L : BODY,
    data.y === 1 ? STICKER.U : BODY,
    data.y === -1 ? STICKER.D : BODY,
    data.z === 1 ? STICKER.F : BODY,
    data.z === -1 ? STICKER.B : BODY,
  ]
  return (
    <group ref={meshRef} position={[data.x, data.y, data.z]}>
      <mesh>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        {faces.map((c, i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} color={c} roughness={0.85} metalness={0.05} />
        ))}
      </mesh>
    </group>
  )
}

/** Odtwarza pojedynczy ruch przy każdej zmianie `playId`; woła onComplete. */
function Model({ token, playId, onComplete }) {
  const refs = useRef([])
  const move = useMemo(() => visualMove(token), [token])
  const anim = useRef({ running: false, done: 0, cubelets: null })
  const { invalidate } = useThree()

  const snapSolved = useCallback(() => {
    INITIAL.forEach((d, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.set(d.x, d.y, d.z)
      g.quaternion.identity()
    })
  }, [])

  useEffect(() => {
    if (playId === 0) {
      snapSolved() // stan początkowy: ułożona kostka
      invalidate()
      return
    }
    // nowe odtworzenie: wróć do ułożonej i wystartuj (poprzedni stan końcowy znika)
    snapSolved()
    anim.current = { running: !!move, done: 0, cubelets: null }
    invalidate()
  }, [playId, move, snapSolved, invalidate])

  useFrame((_, delta) => {
    const a = anim.current
    if (!a.running || !move) return

    // Warstwy wybieramy RAZ na odtworzenie (na ułożonej kostce pozycje całkowite).
    if (!a.cubelets) {
      a.cubelets = []
      refs.current.forEach((g, i) => {
        if (g && move.layers.includes(Math.round(g.position[move.axis]))) a.cubelets.push(i)
      })
    }

    const target = (move.turns * Math.PI) / 2
    const speed = Math.PI / 2 / 0.7
    let mag = speed * Math.min(delta, 0.05)
    if (a.done + mag > target) mag = target - a.done

    const dq = new THREE.Quaternion().setFromAxisAngle(AXIS_VEC[move.axis], mag * move.dir)
    for (const i of a.cubelets) {
      const g = refs.current[i]
      if (!g) continue
      g.position.applyQuaternion(dq)
      g.quaternion.premultiply(dq)
    }
    a.done += mag

    if (a.done >= target - 1e-5) {
      a.running = false // ZATRZYMAJ na stanie końcowym — cooldown ogarnia rodzic
      onComplete?.()
    }
    invalidate()
  })

  return (
    <group>
      {INITIAL.map((d, i) => (
        <Cubelet key={i} data={d} meshRef={(el) => (refs.current[i] = el)} />
      ))}
    </group>
  )
}

const COOLDOWN_MS = 1000

export default function MiniCube({ token, active = false }) {
  // Cykl: idle → playing → resting(1s) → (active ? playing : idle)
  const [phase, setPhase] = useState('idle')
  const [playId, setPlayId] = useState(0)
  const activeRef = useRef(active)
  const timerRef = useRef(0)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  // Start odtworzenia, gdy kafelek jest aktywny i akurat bezczynny.
  useEffect(() => {
    if (active && phase === 'idle') {
      setPhase('playing')
      setPlayId((id) => id + 1)
    }
  }, [active, phase])

  // Koniec animacji → 1 s przestoju na stanie końcowym, potem ewentualnie znów.
  const handleComplete = useCallback(() => {
    setPhase('resting')
    timerRef.current = setTimeout(() => {
      if (activeRef.current) {
        setPhase('playing')
        setPlayId((id) => id + 1)
      } else {
        setPhase('idle')
      }
    }, COOLDOWN_MS)
  }, [])

  // KLUCZOWE: sprzątamy timer przy odmontowaniu — żadnego callbacku po unmount.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [4.6, 4.0, 5.6], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={0.85} />
      <Model token={token} playId={playId} onComplete={handleComplete} />
    </Canvas>
  )
}
