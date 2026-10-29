import { AnimatePresence, motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

/** 顿悟那一下：屏幕正中浮起一行金字，慢慢往上飘散 */
export function EpiphanyNotice() {
  const epiphany = useGameStore((s) => s.epiphany)
  const started = useGameStore((s) => s.started)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[26%] z-[72] flex justify-center px-4">
      <AnimatePresence mode="popLayout">
        {started && epiphany && (
          <motion.div
            key={epiphany.id}
            initial={{ opacity: 0, y: 26, scale: 0.86, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -54, scale: 1.06, filter: 'blur(4px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center gap-1"
          >
            <span className="flex items-center gap-1.5 rounded-full border border-gold/45 bg-[#1c1508]/72 px-3.5 py-1 text-[10px] uppercase tracking-[0.3em] text-gold/85 backdrop-blur-sm">
              <Sparkles className="size-3" />
              顿悟
            </span>
            <span
              className="text-[19px] font-semibold tracking-[0.14em] text-[#ffe9b0] sm:text-[24px]"
              style={{ textShadow: '0 0 22px rgba(242,193,92,0.62), 0 2px 12px rgba(0,0,0,0.7)' }}
            >
              {epiphany.text}
            </span>
            <span className="tnum text-[12.5px] tracking-[0.12em] text-gold/80">
              修为 +{epiphany.xp}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
