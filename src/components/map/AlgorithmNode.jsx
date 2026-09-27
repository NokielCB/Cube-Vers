import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import CubeDiagram from '../cube/CubeDiagram'

/**
 * AlgorithmNode — customowy węzeł React Flow w formie mini bento-boxa.
 *
 * WYDAJNOŚĆ: owinięty w React.memo — przy pan/zoom React Flow renderuje
 * wiele węzłów; memo sprawia, że pojedynczy węzeł re-renderuje się tylko
 * gdy zmienią się JEGO propsy (np. status), a nie przy każdym ruchu mapy.
 *
 * Handle'e (kotwice krawędzi) są celowo maleńkie i wtapiają się w tło —
 * liczy się czysta linia między kafelkami, nie widoczne "porty".
 */
function AlgorithmNode({ data }) {
  const { alg, status = 'new' } = data
  const dot =
    status === 'mastered' ? 'bg-ink-950' : status === 'learning' ? 'bg-ochre' : 'bg-ink-900/20'
  const label =
    status === 'mastered' ? 'Mastered' : status === 'learning' ? 'Learning' : 'To learn'

  return (
    <div className="w-[168px] rounded-3xl border border-white/40 bg-white/60 p-3 shadow-soft backdrop-blur-xl transition-shadow duration-300 hover:shadow-soft-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !border-0 !bg-ink-900/20"
      />

      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-white/50 p-1">
          <CubeDiagram pattern={alg.pattern} className="h-11 w-11" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-ink-950">
            {alg.name}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
            {alg.category} {alg.caseNumber}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] font-medium text-ink-400">{label}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !border-0 !bg-ink-900/20"
      />
    </div>
  )
}

export default memo(AlgorithmNode)
