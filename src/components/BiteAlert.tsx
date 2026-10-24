import { AnimatePresence, motion } from 'motion/react'
import { Fish } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'

export function BiteAlert() {
  const bite = useGameStore((s) => s.bite)
  const isTouch = useIsTouch()

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[24%] z-20 flex justify-center px-6">
      <AnimatePresence>
        {bite && (
          <motion.div
            initial={{ opacity: 0, scale: 0.86, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="flex flex-col items-center"
          >
            <div className="relative grid size-16 place-items-center">
              <motion.span
                animate={{ scale: [1, 1.5], opacity: [0.55, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border border-gold/60"
              />
              <motion.span
                animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
                className="absolute inset-0 rounded-full border border-gold/35"
              />
              <span className="glass grid size-14 place-items-center rounded-full border-gold/40 text-gold shadow-[0_0_40px_-8px_rgba(242,193,92,0.7)]">
                <Fish className="size-7" />
              </span>
            </div>
            <motion.div
              animate={{ opacity: [1, 0.72, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="mt-3 text-[26px] font-bold tracking-[0.24em] text-gold drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
            >
              咬钩了！
            </motion.div>
            <div className="mt-1.5 rounded-full bg-abyss/65 px-3 py-1 text-[11px] text-foam/80 backdrop-blur-sm">
              {isTouch ? '点按右下按钮提竿' : '立刻点击或按空格提竿'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
