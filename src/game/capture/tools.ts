import type { CatchMethod, CaptureToolId, Rarity, SeasonId } from '@/types'
import { RARITIES, pickFish, type FishDef } from '@/game/fishing/fishTable'
import { clamp } from '@/game/utils/math'

export interface ToolLevelStats {
  range: number
  cooldown: number
  wear: number
  power: number
  radius: number
  capacity: number
  waitMs: number
}

export interface CaptureToolDef {
  id: CaptureToolId
  name: string
  title: string
  tagline: string
  color: string
  levels: ToolLevelStats[]
  upgradeCosts: number[]
  notes: string[]
}

export const CAPTURE_TOOLS: CaptureToolDef[] = [
  {
    id: 'harpoon',
    name: '鱼叉',
    title: '潮钢鱼叉',
    tagline: '一次只盯一条鱼。准星锁住后出手，命中即收，失手则惊走鱼群。',
    color: '#f2c15c',
    levels: [
      { range: 9, cooldown: 1.05, wear: 8, power: 0, radius: 0, capacity: 1, waitMs: 0 },
      { range: 12, cooldown: 0.86, wear: 6.5, power: 0.08, radius: 0, capacity: 1, waitMs: 0 },
      { range: 15, cooldown: 0.68, wear: 5, power: 0.16, radius: 0, capacity: 1, waitMs: 0 },
    ],
    upgradeCosts: [260, 780],
    notes: ['单体 · 高精度', '射程随等级提升', '稀有鱼命中率明显更高'],
  },
  {
    id: 'net',
    name: '渔网',
    title: '流苏围网',
    tagline: '向前撒开一片网面，范围里的小鱼很难逃掉；稀有鱼往往会撕开网眼。',
    color: '#6fe0cf',
    levels: [
      { range: 7, cooldown: 2.6, wear: 15, power: 0, radius: 3.1, capacity: 3, waitMs: 0 },
      { range: 8, cooldown: 2.2, wear: 12, power: 0.05, radius: 3.9, capacity: 4, waitMs: 0 },
      { range: 10, cooldown: 1.85, wear: 10, power: 0.1, radius: 4.7, capacity: 5, waitMs: 0 },
    ],
    upgradeCosts: [420, 1200],
    notes: ['范围 · 多尾捕获', '对普通鱼最有效', '传说鱼会撕网逃脱'],
  },
  {
    id: 'trap',
    name: '鱼笼',
    title: '藤编鱼笼',
    tagline: '在海底布下一只笼子，去做别的事，过一会儿再游回来收笼。',
    color: '#c9945e',
    levels: [
      { range: 9, cooldown: 1.2, wear: 10, power: 0, radius: 0, capacity: 2, waitMs: 30000 },
      { range: 11, cooldown: 1.0, wear: 8, power: 0, radius: 0, capacity: 3, waitMs: 22000 },
      { range: 13, cooldown: 0.9, wear: 7, power: 0, radius: 0, capacity: 4, waitMs: 16000 },
    ],
    upgradeCosts: [300, 900],
    notes: ['放置 · 离线等待', '可同时布设 3 只', '自动收取附近已就绪的笼子'],
  },
]

const TOOL_MAP = new Map(CAPTURE_TOOLS.map((t) => [t.id, t]))

export function toolById(id: string): CaptureToolDef | undefined {
  return TOOL_MAP.get(id as CaptureToolId)
}

export function toolStats(id: CaptureToolId, level: number): ToolLevelStats {
  const tool = TOOL_MAP.get(id) ?? CAPTURE_TOOLS[0]
  return tool.levels[clamp(level - 1, 0, tool.levels.length - 1)]
}

export function toolUpgradeCost(id: CaptureToolId, level: number): number | null {
  const tool = TOOL_MAP.get(id)
  if (!tool || level >= tool.levels.length) return null
  return tool.upgradeCosts[level - 1] ?? null
}

export function toolRepairCost(level: number, wear: number): number {
  return Math.round(Math.max(0, 100 - wear) * (0.75 + level * 0.35))
}

const HIT_RATE: Record<Rarity, number> = {
  common: 0.94,
  uncommon: 0.84,
  rare: 0.6,
  epic: 0.34,
  legendary: 0.11,
}

export function harpoonChance(def: FishDef, level: number, depth: number) {
  const depthPenalty = Math.max(0, depth - 4.5) * 0.012
  const skill = (level - 1) * 0.075
  return clamp(HIT_RATE[def.rarity] + skill - depthPenalty - (def.difficulty - 1) * 0.09, 0.03, 0.98)
}

export function netChance(def: FishDef, level: number, depth: number) {
  const rarityPenalty =
    def.rarity === 'legendary' ? 0.52 : def.rarity === 'epic' ? 0.34 : def.rarity === 'rare' ? 0.14 : 0
  const depthPenalty = Math.max(0, depth - 4.5) * 0.01
  return clamp(HIT_RATE[def.rarity] * 0.86 + (level - 1) * 0.05 - rarityPenalty - depthPenalty, 0.02, 0.96)
}

export function trapOutcome(
  depth: number,
  season: SeasonId,
  level: number,
  capacity: number,
): string[] {
  const count = clamp(1 + Math.floor(Math.random() * capacity), 1, capacity)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const def = pickFish(depth, { season })
    out.push(def.id)
  }
  return out
}

export const METHOD_LABEL: Record<CatchMethod, string> = {
  rod: '鱼竿',
  harpoon: '鱼叉',
  net: '渔网',
  trap: '鱼笼',
}

export const METHOD_COLOR: Record<CatchMethod, string> = {
  rod: '#6fe0cf',
  harpoon: '#f2c15c',
  net: '#8fb0bd',
  trap: '#c9945e',
}

export function methodFromTool(id: CaptureToolId): CatchMethod {
  return id
}

export function toolCaptureChance(
  tool: CaptureToolId,
  def: FishDef,
  level: number,
  depth: number,
): number {
  if (tool === 'harpoon') return harpoonChance(def, level, depth)
  if (tool === 'net') return netChance(def, level, depth)
  return 1
}

export function rarityLabel(rarity: Rarity) {
  return RARITIES[rarity].label
}
