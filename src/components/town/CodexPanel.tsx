import { useState } from 'react'
import { BookOpen, Check, Coins, Fish, Gift, Leaf, Soup, Trophy } from 'lucide-react'
import { codexProgress, useGameStore } from '@/store/useGameStore'
import { FISH, RARITIES } from '@/game/fishing/fishTable'
import { CROPS } from '@/game/farm/crops'
import { FORAGE } from '@/game/farm/forage'
import { RECIPES, dishValue } from '@/game/cooking/recipes'
import { CAPTURE_TOOLS, METHOD_COLOR, METHOD_LABEL } from '@/game/capture/tools'
import { SEASONS } from '@/game/world/seasons'
import { DAY_PERIOD_LABEL } from '@/game/world/seasons'
import { FishArt } from '@/components/FishArt'
import { Button } from '@/components/ui/button'
import { Bar, Chip, Empty, PanelHead } from './shared'
import { cn } from '@/lib/utils'
import type { CatchMethod } from '@/types'

type Category = 'fish' | 'crop' | 'dish' | 'forage'

const CATEGORIES: { id: Category; label: string; icon: typeof Fish }[] = [
  { id: 'fish', label: '鱼谱', icon: Fish },
  { id: 'crop', label: '作物', icon: Leaf },
  { id: 'dish', label: '菜谱', icon: Soup },
  { id: 'forage', label: '采集', icon: BookOpen },
]

const MILESTONES = [25, 50, 75, 100] as const
const MILESTONE_REWARD: Record<number, number> = { 25: 120, 50: 320, 75: 760, 100: 1800 }
const METHOD_ORDER: CatchMethod[] = ['rod', 'harpoon', 'net', 'trap']

