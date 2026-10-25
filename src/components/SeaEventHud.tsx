import { AnimatePresence, motion } from 'motion/react'
import {
  CloudLightning,
  Ghost,
  HandCoins,
  Timer,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import type { SeaEventHud as SeaEventState } from '@/types'
import { cn } from '@/lib/utils'

const META: Record<
  SeaEventState['kind'],
  { icon: LucideIcon; color: string; tone: string }
> = {
  ghost: { icon: Ghost, color: '#8fe6d6', tone: 'from-[#8fe6d6]/18' },
  tentacle: { icon: Waves, color: '#b58cff', tone: 'from-[#b58cff]/18' },
  merchant: { icon: HandCoins, color: '#f2c15c', tone: 'from-[#f2c15c]/18' },
  storm: { icon: CloudLightning, color: '#e2685a', tone: 'from-[#e2685a]/20' },
}

export function SeaEventHud() {
  const event = useGameStore((s) => s.seaEvent)
  const underwater = useGameStore((s) => s.underwater)

  if (underwater) return null

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.kind}
          initial={{ opacity: 0, x: -18, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -14, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="pointer-events-none absolute left-3 top-[6.9rem] z-[31] w-[min(17.5rem,calc(100%-1.5rem))] sm:left-5 sm:top-[5.4rem]"
        >
          {(() => {
            const meta = META[event.kind]
            const Icon = meta.icon
            const progress = Math.min(event.progress, event.target)
            const ratio = event.target > 0 ? progress / event.target : 0
            return (
              <div
                className={cn(
                  'glass relative overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_20px_50px_-26px_rgba(0,0,0,0.9)]',
                  event.danger ? 'border-destructive/35' : 'border-foam/15',
                )}
              >
                <div
                  className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent', meta.tone)}
                />
                <div className="relative flex items-start gap-2.5">
                  <span
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${meta.color}1f`, color: meta.color }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8.5px] uppercase tracking-[0.24em] text-foam/35">
                        海上事件
                      </span>
                      <span className="tnum flex items-center gap-1 text-[9px] text-foam/40">
                        <Timer className="size-2.5" />
                        {event.timeLeft}s
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[13.5px] font-semibold tracking-wide text-foam">
                        {event.name}
                      </span>
                      <span
                        className="rounded-full px-1.5 py-px text-[8.5px] font-semibold"
                        style={{ background: `${meta.color}22`, color: meta.color }}
                      >
                        {event.danger ? '危险' : '机遇'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-foam/50">
                      {event.desc}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-foam/10">
                        <div
                          className="h-full rounded-full transition-[width] duration-200"
                          style={{
                            width: `${Math.round(ratio * 100)}%`,
                            background: meta.color,
                            boxShadow: `0 0 12px -2px ${meta.color}`,
                          }}
                        />
                      </div>
                      <span className="tnum text-[9.5px] text-foam/45">
                        {event.kind === 'merchant'
                          ? `${Math.floor(progress)}/${event.target}s`
                          : `${progress}/${event.target}`}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-foam/60">
                      <kbd
                        className="rounded border px-1.5 py-0.5 text-[9px] font-semibold"
                        style={{ borderColor: `${meta.color}66`, color: meta.color }}
                      >
                        E
                      </kbd>
                      <span className="truncate">{event.hint}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
