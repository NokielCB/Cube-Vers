import { motion } from 'framer-motion'

/**
 * ChartSkeleton — elegancki placeholder w kształcie kafla bento na czas
 * ładowania danych. Delikatny „shimmer" (przesuwający się połysk) zamiast
 * krzykliwego spinnera — spójne z estetyką Apple.
 *
 * @param {{ height?:number, bars?:boolean }} props
 */
export default function ChartSkeleton({ height = 180, bars = false }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink-900/[0.03]" style={{ height }}>
      {/* zarys treści */}
      {bars ? (
        <div className="flex h-full items-end gap-3 p-6">
          {[0.5, 0.8, 0.65, 0.4, 0.55].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-ink-900/[0.06]"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center px-6">
          <div className="h-px w-full bg-ink-900/[0.08]" />
        </div>
      )}

      {/* przesuwający się połysk */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
