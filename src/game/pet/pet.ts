export const PET_NAME = '阿獭'

export interface PetState {
  affection: number
  lastFed: number
  lastPlayed: number
  lastPet: number
}

export function defaultPet(): PetState {
  return { affection: 8, lastFed: 0, lastPlayed: 0, lastPet: 0 }
}

const STAGES = [
  { min: 0, label: '初来乍到', note: '它会在船尾探头，但还不肯靠近。' },
  { min: 25, label: '愿意靠近', note: '听见你的口哨就会游过来。' },
  { min: 60, label: '默契伙伴', note: '水下会替你留意鱼群的动静。' },
  { min: 90, label: '形影不离', note: '无论上浮还是下潜，它都跟着你。' },
]

export function petStage(affection: number) {
  let stage = STAGES[0]
  for (const s of STAGES) if (affection >= s.min) stage = s
  return stage
}

export function petNextStage(affection: number) {
  return STAGES.find((s) => s.min > affection) ?? null
}

export const PET_FEED_COOLDOWN = 45_000
export const PET_PLAY_COOLDOWN = 70_000
export const PET_PAT_COOLDOWN = 12_000

export function petAbilityUnlocked(affection: number) {
  return affection >= 60
}
