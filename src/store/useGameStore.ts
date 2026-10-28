import { create } from 'zustand'
import type {
  AchievementToast,
  BaitId,
  BoatPose,
  BossHud,
  CaptureTargetInfo,
  CaptureToolId,
  Catch,
  CatchMethod,
  FacilityId,
  FishingPhase,
  FightState,
  GearId,
  MapZone,
  NavSnapshot,
  Quality,
  RadarContact,
  Rarity,
  SeaEventHud,
  SeasonId,
  ToastItem,
  TownTab,
  UnderwaterMode,
  WeaponId,
} from '@/types'
import {
  DEFAULT_OWNED,
  DECORATIONS,
  boatCapacity,
  boatFacilitySlots,
  boatGearCap,
  findShopEntry,
  isBoatSkin,
  isDecoration,
  isRodSkin,
  type BoatSkinId,
  type DecorationId,
  type RodSkinId,
} from '@/game/shop/catalog'
import { SEASONS, isSeasonId } from '@/game/world/seasons'
import { baitById, isBaitId } from '@/game/fishing/baitTable'
import { FISH, createCatch, fishById, RARITY_ORDER } from '@/game/fishing/fishTable'
import {
  CAPTURE_TOOLS,
  toolById,
  toolRepairCost,
  toolUpgradeCost,
  toolStats,
} from '@/game/capture/tools'
import {
  CROPS,
  PLOT_COUNT,
  cropById,
  emptyPlots,
  growthInfo,
  isCropId,
  produceKey,
  seedKey,
  type CropId,
  type PlotState,
} from '@/game/farm/crops'
import {
  FORAGE,
  forageById,
  forageKey,
  type ForageId,
} from '@/game/farm/forage'
import {
  QUALITY_META,
  RECIPES,
  dishKey,
  dishValue,
  parseDishKey,
  recipeById,
  rowMeetsRarity,
} from '@/game/cooking/recipes'
import { gearById, gearUpgradeCost, type GearDef } from '@/game/gear/gear'
import {
  advanceQuests,
  dailyQuestList,
  questDefsById,
  questRewardItemName,
  type QuestDef,
  type QuestEvent,
  type QuestState,
} from '@/game/quests/quests'
import {
  addDailySold,
  dailySellFactor,
  dayKey,
  marketQuote,
  type DailySold,
} from '@/game/economy/market'
import { npcById } from '@/game/town/npcs'
import {
  PET_FEED_COOLDOWN,
  PET_PAT_COOLDOWN,
  PET_PLAY_COOLDOWN,
  defaultPet,
  type PetState,
} from '@/game/pet/pet'
import { clamp } from '@/game/utils/math'
import { WEAPONS, weaponById, weaponRefillCost } from '@/game/combat/weapons'
import { FACILITIES, facilityById, isFacilityId } from '@/game/boat/facilities'
import {
  DEFAULT_VARIANTS,
  TOOL_VARIANTS,
  variantById,
  variantsFor,
  type ToolVariantId,
} from '@/game/capture/variants'
import {
  ACHIEVEMENTS,
  achievementById,
  emptyAchievements,
  type AchievementMap,
  type AchievementProgress,
} from '@/game/achievements/catalog'
import { CREW, crewById } from '@/game/crew/crew'
import {
  PLAYER_SKINS,
  isPlayerSkin,
  playerSkinById,
  type PlayerSkinId,
} from '@/game/player/playerSkins'
import {
  isRealmIndex,
  playerMaxHp,
  realmAt,
  realmSuppressionMul,
} from '@/game/cultivation/realms'

export const BAG_CAPACITY = 10
export const MAX_HP = 100
export function maxHpFor(realm: number) {
  return playerMaxHp(realm, MAX_HP)
}
export const UNDERWATER_MODES: UnderwaterMode[] = ['dive', 'follow', 'orbit']
export const UNDERWATER_MODE_LABEL: Record<UnderwaterMode, string> = {
  dive: '自由潜游',
  follow: '鱼群跟随',
  orbit: '环绕船身',
}
const SAVE_KEY = 'tidewater-save-v1'
const CABIN_COSTS = [0, 650, 1800]
const CODEX_MILESTONES = [25, 50, 75, 100] as const
const CODEX_REWARDS: Record<number, number> = { 25: 120, 50: 320, 75: 760, 100: 1800 }

export interface ToolState {
  level: number
  wear: number
  uses: number
  catches: number
}

export interface TrapState {
  id: string
  x: number
  y: number
  z: number
  placedAt: number
  readyAt: number
  depth: number
  outcome: string[]
}

export interface CodexEntry {
  count: number
  firstAt: number
  bestKg: number
  bestCm: number
  methods: CatchMethod[]
}

export interface PetProgress extends PetState {}

export interface StoreStats {
  cooked: number
  harvested: number
  gathered: number
  soldValue: number
}

export interface DragonRaceHud {
  active: boolean
  passed: number
  total: number
  timeLeft: number
  best: number
}

export interface CrewCatchNote {
  id: number
  text: string
}

export type TribulationPhase = 'gathering' | 'striking' | 'burning' | 'ascended'

export interface TribulationHud {
  phase: TribulationPhase
  bolt: number
  totalBolts: number
  fromName: string
  toName: string
  color: string
}

export interface SkillCdHud {
  id: string
  key: string
  name: string
  color: string
  left: number
  total: number
  locked: boolean
  needRealm: string
}

export interface AscensionHud {
  /** gate=天河已开待驶入 · sailing=逆流升空中 · crossing=穿云过渡 */
  phase: 'gate' | 'sailing' | 'crossing'
  /** 沿通天河道的进度 0~1 */
  progress: number
  /** 船身距原本水面的高度 */
  altitude: number
}

interface PersistedProgress {
  money: number
  bag: Catch[]
  caughtLog: Record<string, number>
  totalEarned: number
  bestKg: number
  ownedItems: string[]
  boatSkin: BoatSkinId
  rodSkin: RodSkinId
  decorations: DecorationId[]
  season: SeasonId
  baitId: BaitId
  tools: Record<CaptureToolId, ToolState>
  activeTool: CaptureToolId
  gear: Record<GearId, number>
  farmPlots: PlotState[]
  pantry: Record<string, number>
  quests: QuestState[]
  questDay: string
  questSeason: SeasonId
  codex: Record<string, CodexEntry>
  codexClaims: number[]
  cabinLevel: number
  trophies: string[]
  aquarium: string[]
  pet: PetProgress
  traps: TrapState[]
  dailySold: DailySold
  gatherCooldowns: Record<string, number>
  stats: StoreStats
  hp: number
  ownedWeapons: WeaponId[]
  equippedWeapon: WeaponId
  weaponAmmo: Record<WeaponId, number>
  ownedFacilities: FacilityId[]
  installedFacilities: (FacilityId | null)[]
  facilityActive: Partial<Record<FacilityId, boolean>>
  boatPose: BoatPose | null
  toolVariants: Record<'harpoon' | 'net', ToolVariantId>
  ownedVariants: ToolVariantId[]
  variantAmmo: Record<string, number>
  achievements: AchievementMap
  crew: string[]
  relics: string[]
  ownedPlayerSkins: PlayerSkinId[]
  playerSkin: PlayerSkinId
  dragonRaceBest: number
  realm: number
  cultivationXp: number
  cultivationCores: number
  /** 当前所在地图：凡界海湾 / 天界云海 */
  mapZone: MapZone
  /** 天界专属货币，只用于仙舟与仙家物件 */
  immortalJade: number
  /** 是否已完成飞升（决定能否往返两界） */
  ascended: boolean
}

interface GameStore extends PersistedProgress {
  started: boolean
  phase: FishingPhase
  zone: string
  power: number
  fight: FightState | null
  bite: boolean
  prompt: string | null
  nearDock: boolean
  interactLabel: string | null
  card: Catch | null
  cardAdded: boolean
  marketOpen: boolean
  bagOpen: boolean
  shopOpen: boolean
  baitOpen: boolean
  seasonOpen: boolean
  townOpen: boolean
  townTab: TownTab
  npcId: string | null
  cookingOpen: boolean
  lightningAt: number
  captureResult: Catch[] | null
  captureTarget: CaptureTargetInfo | null
  rareFlash: Rarity | null
  lastCook: { recipeId: string; quality: Quality } | null
  toasts: ToastItem[]
  baitWear: number
  underwater: boolean
  underwaterMode: UnderwaterMode
  oxygen: number
  depth: number
  observedFish: string | null
  dead: boolean
  hitAt: number
  respawnToken: number
  boss: BossHud | null
  radarContacts: RadarContact[]
  inputLocked: boolean
  combatCamera: boolean
  nav: NavSnapshot | null
  achievementsOpen: boolean
  achievementToast: AchievementToast | null
  crewOpen: boolean
  seaEvent: SeaEventHud | null
  chestPrompt: string | null
  skinShopOpen: boolean
  dragonRace: DragonRaceHud | null
  crewCatchNote: CrewCatchNote | null
  tribulation: TribulationHud | null
  skillCds: SkillCdHud[]
  ascension: AscensionHud | null

  setStarted: (started: boolean) => void
  setPhase: (phase: FishingPhase) => void
  setZone: (zone: string) => void
  setPower: (power: number) => void
  setFight: (fight: FightState | null) => void
  setBite: (bite: boolean) => void
  setPrompt: (prompt: string | null) => void
  setNearDock: (near: boolean) => void
  setInteractLabel: (label: string | null) => void
  showCard: (c: Catch, added: boolean) => void
  closeCard: () => void
  addCatch: (c: Catch, method?: CatchMethod) => boolean
  sellOne: (id: string) => void
  sellAll: () => void
  openMarket: () => void
  closeMarket: () => void
  setBagOpen: (open: boolean) => void
  setShopOpen: (open: boolean) => void
  setBaitOpen: (open: boolean) => void
  setSeasonOpen: (open: boolean) => void
  setTownOpen: (open: boolean) => void
  setTownTab: (tab: TownTab) => void
  openNpc: (id: string) => void
  closeNpc: () => void
  setCookingOpen: (open: boolean) => void
  flashSky: () => void
  setCaptureResult: (list: Catch[] | null) => void
  setCaptureTarget: (target: CaptureTargetInfo | null) => void
  buyItem: (id: string) => boolean
  equipBoat: (id: BoatSkinId) => void
  equipRod: (id: RodSkinId) => void
  toggleDecoration: (id: DecorationId) => void
  setSeason: (season: SeasonId) => void
  setBait: (bait: BaitId) => void
  wearBait: (amount: number) => number
  setUnderwater: (underwater: boolean) => void
  setUnderwaterMode: (mode: UnderwaterMode) => void
  cycleUnderwaterMode: () => void
  setOxygen: (oxygen: number) => void
  setDepth: (depth: number) => void
  setObservedFish: (defId: string | null) => void
  setActiveTool: (id: CaptureToolId) => void
  wearTool: (id: CaptureToolId, amount: number) => number
  repairTool: (id: CaptureToolId) => boolean
  upgradeTool: (id: CaptureToolId) => boolean
  upgradeGear: (id: GearId) => boolean
  addTrap: (trap: Omit<TrapState, 'id'>) => boolean
  collectTrap: (id: string) => boolean
  plantPlot: (index: number, cropId: CropId) => boolean
  waterPlot: (index: number) => boolean
  harvestPlot: (index: number) => boolean
  buySeed: (cropId: CropId, qty?: number) => boolean
  sellPantryItem: (key: string, qty?: number) => boolean
  cookDish: (recipeId: string, quality: Quality) => string | null
  eatDish: (key: string) => boolean
  gather: (nodeId: string) => { itemId: string; qty: number } | null
  feedPet: () => boolean
  playPet: () => boolean
  patPet: () => boolean
  npcGift: (npcId: string) => string | null
  upgradeCabin: () => boolean
  setTrophy: (defId: string) => boolean
  setAquarium: (defId: string) => boolean
  claimCodexReward: (threshold: number) => boolean
  acceptQuest: (id: string) => boolean
  abandonQuest: (id: string) => void
  claimQuest: (id: string) => boolean
  refreshDailyQuests: () => void
  damagePlayer: (amount: number, source?: string) => boolean
  healPlayer: (amount: number) => void
  respawn: () => void
  buyWeapon: (id: WeaponId) => boolean
  equipWeapon: (id: WeaponId) => void
  consumeAmmo: (id: WeaponId) => boolean
  refillWeapon: (id: WeaponId) => boolean
  buyFacility: (id: FacilityId) => boolean
  installFacility: (index: number, id: FacilityId | null) => void
  toggleFacility: (id: FacilityId) => void
  grillCatch: () => boolean
  grantMoney: (amount: number, text?: string) => void
  setBoatPose: (pose: BoatPose) => void
  setBoss: (boss: BossHud | null) => void
  setRadarContacts: (contacts: RadarContact[]) => void
  setInputLocked: (locked: boolean) => void
  setCombatCamera: (on: boolean) => void
  toggleCombatCamera: () => void
  setNav: (nav: NavSnapshot) => void
  buyToolVariant: (id: ToolVariantId) => boolean
  setToolVariant: (id: ToolVariantId) => void
  cycleToolVariant: () => void
  consumeVariantAmmo: (id: ToolVariantId) => boolean
  refillVariantAmmo: (id: ToolVariantId) => boolean
  grantVariant: (id: ToolVariantId) => boolean
  setAchievementsOpen: (open: boolean) => void
  toggleAchievements: () => void
  advanceAchievement: (id: string, amount: number) => void
  dismissAchievementToast: () => void
  setCrewOpen: (open: boolean) => void
  hireCrew: (id: string) => boolean
  addRelic: (name: string) => void
  setSeaEvent: (event: SeaEventHud | null) => void
  setChestPrompt: (text: string | null) => void
  setSkinShopOpen: (open: boolean) => void
  buyPlayerSkin: (id: PlayerSkinId) => boolean
  equipPlayerSkin: (id: PlayerSkinId) => void
  setDragonRace: (race: DragonRaceHud | null) => void
  completeDragonBoatRace: (secondsLeft: number) => void
  showCrewCatch: (text: string) => void
  absorbCore: (name: string, xp: number) => boolean
  /** 天界渔获直接灌顶修为，返回是否已圆满可渡劫 */
  gainCultivation: (xp: number, source: string) => boolean
  applyBreakthrough: () => { fromName: string; toName: string; realm: number } | null
  setTribulation: (hud: TribulationHud | null) => void
  setSkillCds: (cds: SkillCdHud[]) => void
  setMapZone: (zone: MapZone) => void
  markAscended: () => void
  grantJade: (amount: number, text?: string) => void
  spendJade: (amount: number) => boolean
  setAscension: (hud: AscensionHud | null) => void
  toast: (text: string, tone?: ToastItem['tone']) => void
  dismissToast: (id: number) => void
  resetProgress: () => void
}

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && WEAPONS.some((w) => w.id === value)
}

