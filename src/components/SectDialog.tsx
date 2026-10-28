import { useState } from 'react'
import {
  BadgeCheck,
  Coins,
  Gem,
  Scroll,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RARITIES } from '@/game/fishing/fishTable'
import { FACTIONS } from '@/game/cultivation/factions'
import { SECT_ELDERS, SECT_LAYOUT } from '@/game/sect/sectHalls'
import {
  CONTRIBUTION_BY_RARITY,
  MAX_EQUIPPED,
  TECHNIQUES,
  techniqueCost,
  techniqueValue,
  type TechniqueDef,
} from '@/game/sect/techniques'
import { gameEvents } from '@/game/eventBus'
import { bagCapacity, useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const HALL_NAME: Record<'immortal' | 'demon', string> = {
  immortal: '缥缈仙宗',
  demon: '血煞魔宗',
}

const KIND_LABEL = {
  passive: '静修',
  active: '神通',
  movement: '身法',
} as const

/** 功法数值有的写成比例、有的写成丈数，展示要分开 */
function formatValue(def: TechniqueDef, value: number) {
  if (value <= 0) return '未修习'
  if (def.unit === '雷域半径' || def.unit === '御空高度') return `${value.toFixed(1)} 丈`
  return `+${Math.round(value * 100)}%`
}

function CostRow({ def, level }: { def: TechniqueDef; level: number }) {
  const tithe = level <= 0 ? def.learn : { contribution: techniqueCost(def, level), cores: 0, jade: 0 }
  const parts = [`${tithe.contribution} 贡献`]
  if (tithe.cores) parts.push(`${tithe.cores} 内丹`)
  if (tithe.jade) parts.push(`${tithe.jade} 仙玉`)
  return <span className="tnum text-[10px] text-foam/45">{parts.join(' · ')}</span>
}

export function SectDialog() {
  const sectAt = useGameStore((s) => s.sectAt)
  const setSectAt = useGameStore((s) => s.setSectAt)
  const contribution = useGameStore((s) => s.contribution)
  const techniques = useGameStore((s) => s.techniques)
  const equipped = useGameStore((s) => s.equippedTechniques)
  const bag = useGameStore((s) => s.bag)
  const cores = useGameStore((s) => s.cultivationCores)
  const jade = useGameStore((s) => s.immortalJade)
  const contestWins = useGameStore((s) => s.contestWins)
  const contestLosses = useGameStore((s) => s.contestLosses)
  const realm = useGameStore((s) => s.realm)
  const learnTechnique = useGameStore((s) => s.learnTechnique)
  const upgradeTechnique = useGameStore((s) => s.upgradeTechnique)
  const toggleTechnique = useGameStore((s) => s.toggleTechnique)
  const submitCatch = useGameStore((s) => s.submitCatchForContribution)
  const capacity = useGameStore((s) => bagCapacity(s))
  const [tab, setTab] = useState('techniques')

  if (!sectAt) return null
  const faction = FACTIONS[sectAt]
  const elder = SECT_ELDERS[sectAt]

  const close = () => setSectAt(null)

  const register = () => {
    close()
    gameEvents.emit('contest:register', { faction: sectAt })
  }

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent
        showClose={false}
        className="w-[calc(100%-1.25rem)] max-w-2xl overflow-hidden border-border/70 bg-[#0a1b26] p-0"
        style={{ boxShadow: `0 0 90px -30px ${faction.glow}` }}
      >
        <div
          className="relative border-b border-border/60 px-4 pb-3 pt-4 sm:px-5"
          style={{ background: faction.soft }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className="text-[16px] font-semibold tracking-[0.08em]"
                  style={{ color: faction.color }}
                >
                  {HALL_NAME[sectAt]}
                </h2>
                <span className="rounded-full bg-black/30 px-2 py-0.5 text-[9px] tracking-[0.16em] text-foam/50">
                  {sectAt === 'immortal' ? '悬空浮岛 · 白青为骨' : '暗红断崖 · 血火为门'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-foam/55">
                <span className="flex items-center gap-1">
                  <Shield className="size-3" />
                  {elder.role}
                </span>
                <span className="font-medium text-foam/80">{elder.name}</span>
                <span className="text-foam/30">·</span>
                <span className="tnum">第{realm}重境界</span>
                <span className="text-foam/30">·</span>
                <span className="tnum">
                  坐标 {SECT_LAYOUT[sectAt].x}, {SECT_LAYOUT[sectAt].z}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid size-8 shrink-0 place-items-center rounded-full text-foam/40 transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="离开山门"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-foam/65">{elder.greeting}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
            <span
              className="tnum flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
              style={{ background: `${faction.color}22`, color: faction.color }}
            >
              <Sparkles className="size-3" />
              贡献 {contribution}
            </span>
            <span className="tnum flex items-center gap-1 rounded-full bg-foam/6 px-2.5 py-1 text-foam/60">
              <Gem className="size-3" />内丹 {cores}
            </span>
            <span className="tnum flex items-center gap-1 rounded-full bg-foam/6 px-2.5 py-1 text-foam/60">
              <Coins className="size-3" />仙玉 {jade}
            </span>
            <span className="tnum flex items-center gap-1 rounded-full bg-foam/6 px-2.5 py-1 text-foam/60">
              <Scroll className="size-3" />功法 {equipped.length}/{MAX_EQUIPPED} 运转中
            </span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="px-4 pb-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="techniques" className="flex-1 gap-1.5">
              <Scroll className="size-3.5" />
              功法阁
            </TabsTrigger>
            <TabsTrigger value="tithe" className="flex-1 gap-1.5">
              <Send className="size-3.5" />
              上交渔获
              <span className="tnum text-[9px] text-foam/35">{bag.length}</span>
            </TabsTrigger>
            <TabsTrigger value="contest" className="flex-1 gap-1.5">
              <Trophy className="size-3.5" />
              宗门大比
            </TabsTrigger>
          </TabsList>

          <TabsContent value="techniques" className="mt-2.5">
            <div className="max-h-[min(52dvh,420px)] space-y-2 overflow-y-auto pr-0.5">
              {TECHNIQUES.map((def) => {
                const level = techniques[def.id] ?? 0
                const owned = level > 0
                const worn = equipped.includes(def.id)
                const blocked = def.learn.faction && def.learn.faction !== sectAt
                const cost = techniqueCost(def, level)
                const maxed = level >= def.maxLevel
                const current = techniqueValue(def, level)
                const next = techniqueValue(def, Math.min(def.maxLevel, level + 1))
                return (
                  <div
                    key={def.id}
                    className={cn(
                      'rounded-xl border p-3 transition-colors',
                      blocked
                        ? 'border-border/25 bg-black/25 opacity-55'
                        : worn
                          ? 'border-gold/45 bg-card/55'
                          : 'border-border/45 bg-card/40',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold" style={{ color: def.color }}>
                            《{def.name}》
                          </span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px]"
                            style={{ background: `${def.color}1f`, color: def.color }}
                          >
                            {KIND_LABEL[def.kind]}
                          </span>
                          <span className="text-[9px] tracking-[0.14em] text-foam/30">{def.sect}</span>
                          {def.key && (
                            <span className="rounded border border-foam/20 px-1 text-[9px] font-bold text-foam/55">
                              {def.key}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-foam/55">{def.desc}</p>
                      </div>
                      {worn && (
                        <BadgeCheck className="size-4 shrink-0 text-gold" aria-label="已运转" />
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: def.maxLevel }, (_, i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-full"
                          style={{
                            background: i < level ? def.color : 'rgba(243,232,207,0.12)',
                          }}
                        />
                      ))}
                      <span className="tnum ml-1.5 text-[9.5px] text-foam/40">
                        {level}/{def.maxLevel}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] text-foam/50">
                        {owned ? (
                          <span className="tnum">
                            当前 {formatValue(def, current)}
                            {!maxed && <span className="text-foam/30"> → 下一重 {formatValue(def, next)}</span>}
                          </span>
                        ) : (
                          <span className="tnum">
                            修习所需 <CostRow def={def} level={level} />
                          </span>
                        )}
                        {owned && !maxed && (
                          <span className="tnum ml-1.5 text-foam/40">
                            精进 {cost} 贡献
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {blocked ? (
                          <span className="text-[10px] text-foam/35">
                            {FACTIONS[def.learn.faction!].name}不传之秘
                          </span>
                        ) : !owned ? (
                          <button
                            type="button"
                            onClick={() => learnTechnique(def.id)}
                            className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors hover:brightness-125"
                            style={{ background: `${def.color}26`, color: def.color }}
                          >
                            求取此法
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={maxed}
                              onClick={() => upgradeTechnique(def.id)}
                              className={cn(
                                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                                maxed
                                  ? 'cursor-default bg-foam/6 text-foam/25'
                                  : 'hover:brightness-125',
                              )}
                              style={maxed ? undefined : { background: `${def.color}26`, color: def.color }}
                            >
                              {maxed ? '已至圆满' : '精进'}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTechnique(def.id)}
                              className={cn(
                                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                                worn
                                  ? 'bg-gold/18 text-gold hover:bg-gold/26'
                                  : 'bg-foam/8 text-foam/70 hover:bg-foam/14',
                              )}
                            >
                              {worn ? '收功' : '运转'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 rounded-md bg-foam/4 px-2.5 py-1.5 text-[10px] text-foam/45">
              同时只能运转 {MAX_EQUIPPED} 部功法 · 未运转的功法不生效，但已花的贡献不退
            </div>
          </TabsContent>

          <TabsContent value="tithe" className="mt-2.5">
            <div className="max-h-[min(52dvh,420px)] overflow-y-auto pr-0.5">
              {bag.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
                  <Send className="size-8 text-foam/18" />
                  <div className="text-[12px] text-foam/50">鱼篓里没有可上交的渔获</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    品阶越高的鱼，宗门给的贡献越多
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {bag.map((c) => {
                    const meta = RARITIES[c.rarity]
                    const gained = c.junk ? 1 : CONTRIBUTION_BY_RARITY[c.rarity] ?? 2
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border/45 bg-card/40 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[12.5px] text-foam">{c.name}</span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px]"
                              style={{ background: meta.soft, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="tnum text-[9.5px] text-foam/35">
                            {c.kg.toFixed(2)} kg · 市价 ¥{c.value}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => submitCatch(c.id)}
                          className="shrink-0 rounded-md bg-tide/14 px-2.5 py-1 text-[11px] font-medium text-tide transition-colors hover:bg-tide/22"
                        >
                          上交 +{gained}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-foam/4 px-2.5 py-1.5 text-[10px] text-foam/45">
              <span>
                凡品 2 · 良好 6 · 稀有 16 · 史诗 40 · 传说 90，杂物只值 1
              </span>
              <span className="tnum text-foam/30">
                {bag.length}/{capacity}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="contest" className="mt-2.5">
            <div className="rounded-xl border border-border/45 bg-card/40 p-3">
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-gold" />
                <span className="text-[13px] font-semibold text-foam">仙魔大比</span>
                <span className="tnum ml-auto text-[10px] text-foam/40">
                  胜 {contestWins} · 负 {contestLosses}
                </span>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-foam/55">
                擂台立于仙界云海正中，光幕一起便是一局定胜负。对面站着的，是与你境界相同、阵营相反的
                {FACTIONS[sectAt === 'immortal' ? 'demon' : 'immortal'].name}心魔。
              </p>
              <ul className="mt-2 space-y-1 text-[10px] text-foam/50">
                <li>· 胜利：大量宗门贡献 + 一只大比宝箱（内丹 / 仙玉 / 稀有材料）</li>
                <li>· 落败：倒扣贡献，船身被送回山门外养伤</li>
                <li>· 已运转的功法在擂台上照常可用，U 引天雷、O 踏剑腾空</li>
              </ul>
              <button
                type="button"
                onClick={register}
                className="mt-3 w-full rounded-lg py-2 text-[12.5px] font-semibold tracking-[0.1em] transition-transform active:scale-[0.99]"
                style={{ background: faction.soft, color: faction.color, border: `1px solid ${faction.color}55` }}
              >
                报名上台 · 直面心魔
              </button>
              <div className="mt-1.5 text-center text-[9px] tracking-[0.16em] text-foam/25">
                心魔即是我，我即心魔
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
