import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { parseMoves } from '../../lib/moves'

/**
 * Cube3D — matowa, interaktywna kostka 3×3 na @react-three/fiber.
 *
 * ─────────── STRATEGIA ANIMACJI WARSTW ───────────
 * Zamiast reparentowania sub-meshy do pivota (kruche przy reconcilerze
 * R3F), obracamy warstwę CZYSTO MATEMATYCZNIE: dla każdego klocka z danej
 * warstwy w każdej klatce mnożymy jego pozycję i orientację przez maleńki
 * kwaternion delta wokół osi świata. Suma delt = 90° (lub 180° dla "2").
 * Po zakończeniu ruchu przyciągamy pozycje do siatki (snap), więc kolejny
 * ruch poprawnie wybiera klocki. Elegancko, bez grup i bez wycieków.
 *
 * @param {{ moves: string, playSignal: number }} props
 *   playSignal — licznik; jego zmiana resetuje kostkę i odtwarza sekwencję.
 */

// Stonowana, matowa paleta spójna z premium designem (nie plastik!).
const STICKER = {
  R: '#A6544B', // przygaszona cegła
  L: '#C08552', // matowa terakota
  U: '#F4F3EE', // alabaster
  D: '#C9A961', // ochra
  F: '#5F7A63', // szałwiowa zieleń
  B: '#4C6B82', // stonowany błękit
}
const BODY = '#1A1A1A' // grafitowe wnętrze klocka

// Wektory osi świata dla obrotów (parsowanie ruchów żyje w lib/moves.js —
// wspólne z MiniCube i Trenażerem notacji).
const AXIS_VEC = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}

// 26 klocków (bez niewidocznego rdzenia) na siatce -1,0,1.
const INITIAL = []
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++) if (x || y || z) INITIAL.push({ x, y, z })

/** Pojedynczy klocek: box z 6 materiałami (kolor tylko na ścianie zewnętrznej). */
function Cubelet({ data, meshRef }) {
  const faces = [
    data.x === 1 ? STICKER.R : BODY, // +x
    data.x === -1 ? STICKER.L : BODY, // -x
    data.y === 1 ? STICKER.U : BODY, // +y
    data.y === -1 ? STICKER.D : BODY, // -y
    data.z === 1 ? STICKER.F : BODY, // +z
    data.z === -1 ? STICKER.B : BODY, // -z
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

function CubeModel({ moves, playSignal }) {
  const refs = useRef([])
  const anim = useRef({ queue: [], current: null })

  // Reset do ułożonej + zakolejkowanie sekwencji przy każdym Play.
  useEffect(() => {
    INITIAL.forEach((d, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.set(d.x, d.y, d.z)
      g.quaternion.identity()
    })
    anim.current.queue = playSignal > 0 ? parseMoves(moves) : []
    anim.current.current = null
  }, [playSignal, moves])

  const startMove = (m) => {
    const cubelets = []
    refs.current.forEach((g, i) => {
      if (g && Math.round(g.position[m.axis]) === m.layer) cubelets.push(i)
    })
    return { ...m, axisVec: AXIS_VEC[m.axis], target: (m.turns * Math.PI) / 2, done: 0, cubelets }
  }

  useFrame((_, delta) => {
    const a = anim.current
    if (!a.current) {
      if (!a.queue.length) return
      a.current = startMove(a.queue.shift())
    }
    const move = a.current
    const speed = Math.PI / 2 / 0.55 // 90° w ~0.55 s
    let mag = speed * Math.min(delta, 0.05)
    if (move.done + mag > move.target) mag = move.target - move.done

    const dq = new THREE.Quaternion().setFromAxisAngle(move.axisVec, mag * move.dir)
    for (const i of move.cubelets) {
      const g = refs.current[i]
      if (!g) continue
      g.position.applyQuaternion(dq) // obrót pozycji wokół osi świata
      g.quaternion.premultiply(dq) // obrót własnej orientacji klocka
    }
    move.done += mag

    if (move.done >= move.target - 1e-5) {
      // snap do siatki, żeby kolejny ruch wybrał właściwe klocki
      for (const i of move.cubelets) {
        const g = refs.current[i]
        g.position.set(Math.round(g.position.x), Math.round(g.position.y), Math.round(g.position.z))
      }
      a.current = null
    }
  })

  // Skala < 1: nawet ustawiona „rogiem" do kamery (przekątna ~1,7× szersza
  // niż ścianą) kostka mieści się w kaflu i nie wychodzi poza okno.
  return (
    <group scale={0.78}>
      {INITIAL.map((d, i) => (
        <Cubelet key={i} data={d} meshRef={(el) => (refs.current[i] = el)} />
      ))}
    </group>
  )
}

export default function Cube3D({ moves, playSignal = 0 }) {
  // Klucz resetuje scenę, gdy zmienia się algorytm (inny modal).
  const key = useMemo(() => moves, [moves])
  return (
    <Canvas
      key={key}
      shadows
      dpr={[1, 2]}
      camera={{ position: [4, 3.4, 4.8], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* subtelne, eleganckie światło — nie ma być studio, ma być spokój */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={0.95} castShadow shadow-mapSize={[1024, 1024]} />

      <CubeModel moves={moves} playSignal={playSignal} />

      {/* miękki cień kontaktowy pod kostką */}
      <ContactShadows position={[0, -1.65, 0]} opacity={0.32} scale={9} blur={2.6} far={4} color="#141210" />

      {/* orbita z ograniczonym zoomem — minDistance dobrany tak, aby nawet
          maksymalne przybliżenie i obrót rogiem nie wypchnęły kostki z kafla */}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={9}
        enableDamping
        dampingFactor={0.12}
      />
    </Canvas>
  )
}
