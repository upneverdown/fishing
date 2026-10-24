import { Coins, Gift, ScrollText, Sparkles } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { dailyQuestList, questRewardItemName, type QuestDef } from '@/game/quests/quests'
import { npcById } from '@/game/town/npcs'
import { dayKey } from '@/game/economy/market'
import { Button } from '@/components/ui/button'
import { Bar, Chip, Empty, PanelHead, useNow } from './shared'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<QuestDef['category'], { label: string; color: string }> = {
  catch: { label: '捕捞', color: '#6fe0cf' },
  farm: { label: '耕作', color: '#8fbf77' },
  cook: { label: '烹饪', color: '#e2685a' },
  gather: { label: '采集', color: '#d8ba71' },
  sell: { label: '交易', color: '#f2c15c' },
}

function QuestCard({ def }: { def: QuestDef }) {
  const states = useGameStore((s) => s.quests)
  const accept = useGameStore((s) => s.acceptQuest)
  const claim = useGameStore((s) => s.claimQuest)
  const abandon = useGameStore((s) => s.abandonQuest)
  const state = states.find((q) => q.id === def.id)
  const progress = state?.progress ?? 0
  const accepted = state?.accepted ?? false
  const claimed = state?.claimed ?? false
  const complete = progress >= def.target
  const npc = npcById(def.npc)
  const meta = CATEGORY_META[def.category]
  const now = useNow(2000)
  const stale = def.id.split(':')[0] !== dayKey() || (now && def.id.split(':')[0] !== dayKey())

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card/45 p-3 transition-colors',
        claimed ? 'border-border/30 opacity-55' : complete && accepted ? 'border-gold/40' : 'border-border/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold text-foam">{def.title}</span>
            <Chip color={meta.color} soft={`${meta.color}22`}>
              {meta.label}
            </Chip>
            {stale && <Chip color="#e2685a">已过期</Chip>}
          </div>
          <div className="mt-0.5 text-[9.5px] text-foam/40">
            {npc?.name ?? '码头'} · {npc?.role}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="tnum inline-flex items-center gap-0.5 text-[12px] font-semibold text-gold">
            <Coins className="size-3" />+{def.rewardMoney}
          </span>
          {def.rewardItem && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-foam/45">
              <Gift className="size-2.5" />
              {questRewardItemName(def.rewardItem)} ×{def.rewardQty}
            </span>
          )}
        </div>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">{def.desc}</p>

      <div className="mt-2 flex items-center gap-2">
        <Bar value={(progress / def.target) * 100} color={complete ? '#f2c15c' : meta.color} className="flex-1" />
        <span className="tnum text-[10px] text-foam/60">
          {Math.min(progress, def.target)}/{def.target}
        </span>
      </div>
      <div className="mt-1 text-[9px] text-foam/35">{def.hint}</div>

      <div className="mt-2.5 flex items-center gap-2">
        {!accepted && !claimed && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 rounded-full border-tide/35 px-2.5 text-[10px] text-tide hover:bg-tide/10"
            onClick={() => accept(def.id)}
          >
            接下委托
          </Button>
        )}
        {accepted && !claimed && (
          <>
            <Button
              size="sm"
              disabled={!complete}
              className="h-6 rounded-full bg-gold/15 px-2.5 text-[10px] text-gold hover:bg-gold/25"
              onClick={() => claim(def.id)}
            >
              <Sparkles className="size-3" />
              {complete ? `领取 ¥${def.rewardMoney}` : '进行中'}
            </Button>
            <button
              type="button"
              onClick={() => abandon(def.id)}
              className="text-[9.5px] text-foam/30 transition-colors hover:text-destructive"
            >
              放弃
            </button>
          </>
        )}
        {claimed && <span className="text-[10px] text-tide/70">已完成</span>}
      </div>
    </div>
  )
}

export function QuestPanel() {
  const questDay = useGameStore((s) => s.questDay)
  const questSeason = useGameStore((s) => s.questSeason)
  const season = useGameStore((s) => s.season)
  const refresh = useGameStore((s) => s.refreshDailyQuests)
  const stats = useGameStore((s) => s.stats)
  const quests = useGameStore((s) => s.quests)
  const defs = dailyQuestList(questDay, questSeason)
  const active = quests.filter((q) => q.accepted && !q.claimed).length
  const done = quests.filter((q) => q.claimed).length
  const stale = questDay !== dayKey() || questSeason !== season

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PanelHead
        title="码头委托板"
        desc="每天三条委托，小满会用贝壳把新的压在最上面。完成得越多，码头越热闹。"
        right={
          <div className="flex items-center gap-2">
            <div className="tnum rounded-full bg-foam/6 px-2 py-1 text-[9.5px] text-foam/55">
              进行中 {active}/3 · 已完成 {done}
            </div>
            {stale && (
              <Button size="sm" className="h-6 rounded-full px-2.5 text-[10px]" onClick={refresh}>
                刷新
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {defs.map((def) => (
          <QuestCard key={def.id} def={def} />
        ))}
      </div>

      {defs.length === 0 && (
        <Empty icon={<ScrollText className="size-5" />} title="今天的委托还没贴出来" hint="过一会儿再来看看" />
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 rounded-xl border border-border/40 bg-abyss/30 p-2.5 sm:grid-cols-4">
        {[
          { label: '累计卖鱼', value: `¥${Math.round(stats.soldValue).toLocaleString('zh-CN')}` },
          { label: '烹饪次数', value: stats.cooked },
          { label: '收获作物', value: stats.harvested },
          { label: '采集次数', value: stats.gathered },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="tnum text-[14px] font-semibold text-foam">{s.value}</div>
            <div className="text-[9px] tracking-[0.16em] text-foam/35">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
