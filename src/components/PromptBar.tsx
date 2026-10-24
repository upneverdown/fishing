import { Anchor } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { isModalOpen, useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'

export function PromptBar() {
  const prompt = useGameStore((s) => s.prompt)
  const phase = useGameStore((s) => s.phase)
  const modal = useGameStore((s) => isModalOpen(s) || s.underwater)
  const nearDock = useGameStore((s) => s.nearDock)
  const isTouch = useIsTouch()

  const visible = Boolean(prompt) && phase === 'idle' && !modal && nearDock

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-4 sm:bottom-9">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass flex items-center gap-2.5 rounded-full py-2 pl-3 pr-2.5 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.8)]"
          >
            <span className="grid size-6 place-items-center rounded-full bg-gold/18 text-gold">
              <Anchor className="size-3.5" />
            </span>
            <span className="text-[12px] font-medium text-foam sm:text-[13px]">{prompt}</span>
            {!isTouch && (
              <span className="ml-0.5 grid size-5 place-items-center rounded border border-gold/35 bg-gold/12 text-[10px] font-bold text-gold">
                E
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
