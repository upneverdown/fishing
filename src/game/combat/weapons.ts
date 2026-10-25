import type { WeaponId } from '@/types'

export interface WeaponDef {
  id: WeaponId
  name: string
  title: string
  tagline: string
  kind: 'melee' | 'ranged'
  price: number
  damage: number
  range: number
  cooldown: number
  ammoMax: number
  ammoPrice: number
  color: string
  notes: string[]
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'knife',
    name: '渔刀',
    title: '潮钢短刀',
    tagline: '刀背厚、刀尖窄，贴脸时比鱼叉可靠得多。',
    kind: 'melee',
    price: 160,
    damage: 26,
    range: 3.4,
    cooldown: 0.55,
    ammoMax: 0,
    ammoPrice: 0,
    color: '#a8c6cf',
    notes: ['近战 · 无需弹药', '砍鲨鱼和小型海怪', '水下与船上都能用'],
  },
  {
    id: 'speargun',
    name: '鱼枪',
    title: '气动鱼枪',
    tagline: '一根钢矛带着气泡飞出去，专治不肯靠近的大家伙。',
    kind: 'ranged',
    price: 520,
    damage: 52,
    range: 26,
    cooldown: 0.95,
    ammoMax: 6,
    ammoPrice: 60,
    color: '#f2c15c',
    notes: ['远程 · 射线判定', '对鲨鱼与 Boss 有效', '弹药在渔具铺补给'],
  },
]

const WEAPON_MAP = new Map(WEAPONS.map((w) => [w.id, w]))

export function weaponById(id: WeaponId) {
  return WEAPON_MAP.get(id)
}

export function weaponRefillCost(id: WeaponId, ammo: number) {
  const def = WEAPON_MAP.get(id)
  if (!def || def.ammoMax === 0) return 0
  const missing = Math.max(0, def.ammoMax - ammo)
  return Math.ceil(missing * def.ammoPrice * 0.6)
}

export const CREATURE_HIT_FLASH = '#ff6d5a'