function isVariantId(value: unknown): value is ToolVariantId {
  return typeof value === 'string' && TOOL_VARIANTS.some((v) => v.id === value)
}

function sanitizeInstalled(raw: unknown, boat: BoatSkinId): (FacilityId | null)[] {
  const slots = boatFacilitySlots(boat)
  const base = Array.from({ length: slots }, () => null) as (FacilityId | null)[]
  if (!Array.isArray(raw)) return base
  for (let i = 0; i < slots; i++) {
    const id = raw[i]
    if (typeof id === 'string' && isFacilityId(id)) base[i] = id
  }
  return base
}

function resizeInstalled(list: (FacilityId | null)[], boat: BoatSkinId): (FacilityId | null)[] {
  const slots = boatFacilitySlots(boat)
  const out = list.slice(0, slots)
  while (out.length < slots) out.push(null)
  return out
}

function defaultVariantAmmo(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const variant of TOOL_VARIANTS) out[variant.id] = variant.ammoMax
  return out
}

function num(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function sanitizeAchievements(raw: unknown): AchievementMap {
  const map = emptyAchievements()
  if (!isObj(raw)) return map
  for (const def of ACHIEVEMENTS) {
    const entry = raw[def.id]
    if (!isObj(entry)) continue
    const progress: AchievementProgress = {
      progress: clamp(num(entry.progress, 0), 0, def.target),
      unlockedAt: Math.max(0, num(entry.unlockedAt, 0)),
    }
    map[def.id] = progress
  }
  return map
}

function sanitizeCrew(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const id of raw) {
    if (typeof id === 'string' && crewById(id) && !out.includes(id)) out.push(id)
  }
  return out.slice(0, CREW.length)
}

function readSave(): Partial<PersistedProgress> {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, unknown>
    const out: Partial<PersistedProgress> = {}
    if (typeof p.money === 'number') out.money = p.money
    if (Array.isArray(p.bag)) {
      out.bag = p.bag.filter(
        (c): c is Catch => isObj(c) && typeof c.id === 'string' && typeof c.defId === 'string',
      )
    }
    if (isObj(p.caughtLog)) {
      const log: Record<string, number> = {}
      for (const [k, v] of Object.entries(p.caughtLog)) if (typeof v === 'number') log[k] = v
      out.caughtLog = log
    }
    if (typeof p.totalEarned === 'number') out.totalEarned = p.totalEarned
    if (typeof p.bestKg === 'number') out.bestKg = p.bestKg
    if (Array.isArray(p.ownedItems)) {
      out.ownedItems = p.ownedItems.filter((id): id is string => typeof id === 'string')
    }
    if (typeof p.boatSkin === 'string' && isBoatSkin(p.boatSkin)) out.boatSkin = p.boatSkin
    if (typeof p.rodSkin === 'string' && isRodSkin(p.rodSkin)) out.rodSkin = p.rodSkin
    if (Array.isArray(p.decorations)) {
      out.decorations = p.decorations.filter(
        (id): id is DecorationId => typeof id === 'string' && isDecoration(id),
      )
    }
    if (isSeasonId(p.season)) out.season = p.season
    if (isBaitId(p.baitId)) out.baitId = p.baitId
    if (isObj(p.tools)) out.tools = p.tools as unknown as Record<CaptureToolId, ToolState>
    if (p.activeTool === 'harpoon' || p.activeTool === 'net' || p.activeTool === 'trap') {
      out.activeTool = p.activeTool
    }
    if (isObj(p.gear)) out.gear = p.gear as unknown as Record<GearId, number>
    if (Array.isArray(p.farmPlots)) out.farmPlots = p.farmPlots as unknown as PlotState[]
    if (isObj(p.pantry)) {
      const pantry: Record<string, number> = {}
      for (const [k, v] of Object.entries(p.pantry)) if (typeof v === 'number' && v > 0) pantry[k] = v
      out.pantry = pantry
    }
    if (Array.isArray(p.quests)) out.quests = p.quests as unknown as QuestState[]
    if (typeof p.questDay === 'string') out.questDay = p.questDay
    if (isSeasonId(p.questSeason)) out.questSeason = p.questSeason
    if (isObj(p.codex)) out.codex = p.codex as unknown as Record<string, CodexEntry>
    if (Array.isArray(p.codexClaims)) {
      out.codexClaims = p.codexClaims.filter((v): v is number => typeof v === 'number')
    }
    if (typeof p.cabinLevel === 'number') out.cabinLevel = p.cabinLevel
    if (Array.isArray(p.trophies)) out.trophies = p.trophies.filter((v): v is string => typeof v === 'string')
    if (Array.isArray(p.aquarium)) out.aquarium = p.aquarium.filter((v): v is string => typeof v === 'string')
    if (isObj(p.pet)) out.pet = p.pet as unknown as PetProgress
    if (Array.isArray(p.traps)) out.traps = p.traps as unknown as TrapState[]
    if (isObj(p.dailySold)) out.dailySold = p.dailySold as unknown as DailySold
    if (isObj(p.gatherCooldowns)) {
      const map: Record<string, number> = {}
      for (const [k, v] of Object.entries(p.gatherCooldowns)) {
        if (typeof v === 'number') map[k] = v
      }
      out.gatherCooldowns = map
    }
    if (isObj(p.stats)) out.stats = p.stats as unknown as StoreStats
    if (typeof p.hp === 'number') out.hp = p.hp
    if (Array.isArray(p.ownedWeapons)) {
      out.ownedWeapons = p.ownedWeapons.filter(isWeaponId)
    }
    if (isWeaponId(p.equippedWeapon)) out.equippedWeapon = p.equippedWeapon
    if (isObj(p.weaponAmmo)) {
      const ammo: Record<WeaponId, number> = { knife: 0, speargun: 6 }
      for (const weapon of WEAPONS) {
        ammo[weapon.id] = Math.max(0, Math.round(num(p.weaponAmmo[weapon.id], weapon.ammoMax)))
      }
      out.weaponAmmo = ammo
    }
    if (Array.isArray(p.ownedFacilities)) {
      out.ownedFacilities = p.ownedFacilities.filter(
        (id): id is FacilityId => typeof id === 'string' && isFacilityId(id),
      )
    }
    if (Array.isArray(p.installedFacilities)) {
      out.installedFacilities = p.installedFacilities as (FacilityId | null)[]
    }
    if (isObj(p.facilityActive)) {
      const active: Partial<Record<FacilityId, boolean>> = {}
      for (const facility of FACILITIES) {
        if (typeof p.facilityActive[facility.id] === 'boolean') {
          active[facility.id] = Boolean(p.facilityActive[facility.id])
        }
      }
      out.facilityActive = active
    }
    if (isObj(p.boatPose) && typeof p.boatPose.x === 'number' && typeof p.boatPose.z === 'number') {
      out.boatPose = {
        x: p.boatPose.x,
        z: p.boatPose.z,
        heading: num(p.boatPose.heading, 0),
      }
    }
    if (isObj(p.toolVariants)) {
      const variants = { ...DEFAULT_VARIANTS }
      for (const key of ['harpoon', 'net'] as const) {
        const value = p.toolVariants[key]
        if (isVariantId(value) && variantById(value)?.tool === key) variants[key] = value
      }
      out.toolVariants = variants
    }
    if (Array.isArray(p.ownedVariants)) {
      out.ownedVariants = p.ownedVariants.filter(isVariantId)
    }
    if (isObj(p.variantAmmo)) {
      const ammo: Record<string, number> = {}
      for (const variant of TOOL_VARIANTS) {
        ammo[variant.id] = Math.max(0, Math.round(num(p.variantAmmo[variant.id], variant.ammoMax)))
      }
      out.variantAmmo = ammo
    }
    out.achievements = sanitizeAchievements(p.achievements)
    out.crew = sanitizeCrew(p.crew)
    if (Array.isArray(p.relics)) {
      out.relics = p.relics.filter((v): v is string => typeof v === 'string').slice(0, 40)
    }
    if (Array.isArray(p.ownedPlayerSkins)) {
      const owned = p.ownedPlayerSkins.filter(isPlayerSkin)
      out.ownedPlayerSkins = Array.from(new Set<PlayerSkinId>(['angler', ...owned]))
    }
    const savedSkin = p.playerSkin
    if (typeof savedSkin === 'string' && isPlayerSkin(savedSkin) && out.ownedPlayerSkins?.includes(savedSkin)) {
      out.playerSkin = savedSkin
    }
    if (typeof p.dragonRaceBest === 'number') {
      out.dragonRaceBest = Math.max(0, Math.min(999, Math.round(p.dragonRaceBest)))
    }
    if (isRealmIndex(p.realm)) out.realm = p.realm
    if (typeof p.cultivationXp === 'number' && Number.isFinite(p.cultivationXp)) {
      out.cultivationXp = Math.max(0, Math.round(p.cultivationXp))
    }
    if (typeof p.cultivationCores === 'number' && Number.isFinite(p.cultivationCores)) {
      out.cultivationCores = Math.max(0, Math.round(p.cultivationCores))
    }
    if (p.mapZone === 'celestial' || p.mapZone === 'mortal') out.mapZone = p.mapZone
    if (typeof p.immortalJade === 'number' && Number.isFinite(p.immortalJade)) {
      out.immortalJade = Math.max(0, Math.round(p.immortalJade))
    }
    if (typeof p.ascended === 'boolean') out.ascended = p.ascended
    return out
  } catch {
    return {}
  }
}

