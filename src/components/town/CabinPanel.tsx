import { Heart, Home, PawPrint, Sparkles, Star, Waves } from 'lucide-react'
import { DRIED_FISH_KEY, useGameStore } from '@/store/useGameStore'
import { FISH, RARITIES } from '@/game/fishing/fishTable'
import { SEASONS } from '@/game/world/seasons'
import {
  PET_FEED_COOLDOWN,
  PET_NAME,
  PET_PAT_COOLDOWN,
  PET_PLAY_COOLDOWN,
  petAbilityUnlocked,
  petNextStage,
  petStage,
} from '@/game/pet/pet'
import { FishArt } from '@/components/FishArt'
import { Button } from '@/components/ui/button'
import { Bar, Chip, CoinPill, Empty, PanelHead, useNow } from './shared'
import { cn } from '@/lib/utils'

const CABIN_COSTS = [0, 650, 1800]
const CABIN_PERKS = [
  { level: 1, text: '一间能遮风的小屋，二格标本架、一格水族箱。' },
  { level: 2, text: '收购价 +5%，标本架 4 格、水族箱 2 格。' },
  { level: 3, text: '搭起暖棚，可种反季作物；标本架 5 格、水族箱 3 格。' },
]

function cooldownLeft(last: number, duration: number, now: number) {
  return Math.max(0, last + duration - now)
}

