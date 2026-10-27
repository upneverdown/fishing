import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Anchor, Check, Coins, Users, X } from 'lucide-react'
import { CREW, crewById } from '@/game/crew/crew'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

export function CrewPanel() {
  const open = useGameStore((s) => s.crewOpen)
  const setOpen = useGameStore((s) => s.setCrewOpen)
  const crew = useGameStore((s) => s.crew)
  const money = useGameStore((s) => s.money)
  const hireCrew = useGameStore((s) => s.hireCrew)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'm') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="关闭船员名册"
        className="absolute inset-0 bg-abyss/72 backdrop-blur-sm"
      />
      <motion.section
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-tide/30 bg-[#081b1e]/97 shadow-[0_40px_120px_-34px_rgba(0,0,0,1)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 14% -8%, rgba(111,224,207,0.16), transparent 52%), radial-gradient(ellipse at 92% 6%, rgba(242,193,92,0.1), transparent 44%)',
          }}
        />

        <header className="relative flex items-start gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-tide/40 bg-tide/12 text-tide">
            <Users className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold tracking-[0.12em] text-foam">船员名册</h2>
            <p className="mt-0.5 text-[10px] text-foam/40">
              泊叔的介绍所 · 雇来的人会在甲板上走动，并持续提供增益
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
              <Coins className="size-3" />¥{money.toLocaleString('zh-CN')}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-full text-foam/40 transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9.5px] text-foam/55">
              <Anchor className="size-3 text-tide/70" />
              在船 {crew.length} / {CREW.length}
            </span>
            {crew.length === 0 && (
              <span className="text-[9.5px] text-foam/28">还没有雇人，挑一个试试。</span>
            )}
            {crew.map((id) => {
              const def = crewById(id)
              if (!def) return null
              return (
                <span
                  key={id}
                  className="rounded-full px-2 py-1 text-[9.5px] font-medium"
                  style={{ background: `${def.color}33`, color: def.accent }}
                >
                  {def.name} · {def.effect}
                </span>
              )
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {CREW.map((def) => {
              const hired = crew.includes(def.id)
              const affordable = money >= def.cost
              return (
                <div
                  key={def.id}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-xl border px-3 py-3 transition-colors',
                    hired ? 'border-tide/35 bg-tide/6' : 'border-white/8 bg-white/[0.025]',
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                      background: `radial-gradient(ellipse at 8% 0%, ${def.color}44, transparent 52%)`,
                    }}
                  />
                  <div className="relative flex items-start gap-2.5">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-full border text-[15px] font-semibold"
                      style={{
                        background: `${def.color}40`,
                        borderColor: `${def.color}88`,
                        color: def.accent,
                      }}
                    >
                      {def.name.slice(-1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-foam">{def.name}</span>
                        <span className="rounded-full bg-white/8 px-1.5 py-px text-[8px] text-foam/50">
                          {def.role}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-relaxed text-foam/40">
                        {def.desc}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-2 flex items-center justify-between gap-2 rounded-lg bg-black/22 px-2 py-1.5">
                    <span className="text-[9.5px] font-medium" style={{ color: def.accent }}>
                      {def.effect}
                    </span>
                    <button
                      type="button"
                      onClick={() => hireCrew(def.id)}
                      disabled={hired || !affordable}
                      className={cn(
                        'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors',
                        hired
                          ? 'bg-tide/15 text-tide'
                          : affordable
                            ? 'bg-gold/15 text-gold hover:bg-gold/25'
                            : 'bg-white/5 text-foam/25',
                      )}
                    >
                      {hired ? (
                        <>
                          <Check className="size-3" />
                          已在船上
                        </>
                      ) : (
                        <>
                          <Coins className="size-3" />
                          ¥{def.cost}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-3 rounded-xl border border-white/8 bg-black/22 px-3 py-2 text-[9.5px] leading-relaxed text-foam/35">
            提示：在码头找 <span className="text-gold/80">泊叔</span> 可以直接雇佣。船员效果立即生效并随存档保留；船型换装后，他们会自动走到新甲板上。
          </p>
        </div>

        <footer className="relative border-t border-white/8 px-4 py-2 text-center text-[8px] tracking-[0.18em] text-foam/22">
          按 K 或 ESC 关闭
        </footer>
      </motion.section>
    </div>
  )
}
