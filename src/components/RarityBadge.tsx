import { FishArt } from './FishArt'
import { RARITIES } from '@/game/fishing/fishTable'
import type { Rarity } from '@/types'

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  const meta = RARITIES[rarity]
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
        (className ?? '')
      }
      style={{ background: meta.soft, color: meta.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

export function RarityDot({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full"
      style={{ background: RARITIES[rarity].color }}
    />
  )
}

export { FishArt }