export function CabinPanel() {
  const cabinLevel = useGameStore((s) => s.cabinLevel)
  const money = useGameStore((s) => s.money)
  const upgradeCabin = useGameStore((s) => s.upgradeCabin)
  const trophies = useGameStore((s) => s.trophies)
  const aquarium = useGameStore((s) => s.aquarium)
  const caughtLog = useGameStore((s) => s.caughtLog)
  const setTrophy = useGameStore((s) => s.setTrophy)
  const setAquarium = useGameStore((s) => s.setAquarium)
  const pet = useGameStore((s) => s.pet)
  const feed = useGameStore((s) => s.feedPet)
  const play = useGameStore((s) => s.playPet)
  const pat = useGameStore((s) => s.patPet)
  const dried = useGameStore((s) => s.pantry[DRIED_FISH_KEY] ?? 0)
  const feedDriedFish = useGameStore((s) => s.feedPetDriedFish)
  const season = useGameStore((s) => s.season)
  const now = useNow(1000)
  const stage = petStage(pet.affection)
  const next = petNextStage(pet.affection)
  const trophySlots = 2 + cabinLevel
  const aquariumSlots = 1 + cabinLevel
  const caught = FISH.filter((f) => (caughtLog[f.id] ?? 0) > 0)
  const feedLeft = cooldownLeft(pet.lastFed, PET_FEED_COOLDOWN, now)
  const playLeft = cooldownLeft(pet.lastPlayed, PET_PLAY_COOLDOWN, now)
  const patLeft = cooldownLeft(pet.lastPet, PET_PAT_COOLDOWN, now)
  const nextCost = cabinLevel < 3 ? CABIN_COSTS[cabinLevel] : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <PanelHead
        title="海边小屋"
        desc="把渔获换成墙上的标本、窗边的水族箱，再给阿獭留个靠窗的位置。"
        right={<CoinPill value={money} />}
      />

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-[#173c3c]/70 to-[#0b2326]/80 p-3">
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(111,224,207,0.13),transparent)]" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/40">
                <Home className="size-3" />
                小屋等级
              </div>
              <div className="mt-1 text-[26px] font-semibold leading-none text-foam">
                Lv.{cabinLevel}
                <span className="ml-2 text-[11px] font-normal text-foam/40">
                  {cabinLevel === 1 ? '能住人' : cabinLevel === 2 ? '像个家' : '暖棚小屋'}
                </span>
              </div>
            </div>
            <Chip color="#6fe0cf" soft="#6fe0cf1a">
              {SEASONS[season].name}
            </Chip>
          </div>

          <div className="relative mt-3 flex gap-1">
            {CABIN_PERKS.map((perk) => (
              <div
                key={perk.level}
                className={cn(
                  'flex-1 rounded-md border px-2 py-1.5 text-[9px] leading-relaxed',
                  cabinLevel >= perk.level
                    ? 'border-tide/25 bg-tide/5 text-foam/60'
                    : 'border-border/30 text-foam/25',
                )}
              >
                <div className="mb-0.5 text-[8.5px] tracking-widest">Lv.{perk.level}</div>
                {perk.text}
              </div>
            ))}
          </div>

          <div className="relative mt-3 flex items-center gap-2">
            {nextCost !== null ? (
              <Button
                disabled={money < nextCost}
                onClick={upgradeCabin}
                className="h-8 flex-1 rounded-lg bg-gold/15 text-[11px] font-semibold text-gold hover:bg-gold/25"
              >
                扩建到 Lv.{cabinLevel + 1} · ¥{nextCost}
              </Button>
            ) : (
              <div className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-tide/10 text-[10.5px] text-tide">
                <CheckMark /> 已是最大规模
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/40">
              <PawPrint className="size-3" />
              阿獭
            </div>
            <Chip color="#f2c15c" soft="#f2c15c1a">
              {stage.label}
            </Chip>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative grid size-16 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(242,193,92,0.22),rgba(7,27,29,0.2))]">
              <span className="absolute bottom-1 h-2 w-8 rounded-full bg-white/10 blur-[1px]" />
              <div className="relative flex flex-col items-center">
                <span className="size-8 rounded-full bg-[#b58a63] shadow-[inset_0_-4px_0_rgba(0,0,0,0.16)]" />
                <span className="mt-0.5 size-2 rounded-full bg-[#3a2a1c]" />
              </div>
              <Heart className="absolute right-1 top-1 size-3 fill-[#e2685a] text-[#e2685a]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-foam">{PET_NAME}</span>
                <span className="tnum text-[11px] text-gold">{pet.affection}/100</span>
              </div>
              <Bar value={pet.affection} color="#f2c15c" className="mt-1" />
              <div className="mt-1 text-[9.5px] leading-relaxed text-foam/45">{stage.note}</div>
              {next && <div className="text-[8.5px] text-foam/30">再提升 {next.min - pet.affection} 点进入「{next.label}」</div>}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            <PetButton label="喂食" hint={feedLeft > 0 ? `${Math.ceil(feedLeft / 1000)}s` : '消耗一条鱼'} disabled={feedLeft > 0} onClick={feed} />
            <PetButton label="玩耍" hint={playLeft > 0 ? `${Math.ceil(playLeft / 1000)}s` : '好感 +6'} disabled={playLeft > 0} onClick={play} />
            <PetButton label="摸摸" hint={patLeft > 0 ? `${Math.ceil(patLeft / 1000)}s` : '好感 +2'} disabled={patLeft > 0} onClick={pat} />
            <PetButton
              label="鱼干"
              hint={dried > 0 ? `存货 ${dried} · 好感 +6` : '先去晒几条'}
              disabled={dried === 0}
              onClick={feedDriedFish}
            />
          </div>

          <div
            className={cn(
              'mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px]',
              petAbilityUnlocked(pet.affection) ? 'bg-tide/10 text-tide' : 'bg-foam/5 text-foam/35',
            )}
          >
            <Waves className="size-3" />
            {petAbilityUnlocked(pet.affection) ? '默契已达成：潜游时会替你留意鱼群' : '好感 60 解锁水下助手'}
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-border/45 bg-card/35 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
              <Star className="size-3 text-gold" />
              标本架
            </div>
            <span className="tnum text-[9px] text-foam/35">{trophies.length}/{trophySlots}</span>
          </div>
          <div className="flex min-h-[64px] flex-wrap gap-1.5">
            {trophies.map((id) => {
              const def = FISH.find((f) => f.id === id)
              if (!def) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTrophy(id)}
                  className="group relative grid size-14 place-items-center overflow-hidden rounded-lg border border-gold/30 bg-abyss/40"
                  title={`取下 ${def.name}`}
                >
                  <FishArt rarity={def.rarity} defId={id} className="h-10 w-full" glow={false} />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-abyss/70 px-1 text-center text-[8px] text-foam/60">
                    {def.name}
                  </span>
                </button>
              )
            })}
            {Array.from({ length: Math.max(0, trophySlots - trophies.length) }, (_, i) => (
              <div key={i} className="grid size-14 place-items-center rounded-lg border border-dashed border-border/40 text-[16px] text-foam/15">
                +
              </div>
            ))}
          </div>
          {caught.length > 0 ? (
            <div className="mt-2 max-h-20 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {caught.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTrophy(f.id)}
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[8.5px] transition-colors',
                      trophies.includes(f.id) ? 'bg-gold/20 text-gold' : 'bg-foam/5 text-foam/45 hover:text-foam/80',
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[9px] text-foam/30">图鉴里有鱼之后，就能挑来做标本。</div>
          )}
        </div>

        <div className="rounded-xl border border-border/45 bg-card/35 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
              <Sparkles className="size-3 text-tide" />
              水族箱
            </div>
            <span className="tnum text-[9px] text-foam/35">{aquarium.length}/{aquariumSlots}</span>
          </div>
          <div className="relative flex min-h-[64px] flex-wrap gap-1.5 rounded-lg bg-[linear-gradient(180deg,rgba(111,224,207,0.08),rgba(7,27,29,0.4))] p-1.5">
            {aquarium.length === 0 && (
              <div className="grid w-full place-items-center py-3 text-[9px] text-tide/30">水面很安静</div>
            )}
            {aquarium.map((id) => {
              const def = FISH.find((f) => f.id === id)
              if (!def) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAquarium(id)}
                  className="grid size-12 place-items-center rounded-lg border border-tide/25 bg-abyss/40"
                  title={`捞出 ${def.name}`}
                >
                  <FishArt rarity={def.rarity} defId={id} className="h-9 w-full" glow={false} />
                </button>
              )
            })}
          </div>
          {caught.length > 0 ? (
            <div className="mt-2 max-h-20 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {caught.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAquarium(f.id)}
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[8.5px] transition-colors',
                      aquarium.includes(f.id) ? 'bg-tide/20 text-tide' : 'bg-foam/5 text-foam/45 hover:text-foam/80',
                    )}
                    title={RARITIES[f.rarity].label}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[9px] text-foam/30">水族箱里可以放已经收录的鱼。</div>
          )}
        </div>
      </div>

      {caught.length === 0 && (
        <Empty icon={<Home className="size-5" />} title="屋子里还空着" hint="去钓几条鱼，标本架和水族箱就会热闹起来" />
      )}
    </div>
  )
}

function PetButton({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string
  hint: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-1 py-1.5 text-center transition-colors',
        disabled
          ? 'border-border/25 bg-foam/3 text-foam/25'
          : 'border-gold/25 bg-gold/8 text-gold hover:bg-gold/15',
      )}
    >
      <div className="text-[10px] font-medium">{label}</div>
      <div className="text-[8px] opacity-60">{hint}</div>
    </button>
  )
}

function CheckMark() {
  return <span className="text-tide">✓</span>
}
