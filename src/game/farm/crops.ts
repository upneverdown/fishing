import type { SeasonId } from '@/types'
import { clamp } from '@/game/utils/math'

export type CropId = 'radish' | 'scallion' | 'pumpkin' | 'chili' | 'lotus' | 'snowpea'

export type CropFamily = 'leaf' | 'root' | 'fruit'

export interface CropDef {
  id: CropId
  name: string
  family: CropFamily
  familyLabel: string
  seasons: SeasonId[]
  growMs: number
  seedPrice: number
  sellPrice: number
  yield: number
  color: string
  accent: string
  tagline: string
}

export const CROPS: CropDef[] = [
  {
    id: 'radish',
    name: '沙地萝卜',
    family: 'root',
    familyLabel: '根茎',
    seasons: ['spring', 'autumn'],
    growMs: 90000,
    seedPrice: 12,
    sellPrice: 28,
    yield: 2,
    color: '#d9e7a4',
    accent: '#f2f7dc',
    tagline: '沙土里长得最快的一茬，脆生生带一点甜。',
  },
  {
    id: 'scallion',
    name: '海风小葱',
    family: 'leaf',
    familyLabel: '叶菜',
    seasons: ['spring', 'summer', 'autumn'],
    growMs: 70000,
    seedPrice: 8,
    sellPrice: 17,
    yield: 3,
    color: '#6fae6a',
    accent: '#c6e7ae',
    tagline: '细叶被海风吹得发亮，是烤鱼和鱼汤的底味。',
  },
  {
    id: 'pumpkin',
    name: '蜜瓤南瓜',
    family: 'fruit',
    familyLabel: '瓜果',
    seasons: ['summer', 'autumn'],
    growMs: 150000,
    seedPrice: 22,
    sellPrice: 56,
    yield: 2,
    color: '#e39a4a',
    accent: '#ffd08a',
    tagline: '慢慢爬满半个菜畦，切开时瓤色像落日。',
  },
  {
    id: 'chili',
    name: '火尾椒',
    family: 'fruit',
    familyLabel: '瓜果',
    seasons: ['summer'],
    growMs: 110000,
    seedPrice: 16,
    sellPrice: 38,
    yield: 3,
    color: '#d85c46',
    accent: '#ffb08a',
    tagline: '小小的红尖，烤鱼时放两枚，整间小屋都会醒过来。',
  },
  {
    id: 'lotus',
    name: '镜湖莲藕',
    family: 'root',
    familyLabel: '根茎',
    seasons: ['summer', 'autumn'],
    growMs: 130000,
    seedPrice: 18,
    sellPrice: 44,
    yield: 2,
    color: '#e8d7b6',
    accent: '#f7f0df',
    tagline: '从镜湖浅泥里引来的种，切开有七个孔。',
  },
  {
    id: 'snowpea',
    name: '雪豆',
    family: 'leaf',
    familyLabel: '叶菜',
    seasons: ['winter'],
    growMs: 120000,
    seedPrice: 20,
    sellPrice: 46,
    yield: 3,
    color: '#97c2a2',
    accent: '#d8eed9',
    tagline: '少数能在冷天里挺直腰的作物，豆荚带着薄霜。',
  },
]

const CROP_MAP = new Map(CROPS.map((c) => [c.id, c]))

export function cropById(id: string): CropDef | undefined {
  return CROP_MAP.get(id as CropId)
}

export function isCropId(id: string): id is CropId {
  return CROP_MAP.has(id as CropId)
}

export function seedKey(id: CropId) {
  return `seed:${id}`
}

export function produceKey(id: CropId) {
  return `crop:${id}`
}

export interface PlotState {
  id: number
  cropId: CropId | null
  plantedAt: number
  watered: boolean
  boostMs: number
}

export const PLOT_COUNT = 6

export function emptyPlots(): PlotState[] {
  return Array.from({ length: PLOT_COUNT }, (_, i) => ({
    id: i,
    cropId: null,
    plantedAt: 0,
    watered: false,
    boostMs: 0,
  }))
}

export interface GrowthInfo {
  progress: number
  stage: number
  mature: boolean
  seasonOk: boolean
  greenhouse: boolean
  remainingMs: number
  stageLabel: string
  yieldCount: number
}

const STAGE_LABEL = ['播种', '抽芽', '长叶', '结果', '成熟']

export function growthInfo(
  plot: PlotState,
  crop: CropDef,
  season: SeasonId,
  cabinLevel: number,
  now: number,
): GrowthInfo {
  const greenhouse = cabinLevel >= 3
  const seasonOk = crop.seasons.includes(season) || greenhouse
  const rate = seasonOk ? (plot.watered ? 1 : 0.34) : 0.32
  const elapsed = Math.max(0, now - plot.plantedAt + plot.boostMs)
  let progress = clamp((elapsed / crop.growMs) * rate, 0, 1)
  if (!plot.watered) progress = Math.min(progress, 0.62)
  const stage = progress >= 0.995 ? 4 : progress >= 0.72 ? 3 : progress >= 0.4 ? 2 : progress >= 0.14 ? 1 : 0
  const mature = plot.watered && progress >= 0.995
  const remainingMs = Math.max(0, ((1 - progress) / rate) * crop.growMs)
  const yieldCount = Math.max(1, crop.yield + (seasonOk ? 0 : -1))
  return {
    progress,
    stage,
    mature,
    seasonOk,
    greenhouse,
    remainingMs,
    stageLabel: STAGE_LABEL[stage],
    yieldCount,
  }
}

export function cropSellValue(crop: CropDef, qty: number) {
  return crop.sellPrice * qty
}