function sanitizeTools(raw: Partial<Record<CaptureToolId, Partial<ToolState>>> | undefined) {
  const tools = {} as Record<CaptureToolId, ToolState>
  for (const def of CAPTURE_TOOLS) {
    const r = raw?.[def.id]
    tools[def.id] = {
      level: Math.round(clamp(num(r?.level, 1), 1, def.levels.length)),
      wear: clamp(num(r?.wear, 100), 0, 100),
      uses: Math.max(0, Math.round(num(r?.uses, 0))),
      catches: Math.max(0, Math.round(num(r?.catches, 0))),
    }
  }
  return tools
}

function sanitizeGear(raw: Partial<Record<GearId, number>> | undefined): Record<GearId, number> {
  return {
    rod: Math.round(clamp(num(raw?.rod, 1), 1, 3)),
    line: Math.round(clamp(num(raw?.line, 1), 1, 3)),
    hook: Math.round(clamp(num(raw?.hook, 1), 1, 3)),
  }
}

function sanitizePlots(raw: PlotState[] | undefined): PlotState[] {
  const base = emptyPlots()
  if (!Array.isArray(raw)) return base
  return base.map((fallback, i) => {
    const r = raw[i]
    if (!isObj(r) || typeof r.cropId !== 'string' || !isCropId(r.cropId)) return fallback
    return {
      id: i,
      cropId: r.cropId,
      plantedAt: num(r.plantedAt, Date.now()),
      watered: Boolean(r.watered),
      boostMs: Math.max(0, num(r.boostMs, 0)),
    }
  })
}

function sanitizeQuests(raw: QuestState[] | undefined): QuestState[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: QuestState[] = []
  for (const q of raw) {
    if (!isObj(q) || typeof q.id !== 'string') continue
    out.push({
      id: q.id,
      progress: Math.max(0, num(q.progress, 0)),
      accepted: Boolean(q.accepted),
      claimed: Boolean(q.claimed),
    })
  }
  return out.length ? out : null
}

function sanitizeCodex(raw: Record<string, CodexEntry> | undefined) {
  const codex: Record<string, CodexEntry> = {}
  if (!raw) return codex
  for (const [key, entry] of Object.entries(raw)) {
    if (!isObj(entry) || typeof entry.count !== 'number') continue
    codex[key] = {
      count: Math.max(0, entry.count),
      firstAt: num(entry.firstAt, Date.now()),
      bestKg: num(entry.bestKg, 0),
      bestCm: num(entry.bestCm, 0),
      methods: Array.isArray(entry.methods)
        ? entry.methods.filter((m): m is CatchMethod => m === 'rod' || m === 'harpoon' || m === 'net' || m === 'trap')
        : [],
    }
  }
  return codex
}

function sanitizeTraps(raw: TrapState[] | undefined): TrapState[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (t) =>
        isObj(t) &&
        typeof t.id === 'string' &&
        typeof t.x === 'number' &&
        typeof t.z === 'number' &&
        Array.isArray(t.outcome),
    )
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      x: t.x,
      y: num(t.y, -1),
      z: t.z,
      placedAt: num(t.placedAt, Date.now()),
      readyAt: num(t.readyAt, Date.now()),
      depth: num(t.depth, 1),
      outcome: t.outcome.filter((id): id is string => typeof id === 'string'),
    }))
}

function sanitizePet(raw: PetProgress | undefined): PetProgress {
  const base = defaultPet()
  if (!raw) return base
  return {
    affection: clamp(num(raw.affection, base.affection), 0, 100),
    lastFed: num(raw.lastFed, 0),
    lastPlayed: num(raw.lastPlayed, 0),
    lastPet: num(raw.lastPet, 0),
  }
}

function sanitizeStats(raw: StoreStats | undefined): StoreStats {
  return {
    cooked: Math.max(0, Math.round(num(raw?.cooked, 0))),
    harvested: Math.max(0, Math.round(num(raw?.harvested, 0))),
    gathered: Math.max(0, Math.round(num(raw?.gathered, 0))),
    soldValue: Math.max(0, num(raw?.soldValue, 0)),
  }
}

let toastSeq = 0
let achievementSeq = 0
let achievementPersistAt = 0

