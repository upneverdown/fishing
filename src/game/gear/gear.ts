import type { GearId } from '@/types'

export interface GearDef {
  id: GearId
  name: string
  title: string
  tagline: string
  color: string
  effect: string
  values: number[]
  costs: number[]
}

export const GEAR: GearDef[] = [
  {
    id: 'rod',
    name: '鱼竿',
    title: '韧竹竿',
    tagline: '竿身越韧，收线时能把更大的鱼稳稳带回来。',
    color: '#c9945e',
    effect: '收线速度',
    values: [1, 1.08, 1.18],
    costs: [200, 560],
  },
  {
    id: 'line',
    name: '鱼线',
    title: '潮纺线',
    tagline: '更细更韧的线，能吃掉鱼突然发力时的冲劲。',
    color: '#8fb0bd',
    effect: '张力增幅',
    values: [1, 0.92, 0.82],
    costs: [180, 520],
  },
  {
    id: 'hook',
    name: '鱼钩',
    title: '倒刺钩',
    tagline: '钩尖更利，鱼在饵边打转的时间更短。',
    color: '#f2c15c',
    effect: '咬钩速度',
    values: [1, 1.1, 1.22],
    costs: [160, 480],
  },
]

const GEAR_MAP = new Map(GEAR.map((g) => [g.id, g]))

export function gearById(id: GearId) {
  return GEAR_MAP.get(id)
}

export function gearValue(id: GearId, level: number) {
  const gear = GEAR_MAP.get(id)
  if (!gear) return 1
  return gear.values[Math.min(gear.values.length, Math.max(1, level)) - 1]
}

export function gearUpgradeCost(id: GearId, level: number): number | null {
  const gear = GEAR_MAP.get(id)
  if (!gear || level >= gear.values.length) return null
  return gear.costs[level - 1] ?? null
}
