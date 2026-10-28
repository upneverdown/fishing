import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Skull, Sparkles, X } from 'lucide-react'
import { FACTIONS, type FactionId } from '@/game/cultivation/factions'
import { useGameStore } from '@/store/useGameStore'
import { gameEvents } from '@/game/eventBus'
import { cn } from '@/lib/utils'

const ORDER: FactionId[] = ['immortal', 'demon']

const STATS = [
  { label: '攻击', key: 'attackMul' as const, fmt: (v: number) => `${Math.round(v * 100)}%` },
  { label: '受伤', key: 'hurtMul' as const, fmt: (v: number) => `${Math.round(v * 100)}%` },
  { label: '闪避', key: 'dodgeChance' as const, fmt: (v: number) => `${Math.round(v * 100)}%` },
  { label: '读条', key: 'chargeTimeMul' as const, fmt: (v: number) => `${Math.round(v * 100)}%` },
  { label: '稀有鱼', key: 'rareBoost' as const, fmt: (v: number) => `×${v.toFixed(2)}` },
]

/** 渡劫功成后的仙魔转职：全屏暂停，二选一且终身不改 */
export function FactionChoiceOverlay() {
  const open = useGameStore((s) => s.factionChoiceOpen)
  const chosen = useGameStore((s) => s.playerFaction)
  const chooseFaction = useGameStore((s) => s.chooseFaction)
  const ascended = useGameStore((s) => s.ascended)
  const [hover, setHover] = useState<FactionId | null>(null)

  if (!open) return null

  const pick = (id: FactionId) => {
    if (chosen) return
    chooseFaction(id)
    // 尚未飞升：选完立刻续上涨天河过场
    if (!ascended) gameEvents.emit('ascension:gate', { at: performance.now() / 1000 })
  }

  return (
    <div className="absolute inset-0 z-[86] grid place-items-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(6,20,22,0.78),rgba(3,10,11,0.95))]"
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(ellipse_at_20%_50%,rgba(143,232,255,0.14),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_80%_50%,rgba(255,90,74,0.14),transparent_62%)]" />

      <div className="relative flex w-[min(62rem,94vw)] flex-col items-center px-4 pb-6 pt-3">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.52em] text-[#cfe9e2]/75">
            <Sparkles className="size-3" />
            渡劫功成 · 天道分岔
          </span>
          <h2 className="mt-2.5 text-[27px] font-semibold tracking-[0.22em] text-foam drop-shadow-[0_0_22px_rgba(160,230,220,0.35)]">
            仙魔抉择
          </h2>
          <p className="mt-1.5 text-[12px] tracking-[0.14em] text-[#9fb2ab]">
            一念成仙，一念入魔 · 此后气血、钓术与山门皆随此择而定
          </p>
        </motion.div>

        <div className="mt-5 grid w-full gap-4 sm:grid-cols-2">
          {ORDER.map((id, i) => {
            const f = FACTIONS[id]
            const active = hover === id
            const Icon = id === 'immortal' ? Sparkles : Skull
            return (
              <motion.button
                key={id}
                type="button"
                onMouseEnter={() => setHover(id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => pick(id)}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.1, type: 'spring', stiffness: 240, damping: 22 }}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-300',
                  active ? 'scale-[1.015]' : 'scale-100',
                )}
                style={{
                  borderColor: active ? f.color : 'rgba(243,238,226,0.16)',
                  background: `linear-gradient(158deg, rgba(8,20,21,0.9), rgba(8,20,21,0.55)), radial-gradient(circle at ${i === 0 ? '18% 12%' : '82% 12%'}, ${f.soft}, transparent 62%)`,
                  boxShadow: active ? `0 0 34px -8px ${f.glow}` : '0 10px 30px -18px rgba(0,0,0,0.9)',
                }}
              >
                <span
                  className="immortal-mist"
                  style={{
                    left: i === 0 ? '-6%' : 'auto',
                    right: i === 0 ? 'auto' : '-6%',
                    bottom: '-4%',
                    width: 190,
                    height: 92,
                    background: `radial-gradient(closest-side, ${f.aura.core}66, transparent)`,
                  }}
                />
                <div className="relative flex items-center gap-2.5">
                  <span
                    className="grid size-9 place-items-center rounded-full"
                    style={{ background: f.soft, color: f.color, boxShadow: `inset 0 0 0 1px ${f.color}55` }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[0.12em]" style={{ color: f.color }}>
                      {f.name}
                    </h3>
                    <p className="text-[10.5px] tracking-[0.2em] text-[#8fa39c]">{f.role}</p>
                  </div>
                </div>

                <p className="relative mt-2.5 text-[11.5px] italic tracking-[0.06em] text-[#c6d6d0]/85">
                  「{f.tagline}」
                </p>

                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  {STATS.map((s) => (
                    <span
                      key={s.label}
                      className="tnum rounded-full px-2 py-0.5 text-[9.5px]"
                      style={{ background: 'rgba(243,238,226,0.07)', color: f.color }}
                    >
                      {s.label} {s.fmt(f[s.key])}
                    </span>
                  ))}
                </div>

                <ul className="relative mt-3 space-y-1.5">
                  {f.perks.map((line) => (
                    <li key={line} className="flex items-start gap-1.5 text-[11.5px] text-[#dce9e4]">
                      <Check className="mt-0.5 size-3.5 shrink-0" style={{ color: f.color }} />
                      {line}
                    </li>
                  ))}
                  {f.costs.map((line) => (
                    <li key={line} className="flex items-start gap-1.5 text-[11.5px] text-[#93a098]">
                      <X className="mt-0.5 size-3.5 shrink-0 text-[#c47a6a]" />
                      {line}
                    </li>
                  ))}
                </ul>

                <span
                  className="relative mt-4 block rounded-lg py-2 text-center text-[12px] font-medium tracking-[0.24em] transition-colors"
                  style={{
                    background: active ? f.color : 'rgba(243,238,226,0.08)',
                    color: active ? '#08191a' : '#c9d8d2',
                  }}
                >
                  入{id === 'immortal' ? '仙' : '魔'}道
                </span>
              </motion.button>
            )
          })}
        </div>

        <p className="mt-4 text-[10.5px] tracking-[0.3em] text-[#7d8c86]">
          此择一经定下终身不改 · 两宗山门只渡各自门人
        </p>
      </div>
    </div>
  )
}
