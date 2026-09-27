import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import { visualMove } from '../../lib/moves'

/**
 * StudioCube — JEDYNA, duża, trwała kostka 3D Notation Studio.
 *
 * W przeciwieństwie do `Cube3D` (który przy każdym „Play" resetuje kostkę i
 * odtwarza CAŁĄ sekwencję od ułożonej) ta kostka jest STANOWA i TRWAŁA: każdy
 * kliknięty ruch dokłada się do bieżącego układu, a kostka nigdy się sama nie
 * resetuje. To ma być notacja „na żywo" — użytkownik buduje własny scramble
 * klikając kafelki, dokładnie tak jak kręciłby prawdziwą kostką w rękach.
 *
 * ─────────────── MOST: React state → useFrame (Three.js) ───────────────
 * `queue` (prop) to TYLKO fakty Reacta: „w tej kolejności kliknięto te tokeny".
 * Nie trzymamy w Reakcie żadnej pozycji/kąta — to renderowałoby scenę przy
 * każdej klatce. Zamiast tego w `useEffect` przepisujemy NOWE wpisy `queue` do
 * wewnętrznego `useRef` (FIFO poza Reactem), a `useFrame` co klatkę odpytuje
 * ten ref i bezpośrednio mutuje `position`/`quaternion` meshy. React re-renderuje
 * się tylko gdy ktoś kliknie kafelek (rzadko); animacja 60fps żyje całkowicie
 * poza cyklem renderowania Reacta.
 *
 * ─────────────── COOLDOWN ───────────────
 * Blokadę anty-spam trzyma teraz RODZIC (`SyntaxPage`, stan `isCooldown`) —
 * to on odmawia dopisania nowego tokenu do `queue`, zanim animacja + 1 s
 * "oddechu" się nie skończą. Tutaj, na wszelki wypadek (obrona w głębi),
 * `cooldownUntil` wciąż pilnuje, żeby dwa ruchy z FIFO nigdy się nie nałożyły
 * w klatce — ale w normalnym użyciu FIFO ma zawsze 0–1 elementów, bo rodzic
 * już wcześniej zamknął bramkę.
 *
 * ─────────────── KAMERA: dystans/FOV, nie scale ───────────────
 * Kostka jest CELOWO renderowana w naturalnej skali (1 j. = 1 klocek) — na
 * tym opiera się `Math.round(...)` przy wybieraniu warstwy do obrotu. Żeby
 * kostka wyglądała mniejsza (dużo „oddechu" w kadrze), odsuwamy KAMERĘ i
 * zwężamy FOV, zamiast skalować model. Dzięki temu `ContactShadows`
 * (kalibrowany w tych samych jednostkach świata) i `OrbitControls`
 * (min/maxDistance) w ogóle nie muszą się zmieniać.
 */

const STICKER = {
  R: '#A6544B',
  L: '#C08552',
  U: '#F4F3EE',
  D: '#C9A961',
  F: '#5F7A63',
  B: '#4C6B82',
}
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

const COOLDOWN_MS = 1000
const TURN_SECONDS = 0.55 // 90° w ~0.55 s — pewny, „materialny" ruch, nie pośpiech

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
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        {faces.map((c, i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} color={c} roughness={0.85} metalness={0.05} />
        ))}
      </mesh>
    </group>
  )
}

