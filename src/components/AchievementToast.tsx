import { AnimatePresence, motion } from 'motion/react'
import { Coins, Sparkles, Trophy } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

export function AchievementToast() {
  const toast = useGameStore((s) => s.achievementToast)
  const dismiss = useGameStore((s) => s.dismissAchievementToast)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.9rem,env(safe-area-inset-top))] z-[82] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.button
            key={toast.id}
            type="button"
            onClick={dismiss}
            initial={{ opacity: 0, y: -26, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="pointer-events-auto relative w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gold/45 bg-[#101b18]/94 px-4 py-3 text-left shadow-[0_26px_70px_-24px_rgba(0,0,0,0.95),0_0_36px_-12px_rgba(242,193,92,0.65)] backdrop-blur-xl"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  'radial-gradient(ellipse at 12% -10%, rgba(242,193,92,0.28), transparent 52%), linear-gradient(120deg, rgba(111,224,207,0.08), transparent 58%)',
              }}
            />
            <div className="relative flex items-center gap-3">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-full border border-gold/50 bg-gold/15 text-gold">
                <Trophy className="size-5" />
                <Sparkles className="absolute -right-1 -top-1 size-3 text-gold/80" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.3em] text-gold/75">
                  成就达成
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
                </div>
                <div className="mt-0.5 truncate text-[15px] font-bold tracking-[0.06em] text-foam">
                  {toast.name}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-foam/50">{toast.desc}</div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] font-semibold text-gold">
                <Coins className="size-3" />+{toast.reward}
              </span>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4.4, ease: 'linear' }}
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-gold/80 via-gold/40 to-transparent"
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
