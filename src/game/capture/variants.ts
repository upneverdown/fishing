import type { CaptureToolId } from '@/types'
import type { ToolLevelStats } from '@/game/capture/tools'

export type ToolVariantId =
  | 'harpoon'
  | 'rapidHarpoon'
  | 'spearGun'
  | 'boomHarpoon'
  | 'net'
  | 'trawl'
  | 'stunNet'
  | 'abyssNet'

export type VariantCategory = 'harpoon' | 'net'

export interface ToolVariant {
  id: ToolVariantId
  tool: VariantCategory
  name: string
  title: string
  tagline: string
  price: number
  color: string
  rangeMul: number
  cooldownMul: number
  wearMul: number
  radiusMul: number
  capacityBonus: number
  damage: number
  ammoMax: number
  ammoPrice: number
  valueMul: number
  drag: boolean
  notes: string[]
}

export const TOOL_VARIANTS: ToolVariant[] = [
  {
    id: 'harpoon',
    tool: 'harpoon',
    name: '潮钢鱼叉',
    title: '基础鱼叉',
    tagline: '一次只盯一条鱼，准星锁住后出手。',
    price: 0,
    color: '#f2c15c',
    rangeMul: 1,
    cooldownMul: 1,
    wearMul: 1,
    radiusMul: 1,
    capacityBonus: 0,
    damage: 14,
    ammoMax: 0,
    ammoPrice: 0,
    valueMul: 1,
    drag: false,
    notes: ['单体 · 高精度', '无需弹药'],
  },
  {
    id: 'rapidHarpoon',
    tool: 'harpoon',
    name: '连发鱼叉',
    title: '三连发机括',
    tagline: '机括一压就是三发，专清成群的小鱼，单发威力小一些。',
    price: 480,
    color: '#8fe6d6',
    rangeMul: 0.86,
    cooldownMul: 0.42,
    wearMul: 1.7,
    radiusMul: 1,
    capacityBonus: 0,
    damage: 9,
    ammoMax: 0,
    ammoPrice: 0,
    valueMul: 1,
    drag: false,
    notes: ['冷却缩短 58%', '适合小鱼群', '磨损更快'],
  },
  {
    id: 'spearGun',
    tool: 'harpoon',
    name: '鱼枪',
    title: '绳索鱼枪',
    tagline: '钢矛飞出很远，绳索会自动把猎物拖回手边。',
    price: 980,
    color: '#f0a35e',
    rangeMul: 2.4,
    cooldownMul: 1.35,
    wearMul: 1.25,
    radiusMul: 1,
    capacityBonus: 0,
    damage: 34,
    ammoMax: 5,
    ammoPrice: 28,
    valueMul: 1,
    drag: true,
    notes: ['射程 ×2.4', '绳索自动拖拽', '需要补充矛头'],
  },
  {
    id: 'boomHarpoon',
    tool: 'harpoon',
    name: '爆炸鱼叉',
    title: '爆裂叉头',
    tagline: '叉头里塞了火药，扎中后轰开一片水花，对大家伙尤其有效。',
    price: 1600,
    color: '#ff7a4f',
    rangeMul: 1.08,
    cooldownMul: 1.9,
    wearMul: 2,
    radiusMul: 1,
    capacityBonus: 0,
    damage: 110,
    ammoMax: 3,
    ammoPrice: 90,
    valueMul: 0.78,
    drag: false,
    notes: ['对大型生物高额伤害', '范围炸伤 · 鱼品质下降', '炸药有限'],
  },
  {
    id: 'net',
    tool: 'net',
    name: '流苏围网',
    title: '基础渔网',
    tagline: '向前撒开一片网面，范围里的小鱼很难逃掉。',
    price: 0,
    color: '#6fe0cf',
    rangeMul: 1,
    cooldownMul: 1,
    wearMul: 1,
    radiusMul: 1,
    capacityBonus: 0,
    damage: 4,
    ammoMax: 0,
    ammoPrice: 0,
    valueMul: 1,
    drag: false,
    notes: ['范围 · 多尾捕获', '对普通鱼最有效'],
  },
  {
    id: 'trawl',
    tool: 'net',
    name: '拖网',
    title: '船尾拖网',
    tagline: '挂在船尾，船一动网就张开，经过的鱼群会被兜进来。',
    price: 700,
    color: '#9bc7b6',
    rangeMul: 1.2,
    cooldownMul: 1.4,
    wearMul: 0.8,
    radiusMul: 1.65,
    capacityBonus: 1,
    damage: 4,
    ammoMax: 0,
    ammoPrice: 0,
    valueMul: 0.94,
    drag: false,
    notes: ['船尾专用 · 航行自动收鱼', '网面更宽', '水下无法手撒'],
  },
  {
    id: 'stunNet',
    tool: 'net',
    name: '高压电击网',
    title: '脉冲电击网',
    tagline: '一片蓝白电弧铺开，附近的鱼会直接翻肚，但卖相会差一点。',
    price: 1300,
    color: '#7fb9ff',
    rangeMul: 1.1,
    cooldownMul: 1.25,
    wearMul: 1.8,
    radiusMul: 2.15,
    capacityBonus: 3,
    damage: 22,
    ammoMax: 0,
    ammoPrice: 0,
    valueMul: 0.82,
    drag: false,
    notes: ['范围 ×2.15', '一次多抓 3 条', '鱼价 -18%'],
  },
  {
    id: 'abyssNet',
    tool: 'net',
    name: '深渊巨网',
    title: '沉渊缚网',
    tagline: '用沉船缆绳编成的巨网，连巨鲸和 Boss 都能缠住片刻。',
    price: 2200,
    color: '#b57cff',
    rangeMul: 1.35,
    cooldownMul: 2.2,
    wearMul: 2.4,
    radiusMul: 2.7,
    capacityBonus: 5,
    damage: 65,
    ammoMax: 0,
    ammoPrice: 0,
    valueMul: 0.88,
    drag: false,
    notes: ['范围 ×2.7', '对 Boss/巨鲸造成伤害并减速', '磨损极快'],
  },
]

const VARIANT_MAP = new Map(TOOL_VARIANTS.map((v) => [v.id, v]))

export function variantById(id: ToolVariantId) {
  return VARIANT_MAP.get(id)
}

export function variantsFor(tool: VariantCategory) {
  return TOOL_VARIANTS.filter((v) => v.tool === tool)
}

export const DEFAULT_VARIANTS: Record<VariantCategory, ToolVariantId> = {
  harpoon: 'harpoon',
  net: 'net',
}

export function variantCategory(tool: CaptureToolId): VariantCategory | null {
  if (tool === 'harpoon') return 'harpoon'
  if (tool === 'net') return 'net'
  return null
}

export function variantStats(base: ToolLevelStats, variant: ToolVariant | undefined): ToolLevelStats {
  if (!variant) return base
  return {
    ...base,
    range: +(base.range * variant.rangeMul).toFixed(2),
    cooldown: +(base.cooldown * variant.cooldownMul).toFixed(2),
    wear: +(base.wear * variant.wearMul).toFixed(2),
    radius: +(base.radius * variant.radiusMul).toFixed(2),
    capacity: base.capacity + variant.capacityBonus,
  }
}
