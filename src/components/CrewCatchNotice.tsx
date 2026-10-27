import { AnimatePresence, motion } from 'motion/react'
import { Fish } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

export function CrewCatchNotice() {
  const note = useGameStore((s) => s.crewCatchNote)
  const started = useGameStore((s) => s.started)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(5.2rem,calc(env(safe-area-inset-bottom)+4.6rem))] z-30 flex justify-center px-4">
      <AnimatePresence mode="popLayout">
        {started && note && (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass flex max-w-[86vw] items-center gap-2 rounded-full border-tide/35 py-1.5 pl-2.5 pr-4 text-[11.5px] text-tide"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-tide/15">
              <Fish className="size-3.5" />
            </span>
            <span className="truncate">{note.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}