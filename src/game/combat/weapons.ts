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
  /** 起手前摇：这时间里刀刃还没到判定帧 */
  windup: number
  /** 收招后摇：挥完之后武器锁住的时长（已含在 cooldown 内） */
  recover: number
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
    windup: 0.1,
    recover: 0.2,
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
    windup: 0.12,
    recover: 0.28,
    ammoMax: 6,
    ammoPrice: 60,
    color: '#f2c15c',
    notes: ['远程 · 射线判定', '对鲨鱼与 Boss 有效', '弹药在渔具铺补给'],
  },
  {
    id: 'bonestaff',
    name: '鱼骨法杖',
    title: '万鱼骨 · 潮音杖',
    tagline: '用一整个鱼群的骨头扎成的杖头，敲一下就把海水捏成弹。',
    kind: 'ranged',
    price: 680,
    damage: 34,
    range: 34,
    cooldown: 0.6,
    windup: 0.08,
    recover: 0.16,
    ammoMax: 0,
    ammoPrice: 0,
    color: '#7ed4ff',
    notes: ['远程 · 水弹飞行判定', '左键锁定目标即出手', '水弹可打 Boss 与心魔'],
  },
  {
    id: 'dragonblade',
    name: '龙牙巨剑',
    title: '逆鳞 · 龙牙巨剑',
    tagline: '剑身是一片脱落的龙牙，抬起慢，落下去半片海都翻了。',
    kind: 'melee',
    price: 1250,
    damage: 96,
    range: 7.2,
    cooldown: 1.35,
    windup: 0.42,
    recover: 0.6,
    ammoMax: 0,
    ammoPrice: 0,
    color: '#e2c8ff',
    notes: ['近战 · 大范围重击', '前摇长但一刀顶三刀', '出手时船身会被压得一沉'],
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
