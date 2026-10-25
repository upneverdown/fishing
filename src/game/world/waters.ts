import type { WaterId } from '@/types'
import { BOAT_STYLES, type BoatSkinId } from '@/game/shop/catalog'

export interface WaterZone {
  id: WaterId
  name: string
  subtitle: string
  tier: number
  center: { x: number; z: number }
  radius: number
  color: string
  desc: string
  hazards: string
  fish: string[]
}

/** Open-water regions, ordered from the innermost bay outward. */
export const WATERS: WaterZone[] = [
  {
    id: 'bay',
    name: '主海湾',
    subtitle: '近岸 · 新手水域',
    tier: 1,
    center: { x: 0, z: 6 },
    radius: 44,
    color: '#6fe0cf',
    desc: '码头外的老渔场，风浪温和，白条和鲫鱼最多。',
    hazards: '无',
    fish: ['白条', '鲫鱼', '鲤鱼', '鲈鱼'],
  },
  {
    id: 'creek',
    name: '林间小湾',
    subtitle: '近岸 · 静水',
    tier: 1,
    center: { x: -55, z: 32 },
    radius: 24,
    color: '#7fd18a',
    desc: '被树林围住的小水湾，锦鲤和草鱼在这里躲清静。',
    hazards: '浅滩',
    fish: ['锦鲤', '草鱼', '黑鱼'],
  },
  {
    id: 'falls',
    name: '瀑布深潭',
    subtitle: '深水 · 中船',
    tier: 2,
    center: { x: 40, z: 46 },
    radius: 22,
    color: '#8fb0bd',
    desc: '瀑布砸出的深潭，水色发青，金鳟只在黄昏露头。',
    hazards: '暗流',
    fish: ['金鳟', '鳟鱼', '鲶鱼'],
  },
  {
    id: 'mirror',
    name: '镜湖',
    subtitle: '深水湖 · 中船',
    tier: 2,
    center: { x: 88, z: -42 },
    radius: 38,
    color: '#58b4ff',
    desc: '静得像一面镜子，湖心住着慢吞吞的老龟。',
    hazards: '老龟领地',
    fish: ['镜影鲤', '月光鲟', '冰湖白鱼'],
  },
  {
    id: 'farsea',
    name: '黑潮外海',
    subtitle: '远海 · 大船',
    tier: 3,
    center: { x: 128, z: 8 },
    radius: 35,
    color: '#b57cff',
    desc: '穿过东侧海峡才能抵达的深蓝海域，巨鲸和旗鱼在浪下巡游。',
    hazards: '涌浪 · 鲨群',
    fish: ['黑潮旗鱼', '潮鹰鲼', '翻车鲀'],
  },
  {
    id: 'trench',
    name: '沉船深沟',
    subtitle: '特殊水域 · 大船',
    tier: 3,
    center: { x: -82, z: -58 },
    radius: 34,
    color: '#ffb13d',
    desc: '海图边缘的裂谷，龙王在沟底盘踞，渊底鲟守着沉船。',
    hazards: '龙王 · 强流',
    fish: ['渊底鲟', '赤鳍鲛', '灯笼鮟鱇'],
  },
]

const WATER_MAP = new Map(WATERS.map((w) => [w.id, w]))

export function waterById(id: WaterId) {
  return WATER_MAP.get(id)
}

/** Highest-tier region containing the point (locked water wins over overlap). */
export function waterAt(x: number, z: number): WaterZone | null {
  let found: WaterZone | null = null
  for (const water of WATERS) {
    const d = Math.hypot(x - water.center.x, z - water.center.z)
    if (d <= water.radius && (!found || water.tier > found.tier)) found = water
  }
  return found
}

export function boatTier(skin: BoatSkinId): number {
  return BOAT_STYLES.find((b) => b.id === skin)?.tier ?? 1
}

export function waterUnlocked(skin: BoatSkinId, water: WaterZone): boolean {
  return boatTier(skin) >= water.tier
}

export function canEnterWater(skin: BoatSkinId, x: number, z: number): WaterZone | null {
  const water = waterAt(x, z)
  if (!water || waterUnlocked(skin, water)) return null
  return water
}

export function nextWaterForTier(tier: number): WaterZone | undefined {
  return WATERS.find((w) => w.tier === tier + 1)
}
