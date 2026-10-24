import { create } from 'zustand'
import type {
  BaitId,
  CaptureTargetInfo,
  CaptureToolId,
  Catch,
  CatchMethod,
  FishingPhase,
  FightState,
  GearId,
  Quality,
  Rarity,
  SeasonId,
  ToastItem,
  TownTab,
  UnderwaterMode,
} from '@/types'
import {
  DEFAULT_OWNED,
  DECORATIONS,
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

export const BAG_CAPACITY = 10
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

  setStarted: (started: boolean) => void
  setPhase: (phase: FishingPhase) => void
  setZone: (zone: string) => void
  setPower: (power: number) => void
  setFight: (fight: FightState | null) => void
  setBite: (bite: boolean) => void
  setPrompt: (prompt: string | null) => void
  setNearDock: (near: boolean) => void
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
  toast: (text: string, tone?: ToastItem['tone']) => void
  dismissToast: (id: number) => void
  resetProgress: () => void
}

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function num(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
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

    started: false,
    phase: 'idle',
    zone: '老码头',
    power: 0,
    fight: null,
    bite: false,
    prompt: null,
    nearDock: false,
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

    setStarted: (started) => set({ started }),
    setPhase: (phase) => set({ phase }),
    setZone: (zone) => set({ zone }),
    setPower: (power) => set({ power }),
    setFight: (fight) => set({ fight }),
    setBite: (bite) => set({ bite }),
    setPrompt: (prompt) => set({ prompt }),
    setNearDock: (near) => set({ nearDock: near }),

    showCard: (c, added) => set({ card: c, cardAdded: added }),
    closeCard: () => set({ card: null }),

    addCatch: (c, method = c.method ?? 'rod') => {
      const state = get()
      const added = state.bag.length < BAG_CAPACITY
      const bag = added ? [...state.bag, { ...c, method }] : state.bag
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
      const quote = marketQuote(target, state.season, state.cabinLevel, state.dailySold)
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
        marketQuote(c, state.season, state.cabinLevel, state.dailySold),
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
      set({ npcId: id, townOpen: true })
    },
    closeNpc: () => set({ npcId: null }),

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
      if (state.money < entry.price) {
        state.toast('金币不够，先去码头卖几条鱼', 'danger')
        return false
      }
      const ownedItems = [...state.ownedItems, id]
      const patch: Partial<GameStore> = {
        money: state.money - entry.price,
        ownedItems,
      }
      if (entry.kind === 'boat' && isBoatSkin(id)) patch.boatSkin = id
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
      set({ boatSkin: id })
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
      if (state.bag.length >= BAG_CAPACITY) {
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
        baitWear: 100,
        card: null,
        fight: null,
        phase: 'idle',
        underwater: false,
        observedFish: null,
        townOpen: false,
        townTab: 'quests',
        npcId: null,
        captureResult: null,
        captureTarget: null,
        rareFlash: null,
        lastCook: null,
      })
      persist()
    },
  }
})

export function isModalOpen(state = useGameStore.getState()) {
  return Boolean(
    state.card ||
      state.marketOpen ||
      state.bagOpen ||
      state.shopOpen ||
      state.baitOpen ||
      state.seasonOpen ||
      state.townOpen ||
      state.npcId ||
      state.captureResult,
  )
}

export function dailyQuestsForState(state = useGameStore.getState()) {
  return dailyQuestList(state.questDay, state.questSeason)
}

export function questDefsMapForState(state = useGameStore.getState()) {
  return questDefsById(state.questDay, state.questSeason)
}

export function codexProgress(state = useGameStore.getState()) {
  const total = FISH.length + CROPS.length + RECIPES.length + FORAGE.length
  const collected =
    FISH.filter((f) => (state.codex[`fish:${f.id}`]?.count ?? 0) > 0).length +
    CROPS.filter((c) => (state.codex[`crop:${c.id}`]?.count ?? 0) > 0).length +
    RECIPES.filter((r) => (state.codex[`dish:${r.id}`]?.count ?? 0) > 0).length +
    FORAGE.filter((f) => (state.codex[`forage:${f.id}`]?.count ?? 0) > 0).length
  return { collected, total, pct: total ? (collected / total) * 100 : 0 }
}

export function currentToolStats(state = useGameStore.getState()) {
  return toolStats(state.activeTool, state.tools[state.activeTool].level)
}

export function currentDailyFactor(state = useGameStore.getState()) {
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
