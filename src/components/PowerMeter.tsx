import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'

export function PowerMeter() {
  const phase = useGameStore((s) => s.phase)
  const power = useGameStore((s) => s.power)
  const isTouch = useIsTouch()
  const visible = phase === 'charging'
  const pct = Math.round(power * 100)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-6 sm:bottom-10">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="glass w-full max-w-[340px] rounded-2xl px-4 py-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.85)]"
          >
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="font-medium tracking-[0.18em] text-foam/70">抛竿力度</span>
              <span className="tnum font-semibold text-gold">{pct}%</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-foam/10">
              <div className="absolute inset-y-0 left-1/4 w-px bg-foam/15" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-foam/15" />
              <div className="absolute inset-y-0 left-3/4 w-px bg-foam/15" />
              <div
                className="h-full rounded-full bg-gradient-to-r from-tide via-gold to-destructive transition-[width] duration-75 ease-out"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
            <div className="mt-2 text-center text-[11px] text-muted-foreground">
              {isTouch ? '松开按钮抛出鱼线' : '松开空格或鼠标抛出鱼线'}
              <span className="mx-1.5 text-foam/20">·</span>
              <span className="text-tide/80">越满抛得越远</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
