import { Bone, Crosshair, Sword, Wand2 } from 'lucide-react'
import { WEAPONS, weaponById } from '@/game/combat/weapons'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'
import type { WeaponId } from '@/types'

const ICONS: Record<WeaponId, typeof Sword> = {
  knife: Sword,
  dragonblade: Bone,
  speargun: Crosshair,
  bonestaff: Wand2,
}

/** 底部武器栏：1 键管近战、2 键管远程，点格子直接换手里那件 */
const SLOTS = [...WEAPONS].sort((a, b) =>
  a.kind === b.kind ? a.damage - b.damage : a.kind === 'melee' ? -1 : 1,
)

export function WeaponBar() {
  const equipped = useGameStore((s) => s.equippedWeapon)
  const owned = useGameStore((s) => s.ownedWeapons)
  const ammo = useGameStore((s) => s.weaponAmmo)
  const equipWeapon = useGameStore((s) => s.equipWeapon)
  const toast = useGameStore((s) => s.toast)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[6.4rem] z-20 flex justify-center px-3 sm:bottom-4">
      <div className="glass flex items-end gap-1.5 rounded-xl border-foam/12 px-2 py-1.5">
        {SLOTS.map((def) => {
          const Icon = ICONS[def.id] ?? Sword
          const has = owned.includes(def.id)
          const isActive = equipped === def.id
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => {
                if (!has) {
                  toast(`${def.name}还没买 · 去小镇渔具铺看看`, 'info')
                  return
                }
                equipWeapon(def.id)
              }}
              title={`${def.title} · ${def.tagline}`}
              className={cn(
                'pointer-events-auto relative flex w-[4.1rem] flex-col items-center gap-0.5 rounded-lg border px-1 py-1 transition-colors',
                isActive
                  ? 'border-gold/55 bg-gold/10 text-gold'
                  : has
                    ? 'border-border/45 bg-abyss/45 text-foam/65 hover:border-foam/25'
                    : 'border-border/25 bg-abyss/25 text-foam/25',
              )}
            >
              <span
                className={cn(
                  'absolute -left-1 -top-1 grid size-4 place-items-center rounded border text-[8.5px] font-bold',
                  isActive
                    ? 'border-gold/60 bg-gold text-abyss'
                    : 'border-foam/25 bg-[#072226] text-foam/60',
                )}
              >
                {def.kind === 'melee' ? '1' : '2'}
              </span>
              <Icon className="size-3.5" style={has ? { color: def.color } : undefined} />
              <span className="truncate text-[9.5px] font-medium leading-tight">{def.name}</span>
              <span className="tnum text-[7.5px] tracking-[0.06em] opacity-70">
                {!has ? '未购' : def.ammoMax > 0 ? `${ammo[def.id] ?? 0}/${def.ammoMax}` : `${def.damage} 伤`}
              </span>
            </button>
          )
        })}
        <span className="ml-1 hidden max-w-[6.5rem] text-[8px] leading-tight tracking-[0.08em] text-foam/35 sm:block">
          {weaponById(equipped)?.kind === 'melee' ? 'J 出手 · 左键锁定敌人也出手' : 'K 出手 · 左键锁定敌人也出手'}
        </span>
      </div>
    </div>
  )
}
