import { AnimatePresence, motion } from 'motion/react'
import { Flag, Timer } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

export function DragonRaceHud() {
  const race = useGameStore((s) => s.dragonRace)
  const underwater = useGameStore((s) => s.underwater)

  const show = !!race && race.active && !underwater
  const low = !!race && race.timeLeft <= 15

  return (
    <AnimatePresence>
      {show && race && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="pointer-events-none fixed left-1/2 z-30 top-[max(4.6rem,calc(env(safe-area-inset-top)+4.2rem))] -translate-x-1/2"
        >
          <div
            className={cn(
              'glass flex items-center gap-3 rounded-full py-1.5 pl-2.5 pr-4',
              low && 'border-destructive/45',
            )}
          >
            <span className="grid size-7 place-items-center rounded-full bg-gold/15 text-gold">
              <Flag className="size-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.24em] text-foam/40">龙舟赛</span>
              <span className="tnum text-[12px] font-semibold text-foam">
                光圈 {race.passed}<span className="text-foam/40"> / {race.total}</span>
              </span>
            </div>
            <div className="h-7 w-px bg-foam/10" />
            <span
              className={cn(
                'tnum flex items-center gap-1 text-[15px] font-bold',
                low ? 'text-destructive' : 'text-tide',
              )}
            >
              <Timer className="size-3.5" />
              {Math.max(0, Math.ceil(race.timeLeft))}s
            </span>
            {race.best > 0 && (
              <span className="hidden text-[9px] text-foam/35 sm:inline">
                最佳剩余 {race.best}s
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}