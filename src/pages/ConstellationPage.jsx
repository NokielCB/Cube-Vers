import { useCallback, useMemo } from 'react'
import ReactFlow, { Background, BackgroundVariant, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import { Share2 } from 'lucide-react'
import { ALGORITHMS } from '../data/algorithms'
import { NODE_POSITIONS, RELATIONS } from '../data/algorithmMap'
import AlgorithmNode from '../components/map/AlgorithmNode'

/**
 * ConstellationPage — interaktywna mapa myśli algorytmów na React Flow.
 *
 * ────────── WYDAJNOŚĆ (60 FPS przy pan/zoom) ──────────
 *  1. `nodeTypes` zdefiniowane POZA komponentem → stabilna referencja.
 *     Gdyby powstawał nowy obiekt przy każdym renderze, React Flow
 *     przemontowywałby WSZYSTKIE węzły — zabójstwo dla płynności.
 *  2. Węzeł (AlgorithmNode) jest w React.memo → re-render tylko przy
 *     zmianie własnych propsów.
 *  3. `onlyRenderVisibleElements` → poza ekranem węzły nie są rysowane.
 *  4. `nodes`/`edges` w useMemo → nie tworzymy tablic na nowo bez potrzeby.
 *  5. Pan/zoom robi transformację CSS na jednym kontenerze (GPU), więc
 *     dziesiątki lekkich SVG jadą gładko.
 */

// STABILNA referencja — klucz do wydajności React Flow.
const nodeTypes = { algorithm: AlgorithmNode }

// Luksusowe, cieniutkie krawędzie (1px, ciemnoszare).
const defaultEdgeOptions = {
  type: 'default',
  style: { stroke: 'rgba(23,23,23,0.26)', strokeWidth: 1 },
}

export default function ConstellationPage({ statuses = {}, onOpenAlg }) {
  // Węzły z bazy + pozycje z mapy; status wstrzykujemy do data.
  const nodes = useMemo(
    () =>
      ALGORITHMS.filter((a) => NODE_POSITIONS[a.id]).map((a) => ({
        id: a.id,
        type: 'algorithm',
        position: NODE_POSITIONS[a.id],
        data: { alg: a, status: statuses[a.id] ?? 'new' },
      })),
    [statuses],
  )

  // Krawędzie z relacji — stałe, więc bez zależności.
  const edges = useMemo(
    () =>
      RELATIONS.map(([source, target]) => ({
        id: `${source}-${target}`,
        source,
        target,
      })),
    [],
  )

  // Klik węzła → nasz centralny modal (id === id algorytmu).
  const onNodeClick = useCallback((_, node) => onOpenAlg?.(node.id), [onOpenAlg])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-10 lg:px-10">
      <div className="mb-5 flex items-baseline gap-3">
        <div className="flex items-center gap-2">
          <Share2 size={16} strokeWidth={1.5} className="text-ink-400" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
            Algorithmic Constellation
          </h1>
        </div>
        <span className="text-[11px] font-medium text-ink-400">
          Kliknij węzeł, aby zobaczyć szczegóły · przeciągnij tło, aby przesuwać
        </span>
      </div>

      {/* płótno w szklanym kaflu */}
      {/* mobile: 100dvh (dynamiczny pasek Safari) minus nagłówek + bottom nav */}
      <div className="tile h-[calc(100dvh-260px)] min-h-[400px] overflow-hidden !p-0 md:h-[calc(100vh-190px)] md:min-h-[520px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={1.75}
          nodesDraggable={false}
          nodesConnectable={false}
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: false }}
          className="bg-transparent"
        >
          {/* surowa siatka punktów o niskim opacity */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={26}
            size={1.4}
            color="rgba(23,23,23,0.10)"
          />
          <Controls
            showInteractive={false}
            className="overflow-hidden rounded-xl border border-white/40 !shadow-soft"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
