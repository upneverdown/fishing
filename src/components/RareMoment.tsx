import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { RARITIES } from '@/game/fishing/fishTable'

export function RareMoment() {
  const rarity = useGameStore((s) => s.rareFlash)
  const meta = rarity ? RARITIES[rarity] : null

  useEffect(() => {
    if (!rarity) return
    const id = window.setTimeout(() => useGameStore.setState({ rareFlash: null }), 3200)
    return () => window.clearTimeout(id)
  }, [rarity])

  return (
    <AnimatePresence>
      {rarity && meta && (
        <motion.div
          key={rarity}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            className="relative flex flex-col items-center gap-2"
          >
            <div
              className="absolute -inset-x-32 -inset-y-20 blur-3xl"
              style={{ background: `radial-gradient(ellipse, ${meta.color}44, transparent 65%)` }}
            />
            <Sparkles className="relative size-8" style={{ color: meta.color }} />
            <div
              className="relative text-[46px] font-black leading-none tracking-[0.18em] sm:text-[64px]"
              style={{ color: meta.color, textShadow: `0 0 40px ${meta.color}77` }}
            >
              {meta.label}
            </div>
            <div className="relative text-[11px] tracking-[0.42em] text-foam/60">
              {rarity === 'legendary' ? 'LEGENDARY CATCH' : 'RARE CATCH'}
            </div>
          </motion.div>
          {Array.from({ length: 18 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute size-1.5 rounded-full"
              style={{
                background: meta.color,
                left: `${8 + ((i * 37) % 84)}%`,
                top: `${12 + ((i * 53) % 72)}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0.4], y: -30 - (i % 5) * 14 }}
              transition={{ duration: 1.8, delay: i * 0.05, repeat: 1 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
