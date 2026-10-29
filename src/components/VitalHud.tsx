import { Fish, Heart } from 'lucide-react'
import { DRIED_FISH_COOLDOWN_MS, DRIED_FISH_KEY, maxHpFor, useGameStore } from '@/store/useGameStore'
import { useNow } from '@/components/town/shared'
import { cn } from '@/lib/utils'

/** 左下角身家面板：一条命、一兜鱼干 */
export function VitalHud() {
  const now = useNow(200)
  const hp = useGameStore((s) => s.hp)
  const realm = useGameStore((s) => s.realm)
  const faction = useGameStore((s) => s.playerFaction)
  const dried = useGameStore((s) => s.pantry[DRIED_FISH_KEY] ?? 0)
  const eatenAt = useGameStore((s) => s.driedFishAt)
  const eatDriedFish = useGameStore((s) => s.eatDriedFish)

  const maxHp = maxHpFor(realm)
  const low = hp <= maxHp * 0.3
  const waiting = Math.max(0, DRIED_FISH_COOLDOWN_MS - (now - eatenAt))
  const cooling = waiting > 0

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-3 left-3 z-20 w-[10.2rem] rounded-xl border bg-[#072226]/86 px-2.5 py-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md sm:bottom-4 sm:left-5',
        low ? 'border-destructive/55' : 'border-foam/12',
      )}
    >
      <div className="flex items-center justify-between text-[8.5px] uppercase tracking-[0.18em]">
        <span className={cn('flex items-center gap-1', low ? 'text-destructive' : 'text-foam/45')}>
          <Heart className={cn('size-3', low && 'animate-pulse')} />
          生命
        </span>
        <span className={cn('tnum text-[10px] font-semibold', low ? 'text-destructive' : 'text-foam/75')}>
          {hp}/{maxHp}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foam/10">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`,
            background: low
              ? 'linear-gradient(90deg,#e2685a,#ff9a6b)'
              : faction === 'immortal'
                ? 'linear-gradient(90deg,#3fd8c6,#9ff0ff)'
                : faction === 'demon'
                  ? 'linear-gradient(90deg,#7c1a20,#d2503f)'
                  : 'linear-gradient(90deg,#6fe0cf,#a8f0e1)',
            boxShadow: low
              ? '0 0 12px #e2685a88'
              : faction === 'demon'
                ? '0 0 12px #8e1f2688'
                : faction === 'immortal'
                  ? '0 0 12px #6fe0cf88'
                  : '0 0 12px #6fe0cf55',
          }}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5 border-t border-white/6 pt-1.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold/12 text-gold">
          <Fish className="size-3" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="tnum text-[11px] font-semibold text-gold">{dried} 条鱼干</div>
          <div className="truncate text-[7.5px] tracking-[0.08em] text-foam/35">
            {cooling ? `还要 ${Math.ceil(waiting / 1000)} 秒才咽得下` : '嚼一条 · 立刻回三成血'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => eatDriedFish()}
          className={cn(
            'pointer-events-auto shrink-0 rounded-md border px-1.5 py-1 text-[9px] font-semibold tracking-[0.1em] transition-colors',
            dried > 0 && !cooling
              ? 'border-gold/45 bg-gold/12 text-gold hover:bg-gold/20'
              : 'border-border/30 bg-abyss/35 text-foam/30',
          )}
        >
          H 吃
        </button>
      </div>
    </div>
  )
}
