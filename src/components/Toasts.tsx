import { AnimatePresence, motion } from 'motion/react'
import { Coins, TriangleAlert, Info } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const TONE = {
  info: { icon: Info, className: 'text-foam/80' },
  gold: { icon: Coins, className: 'text-gold' },
  danger: { icon: TriangleAlert, className: 'text-destructive' },
} as const

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts)
  const dismiss = useGameStore((s) => s.dismissToast)
  const celestial = useGameStore((s) => s.mapZone === 'celestial')

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.6rem] z-30 flex flex-col items-center gap-1.5 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.tone]
          const Icon = tone.icon
          const immortal = celestial && t.tone === 'gold'
          return (
            <motion.button
              key={t.id}
              type="button"
              layout
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={cn(
                'glass pointer-events-auto relative flex max-w-[88vw] items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-[11.5px] font-medium shadow-lg',
                tone.className,
                immortal && 'immortal-halo border border-[#ffd06a]/55 text-[#ffe6b0]',
              )}
              style={
                immortal
                  ? {
                      background:
                        'linear-gradient(100deg, rgba(58,36,8,0.86), rgba(126,84,26,0.78))',
                      boxShadow: '0 0 22px -4px rgba(255,196,104,0.65)',
                    }
                  : undefined
              }
            >
              {immortal && (
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <span
                    className="immortal-mist"
                    style={{ left: '-12%', bottom: '-34%', width: 86, height: 42 }}
                  />
                  <span className="immortal-mote" style={{ left: '82%', top: '58%' }} />
                </span>
              )}
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{t.text}</span>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
