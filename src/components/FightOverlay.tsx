import { AnimatePresence, motion } from 'motion/react'
import { Fish, TriangleAlert } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

function tensionColor(tension: number) {
  if (tension >= 78) return '#e2685a'
  if (tension >= 55) return '#f2c15c'
  return '#6fe0cf'
}

export function FightOverlay() {
  const fight = useGameStore((s) => s.fight)
  const phase = useGameStore((s) => s.phase)
  const isTouch = useIsTouch()
  const visible = Boolean(fight) && phase === 'fight'

  const tension = fight?.tension ?? 0
  const progress = fight?.progress ?? 0
  const pulling = fight?.pulling ?? false
  const danger = tension >= 78

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center px-4 sm:bottom-9">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'glass w-full max-w-[380px] rounded-2xl px-4 py-3.5 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.9)]',
              danger && 'border-destructive/40',
            )}
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-tide/15 text-tide">
                  <Fish className="size-3.5" />
                </span>
                <span className="text-[13px] font-medium text-foam">收线中</span>
                {pulling && (
                  <span className="flex items-center gap-1 rounded-full bg-destructive/18 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
                    鱼在挣扎
                  </span>
                )}
              </div>
              <span className="tnum text-[11px] text-muted-foreground">{Math.round(progress)}%</span>
            </div>

            <div className="mb-1 flex items-center justify-between text-[10px] tracking-wide text-muted-foreground">
              <span>渔获进度</span>
              <span className="text-gold/70">拉到 100% 即可上船</span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-foam/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-tide via-gold to-primary transition-[width] duration-100 ease-out"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>

            <div className="mb-1 flex items-center justify-between text-[10px] tracking-wide">
              <span className="text-muted-foreground">鱼线张力</span>
              <span className={cn('tnum font-semibold', danger ? 'text-destructive' : 'text-foam/70')}>
                {Math.round(tension)}%
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-foam/10">
              <div className="absolute inset-y-0 left-[78%] w-px bg-destructive/60" />
              <div
                className={cn('h-full rounded-full transition-[width] duration-100 ease-out', danger && 'animate-pulse')}
                style={{ width: `${Math.max(2, tension)}%`, backgroundColor: tensionColor(tension) }}
              />
            </div>

            <div
              className={cn(
                'mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px]',
                pulling ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {pulling ? <TriangleAlert className="size-3.5 shrink-0" /> : null}
              {pulling
                ? '鱼在发力，快松手泄力，别把线绷断'
                : isTouch
                  ? '按住右侧「收线」慢慢拉回来'
                  : '按住空格收线，张力过高时松手'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