function StudioModel({ queue, resetSignal }) {
  const refs = useRef([])
  const processedCount = useRef(0)
  const fifo = useRef([]) // sparsowane ruchy czekające na wykonanie (poza Reactem)
  const anim = useRef({ current: null, cooldownUntil: 0 })

  const snapSolved = useCallback(() => {
    INITIAL.forEach((d, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.set(d.x, d.y, d.z)
      g.quaternion.identity()
    })
  }, [])

  // Reset na żądanie (przycisk) — czyści też kolejkę, żeby nie „doleciały"
  // stare ruchy po ułożeniu kostki na nowo.
  useEffect(() => {
    if (resetSignal === 0) return
    snapSolved()
    fifo.current = []
    anim.current = { current: null, cooldownUntil: 0 }
  }, [resetSignal, snapSolved])

  // Nowe tokeny w `queue` (kliknięcia z lewej kolumny) → dopisz do wewnętrznego FIFO.
  useEffect(() => {
    for (let i = processedCount.current; i < queue.length; i++) {
      const move = visualMove(queue[i].token)
      if (move) fifo.current.push(move)
    }
    processedCount.current = queue.length
  }, [queue])

  useFrame((_, delta) => {
    const a = anim.current

    if (!a.current) {
      const now = performance.now()
      if (now < a.cooldownUntil) return // cooldown w toku — czekamy, nawet jeśli FIFO ma coś do zrobienia
      if (!fifo.current.length) return
      const move = fifo.current.shift()
      const cubelets = []
      refs.current.forEach((g, i) => {
        if (g && move.layers.includes(Math.round(g.position[move.axis]))) cubelets.push(i)
      })
      a.current = {
        axisVec: AXIS_VEC[move.axis],
        dir: move.dir,
        target: (move.turns * Math.PI) / 2,
        done: 0,
        cubelets,
      }
    }

    const move = a.current
    const speed = Math.PI / 2 / TURN_SECONDS
    let mag = speed * Math.min(delta, 0.05)
    if (move.done + mag > move.target) mag = move.target - move.done

    const dq = new THREE.Quaternion().setFromAxisAngle(move.axisVec, mag * move.dir)
    for (const i of move.cubelets) {
      const g = refs.current[i]
      if (!g) continue
      g.position.applyQuaternion(dq)
      g.quaternion.premultiply(dq)
    }
    move.done += mag

    if (move.done >= move.target - 1e-5) {
      // snap do siatki całkowitej, żeby kolejny ruch poprawnie wybrał warstwę
      for (const i of move.cubelets) {
        const g = refs.current[i]
        g.position.set(Math.round(g.position.x), Math.round(g.position.y), Math.round(g.position.z))
      }
      anim.current = { current: null, cooldownUntil: performance.now() + COOLDOWN_MS }
    }
  })

  return (
    <group>
      {INITIAL.map((d, i) => (
        <Cubelet key={i} data={d} meshRef={(el) => (refs.current[i] = el)} />
      ))}
    </group>
  )
}

/**
 * @param {{ queue: {id:number, token:string}[] }} props
 */
export default function StudioCube({ queue }) {
  const [resetSignal, setResetSignal] = useState(0)

  return (
    <div className="relative h-full w-full min-w-0 overflow-hidden">
      <button
        onClick={() => setResetSignal((n) => n + 1)}
        className="absolute right-3 top-3 z-10 flex min-h-[36px] touch-manipulation items-center gap-1.5 rounded-full border border-ink-900/[0.08] bg-white/60 px-3 py-1.5 text-[11px] font-medium text-ink-500 backdrop-blur-md transition-colors duration-200 hover:border-ink-900/20 hover:text-ink-950 md:right-5 md:top-5"
      >
        <RotateCcw size={12} strokeWidth={2} />
        Reset
      </button>

      {/* Kamera odsunięta + wąski FOV: kostka zajmuje ~55-60% wysokości kadru,
          zamiast wypełniać cały bento-box — więcej „oddechu", premium look. */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [8, 7, 9], fov: 28 }}
        gl={{ antialias: true, alpha: true }}
        // touch-action: none → gest na kostce trafia w OrbitControls (płynny
        // obrót jednym palcem, pinch-zoom), zamiast scrollować stronę
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 5]} intensity={0.95} castShadow shadow-mapSize={[1024, 1024]} />

        <StudioModel queue={queue} resetSignal={resetSignal} />

        <ContactShadows position={[0, -1.65, 0]} opacity={0.32} scale={9} blur={2.6} far={4} color="#141210" />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={10}
          maxDistance={18}
          enableDamping
          dampingFactor={0.12}
        />
      </Canvas>
    </div>
  )
}