export const useGameStore = create<GameStore>()((set, get) => {
  const saved = readSave()
  const initialOwned = Array.from(new Set([...DEFAULT_OWNED, ...(saved.ownedItems ?? [])]))
  const initialBoat =
    saved.boatSkin && initialOwned.includes(saved.boatSkin) ? saved.boatSkin : 'rowboat'
  const initialRod =
    saved.rodSkin && initialOwned.includes(saved.rodSkin) ? saved.rodSkin : 'classic'
  const initialDecorations = (saved.decorations ?? []).filter(
    (id) => initialOwned.includes(id) && isDecoration(id),
  )
  const initialSeason = saved.season ?? 'spring'
  const today = dayKey()

  const validQuestDay = saved.questDay === today
  const savedQuests = validQuestDay ? sanitizeQuests(saved.quests) : null
  const initialQuestSeason = validQuestDay && saved.questSeason ? saved.questSeason : initialSeason
  const initialQuests: QuestState[] = savedQuests
    ? savedQuests
    : dailyQuestList(today, initialSeason).map((q) => ({
        id: q.id,
        progress: 0,
        accepted: false,
        claimed: false,
      }))
  const initialQuestDay = savedQuests ? today : today
  const initialQuestSeasonFinal = savedQuests ? initialQuestSeason : initialSeason

  const tools = sanitizeTools(saved.tools)
  const gear = sanitizeGear(saved.gear)
  const farmPlots = sanitizePlots(saved.farmPlots)
  const pantry = saved.pantry ?? { 'seed:radish': 3, 'seed:scallion': 2 }
  const codex = sanitizeCodex(saved.codex)
  const pet = sanitizePet(saved.pet)
  const traps = sanitizeTraps(saved.traps)
  const dailySold: DailySold =
    saved.dailySold?.day === today
      ? { day: today, value: Math.max(0, num(saved.dailySold.value, 0)) }
      : { day: today, value: 0 }
  const gatherCooldowns = saved.gatherCooldowns ?? {}
  const stats = sanitizeStats(saved.stats)
  const initialCabin = Math.round(clamp(num(saved.cabinLevel, 1), 1, 3))
  const trophies = (saved.trophies ?? []).filter((id) => Boolean(fishById(id)))
  const aquarium = (saved.aquarium ?? []).filter((id) => Boolean(fishById(id)))
  const codexClaims = (saved.codexClaims ?? []).filter((n) =>
    (CODEX_MILESTONES as readonly number[]).includes(n),
  )
  const initialHp = Math.round(clamp(num(saved.hp, MAX_HP), 1, maxHpFor(saved.realm ?? 0)))
  const ownedWeapons = Array.from(
    new Set<WeaponId>(['knife', ...(saved.ownedWeapons ?? [])]),
  )
  const equippedWeapon =
    saved.equippedWeapon && ownedWeapons.includes(saved.equippedWeapon)
      ? saved.equippedWeapon
      : 'knife'
  const weaponAmmo: Record<WeaponId, number> = saved.weaponAmmo ?? { knife: 0, speargun: 6 }
  const ownedFacilities = saved.ownedFacilities ?? []
  const installedFacilities = sanitizeInstalled(saved.installedFacilities, initialBoat)
  const facilityActive = saved.facilityActive ?? {}
  const toolVariants = saved.toolVariants ?? { ...DEFAULT_VARIANTS }
  const ownedVariants = Array.from(
    new Set<ToolVariantId>(['harpoon', 'net', ...(saved.ownedVariants ?? [])]),
  )
  const variantAmmo = { ...defaultVariantAmmo(), ...(saved.variantAmmo ?? {}) }
  const achievements = sanitizeAchievements(saved.achievements)
  const crew = sanitizeCrew(saved.crew)
  const relics = saved.relics ?? []
  const ownedPlayerSkins = saved.ownedPlayerSkins ?? ['angler']
  const playerSkin = saved.playerSkin ?? 'angler'
  const dragonRaceBest = saved.dragonRaceBest ?? 0

  const persist = () => {
    const {
      money,
      bag,
      caughtLog,
      totalEarned,
      bestKg,
      ownedItems,
      boatSkin,
      rodSkin,
      decorations,
      season,
      baitId,
      tools,
      activeTool,
      gear,
      farmPlots,
      pantry,
      quests,
      questDay,
      questSeason,
      codex,
      codexClaims,
      cabinLevel,
      trophies,
      aquarium,
      pet,
      traps,
      dailySold,
      gatherCooldowns,
      stats,
      hp,
      ownedWeapons,
      equippedWeapon,
      weaponAmmo,
      ownedFacilities,
      installedFacilities,
      facilityActive,
      boatPose,
      toolVariants,
      ownedVariants,
      variantAmmo,
      achievements,
      crew,
      relics,
      ownedPlayerSkins,
      playerSkin,
      dragonRaceBest,
      realm,
      cultivationXp,
      cultivationCores,
      mapZone,
      immortalJade,
      ascended,
    } = get()
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          money,
          bag,
          caughtLog,
          totalEarned,
          bestKg,
          ownedItems,
          boatSkin,
          rodSkin,
          decorations,
          season,
          baitId,
          tools,
          activeTool,
          gear,
          farmPlots,
          pantry,
          quests,
          questDay,
          questSeason,
          codex,
          codexClaims,
          cabinLevel,
          trophies,
          aquarium,
          pet,
          traps,
          dailySold,
          gatherCooldowns,
          stats,
          hp,
          ownedWeapons,
          equippedWeapon,
          weaponAmmo,
          ownedFacilities,
          installedFacilities,
          facilityActive,
          boatPose,
          toolVariants,
          ownedVariants,
          variantAmmo,
          achievements,
          crew,
          relics,
          ownedPlayerSkins,
          playerSkin,
          dragonRaceBest,
          realm,
          cultivationXp,
          cultivationCores,
          mapZone,
          immortalJade,
          ascended,
        }),
      )
    } catch {
      // storage can be unavailable in private mode; the game still runs.
    }
  }

  const questDefsFor = (state: GameStore) =>
    dailyQuestList(state.questDay, state.questSeason)

  const bumpQuests = (state: GameStore, event: QuestEvent) =>
    advanceQuests(state.quests, questDefsFor(state), event)

  const codexEntry = (
    prev: CodexEntry | undefined,
    patch: { kg?: number; cm?: number; method?: CatchMethod; count?: number },
  ): CodexEntry => ({
    count: (prev?.count ?? 0) + (patch.count ?? 1),
    firstAt: prev?.firstAt ?? Date.now(),
    bestKg: Math.max(prev?.bestKg ?? 0, patch.kg ?? 0),
    bestCm: Math.max(prev?.bestCm ?? 0, patch.cm ?? 0),
    methods: patch.method
      ? Array.from(new Set([...(prev?.methods ?? []), patch.method]))
      : (prev?.methods ?? []),
  })

  const flashRare = (rarity: Rarity) => {
    if (rarity !== 'epic' && rarity !== 'legendary') return
    set({ rareFlash: rarity })
    window.setTimeout(() => {
      if (get().rareFlash === rarity) set({ rareFlash: null })
    }, rarity === 'legendary' ? 4200 : 2800)
  }

  return {
    money: saved.money ?? 60,
    bag: saved.bag ?? [],
    caughtLog: saved.caughtLog ?? {},
    totalEarned: saved.totalEarned ?? 0,
    bestKg: saved.bestKg ?? 0,
    ownedItems: initialOwned,
    boatSkin: initialBoat,
    rodSkin: initialRod,
    decorations: initialDecorations,
    season: initialSeason,
    baitId: saved.baitId ?? 'worm',
    tools,
    activeTool: saved.activeTool ?? 'harpoon',
    gear,
    farmPlots,
    pantry,
    quests: initialQuests,
    questDay: initialQuestDay,
    questSeason: initialQuestSeasonFinal,
    codex,
    codexClaims,
    cabinLevel: initialCabin,
    trophies: trophies.slice(0, 2 + initialCabin),
    aquarium: aquarium.slice(0, 1 + initialCabin),
    pet,
    traps,
    dailySold,
    gatherCooldowns,
    stats,
    hp: initialHp,
    ownedWeapons,
    equippedWeapon,
    weaponAmmo,
    ownedFacilities,
    installedFacilities,
    facilityActive,
    boatPose: saved.boatPose ?? null,
    toolVariants,
    ownedVariants,
    variantAmmo,
    achievements,
    crew,
    relics,
    ownedPlayerSkins,
    playerSkin,
    dragonRaceBest,
    realm: saved.realm ?? 0,
    cultivationXp: saved.cultivationXp ?? 0,
    cultivationCores: saved.cultivationCores ?? 0,
    ascended: saved.ascended === true,
    mapZone: saved.ascended === true ? (saved.mapZone ?? 'mortal') : 'mortal',
    immortalJade: saved.immortalJade ?? 0,

    started: false,
    phase: 'idle',
    zone: '老码头',
    power: 0,
    fight: null,
    bite: false,
    prompt: null,
    nearDock: false,
    interactLabel: null,
    card: null,
    cardAdded: false,
    marketOpen: false,
    bagOpen: false,
    shopOpen: false,
    baitOpen: false,
    seasonOpen: false,
    townOpen: false,
    townTab: 'quests',
    npcId: null,
    cookingOpen: false,
    lightningAt: 0,
    captureResult: null,
    captureTarget: null,
    rareFlash: null,
    lastCook: null,
    toasts: [],
    baitWear: 100,
    underwater: false,
    underwaterMode: 'dive',
    oxygen: 100,
    depth: 0,
    observedFish: null,
    dead: false,
    hitAt: 0,
    respawnToken: 0,
    boss: null,
    radarContacts: [],
    inputLocked: false,
    combatCamera: false,
    nav: null,
    achievementsOpen: false,
    achievementToast: null,
    crewOpen: false,
    seaEvent: null,
    chestPrompt: null,
    skinShopOpen: false,
    dragonRace: null,
    crewCatchNote: null,
    tribulation: null,
    skillCds: [],
    ascension: null,

    setStarted: (started) => set({ started }),
    setPhase: (phase) => set({ phase }),
    setZone: (zone) => set({ zone }),
    setPower: (power) => set({ power }),
    setFight: (fight) => set({ fight }),
    setBite: (bite) => set({ bite }),
    setPrompt: (prompt) => set({ prompt }),
    setNearDock: (near) => set({ nearDock: near }),
    setInteractLabel: (label) => set({ interactLabel: label }),

    showCard: (c, added) => set({ card: c, cardAdded: added }),
    closeCard: () => set({ card: null }),

    addCatch: (c, method = c.method ?? 'rod') => {
      const state = get()
      const added = state.bag.length < bagCapacity(state)
      const bag = added ? [...state.bag, { ...c, method }] : state.bag
      if (c.junk) {
        set({ bag })
        if (!added) get().toast('鱼篓满了，这团垃圾又滑回海里', 'danger')
        else get().toast(`捞上来一${c.name}…`, 'info')
        persist()
        return added
      }
      const caughtLog = { ...state.caughtLog, [c.defId]: (state.caughtLog[c.defId] ?? 0) + 1 }
      const key = `fish:${c.defId}`
      const codex = {
        ...state.codex,
        [key]: codexEntry(state.codex[key], { kg: c.kg, cm: c.cm, method }),
      }
      let toolsState = state.tools
      if (method === 'harpoon' || method === 'net' || method === 'trap') {
        const tool = state.tools[method]
        toolsState = {
          ...state.tools,
          [method]: { ...tool, catches: tool.catches + 1 },
        }
      }
      const quests = bumpQuests(state, {
        kind: 'catch',
        amount: 1,
        defId: c.defId,
        rarity: c.rarity,
        method,
      })
      set({
        bag,
        caughtLog,
        codex,
        tools: toolsState,
        quests,
        bestKg: Math.max(state.bestKg, c.kg),
      })
      if (!added) get().toast('鱼篓满了，这条鱼被放回了水里', 'danger')
      flashRare(c.rarity)
      if (c.rarity === 'legendary') {
        get().toast(`传说现世 · ${c.name}`, 'gold')
      }
      persist()
      return added
    },

    sellOne: (id) => {
      const state = get()
      const target = state.bag.find((c) => c.id === id)
      if (!target) return
      const quote = marketQuote(
        target,
        state.season,
        state.cabinLevel,
        state.dailySold,
        state.installedFacilities.includes('livewell'),
      )
      const dailySold = addDailySold(state.dailySold, quote.price)
      const quests = bumpQuests(state, { kind: 'sell', amount: quote.price })
      set({
        bag: state.bag.filter((c) => c.id !== id),
        money: state.money + quote.price,
        totalEarned: state.totalEarned + quote.price,
        dailySold,
        quests,
        stats: { ...state.stats, soldValue: state.stats.soldValue + quote.price },
      })
      get().toast(`卖出 ${target.name}  +¥${quote.price}`, 'gold')
      persist()
    },

    sellAll: () => {
      const state = get()
      if (!state.bag.length) return
      const quotes = state.bag.map((c) =>
        marketQuote(
          c,
          state.season,
          state.cabinLevel,
          state.dailySold,
          state.installedFacilities.includes('livewell'),
        ),
      )
      const total = quotes.reduce((s, q) => s + q.price, 0)
      const dailySold = addDailySold(state.dailySold, total)
      const quests = bumpQuests(state, { kind: 'sell', amount: total })
      set({
        bag: [],
        money: state.money + total,
        totalEarned: state.totalEarned + total,
        dailySold,
        quests,
        stats: { ...state.stats, soldValue: state.stats.soldValue + total },
      })
      get().toast(`全部卖出  +¥${total}`, 'gold')
      persist()
    },

    openMarket: () =>
      set({
        marketOpen: true,
        townOpen: false,
        npcId: null,
        cookingOpen: false,
        bagOpen: false,
        shopOpen: false,
        baitOpen: false,
        seasonOpen: false,
      }),
    closeMarket: () => set({ marketOpen: false }),
    setBagOpen: (open) => set({ bagOpen: open }),
    setShopOpen: (open) => set({ shopOpen: open }),
    setBaitOpen: (open) => set({ baitOpen: open }),
    setSeasonOpen: (open) => set({ seasonOpen: open }),

    setTownOpen: (open) => {
      const state = get()
      if (open) {
        if (state.underwater) {
          state.toast('先浮回水面，再回小镇', 'info')
          return
        }
        if (state.phase !== 'idle') {
          state.toast('先收线，再回小镇', 'info')
          return
        }
        get().refreshDailyQuests()
        set({
          townOpen: true,
          npcId: null,
          cookingOpen: false,
          marketOpen: false,
          bagOpen: false,
          shopOpen: false,
          baitOpen: false,
          seasonOpen: false,
          card: null,
        })
      } else {
        set({ townOpen: false, npcId: null })
      }
    },

    setTownTab: (tab) => set({ townTab: tab }),
    openNpc: (id) => {
      if (!npcById(id)) return
      set({ npcId: id, cookingOpen: false })
    },
    closeNpc: () => set({ npcId: null }),
    setCookingOpen: (open) => {
      const state = get()
      if (open && state.underwater) {
        state.toast('先浮回水面再开锅', 'info')
        return
      }
      if (open) {
        set({
          cookingOpen: true,
          townOpen: false,
          npcId: null,
          marketOpen: false,
          bagOpen: false,
          shopOpen: false,
          baitOpen: false,
          seasonOpen: false,
          card: null,
        })
      } else {
        set({ cookingOpen: false })
      }
    },
    flashSky: () => set({ lightningAt: Date.now() }),

    setCaptureResult: (list) => set({ captureResult: list }),
    setCaptureTarget: (target) => set({ captureTarget: target }),

    setSeason: (season) => {
      if (!isSeasonId(season) || get().season === season) return
      set({ season })
      const profile = SEASONS[season]
      get().toast(`季节切换 · ${profile.name} · ${profile.tagline}`, 'gold')
      persist()
    },

    setBait: (bait) => {
      if (!isBaitId(bait)) return
      const def = baitById(bait)
      set({ baitId: bait, baitWear: 100 })
      get().toast(`换上鱼饵 · ${def?.name ?? '新饵'}`, 'gold')
      persist()
    },

    wearBait: (amount) => {
      const state = get()
      const remaining = Math.max(0, state.baitWear - Math.max(0, amount))
      if (remaining > 0) {
        set({ baitWear: remaining })
        return remaining
      }
      set({ baitId: 'worm', baitWear: 100 })
      state.toast('饵料用尽了，换回红蚯蚓', 'info')
      persist()
      return 0
    },

    setUnderwater: (underwater) => {
      const state = get()
      if (state.underwater === underwater) return
      if (underwater && state.phase !== 'idle') {
        state.toast('先收线，再潜下水', 'info')
        return
      }
      set({
        underwater,
        oxygen: 100,
        depth: 0,
        observedFish: null,
        captureTarget: null,
        townOpen: false,
        npcId: null,
        cookingOpen: false,
        combatCamera: false,
        inputLocked: underwater ? false : get().inputLocked,
      })
      if (underwater) {
        state.toast('已潜入水下 · 左键使用工具 / V 上浮', 'info')
      }
    },

    setUnderwaterMode: (mode) => {
      set({ underwaterMode: mode, captureTarget: null })
      get().toast(`水下视角 · ${UNDERWATER_MODE_LABEL[mode]}`, 'info')
    },

    cycleUnderwaterMode: () => {
      const current = get().underwaterMode
      const next = UNDERWATER_MODES[(UNDERWATER_MODES.indexOf(current) + 1) % UNDERWATER_MODES.length]
      get().setUnderwaterMode(next)
    },

    setOxygen: (oxygen) => set({ oxygen: Math.max(0, Math.min(100, oxygen)) }),
    setDepth: (depth) => set({ depth: Math.max(0, depth) }),
    setObservedFish: (defId) => set({ observedFish: defId }),

    buyItem: (id) => {
      const entry = findShopEntry(id)
      if (!entry) return false
      const state = get()
      if (state.ownedItems.includes(id)) {
        state.toast('这件已经在你船上了')
        return false
      }
      if (entry.celestialOnly && !state.ascended) {
        state.toast('仙家之物 · 需渡劫飞升后方可请回', 'info')
        return false
      }
      if (entry.jade) {
        if (state.immortalJade < entry.jade) {
          state.toast(`仙玉不足 · 还需 ${entry.jade - state.immortalJade} 块`, 'danger')
          return false
        }
      } else if (state.money < entry.price) {
        state.toast('金币不够，先去码头卖几条鱼', 'danger')
        return false
      }
      const ownedItems = [...state.ownedItems, id]
      const patch: Partial<GameStore> = {
        ownedItems,
      }
      if (entry.jade) patch.immortalJade = state.immortalJade - entry.jade
      else patch.money = state.money - entry.price
      if (entry.kind === 'boat' && isBoatSkin(id)) {
        patch.boatSkin = id
        patch.installedFacilities = resizeInstalled(state.installedFacilities, id)
      }
      if (entry.kind === 'rod' && isRodSkin(id)) patch.rodSkin = id
      if (entry.kind === 'decoration' && isDecoration(id) && !state.decorations.includes(id)) {
        patch.decorations = [...state.decorations, id]
      }
      set(patch)
      const suffix = entry.kind === 'decoration' ? ' · 已挂上船' : ' · 已装备'
      get().toast(`已购入 ${entry.name}${suffix}`, 'gold')
      persist()
      return true
    },

    equipBoat: (id) => {
      const state = get()
      if (!state.ownedItems.includes(id)) return
      set({
        boatSkin: id,
        installedFacilities: resizeInstalled(state.installedFacilities, id),
      })
      const style = findShopEntry(id)
      get().toast(`已换乘 ${style?.name ?? '新船'}`, 'gold')
      persist()
    },

    equipRod: (id) => {
      const state = get()
      if (!state.ownedItems.includes(id)) return
      set({ rodSkin: id })
      const skin = findShopEntry(id)
      get().toast(`已换用 ${skin?.name ?? '新鱼竿'}`, 'gold')
      persist()
    },

    toggleDecoration: (id) => {
      const state = get()
      if (!state.ownedItems.includes(id)) return
      const equipped = state.decorations.includes(id)
      const decorations = equipped
        ? state.decorations.filter((d) => d !== id)
        : [...state.decorations, id]
      set({ decorations })
      const meta = DECORATIONS.find((d) => d.id === id)
      get().toast(`${equipped ? '已收起' : '已挂上'} ${meta?.name ?? '装饰'}`, equipped ? 'info' : 'gold')
      persist()
    },

    setActiveTool: (id) => {
      if (!toolById(id)) return
      if (get().activeTool === id) return
      set({ activeTool: id, captureTarget: null })
      get().toast(`换上 ${toolById(id)?.name ?? '新工具'}`, 'info')
      persist()
    },

    wearTool: (id, amount) => {
      const state = get()
      const tool = state.tools[id]
      const wear = clamp(tool.wear - Math.max(0, amount), 0, 100)
      set({
        tools: {
          ...state.tools,
          [id]: { ...tool, wear, uses: tool.uses + 1 },
        },
      })
      if (wear <= 0) {
        get().toast(`${toolById(id)?.name ?? '工具'}坏掉了，回渔具铺修一下`, 'danger')
      } else if (wear < 18) {
        get().toast(`${toolById(id)?.name ?? '工具'}快撑不住了`, 'info')
      }
      persist()
      return wear
    },

    repairTool: (id) => {
      const state = get()
      const tool = state.tools[id]
      if (tool.wear >= 99.5) {
        state.toast('这件工具还好好的')
        return false
      }
      const cost = toolRepairCost(tool.level, tool.wear)
      if (state.money < cost) {
        state.toast(`修理需要 ¥${cost}，金币不够`, 'danger')
        return false
      }
      set({
        money: state.money - cost,
        tools: { ...state.tools, [id]: { ...tool, wear: 100 } },
      })
      get().toast(`${toolById(id)?.name ?? '工具'}修好了 · -¥${cost}`, 'gold')
      persist()
      return true
    },

    upgradeTool: (id) => {
      const state = get()
      const def = toolById(id)
      const tool = state.tools[id]
      if (!def) return false
      const cost = toolUpgradeCost(id, tool.level)
      if (cost === null) {
        state.toast('这件工具已经升到顶了')
        return false
      }
      if (state.money < cost) {
        state.toast(`升级需要 ¥${cost}，金币不够`, 'danger')
        return false
      }
      set({
        money: state.money - cost,
        tools: { ...state.tools, [id]: { ...tool, level: tool.level + 1, wear: 100 } },
      })
      get().toast(`${def.name}升到 Lv.${tool.level + 1}`, 'gold')
      persist()
      return true
    },

    upgradeGear: (id) => {
      const state = get()
      const def: GearDef | undefined = gearById(id)
      const level = state.gear[id]
      if (!def) return false
      const cost = gearUpgradeCost(id, level)
      if (cost === null) {
        state.toast('这件装备已经升到顶了')
        return false
      }
      if (state.money < cost) {
        state.toast(`升级需要 ¥${cost}，金币不够`, 'danger')
        return false
      }
      set({ money: state.money - cost, gear: { ...state.gear, [id]: level + 1 } })
      get().toast(`${def.name}升到 Lv.${level + 1}`, 'gold')
      persist()
      return true
    },

    addTrap: (trap) => {
      const state = get()
      if (state.traps.length >= 3) {
        state.toast('最多同时布设 3 只鱼笼', 'info')
        return false
      }
      const id = `trap-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`
      set({ traps: [...state.traps, { ...trap, id }] })
      state.toast(`鱼笼已布设 · ${Math.max(1, Math.round((trap.readyAt - Date.now()) / 1000))} 秒后查看`, 'info')
      persist()
      return true
    },

    collectTrap: (id) => {
      const state = get()
      const trap = state.traps.find((t) => t.id === id)
      if (!trap) return false
      const now = Date.now()
      if (now < trap.readyAt) {
        state.toast(`鱼笼还要 ${Math.ceil((trap.readyAt - now) / 1000)} 秒`, 'info')
        return false
      }
      if (state.bag.length >= bagCapacity(state)) {
        state.toast('鱼篓满了，先腾出位置再收笼', 'danger')
        return false
      }
      const captures: Catch[] = []
      for (const defId of trap.outcome) {
        const def = fishById(defId)
        if (!def) continue
        const caught = createCatch(def, 'trap')
        const added = get().addCatch(caught, 'trap')
        if (added) captures.push(caught)
      }
      set({ traps: get().traps.filter((t) => t.id !== id) })
      if (captures.length) {
        set({ captureResult: captures })
        get().toast(`收笼 · ${captures.length} 条渔获`, 'gold')
      } else {
        get().toast('鱼笼里空空的', 'info')
      }
      persist()
      return captures.length > 0
    },

    plantPlot: (index, cropId) => {
      const state = get()
      const plot = state.farmPlots[index]
      const crop = cropById(cropId)
      if (!plot || !crop) return false
      if (plot.cropId) {
        state.toast('这块地已经种上了')
        return false
      }
      const key = seedKey(cropId)
      const count = state.pantry[key] ?? 0
      if (count < 1) {
        state.toast(`没有${crop.name}种子了，去铺子买一包`, 'danger')
        return false
      }
      const farmPlots = state.farmPlots.map((p) =>
        p.id === index
          ? { ...p, cropId, plantedAt: Date.now(), watered: false, boostMs: 0 }
          : p,
      )
      const pantry = { ...state.pantry, [key]: count - 1 }
      set({ farmPlots, pantry })
      state.toast(`播下 ${crop.name}`, 'gold')
      persist()
      return true
    },

    waterPlot: (index) => {
      const state = get()
      const plot = state.farmPlots[index]
      const crop = plot?.cropId ? cropById(plot.cropId) : undefined
      if (!plot || !crop) return false
      if (plot.watered) {
        state.toast('这块地已经浇过水了')
        return false
      }
      const farmPlots = state.farmPlots.map((p) =>
        p.id === index ? { ...p, watered: true, boostMs: p.boostMs + crop.growMs * 0.18 } : p,
      )
      set({ farmPlots })
      const seasonOk = crop.seasons.includes(state.season) || state.cabinLevel >= 3
      state.toast(
        seasonOk ? `给 ${crop.name} 浇了水` : `季节不对，${crop.name} 长得会慢一些`,
        seasonOk ? 'info' : 'gold',
      )
      persist()
      return true
    },

    harvestPlot: (index) => {
      const state = get()
      const plot = state.farmPlots[index]
      const crop = plot?.cropId ? cropById(plot.cropId) : undefined
      if (!plot || !crop) return false
      const info = growthInfo(plot, crop, state.season, state.cabinLevel, Date.now())
      if (!info.mature) {
        state.toast(plot.watered ? '还没熟，再等等' : '先浇一次水，苗才长得动', 'info')
        return false
      }
      const key = produceKey(crop.id)
      const pantry = {
        ...state.pantry,
        [key]: (state.pantry[key] ?? 0) + info.yieldCount,
      }
      const farmPlots = state.farmPlots.map((p) =>
        p.id === index
          ? { ...p, cropId: null, plantedAt: 0, watered: false, boostMs: 0 }
          : p,
      )
      const codexKey = `crop:${crop.id}`
      const codex = {
        ...state.codex,
        [codexKey]: codexEntry(state.codex[codexKey], { count: info.yieldCount }),
      }
      const quests = bumpQuests(state, {
        kind: 'harvest',
        amount: 1,
        cropId: crop.id,
      })
      set({
        pantry,
        farmPlots,
        codex,
        quests,
        stats: { ...state.stats, harvested: state.stats.harvested + info.yieldCount },
      })
      state.toast(`收获 ${crop.name} ×${info.yieldCount}`, 'gold')
      persist()
      return true
    },

    buySeed: (cropId, qty = 1) => {
      const state = get()
      const crop = cropById(cropId)
      if (!crop) return false
      const amount = Math.max(1, Math.floor(qty))
      const cost = crop.seedPrice * amount
      if (state.money < cost) {
        state.toast(`买种子需要 ¥${cost}`, 'danger')
        return false
      }
      const key = seedKey(cropId)
      set({
        money: state.money - cost,
        pantry: { ...state.pantry, [key]: (state.pantry[key] ?? 0) + amount },
      })
      state.toast(`购入 ${crop.name}种子 ×${amount} · -¥${cost}`, 'gold')
      persist()
      return true
    },

    sellPantryItem: (key, qty = 1) => {
      const state = get()
      const have = state.pantry[key] ?? 0
      const amount = Math.max(1, Math.floor(qty))
      if (have < amount) return false
      let unit = 0
      let name = '物产'
      if (key.startsWith('crop:')) {
        const crop = cropById(key.slice(5))
        if (!crop) return false
        unit = crop.sellPrice
        name = crop.name
      } else if (key.startsWith('forage:')) {
        const item = forageById(key.slice(7))
        if (!item) return false
        unit = item.sellPrice
        name = item.name
      } else if (key.startsWith('dish:')) {
        const parsed = parseDishKey(key)
        if (!parsed) return false
        unit = dishValue(key)
        name = recipeById(parsed.recipeId)?.name ?? '菜肴'
      } else {
        return false
      }
      const value = Math.round(unit * amount * (1 + Math.max(0, state.cabinLevel - 1) * 0.05))
      const dailySold = addDailySold(state.dailySold, value)
      const quests = bumpQuests(state, { kind: 'sell', amount: value })
      set({
        money: state.money + value,
        totalEarned: state.totalEarned + value,
        dailySold,
        quests,
        pantry: { ...state.pantry, [key]: have - amount },
        stats: { ...state.stats, soldValue: state.stats.soldValue + value },
      })
      state.toast(`卖出 ${name} ×${amount} · +¥${value}`, 'gold')
      persist()
      return true
    },

    cookDish: (recipeId, quality) => {
      const state = get()
      const recipe = recipeById(recipeId)
      if (!recipe) return null
      if (!(quality in QUALITY_META)) return null
      const candidates = state.bag
        .filter((c) => rowMeetsRarity(c.rarity, recipe.fishRarity))
        .sort((a, b) => a.value - b.value)
      if (candidates.length < recipe.fishCount) {
        state.toast(`需要 ${recipe.fishCount} 条 ${recipe.fishRarity} 及以上的鱼`, 'danger')
        return null
      }
      const usedFish = candidates.slice(0, recipe.fishCount)
      const pantry = { ...state.pantry }
      const cropKey = recipe.cropId ? produceKey(recipe.cropId) : null
      const forageKeyNeeded = recipe.forageId ? forageKey(recipe.forageId) : null
      if (cropKey && (pantry[cropKey] ?? 0) < (recipe.cropCount ?? 1)) {
        state.toast('蔬菜不够，去菜园看看', 'danger')
        return null
      }
      if (forageKeyNeeded && (pantry[forageKeyNeeded] ?? 0) < (recipe.forageCount ?? 1)) {
        state.toast('采集物不够，去潮间带找找', 'danger')
        return null
      }
      const usedIds = new Set(usedFish.map((c) => c.id))
      if (cropKey) pantry[cropKey] = (pantry[cropKey] ?? 0) - (recipe.cropCount ?? 1)
      if (forageKeyNeeded) {
        pantry[forageKeyNeeded] = (pantry[forageKeyNeeded] ?? 0) - (recipe.forageCount ?? 1)
      }
      const key = dishKey(recipeId, quality)
      pantry[key] = (pantry[key] ?? 0) + 1
      const codexKey = `dish:${recipeId}`
      const codex = {
        ...state.codex,
        [codexKey]: codexEntry(state.codex[codexKey], { count: 1 }),
      }
      const quests = bumpQuests(state, { kind: 'cook', amount: 1, recipeId })
      set({
        bag: state.bag.filter((c) => !usedIds.has(c.id)),
        pantry,
        codex,
        quests,
        lastCook: { recipeId, quality },
        stats: { ...state.stats, cooked: state.stats.cooked + 1 },
      })
      state.toast(`${recipe.name} · ${QUALITY_META[quality].label}`, quality === 'perfect' ? 'gold' : 'info')
      persist()
      return key
    },

    eatDish: (key) => {
      const state = get()
      if (!state.underwater) {
        state.toast('浮上水面再吃吧', 'info')
        return false
      }
      const parsed = parseDishKey(key)
      const have = state.pantry[key] ?? 0
      if (!parsed || have < 1) return false
      const recipe = recipeById(parsed.recipeId)
      const bonus = recipe ? Math.round(recipe.basePrice / 14) : 12
      set({
        pantry: { ...state.pantry, [key]: have - 1 },
        oxygen: clamp(state.oxygen + bonus, 0, 100),
      })
      get().toast(`吃了一份 ${recipe?.name ?? '菜'} · 氧气 +${bonus}`, 'gold')
      persist()
      return true
    },

    gather: (nodeId) => {
      const state = get()
      const item = forageById(nodeId)
      if (!item) return null
      if (!item.seasons.includes(state.season)) {
        state.toast(`${item.name}不在这个季节出现`, 'info')
        return null
      }
      const last = state.gatherCooldowns[nodeId] ?? 0
      const now = Date.now()
      if (now - last < item.cooldownMs) {
        state.toast(`这片${item.zone}还没长回来`, 'info')
        return null
      }
      const qty = 1 + Math.floor(Math.random() * 2)
      const key = forageKey(item.id)
      const codexKey = `forage:${item.id}`
      set({
        pantry: { ...state.pantry, [key]: (state.pantry[key] ?? 0) + qty },
        gatherCooldowns: { ...state.gatherCooldowns, [nodeId]: now },
        codex: {
          ...state.codex,
          [codexKey]: codexEntry(state.codex[codexKey], { count: qty }),
        },
        quests: bumpQuests(state, { kind: 'gather', amount: qty, itemId: item.id }),
        stats: { ...state.stats, gathered: state.stats.gathered + qty },
      })
      state.toast(`采到 ${item.name} ×${qty}`, 'gold')
      persist()
      return { itemId: key, qty }
    },

    feedPet: () => {
      const state = get()
      const now = Date.now()
      if (now - state.pet.lastFed < PET_FEED_COOLDOWN) {
        state.toast('阿獭刚吃过，过一会儿再喂', 'info')
        return false
      }
      const fish = [...state.bag].sort((a, b) => a.value - b.value)[0]
      if (!fish) {
        state.toast('鱼篓里没有鱼可以喂它', 'info')
        return false
      }
      set({
        bag: state.bag.filter((c) => c.id !== fish.id),
        pet: {
          ...state.pet,
          affection: clamp(state.pet.affection + 8, 0, 100),
          lastFed: now,
        },
      })
      get().toast(`阿獭吃掉了 ${fish.name} · 好感 +8`, 'gold')
      persist()
      return true
    },

    playPet: () => {
      const state = get()
      const now = Date.now()
      if (now - state.pet.lastPlayed < PET_PLAY_COOLDOWN) {
        state.toast('它刚玩累了，让它歇一会儿', 'info')
        return false
      }
      set({
        pet: {
          ...state.pet,
          affection: clamp(state.pet.affection + 6, 0, 100),
          lastPlayed: now,
        },
      })
      get().toast('和阿獭玩了一会儿 · 好感 +6', 'gold')
      persist()
      return true
    },

    patPet: () => {
      const state = get()
      const now = Date.now()
      if (now - state.pet.lastPet < PET_PAT_COOLDOWN) return false
      set({
        pet: {
          ...state.pet,
          affection: clamp(state.pet.affection + 2, 0, 100),
          lastPet: now,
        },
      })
      get().toast('阿獭蹭了蹭你的手 · 好感 +2', 'info')
      persist()
      return true
    },

    npcGift: (npcId) => {
      const state = get()
      const npc = npcById(npcId)
      if (!npc) return null
      const key = `npc:${npcId}`
      const now = Date.now()
      if (now - (state.gatherCooldowns[key] ?? 0) < 8 * 3600_000) {
        state.toast(`${npc.name}今天已经给过你东西了`, 'info')
        return null
      }
      const gifts: Record<string, { item: string; qty: number }> = {
        zhou: { item: 'forage:shell', qty: 2 },
        lan: { item: 'forage:seaweed', qty: 2 },
        xiaoman: { item: 'seed:scallion', qty: 2 },
        apo: { item: 'seed:radish', qty: 2 },
        che: { item: 'dish:grilled-crucian#good', qty: 1 },
        azhou: { item: 'forage:firefly', qty: 1 },
      }
      const gift = gifts[npcId] ?? { item: 'seed:radish', qty: 1 }
      set({
        pantry: { ...state.pantry, [gift.item]: (state.pantry[gift.item] ?? 0) + gift.qty },
        gatherCooldowns: { ...state.gatherCooldowns, [key]: now },
      })
      const name = questRewardItemName(gift.item)
      state.toast(`${npc.name} 给了你 ${name} ×${gift.qty}`, 'gold')
      persist()
      return `${name} ×${gift.qty}`
    },

    upgradeCabin: () => {
      const state = get()
      if (state.cabinLevel >= 3) {
        state.toast('小屋已经是最宽敞的样子了')
        return false
      }
      const cost = CABIN_COSTS[state.cabinLevel]
      if (state.money < cost) {
        state.toast(`扩建需要 ¥${cost}，金币不够`, 'danger')
        return false
      }
      set({ money: state.money - cost, cabinLevel: state.cabinLevel + 1 })
      state.toast(`小屋扩建到 Lv.${state.cabinLevel + 1}`, 'gold')
      persist()
      return true
    },

    setTrophy: (defId) => {
      const state = get()
      const def = fishById(defId)
      if (!def || !(state.caughtLog[defId] > 0)) {
        state.toast('图鉴里还没有这条鱼', 'info')
        return false
      }
      if (state.trophies.includes(defId)) {
        set({ trophies: state.trophies.filter((id) => id !== defId) })
        persist()
        return true
      }
      const slots = 2 + state.cabinLevel
      if (state.trophies.length >= slots) {
        state.toast(`标本架满了（${slots} 个），先取下一个`, 'info')
        return false
      }
      set({ trophies: [...state.trophies, defId] })
      state.toast(`把 ${def.name} 做成了标本`, 'gold')
      persist()
      return true
    },

    setAquarium: (defId) => {
      const state = get()
      const def = fishById(defId)
      if (!def || !(state.caughtLog[defId] > 0)) {
        state.toast('图鉴里还没有这条鱼', 'info')
        return false
      }
      if (state.aquarium.includes(defId)) {
        set({ aquarium: state.aquarium.filter((id) => id !== defId) })
        persist()
        return true
      }
      const slots = 1 + state.cabinLevel
      if (state.aquarium.length >= slots) {
        state.toast(`水族箱放不下更多了（${slots} 条），先捞出一条`, 'info')
        return false
      }
      set({ aquarium: [...state.aquarium, defId] })
      state.toast(`把 ${def.name} 放进了水族箱`, 'gold')
      persist()
      return true
    },

    claimCodexReward: (threshold) => {
      const state = get()
      if (!(CODEX_MILESTONES as readonly number[]).includes(threshold)) return false
      if (state.codexClaims.includes(threshold)) return false
      const total = FISH.length + CROPS.length + RECIPES.length + FORAGE.length
      const collected =
        FISH.filter((f) => (state.codex[`fish:${f.id}`]?.count ?? 0) > 0).length +
        CROPS.filter((c) => (state.codex[`crop:${c.id}`]?.count ?? 0) > 0).length +
        RECIPES.filter((r) => (state.codex[`dish:${r.id}`]?.count ?? 0) > 0).length +
        FORAGE.filter((f) => (state.codex[`forage:${f.id}`]?.count ?? 0) > 0).length
      if ((collected / total) * 100 < threshold) {
        state.toast(`图鉴还没到 ${threshold}%`, 'info')
        return false
      }
      const reward = CODEX_REWARDS[threshold]
      set({
        money: state.money + reward,
        codexClaims: [...state.codexClaims, threshold],
      })
      state.toast(`图鉴 ${threshold}% 奖励 · +¥${reward}`, 'gold')
      persist()
      return true
    },

    acceptQuest: (id) => {
      const state = get()
      const defs = questDefsFor(state)
      const def = defs.find((q) => q.id === id)
      if (!def) return false
      const active = state.quests.filter((q) => q.accepted && !q.claimed).length
      if (active >= 3) {
        state.toast('最多同时接 3 个委托', 'info')
        return false
      }
      const quests = state.quests.map((q) =>
        q.id === id ? { ...q, accepted: true, progress: q.progress } : q,
      )
      set({ quests })
      state.toast(`接下委托 · ${def.title}`, 'gold')
      persist()
      return true
    },

    abandonQuest: (id) => {
      const state = get()
      set({
        quests: state.quests.map((q) =>
          q.id === id ? { ...q, accepted: false, progress: 0 } : q,
        ),
      })
      persist()
    },

    claimQuest: (id) => {
      const state = get()
      const defs = questDefsFor(state)
      const def = defs.find((q) => q.id === id)
      const quest = state.quests.find((q) => q.id === id)
      if (!def || !quest || !quest.accepted || quest.claimed) return false
      if (quest.progress < def.target) return false
      const pantry = { ...state.pantry }
      if (def.rewardItem && def.rewardQty) {
        pantry[def.rewardItem] = (pantry[def.rewardItem] ?? 0) + def.rewardQty
      }
      set({
        money: state.money + def.rewardMoney,
        pantry,
        quests: state.quests.map((q) => (q.id === id ? { ...q, claimed: true } : q)),
      })
      state.toast(
        `委托完成 · ${def.title} · +¥${def.rewardMoney}${def.rewardItem ? ` · ${questRewardItemName(def.rewardItem)}×${def.rewardQty}` : ''}`,
        'gold',
      )
      persist()
      return true
    },

    refreshDailyQuests: () => {
      const state = get()
      const todayKey = dayKey()
      if (state.questDay === todayKey) return
      const quests = dailyQuestList(todayKey, state.season).map((q) => ({
        id: q.id,
        progress: 0,
        accepted: false,
        claimed: false,
      }))
      set({ questDay: todayKey, questSeason: state.season, quests })
      state.toast('新的每日委托已经贴出来了', 'info')
      persist()
    },

    damagePlayer: (amount, source = '海怪') => {
      const state = get()
      if (state.dead) return false
      const armor = !state.underwater && state.boatSkin === 'pirate' ? 0.62 : 1
      const pressure = state.boss ? realmSuppressionMul(state.realm, state.boss.realm ?? 0) : 1
      const dmg = Math.max(1, Math.round(amount * armor * pressure))
      const hp = Math.max(0, state.hp - dmg)
      if (hp <= 0) {
        const lost = Math.floor(state.bag.length / 2)
        set({
          hp: 0,
          hitAt: Date.now(),
          dead: true,
          underwater: false,
          oxygen: 100,
          depth: 0,
          bag: state.bag.slice(lost),
          captureTarget: null,
          fight: null,
          phase: 'idle',
          boss: null,
          combatCamera: false,
          inputLocked: false,
        })
        state.toast(
          `${source}把你打翻在海里 · 丢失 ${lost} 条渔获，被拖回了岸边`,
          'danger',
        )
        persist()
        return true
      }
      set({ hp, hitAt: Date.now() })
      state.toast(
        `${source}造成 ${dmg} 点伤害 · 生命 ${hp}/${maxHpFor(state.realm)}${
          pressure < 1 ? ' · 境界压制生效' : pressure > 1 ? ' · 境界受压' : ''
        }`,
        'danger',
      )
      persist()
      return true
    },

    healPlayer: (amount) => {
      const state = get()
      if (state.dead) return
      const hp = clamp(state.hp + Math.max(0, Math.round(amount)), 0, maxHpFor(state.realm))
      if (hp === state.hp) return
      set({ hp })
      persist()
    },

    respawn: () => {
      const state = get()
      if (!state.dead) return
      set({
        dead: false,
        hp: maxHpFor(state.realm),
        underwater: false,
        oxygen: 100,
        depth: 0,
        respawnToken: state.respawnToken + 1,
        inputLocked: false,
        combatCamera: false,
      })
      state.toast('你被拖回了老码头 · 生命已经恢复', 'gold')
      persist()
    },

    buyWeapon: (id) => {
      const def = weaponById(id)
      const state = get()
      if (!def) return false
      if (state.ownedWeapons.includes(id)) {
        state.toast('这件武器已经在你的装备里了')
        return false
      }
      if (state.money < def.price) {
        state.toast(`购买 ${def.name} 需要 ¥${def.price}`, 'danger')
        return false
      }
      const ammo = { ...state.weaponAmmo, [id]: def.ammoMax }
      set({
        money: state.money - def.price,
        ownedWeapons: [...state.ownedWeapons, id],
        equippedWeapon: id,
        weaponAmmo: ammo,
      })
      state.toast(`购入 ${def.name} · 已装备`, 'gold')
      persist()
      return true
    },

    equipWeapon: (id) => {
      const state = get()
      if (!state.ownedWeapons.includes(id)) return
      if (state.equippedWeapon === id) return
      set({ equippedWeapon: id })
      state.toast(`换用 ${weaponById(id)?.name ?? '武器'}`, 'info')
      persist()
    },

    consumeAmmo: (id) => {
      const def = weaponById(id)
      const state = get()
      if (!def) return false
      if (def.ammoMax === 0) return true
      const ammo = state.weaponAmmo[id] ?? 0
      if (ammo <= 0) {
        state.toast(`${def.name}没弹药了，回渔具铺补给`, 'danger')
        return false
      }
      set({ weaponAmmo: { ...state.weaponAmmo, [id]: ammo - 1 } })
      persist()
      return true
    },

    refillWeapon: (id) => {
      const def = weaponById(id)
      const state = get()
      if (!def || def.ammoMax === 0) return false
      const ammo = state.weaponAmmo[id] ?? 0
      if (ammo >= def.ammoMax) {
        state.toast('弹药已经是满的')
        return false
      }
      const cost = weaponRefillCost(id, ammo)
      if (state.money < cost) {
        state.toast(`补给需要 ¥${cost}`, 'danger')
        return false
      }
      set({
        money: state.money - cost,
        weaponAmmo: { ...state.weaponAmmo, [id]: def.ammoMax },
      })
      state.toast(`补给 ${def.name} 弹药 · -¥${cost}`, 'gold')
      persist()
      return true
    },

    buyFacility: (id) => {
      const def = facilityById(id)
      const state = get()
      if (!def) return false
      if (state.ownedFacilities.includes(id)) {
        state.toast('这件设施已经买过了，去船坞装上就行')
        return false
      }
      if (state.money < def.price) {
        state.toast(`购买 ${def.name} 需要 ¥${def.price}`, 'danger')
        return false
      }
      const slots = boatFacilitySlots(state.boatSkin)
      let installed = [...state.installedFacilities]
      while (installed.length < slots) installed.push(null)
      const empty = installed.findIndex((slot) => slot === null)
      if (empty >= 0 && empty < slots) installed[empty] = id
      set({
        money: state.money - def.price,
        ownedFacilities: [...state.ownedFacilities, id],
        installedFacilities: installed,
        facilityActive: { ...state.facilityActive, [id]: def.toggle ? true : state.facilityActive[id] },
      })
      state.toast(
        empty >= 0 ? `${def.name} 已安装到 ${empty + 1} 号槽` : `购入 ${def.name} · 船坞槽位已满`,
        'gold',
      )
      persist()
      return true
    },

    installFacility: (index, id) => {
      const state = get()
      const slots = boatFacilitySlots(state.boatSkin)
      if (index < 0 || index >= slots) return
      if (id && !state.ownedFacilities.includes(id)) return
      const installed = [...state.installedFacilities]
      while (installed.length < slots) installed.push(null)
      if (id) {
        const previous = installed.findIndex((slot) => slot === id)
        if (previous >= 0 && previous !== index) installed[previous] = null
      }
      installed[index] = id
      set({ installedFacilities: installed })
      state.toast(
        id ? `${facilityById(id)?.name ?? '设施'} 装到 ${index + 1} 号槽` : `${index + 1} 号槽已清空`,
        id ? 'gold' : 'info',
      )
      persist()
    },

    toggleFacility: (id) => {
      const state = get()
      const def = facilityById(id)
      if (!def) return
      if (!state.installedFacilities.includes(id)) {
        state.toast(`${def.name}还没装上`, 'info')
        return
      }
      if (!def.toggle) {
        state.toast(`${def.name}会一直工作`)
        return
      }
      const next = !state.facilityActive[id]
      set({ facilityActive: { ...state.facilityActive, [id]: next } })
      state.toast(`${def.name}${next ? '已开启' : '已关闭'}`, next ? 'gold' : 'info')
      persist()
    },

    grillCatch: () => {
      const state = get()
      const installed = state.installedFacilities.includes('grill')
      if (!installed) {
        state.toast('船上还没有烤架', 'info')
        return false
      }
      if (state.hp >= maxHpFor(state.realm)) {
        state.toast('状态很好，不用急着吃')
        return false
      }
      const fish = [...state.bag].sort((a, b) => a.value - b.value)[0]
      if (!fish) {
        state.toast('鱼篓里没有鱼可以烤', 'info')
        return false
      }
      set({
        bag: state.bag.filter((c) => c.id !== fish.id),
        hp: clamp(state.hp + 22, 0, maxHpFor(state.realm)),
        stats: { ...state.stats, cooked: state.stats.cooked + 1 },
      })
      state.toast(`烤掉了 ${fish.name} · 生命 +22`, 'gold')
      persist()
      return true
    },

    grantMoney: (amount, text) => {
      const state = get()
      const value = Math.max(0, Math.round(amount))
      if (!value) return
      set({
        money: state.money + value,
        totalEarned: state.totalEarned + value,
        stats: { ...state.stats, soldValue: state.stats.soldValue + value },
      })
      if (text) state.toast(`${text} · +¥${value}`, 'gold')
      persist()
    },

    setBoatPose: (pose) => {
      set({ boatPose: pose })
      persist()
    },

    setBoss: (boss) => set({ boss }),
    setRadarContacts: (contacts) => set({ radarContacts: contacts }),
    setInputLocked: (inputLocked) => set({ inputLocked }),
    setCombatCamera: (combatCamera) => set({ combatCamera }),
    toggleCombatCamera: () => {
      const state = get()
      if (!state.boss) {
        state.toast('附近没有首领，战斗视角无法锁定', 'info')
        return
      }
      const next = !state.combatCamera
      set({ combatCamera: next })
      state.toast(next ? '镜头锁定首领 · 战斗视角' : '镜头解除锁定 · 自由视角', 'info')
    },
    setNav: (nav) => set({ nav }),

    buyToolVariant: (id) => {
      const def = variantById(id)
      const state = get()
      if (!def) return false
      if (state.ownedVariants.includes(id)) {
        state.toast('这件工具已经在库里了')
        return false
      }
      if (state.money < def.price) {
        state.toast(`购买 ${def.name} 需要 ¥${def.price}`, 'danger')
        return false
      }
      set({
        money: state.money - def.price,
        ownedVariants: [...state.ownedVariants, id],
        toolVariants: { ...state.toolVariants, [def.tool]: id },
        variantAmmo: { ...state.variantAmmo, [id]: def.ammoMax },
        activeTool: def.tool,
        captureTarget: null,
      })
      state.toast(`购入 ${def.name} · 已换上`, 'gold')
      persist()
      return true
    },

    setToolVariant: (id) => {
      const def = variantById(id)
      const state = get()
      if (!def) return
      if (!state.ownedVariants.includes(id)) return
      set({
        toolVariants: { ...state.toolVariants, [def.tool]: id },
        activeTool: def.tool,
        captureTarget: null,
      })
      state.toast(`换上 ${def.name}`, 'info')
      persist()
    },

    cycleToolVariant: () => {
      const state = get()
      const category =
        state.activeTool === 'harpoon' ? 'harpoon' : state.activeTool === 'net' ? 'net' : null
      if (!category) {
        state.toast('鱼笼没有其他型号', 'info')
        return
      }
      const owned = variantsFor(category).filter((v) => state.ownedVariants.includes(v.id))
      if (owned.length < 2) {
        state.toast('还没有可切换的进阶工具，去渔具铺看看', 'info')
        return
      }
      const current = state.toolVariants[category]
      const index = owned.findIndex((v) => v.id === current)
      const next = owned[(index + 1) % owned.length]
      set({
        toolVariants: { ...state.toolVariants, [category]: next.id },
        captureTarget: null,
      })
      state.toast(`换上 ${next.name}`, 'info')
      persist()
    },

    consumeVariantAmmo: (id) => {
      const def = variantById(id)
      const state = get()
      if (!def) return false
      if (def.ammoMax === 0) return true
      const ammo = state.variantAmmo[id] ?? 0
      if (ammo <= 0) {
        state.toast(`${def.name}弹药耗尽，回渔具铺补给`, 'danger')
        return false
      }
      set({ variantAmmo: { ...state.variantAmmo, [id]: ammo - 1 } })
      persist()
      return true
    },

    refillVariantAmmo: (id) => {
      const def = variantById(id)
      const state = get()
      if (!def || def.ammoMax === 0) return false
      const ammo = state.variantAmmo[id] ?? 0
      if (ammo >= def.ammoMax) {
        state.toast('这件工具弹药是满的')
        return false
      }
      const cost = Math.ceil((def.ammoMax - ammo) * def.ammoPrice)
      if (state.money < cost) {
        state.toast(`补给需要 ¥${cost}`, 'danger')
        return false
      }
      set({
        money: state.money - cost,
        variantAmmo: { ...state.variantAmmo, [id]: def.ammoMax },
      })
      state.toast(`补给 ${def.name} · -¥${cost}`, 'gold')
      persist()
      return true
    },

    grantVariant: (id) => {
      const def = variantById(id)
      if (!def) return false
      const state = get()
      const owned = state.ownedVariants.includes(id)
      set({
        ownedVariants: owned ? state.ownedVariants : [...state.ownedVariants, id],
        variantAmmo: { ...state.variantAmmo, [id]: def.ammoMax },
      })
      state.toast(owned ? `${def.name} 弹药已补满` : `发现稀有装备 · ${def.name}`, 'gold')
      persist()
      return true
    },

    setAchievementsOpen: (open) => set({ achievementsOpen: open }),
    toggleAchievements: () => set((s) => ({ achievementsOpen: !s.achievementsOpen })),
    dismissAchievementToast: () => set({ achievementToast: null }),

    advanceAchievement: (id, amount) => {
      const def = achievementById(id)
      if (!def || amount <= 0) return
      const state = get()
      const current = state.achievements[id] ?? { progress: 0, unlockedAt: 0 }
      if (current.unlockedAt > 0) return
      const next = Math.min(def.target, current.progress + amount)
      if (next >= def.target) {
        achievementSeq += 1
        const toast: AchievementToast = {
          id: achievementSeq,
          name: def.name,
          desc: def.desc,
          reward: def.reward,
          icon: def.icon,
        }
        set({
          achievements: {
            ...state.achievements,
            [id]: { progress: def.target, unlockedAt: Date.now() },
          },
          money: state.money + def.reward,
          totalEarned: state.totalEarned + def.reward,
          achievementToast: toast,
        })
        window.setTimeout(() => {
          if (get().achievementToast?.id === toast.id) set({ achievementToast: null })
        }, 4800)
        persist()
        return
      }
      set({
        achievements: { ...state.achievements, [id]: { progress: next, unlockedAt: 0 } },
      })
      const now = Date.now()
      if (now - achievementPersistAt >= 4000) {
        achievementPersistAt = now
        persist()
      }
    },

    setCrewOpen: (open) => set({ crewOpen: open }),

    hireCrew: (id) => {
      const def = crewById(id)
      const state = get()
      if (!def) return false
      if (state.crew.includes(id)) {
        state.toast(`${def.name} 已经在船上了`)
        return false
      }
      if (state.money < def.cost) {
        state.toast(`雇佣 ${def.name} 需要 ¥${def.cost}`, 'danger')
        return false
      }
      set({ crew: [...state.crew, id], money: state.money - def.cost })
      state.toast(`${def.name} 上了船 · ${def.effect}`, 'gold')
      persist()
      return true
    },

    addRelic: (name) => {
      const state = get()
      set({ relics: [...state.relics, name].slice(-40) })
      persist()
    },

    setSeaEvent: (seaEvent) => set({ seaEvent }),
    setChestPrompt: (chestPrompt) => set({ chestPrompt }),

    setSkinShopOpen: (open) => set({ skinShopOpen: open }),

    buyPlayerSkin: (id) => {
      const def = playerSkinById(id)
      const state = get()
      if (!def) return false
      if (state.ownedPlayerSkins.includes(id)) {
        state.toast(`${def.name} 已经在衣柜里了`)
        return false
      }
      if (state.money < def.price) {
        state.toast(`购买 ${def.name} 需要 ¥${def.price}`, 'danger')
        return false
      }
      set({
        money: state.money - def.price,
        ownedPlayerSkins: [...state.ownedPlayerSkins, id],
        playerSkin: id,
      })
      state.toast(`已购入 ${def.name} · 立即穿戴`, 'gold')
      persist()
      return true
    },

    equipPlayerSkin: (id) => {
      const def = playerSkinById(id)
      const state = get()
      if (!def) return
      if (!state.ownedPlayerSkins.includes(id)) {
        state.toast(`还没有 ${def.name}，先购买吧`, 'danger')
        return
      }
      if (state.playerSkin === id) {
        state.toast(`已经穿着 ${def.name} 了`)
        return
      }
      set({ playerSkin: id })
      state.toast(`换上 ${def.name}`, 'gold')
      persist()
    },

    setDragonRace: (dragonRace) => set({ dragonRace }),

    completeDragonBoatRace: (secondsLeft) => {
      const state = get()
      const timeBonus = Math.max(0, Math.round(secondsLeft)) * 10
      const reward = 600 + timeBonus
      const firstClear = !state.ownedItems.includes('dragonboat')
      const already = state.dragonRaceBest > 0
      set({
        money: state.money + reward,
        totalEarned: state.totalEarned + reward,
        stats: { ...state.stats, soldValue: state.stats.soldValue + reward },
        ownedItems: firstClear ? [...state.ownedItems, 'dragonboat'] : state.ownedItems,
        boatSkin: firstClear ? 'dragonboat' : state.boatSkin,
        installedFacilities: firstClear
          ? resizeInstalled(state.installedFacilities, 'dragonboat')
          : state.installedFacilities,
        dragonRaceBest: Math.max(state.dragonRaceBest, Math.max(0, Math.round(secondsLeft))),
      })
      state.toast(
        firstClear
          ? `龙舟赛通关 · +¥${reward} · 解锁龙吟号并自动换乘`
          : already
            ? `龙舟赛再次通关 · +¥${reward}`
            : `龙舟赛通关 · +¥${reward}`,
        'gold',
      )
      persist()
    },

    showCrewCatch: (text) => {
      toastSeq += 1
      const id = toastSeq
      set({ crewCatchNote: { id, text } })
      window.setTimeout(() => {
        if (get().crewCatchNote?.id === id) set({ crewCatchNote: null })
      }, 4200)
    },

    absorbCore: (name, xp) => {
      const state = get()
      const gained = Math.max(0, Math.round(xp))
      const cultivationXp = state.cultivationXp + gained
      set({ cultivationXp, cultivationCores: state.cultivationCores + 1 })
      state.toast(`吸收${name} · 修为 +${gained}`, 'gold')
      persist()
      const need = realmAt(state.realm).requiredXp
      return Number.isFinite(need) && cultivationXp >= need
    },

    applyBreakthrough: () => {
      const state = get()
      const from = realmAt(state.realm)
      if (!Number.isFinite(from.requiredXp)) return null
      const to = realmAt(state.realm + 1)
      const nextRealm = state.realm + 1
      set({
        realm: nextRealm,
        cultivationXp: Math.max(0, state.cultivationXp - from.requiredXp),
        hp: maxHpFor(nextRealm),
      })
      state.toast(`恭喜道友，突破至${to.name}！`, 'gold')
      persist()
      return { fromName: from.name, toName: to.name, realm: nextRealm }
    },

    setTribulation: (tribulation) => set({ tribulation }),

    setSkillCds: (skillCds) => set({ skillCds }),

    setAscension: (ascension) => set({ ascension }),

    gainCultivation: (xp, source) => {
      const state = get()
      const gained = Math.max(0, Math.round(xp))
      if (!gained) return false
      const cultivationXp = state.cultivationXp + gained
      set({ cultivationXp })
      state.toast(`${source} · 修为 +${gained}`, 'gold')
      persist()
      const need = realmAt(state.realm).requiredXp
      return Number.isFinite(need) && cultivationXp >= need
    },

    setMapZone: (mapZone) => {
      if (get().mapZone === mapZone) return
      set({ mapZone })
      persist()
    },

    markAscended: () => {
      if (get().ascended) return
      set({ ascended: true })
      persist()
    },

    grantJade: (amount, text) => {
      const state = get()
      const gained = Math.max(0, Math.round(amount))
      if (!gained) return
      set({ immortalJade: state.immortalJade + gained })
      if (text) state.toast(`${text} · 仙玉 +${gained}`, 'gold')
      persist()
    },

    spendJade: (amount) => {
      const state = get()
      const cost = Math.max(0, Math.round(amount))
      if (state.immortalJade < cost) {
        state.toast(`仙玉不足 · 还需 ${cost - state.immortalJade}`, 'danger')
        return false
      }
      set({ immortalJade: state.immortalJade - cost })
      persist()
      return true
    },

    toast: (text, tone = 'info') => {
      toastSeq += 1
      const id = toastSeq
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }))
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, 2800)
    },

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    resetProgress: () => {
      const todayKey = dayKey()
      const freshPlots = emptyPlots()
      set({
        money: 60,
        bag: [],
        caughtLog: {},
        totalEarned: 0,
        bestKg: 0,
        ownedItems: [...DEFAULT_OWNED],
        boatSkin: 'rowboat',
        rodSkin: 'classic',
        decorations: [],
        season: 'spring',
        baitId: 'worm',
        tools: sanitizeTools(undefined),
        activeTool: 'harpoon',
        gear: sanitizeGear(undefined),
        farmPlots: freshPlots,
        pantry: { 'seed:radish': 3, 'seed:scallion': 2 },
        quests: dailyQuestList(todayKey, 'spring').map((q) => ({
          id: q.id,
          progress: 0,
          accepted: false,
          claimed: false,
        })),
        questDay: todayKey,
        questSeason: 'spring',
        codex: {},
        codexClaims: [],
        cabinLevel: 1,
        trophies: [],
        aquarium: [],
        pet: defaultPet(),
        traps: [],
        dailySold: { day: todayKey, value: 0 },
        gatherCooldowns: {},
        stats: { cooked: 0, harvested: 0, gathered: 0, soldValue: 0 },
        hp: MAX_HP,
        realm: 0,
        cultivationXp: 0,
        cultivationCores: 0,
        mapZone: 'mortal',
        immortalJade: 0,
        ascended: false,
        tribulation: null,
        skillCds: [],
        ascension: null,
        ownedWeapons: ['knife'],
        equippedWeapon: 'knife',
        weaponAmmo: { knife: 0, speargun: 6 },
        ownedFacilities: [],
        installedFacilities: sanitizeInstalled(undefined, 'rowboat'),
        facilityActive: {},
        boatPose: null,
        toolVariants: { ...DEFAULT_VARIANTS },
        ownedVariants: ['harpoon', 'net'],
        variantAmmo: defaultVariantAmmo(),
        dead: false,
        hitAt: 0,
        respawnToken: 0,
        boss: null,
        radarContacts: [],
        inputLocked: false,
        combatCamera: false,
        nav: null,
        interactLabel: null,
        nearDock: false,
        baitWear: 100,
        card: null,
        fight: null,
        phase: 'idle',
        underwater: false,
        observedFish: null,
        townOpen: false,
        townTab: 'quests',
        npcId: null,
        cookingOpen: false,
        lightningAt: 0,
        captureResult: null,
        captureTarget: null,
        rareFlash: null,
        lastCook: null,
        achievements: emptyAchievements(),
        crew: [],
        relics: [],
        ownedPlayerSkins: ['angler'],
        playerSkin: 'angler',
        dragonRaceBest: 0,
        achievementsOpen: false,
        achievementToast: null,
        crewOpen: false,
        seaEvent: null,
        chestPrompt: null,
        skinShopOpen: false,
        dragonRace: null,
        crewCatchNote: null,
      })
      persist()
    },
  }
})

