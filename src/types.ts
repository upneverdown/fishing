export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'

export type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night'

export type BaitId = 'worm' | 'minnow' | 'spoon' | 'crank' | 'pellet' | 'dough'

export type BaitCategory = 'live' | 'lure' | 'soft'

export type UnderwaterMode = 'dive' | 'follow' | 'orbit'

export type CatchMethod = 'rod' | 'harpoon' | 'net' | 'trap'

export type CaptureToolId = 'harpoon' | 'net' | 'trap'

<<<<<<< HEAD
export type WaterId = 'bay' | 'creek' | 'falls' | 'mirror' | 'farsea' | 'trench'

export type WeaponId = 'knife' | 'speargun'

export type FacilityId = 'fishfinder' | 'livewell' | 'searchlight' | 'grill' | 'anchor'

=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
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
<<<<<<< HEAD
  junk?: boolean
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
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
<<<<<<< HEAD

export interface BoatPose {
  x: number
  z: number
  heading: number
}

export interface BossHud {
  id: string
  name: string
  hp: number
  maxHp: number
  phase: number
  skill: string
  ultimate?: boolean
}

export interface RadarContact {
  id: string
  x: number
  z: number
  depth: number
  kind: 'fish' | 'shark' | 'whale' | 'boss'
  label: string
  distance: number
  bearing: number
}

export interface NavNpc {
  id: string
  x: number
  z: number
}

export interface NavBoss {
  id: string
  name: string
  x: number
  z: number
  arenaX: number
  arenaZ: number
  arenaR: number
  intro: boolean
}

export interface NavSnapshot {
  px: number
  pz: number
  heading: number
  underwater: boolean
  boatX: number
  boatZ: number
  boatHeading: number
  boss: NavBoss | null
  npcs: NavNpc[]
}

export interface SeaEventHud {
  kind: 'ghost' | 'tentacle' | 'merchant' | 'storm'
  name: string
  desc: string
  hint: string
  progress: number
  target: number
  timeLeft: number
  danger: boolean
}

export interface AchievementToast {
  id: number
  name: string
  desc: string
  reward: number
  icon: string
}
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