function CodexDetail({ category, id }: { category: Category; id: string }) {
  const codex = useGameStore((s) => s.codex)
  const entry = codex[`${category}:${id}`]
  const discovered = (entry?.count ?? 0) > 0

  if (category === 'fish') {
    const def = FISH.find((f) => f.id === id)
    if (!def) return null
    const meta = RARITIES[def.rarity]
    return (
      <div className="flex flex-col gap-2">
        <div className="relative h-28 overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_50%,rgba(111,224,207,0.1),transparent_70%)]">
          {discovered ? (
            <FishArt rarity={def.rarity} defId={def.id} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center text-[28px] text-foam/12">???</div>
          )}
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold"
            style={{ background: meta.soft, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-foam">{discovered ? def.name : '未收录'}</span>
          <span className="tnum text-[10px] text-foam/45">捕获 {entry?.count ?? 0} 条</span>
        </div>
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">
          {discovered ? def.desc : '见过它的人不多。去更深、更冷、更安静的水里找找。'}
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-[9.5px] text-foam/45">
          <span>水深 {def.minDepth.toFixed(1)}–{def.maxDepth.toFixed(1)} m</span>
          <span>体重 {def.minKg}–{def.maxKg} kg</span>
          <span>{def.seasons ? def.seasons.map((s) => SEASONS[s].name).join(' / ') : '全年'}</span>
          <span>{def.periods ? def.periods.map((p) => DAY_PERIOD_LABEL[p]).join(' / ') : '不限时段'}</span>
        </div>
        {discovered && (
          <div className="rounded-md bg-foam/5 px-2 py-1.5 text-[9.5px] text-foam/50">
            纪录 · {entry?.bestKg ? `${entry.bestKg.toFixed(2)} kg` : '—'} / {entry?.bestCm ?? 0} cm
            <div className="mt-1 flex flex-wrap gap-1">
              {METHOD_ORDER.map((m) => (
                <span
                  key={m}
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[8.5px]',
                    entry?.methods?.includes(m) ? 'text-foam/75' : 'text-foam/20',
                  )}
                  style={entry?.methods?.includes(m) ? { background: `${METHOD_COLOR[m]}22` } : undefined}
                >
                  {METHOD_LABEL[m]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (category === 'crop') {
    const def = CROPS.find((c) => c.id === id)
    if (!def) return null
    return (
      <div className="flex flex-col gap-2">
        <div className="grid h-24 place-items-center rounded-lg bg-[radial-gradient(ellipse_at_50%_120%,rgba(143,191,119,0.2),transparent_70%)]">
          <span className="size-10 rounded-full" style={{ background: `linear-gradient(160deg, ${def.accent}, ${def.color})` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-foam">{discovered ? def.name : '未收录'}</span>
          <Chip color={def.color} soft={`${def.color}22`}>{def.familyLabel}</Chip>
        </div>
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">
          {discovered ? def.tagline : '在菜园里种一茬，收获后就会记进图鉴。'}
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-[9.5px] text-foam/45">
          <span>生长 {Math.round(def.growMs / 1000)} 秒</span>
          <span>产量 {def.yield}</span>
          <span>种子 ¥{def.seedPrice}</span>
          <span>售价 ¥{def.sellPrice}</span>
        </div>
        <div className="rounded-md bg-foam/5 px-2 py-1.5 text-[9.5px] text-foam/50">
          收获 {entry?.count ?? 0} 份 · 适种 {def.seasons.map((s) => SEASONS[s].name).join(' / ')}
        </div>
      </div>
    )
  }

  if (category === 'dish') {
    const def = RECIPES.find((r) => r.id === id)
    if (!def) return null
    return (
      <div className="flex flex-col gap-2">
        <div className="grid h-24 place-items-center rounded-lg bg-[radial-gradient(ellipse_at_50%_35%,rgba(226,104,90,0.2),transparent_70%)]">
          <Soup className="size-10 text-destructive/60" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-foam">{discovered ? def.name : '未收录'}</span>
          <span className="tnum text-[10px] text-gold">基准 ¥{def.basePrice}</span>
        </div>
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">
          {discovered ? def.tagline : '在灶台上做一次，就会记下这张菜谱。'}
        </p>
        <div className="text-[9.5px] text-foam/45">
          {def.method} · {def.effect}
        </div>
        <div className="rounded-md bg-foam/5 px-2 py-1.5 text-[9.5px] text-foam/50">
          做过 {entry?.count ?? 0} 次 · 完美 ¥{dishValue(`dish:${def.id}#perfect`)}
        </div>
      </div>
    )
  }

  const def = FORAGE.find((f) => f.id === id)
  if (!def) return null
  return (
    <div className="flex flex-col gap-2">
      <div className="grid h-24 place-items-center rounded-lg bg-[radial-gradient(ellipse_at_50%_50%,rgba(242,193,92,0.14),transparent_70%)]">
        <Leaf className="size-10" style={{ color: def.color }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-foam">{discovered ? def.name : '未收录'}</span>
        <Chip color={def.color} soft={`${def.color}22`}>{def.zone}</Chip>
      </div>
      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        {discovered ? def.tagline : '去潮间带找找，季节对了才长得出来。'}
      </p>
      <div className="text-[9.5px] text-foam/45">用途 · {def.use}</div>
      <div className="rounded-md bg-foam/5 px-2 py-1.5 text-[9.5px] text-foam/50">
        采到 {entry?.count ?? 0} 份 · {def.seasons.map((s) => SEASONS[s].name).join(' / ')} · ¥{def.sellPrice}
      </div>
    </div>
  )
}

export function CodexPanel() {
  const codex = useGameStore((s) => s.codex)
  const claims = useGameStore((s) => s.codexClaims)
  const claim = useGameStore((s) => s.claimCodexReward)
  const state = useGameStore()
  const progress = codexProgress(state)
  const [category, setCategory] = useState<Category>('fish')
  const [selected, setSelected] = useState('bleak')

  const items =
    category === 'fish'
      ? FISH.map((f) => ({ id: f.id, name: f.name, sub: RARITIES[f.rarity].label, color: RARITIES[f.rarity].color, rarity: f.rarity }))
      : category === 'crop'
        ? CROPS.map((c) => ({ id: c.id, name: c.name, sub: `${c.seasons.length} 季`, color: c.color, rarity: undefined }))
        : category === 'dish'
          ? RECIPES.map((r) => ({ id: r.id, name: r.name, sub: r.method, color: '#e2a354', rarity: undefined }))
          : FORAGE.map((f) => ({ id: f.id, name: f.name, sub: f.zone, color: f.color, rarity: undefined }))

  const selectedId = items.some((i) => i.id === selected) ? selected : items[0]?.id

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PanelHead
        title="海湾图鉴"
        desc="捕过、种过、做过的都会记下来。集齐得越多，码头给的奖励越厚。"
        right={<Chip color="#f2c15c" soft="#f2c15c1a">{progress.collected}/{progress.total} · {progress.pct.toFixed(0)}%</Chip>}
      />

      <div>
        <Bar value={progress.pct} color="#f2c15c" className="h-2" />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {MILESTONES.map((m) => {
            const claimed = claims.includes(m)
            const unlocked = progress.pct >= m
            return (
              <button
                key={m}
                type="button"
                disabled={claimed || !unlocked}
                onClick={() => claim(m)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] transition-colors',
                  claimed
                    ? 'bg-foam/5 text-foam/25'
                    : unlocked
                      ? 'bg-gold/15 text-gold hover:bg-gold/25'
                      : 'bg-foam/5 text-foam/30',
                )}
              >
                {claimed ? <Check className="size-2.5" /> : <Gift className="size-2.5" />}
                {m}% · ¥{MILESTONE_REWARD[m]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1">
        {CATEGORIES.map((c) => {
          const Icon = c.icon
          const active = c.id === category
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id)
                setSelected(
                  c.id === 'fish' ? FISH[0].id : c.id === 'crop' ? CROPS[0].id : c.id === 'dish' ? RECIPES[0].id : FORAGE[0].id,
                )
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] transition-colors',
                active ? 'bg-foam/12 text-foam' : 'text-foam/45 hover:bg-foam/6 hover:text-foam/70',
              )}
            >
              <Icon className="size-3" />
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto pr-0.5">
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-3">
            {items.map((item) => {
              const discovered = (codex[`${category}:${item.id}`]?.count ?? 0) > 0
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    'group relative flex flex-col items-center gap-0.5 rounded-lg border p-2 transition-colors',
                    selectedId === item.id
                      ? 'border-gold/45 bg-gold/8'
                      : 'border-border/40 bg-card/30 hover:border-border/70',
                    !discovered && 'opacity-45',
                  )}
                >
                  {discovered && item.rarity ? (
                    <FishArt rarity={item.rarity} defId={item.id} className="h-9 w-full" glow={false} />
                  ) : (
                    <span
                      className="grid h-9 w-full place-items-center rounded-md bg-abyss/40 text-[15px]"
                      style={{ color: discovered ? item.color : 'rgba(243,238,226,0.18)' }}
                    >
                      {discovered ? '●' : '?'}
                    </span>
                  )}
                  <span className="mt-0.5 w-full truncate text-center text-[9.5px] text-foam/75">
                    {discovered ? item.name : '？？？'}
                  </span>
                  <span className="w-full truncate text-center text-[8px] text-foam/30">{item.sub}</span>
                  {discovered && (
                    <span className="tnum absolute right-1 top-1 text-[8px] text-foam/35">
                      {codex[`${category}:${item.id}`]?.count ?? 0}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto rounded-xl border border-border/45 bg-card/40 p-2.5">
          {selectedId ? (
            <CodexDetail category={category} id={selectedId} />
          ) : (
            <Empty icon={<BookOpen className="size-5" />} title="还没有记录" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-abyss/25 px-2.5 py-1.5 text-[9.5px] text-foam/40">
        <Trophy className="size-3 text-gold/70" />
        {CAPTURE_TOOLS.length} 种捕捞工具 · {FISH.length} 种鱼 · {CROPS.length} 种作物 · {RECIPES.length} 道菜
        <span className="ml-auto inline-flex items-center gap-1">
          <Coins className="size-3 text-gold/60" />
          图鉴奖励靠进度解锁
        </span>
      </div>
    </div>
  )
}