export function bagCapacity(state: GameStore = useGameStore.getState()) {
  const livewell = state.installedFacilities.includes('livewell') ? 6 : 0
  return boatCapacity(state.boatSkin) + livewell
}

export function isModalOpen(state: GameStore = useGameStore.getState()) {
  return Boolean(
    state.card ||
      state.marketOpen ||
      state.bagOpen ||
      state.shopOpen ||
      state.baitOpen ||
      state.seasonOpen ||
      state.townOpen ||
      state.npcId ||
      state.cookingOpen ||
      state.captureResult ||
      state.achievementsOpen ||
      state.crewOpen ||
      state.skinShopOpen ||
      state.dead,
  )
}

export function dailyQuestsForState(state: GameStore = useGameStore.getState()) {
  return dailyQuestList(state.questDay, state.questSeason)
}

export function questDefsMapForState(state: GameStore = useGameStore.getState()) {
  return questDefsById(state.questDay, state.questSeason)
}

export function codexProgress(state: GameStore = useGameStore.getState()) {
  const total = FISH.length + CROPS.length + RECIPES.length + FORAGE.length
  const collected =
    FISH.filter((f) => (state.codex[`fish:${f.id}`]?.count ?? 0) > 0).length +
    CROPS.filter((c) => (state.codex[`crop:${c.id}`]?.count ?? 0) > 0).length +
    RECIPES.filter((r) => (state.codex[`dish:${r.id}`]?.count ?? 0) > 0).length +
    FORAGE.filter((f) => (state.codex[`forage:${f.id}`]?.count ?? 0) > 0).length
  return { collected, total, pct: total ? (collected / total) * 100 : 0 }
}

export function currentToolStats(state: GameStore = useGameStore.getState()) {
  return toolStats(state.activeTool, state.tools[state.activeTool].level)
}

export function currentDailyFactor(state: GameStore = useGameStore.getState()) {
  return dailySellFactor(state.dailySold)
}

export function toolLabel(id: CaptureToolId) {
  return toolById(id)?.name ?? id
}

export function rarityRank(rarity: Rarity) {
  return RARITY_ORDER.indexOf(rarity)
}

export function pantryItemName(key: string) {
  if (key.startsWith('seed:')) {
    const crop = cropById(key.slice(5))
    return crop ? `${crop.name}种子` : '种子'
  }
  if (key.startsWith('crop:')) return cropById(key.slice(5))?.name ?? '蔬菜'
  if (key.startsWith('forage:')) return forageById(key.slice(7))?.name ?? '采集物'
  if (key.startsWith('dish:')) {
    const parsed = parseDishKey(key)
    return parsed ? (recipeById(parsed.recipeId)?.name ?? '菜肴') : '菜肴'
  }
  return key
}

export { PLOT_COUNT, produceKey, seedKey, forageKey }
