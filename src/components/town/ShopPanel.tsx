import { Anchor, Archive, Crosshair, Grid3X3, Hammer, Wrench } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { CAPTURE_TOOLS, toolById, toolRepairCost, toolStats, toolUpgradeCost } from '@/game/capture/tools'
import { GEAR, gearById, gearUpgradeCost } from '@/game/gear/gear'
import { Button } from '@/components/ui/button'
import { Bar, Chip, CoinPill, PanelHead } from './shared'
import { cn } from '@/lib/utils'

const TOOL_ICON = {
  harpoon: Crosshair,
  net: Grid3X3,
  trap: Archive,
} as const

function ToolCard({ id }: { id: (typeof CAPTURE_TOOLS)[number]['id'] }) {
  const def = toolById(id)
  const tool = useGameStore((s) => s.tools[id])
  const active = useGameStore((s) => s.activeTool === id)
  const setActive = useGameStore((s) => s.setActiveTool)
  const upgrade = useGameStore((s) => s.upgradeTool)
  const repair = useGameStore((s) => s.repairTool)
  const money = useGameStore((s) => s.money)
  if (!def) return null
  const stats = toolStats(id, tool.level)
  const upCost = toolUpgradeCost(id, tool.level)
  const fixCost = toolRepairCost(tool.level, tool.wear)
  const Icon = TOOL_ICON[id]
  const maxed = upCost === null

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5 transition-colors',
        active ? 'border-gold/40 bg-gold/5' : 'border-border/45 bg-card/35',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="grid size-9 place-items-center rounded-full"
            style={{ background: `${def.color}1a`, color: def.color }}
          >
            <Icon className="size-4.5" />
          </span>
          <div>
            <div className="text-[12.5px] font-semibold text-foam">
              {def.name}
              <span className="tnum ml-1.5 text-[9.5px] font-normal text-foam/40">Lv.{tool.level}</span>
            </div>
            <div className="text-[8.5px] text-foam/35">{def.notes.join(' · ')}</div>
          </div>
        </div>
        <button
          type="button"
          disabled={active || tool.wear <= 0}
          onClick={() => setActive(id)}
          className={cn(
            'rounded-full px-2 py-1 text-[9px] transition-colors',
            active
              ? 'bg-gold/18 text-gold'
              : tool.wear <= 0
                ? 'bg-destructive/10 text-destructive/50'
                : 'bg-foam/6 text-foam/45 hover:text-foam/80',
          )}
        >
          {active ? '使用中' : tool.wear <= 0 ? '已损坏' : '装备'}
        </button>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-relaxed text-foam/40">{def.tagline}</p>

      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
        <MiniStat label="射程" value={`${stats.range}m`} />
        <MiniStat label="冷却" value={`${stats.cooldown.toFixed(2)}s`} />
        {id === 'net' ? (
          <MiniStat label="网面" value={`${stats.radius.toFixed(1)}m`} />
        ) : id === 'trap' ? (
          <MiniStat label="等待" value={`${Math.round(stats.waitMs / 1000)}s`} />
        ) : (
          <MiniStat label="耐久" value={`${Math.round(stats.wear)}`} />
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Wrench className="size-3 text-foam/30" />
        <Bar
          value={tool.wear}
          color={tool.wear > 55 ? def.color : tool.wear > 20 ? '#e2a354' : '#e2685a'}
          className="flex-1"
        />
        <span className="tnum text-[8.5px] text-foam/35">{Math.round(tool.wear)}%</span>
      </div>

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          disabled={tool.wear >= 99.5 || money < fixCost}
          onClick={() => repair(id)}
          className="flex-1 rounded-md border border-border/45 px-1.5 py-1 text-[9px] text-foam/55 transition-colors hover:border-tide/35 hover:text-tide disabled:opacity-30"
        >
          修理 ¥{fixCost}
        </button>
        <button
          type="button"
          disabled={maxed || money < (upCost ?? 0)}
          onClick={() => upgrade(id)}
          className={cn(
            'flex-1 rounded-md px-1.5 py-1 text-[9px] transition-colors',
            maxed
              ? 'bg-foam/5 text-foam/25'
              : 'bg-gold/12 text-gold hover:bg-gold/20 disabled:opacity-30',
          )}
        >
          {maxed ? '已满级' : `升级 ¥${upCost}`}
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[8px] text-foam/25">
        <span>使用 {tool.uses} 次</span>
        <span>捕获 {tool.catches} 条</span>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-abyss/30 py-1">
      <div className="tnum text-[10px] font-medium text-foam/70">{value}</div>
      <div className="text-[7.5px] tracking-[0.12em] text-foam/30">{label}</div>
    </div>
  )
}

export function ShopPanel() {
  const gear = useGameStore((s) => s.gear)
  const money = useGameStore((s) => s.money)
  const upgradeGear = useGameStore((s) => s.upgradeGear)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <PanelHead
        title="阿岚的渔具铺"
        desc="工具会磨损，也能升级。鱼竿、鱼线、鱼钩三件套决定你和大鱼掰手腕时的底气。"
        right={<CoinPill value={money} />}
      />

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
          <Crosshair className="size-3" />
          捕捞工具
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {CAPTURE_TOOLS.map((tool) => (
            <ToolCard key={tool.id} id={tool.id} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
          <Hammer className="size-3" />
          钓鱼装备
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {GEAR.map((item) => {
            const level = gear[item.id]
            const cost = gearUpgradeCost(item.id, level)
            const maxed = cost === null
            const value = item.values[level - 1]
            const nextValue = !maxed ? item.values[level] : value
            return (
              <div key={item.id} className="rounded-xl border border-border/45 bg-card/35 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foam">{item.name}</span>
                  <Chip color={item.color} soft={`${item.color}1a`}>
                    Lv.{level}
                  </Chip>
                </div>
                <div className="mt-0.5 text-[9px] text-foam/35">{item.title}</div>
                <p className="mt-1 line-clamp-2 text-[9.5px] leading-relaxed text-foam/40">{item.tagline}</p>
                <div className="mt-1.5 flex items-center justify-between rounded-md bg-abyss/30 px-2 py-1">
                  <span className="text-[8.5px] text-foam/35">{item.effect}</span>
                  <span className="tnum text-[9.5px] text-foam/70">
                    ×{value.toFixed(2)}
                    {!maxed && <span className="text-tide/60"> → ×{nextValue.toFixed(2)}</span>}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  {item.values.map((_, i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 rounded-full"
                      style={{ background: i < level ? item.color : 'rgba(243,238,226,0.1)' }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  disabled={maxed || money < (cost ?? 0)}
                  onClick={() => upgradeGear(item.id)}
                  className={cn(
                    'mt-2 h-7 w-full rounded-md text-[9.5px]',
                    maxed
                      ? 'bg-foam/5 text-foam/25'
                      : 'bg-gold/12 text-gold hover:bg-gold/20',
                  )}
                >
                  {maxed ? '已满级' : `升级 · ¥${cost}`}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-abyss/25 p-2.5 text-[9px] leading-relaxed text-foam/35">
        <Anchor className="mt-0.5 size-3 shrink-0 text-tide/60" />
        鱼叉适合点杀稀有鱼，渔网适合清小鱼，鱼笼放着就能干活。工具没耐久时无法出手，回铺子修一下就好。
      </div>
    </div>
  )
}
