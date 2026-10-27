import { Droplets, Flame, Gem, Sparkles, Swords } from 'lucide-react'
import { realmAt } from '@/game/cultivation/realms'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const SKILL_ICON = {
  water: Droplets,
  fire: Flame,
  sword: Swords,
} as const

function SkillChip({ id }: { id: keyof typeof SKILL_ICON }) {
  const cd = useGameStore((s) => s.skillCds.find((skill) => skill.id === id))
  const Icon = SKILL_ICON[id]
  if (!cd) return null
  const ready = !cd.locked && cd.left <= 0
  const cooling = !cd.locked && cd.left > 0
  const pct = cd.locked ? 0 : Math.max(0, Math.min(100, (cd.left / Math.max(0.1, cd.total)) * 100))

  return (
    <div
      className={cn(
        'relative flex items-center gap-1 overflow-hidden rounded-md border px-1.5 py-1 transition-colors',
        ready && 'border-current/45 bg-current/8',
        cooling && 'border-border/40 bg-abyss/45',
        cd.locked && 'border-border/20 bg-abyss/25',
      )}
      style={{ color: cd.locked ? undefined : cd.color }}
      title={
        cd.locked
          ? `${cd.name} · 需突破至${cd.needRealm}`
          : cooling
            ? `${cd.name} · 冷却 ${cd.left.toFixed(1)} 秒`
            : `${cd.name} · 按 ${cd.key} 释放`
      }
    >
      {cooling && (
        <span
          className="absolute inset-y-0 left-0 bg-black/45"
          style={{ width: `${pct}%` }}
        />
      )}
      <Icon className={cn('relative size-3 shrink-0', cd.locked && 'text-foam/25')} />
      <span
        className={cn(
          'relative min-w-0 flex-1 truncate text-[9.5px] font-medium',
          cd.locked && 'text-foam/30',
        )}
      >
        {cd.name}
      </span>
      <span
        className={cn(
          'tnum relative shrink-0 text-[8.5px] font-semibold',
          ready && 'opacity-90',
          cooling && 'text-foam/60',
          cd.locked && 'text-foam/25',
        )}
      >
        {cd.locked ? cd.needRealm : cooling ? `${cd.left.toFixed(1)}s` : cd.key}
      </span>
    </div>
  )
}

export function CultivationHud() {
  const realm = useGameStore((s) => s.realm)
  const xp = useGameStore((s) => s.cultivationXp)
  const cores = useGameStore((s) => s.cultivationCores)
  const underwater = useGameStore((s) => s.underwater)
  const current = realmAt(realm)
  const next = realmAt(realm + 1)
  const capped = !Number.isFinite(current.requiredXp)
  const pct = capped ? 100 : Math.max(0, Math.min(100, (xp / current.requiredXp) * 100))

  if (underwater) return null

  return (
    <div
      className="pointer-events-none absolute right-3 top-[12.7rem] z-20 w-[8.5rem] rounded-xl border bg-[#072226]/82 p-2 backdrop-blur-md sm:right-5 sm:top-[15.1rem] sm:w-[10.2rem]"
      style={{ borderColor: `${current.color}44` }}
    >
      <div className="flex items-center justify-between text-[8.5px] uppercase tracking-[0.16em]">
        <span className="flex items-center gap-1" style={{ color: current.color }}>
          <Sparkles className="size-3" />
          修仙
        </span>
        <span className="tnum flex items-center gap-0.5 text-foam/50">
          <Gem className="size-2.5" />
          {cores}
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-[12.5px] font-semibold tracking-wide" style={{ color: current.color }}>
          {current.name}
        </span>
        <span className="tnum text-[8.5px] text-foam/40">
          {capped ? '圆满' : `${Math.floor(xp)}/${current.requiredXp}`}
        </span>
      </div>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foam/10">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg,${current.color},${next.color})`,
            boxShadow: `0 0 12px ${current.glow}`,
          }}
        />
      </div>
      <div className="mt-0.5 truncate text-[8px] text-foam/35">
        {capped ? current.motto : `渡劫可入${next.name}`}
      </div>

      <div className="mt-1.5 flex flex-col gap-1 border-t border-white/6 pt-1.5">
        <SkillChip id="water" />
        <SkillChip id="fire" />
        <SkillChip id="sword" />
      </div>

      {realm === 0 && (
        <div className="mt-1.5 border-t border-white/6 pt-1.5 text-[8px] leading-snug text-foam/30">
          击败海中首领，按 F 吸收内丹积攒修为
        </div>
      )}
    </div>
  )
}
