import type { Catch, Rarity, SeasonId } from '@/types'
import { fishById } from '@/game/fishing/fishTable'
import { clamp } from '@/game/utils/math'

export interface DailySold {
  day: string
  value: number
}

const DEMAND: Record<SeasonId, Record<Rarity, number>> = {
  spring: { common: 1, uncommon: 1.06, rare: 1.12, epic: 1.04, legendary: 0.96 },
  summer: { common: 0.92, uncommon: 1.02, rare: 1.08, epic: 1.16, legendary: 1 },
  autumn: { common: 1.02, uncommon: 1.08, rare: 1.16, epic: 1.12, legendary: 1.06 },
  winter: { common: 1.12, uncommon: 1.15, rare: 1.1, epic: 1.04, legendary: 1.2 },
}

export function freshnessOf(c: Catch, now = Date.now()) {
  const hours = Math.max(0, (now - c.caughtAt) / 3_600_000)
  return clamp(1 - hours * 0.022, 0.5, 1)
}

export function dailySellFactor(daily: DailySold, now = Date.now()) {
  const day = dayKey(new Date(now))
  if (daily.day !== day) return 1
  return clamp(1 - Math.max(0, daily.value - 900) * 0.00016, 0.74, 1)
}

export interface MarketQuote {
  price: number
  baseValue: number
  freshness: number
  demand: number
  cabinBonus: number
  dailyFactor: number
  specialty: boolean
}

export function marketQuote(
  c: Catch,
  season: SeasonId,
  cabinLevel: number,
  daily: DailySold,
  now = Date.now(),
): MarketQuote {
  const freshness = freshnessOf(c, now)
  const demand = DEMAND[season][c.rarity]
  const cabinBonus = 1 + Math.max(0, cabinLevel - 1) * 0.05
  const dailyFactor = dailySellFactor(daily, now)
  const def = fishById(c.defId)
  const specialty = Boolean(def?.seasons?.includes(season)) && c.rarity !== 'common'
  const specialtyBonus = specialty ? 1.06 : 1
  const price = Math.max(
    1,
    Math.round(c.value * freshness * demand * cabinBonus * dailyFactor * specialtyBonus),
  )
  return { price, baseValue: c.value, freshness, demand, cabinBonus, dailyFactor, specialty }
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDailySold(daily: DailySold, amount: number, now = Date.now()): DailySold {
  const day = dayKey(new Date(now))
  return { day, value: (daily.day === day ? daily.value : 0) + amount }
}
