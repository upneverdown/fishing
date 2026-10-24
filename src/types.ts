export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'

export type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night'

export type BaitId = 'worm' | 'minnow' | 'spoon' | 'crank' | 'pellet' | 'dough'

export type BaitCategory = 'live' | 'lure' | 'soft'

export type UnderwaterMode = 'dive' | 'follow' | 'orbit'

export type CatchMethod = 'rod' | 'harpoon' | 'net' | 'trap'

export type CaptureToolId = 'harpoon' | 'net' | 'trap'

export type Quality = 'raw' | 'good' | 'perfect' | 'burnt'

export type TownTab = 'quests' | 'farm' | 'kitchen' | 'codex' | 'cabin' | 'shop'

export type GearId = 'rod' | 'line' | 'hook'

export interface CaptureTargetInfo {
  defId?: string
  label: string
  distance: number
  ready: boolean
}

export type FishingPhase =
  | 'idle'
  | 'charging'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'fight'
  | 'landed'

export interface Catch {
  id: string
  defId: string
  name: string
  rarity: Rarity
  kg: number
  cm: number
  value: number
  unitPrice: number
  desc: string
  caughtAt: number
  method?: CatchMethod
}

export interface FightState {
  progress: number
  tension: number
  pulling: boolean
}

export interface ToastItem {
  id: number
  text: string
  tone: 'info' | 'gold' | 'danger'
}

export interface Vec2 {
  x: number
  z: number
}
