import {
  Anchor,
  Archive,
  Crosshair,
  Gauge,
  Grid3X3,
  Hammer,
  Sword,
  Target,
  Wrench,
} from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { CAPTURE_TOOLS, toolById, toolRepairCost, toolStats, toolUpgradeCost } from '@/game/capture/tools'
import {
  variantById,
  variantStats,
  variantsFor,
  type ToolVariantId,
} from '@/game/capture/variants'
import { WEAPONS, weaponById, weaponRefillCost } from '@/game/combat/weapons'
import { GEAR, gearUpgradeCost } from '@/game/gear/gear'
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

function WeaponCard({ id }: { id: (typeof WEAPONS)[number]['id'] }) {
  const def = weaponById(id)
  const owned = useGameStore((s) => s.ownedWeapons.includes(id))
  const equipped = useGameStore((s) => s.equippedWeapon === id)
  const ammo = useGameStore((s) => s.weaponAmmo[id] ?? 0)
  const money = useGameStore((s) => s.money)
  const buyWeapon = useGameStore((s) => s.buyWeapon)
  const equipWeapon = useGameStore((s) => s.equipWeapon)
  const refillWeapon = useGameStore((s) => s.refillWeapon)
  if (!def) return null
  const refillCost = weaponRefillCost(id, ammo)
  const Icon = def.kind === 'melee' ? Sword : Target

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5 transition-colors',
        equipped ? 'border-gold/45 bg-gold/5' : 'border-border/45 bg-card/35',
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
              <span className="ml-1.5 text-[8.5px] font-normal text-foam/35">
                {def.kind === 'melee' ? '近战' : '远程'}
              </span>
            </div>
            <div className="text-[8.5px] text-foam/35">{def.title}</div>
          </div>
        </div>
        <span className="tnum text-[9px] text-foam/40">
          {def.ammoMax > 0 ? `${ammo}/${def.ammoMax}` : '无弹药'}
        </span>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-relaxed text-foam/40">{def.tagline}</p>

      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
        <MiniStat label="伤害" value={`${def.damage}`} />
        <MiniStat label="射程" value={`${def.range}m`} />
        <MiniStat label="冷却" value={`${def.cooldown.toFixed(2)}s`} />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className={cn('tnum text-[10.5px]', owned ? 'text-foam/35' : money >= def.price ? 'text-gold' : 'text-destructive/80')}>
          {owned ? '已拥有' : `¥${def.price}`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {owned && def.ammoMax > 0 && ammo < def.ammoMax && (
            <button
              type="button"
              disabled={money < refillCost}
              onClick={() => refillWeapon(id)}
              className="rounded-md border border-border/45 px-1.5 py-1 text-[9px] text-foam/55 transition-colors hover:border-gold/35 hover:text-gold disabled:opacity-30"
            >
              补给 ¥{refillCost}
            </button>
          )}
          {equipped ? (
            <span className="rounded-full border border-gold/30 px-2 py-1 text-[9px] text-gold/80">已装备</span>
          ) : owned ? (
            <button
              type="button"
              onClick={() => equipWeapon(id)}
              className="rounded-md bg-foam/8 px-2 py-1 text-[9px] text-foam/70 transition-colors hover:bg-foam/15"
            >
              装备
            </button>
          ) : (
            <button
              type="button"
              disabled={money < def.price}
              onClick={() => buyWeapon(id)}
              className="rounded-md bg-gold/12 px-2 py-1 text-[9px] text-gold transition-colors hover:bg-gold/22 disabled:opacity-30"
            >
              购入
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function VariantCard({ id }: { id: ToolVariantId }) {
  const def = variantById(id)
  const owned = useGameStore((s) => s.ownedVariants.includes(id))
  const equipped = useGameStore((s) => s.toolVariants[def?.tool ?? 'harpoon'] === id)
  const ammo = useGameStore((s) => s.variantAmmo[id] ?? 0)
  const level = useGameStore((s) => (def ? s.tools[def.tool].level : 1))
  const money = useGameStore((s) => s.money)
  const buyToolVariant = useGameStore((s) => s.buyToolVariant)
  const setToolVariant = useGameStore((s) => s.setToolVariant)
  const refillVariantAmmo = useGameStore((s) => s.refillVariantAmmo)
  if (!def) return null
  const stats = variantStats(toolStats(def.tool, level), def)
  const refillCost = def.ammoMax > 0 ? Math.ceil((def.ammoMax - ammo) * def.ammoPrice) : 0
  const Icon = def.tool === 'harpoon' ? Crosshair : Grid3X3

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-2.5 transition-colors',
        equipped ? 'border-gold/45 bg-gold/5' : 'border-border/45 bg-card/35',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full"
            style={{ background: `${def.color}1a`, color: def.color }}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-foam">{def.name}</div>
            <div className="truncate text-[8.5px] text-foam/35">{def.title}</div>
          </div>
        </div>
        {def.damage >= 60 && (
          <span className="shrink-0 rounded-full bg-destructive/12 px-1.5 py-0.5 text-[8px] text-destructive/80">
            重火力
          </span>
        )}
      </div>

      <p className="mt-1.5 line-clamp-2 min-h-[26px] text-[9.5px] leading-relaxed text-foam/40">
        {def.tagline}
      </p>

      <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
        <MiniStat label="伤害" value={`${def.damage}`} />
        <MiniStat label="射程" value={`${stats.range}m`} />
        <MiniStat label="冷却" value={`${stats.cooldown.toFixed(1)}s`} />
        <MiniStat
          label={def.capacityBonus > 0 ? '多抓' : def.ammoMax > 0 ? '弹量' : '鱼价'}
          value={
            def.capacityBonus > 0
              ? `+${def.capacityBonus}`
              : def.ammoMax > 0
                ? `${def.ammoMax}`
                : `${Math.round(def.valueMul * 100)}%`
          }
        />
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-2">
        <span className={cn('tnum text-[10px]', owned ? 'text-foam/35' : money >= def.price ? 'text-gold' : 'text-destructive/80')}>
          {owned ? (def.ammoMax > 0 ? `弹药 ${ammo}/${def.ammoMax}` : '已拥有') : `¥${def.price}`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {owned && def.ammoMax > 0 && ammo < def.ammoMax && (
            <button
              type="button"
              disabled={money < refillCost}
              onClick={() => refillVariantAmmo(id)}
              className="rounded-md border border-border/45 px-1.5 py-1 text-[8.5px] text-foam/55 transition-colors hover:border-gold/35 hover:text-gold disabled:opacity-30"
            >
              补给 ¥{refillCost}
            </button>
          )}
          {equipped ? (
            <span className="rounded-full border border-gold/30 px-2 py-1 text-[8.5px] text-gold/80">使用中</span>
          ) : owned ? (
            <button
              type="button"
              onClick={() => setToolVariant(id)}
              className="rounded-md bg-foam/8 px-2 py-1 text-[8.5px] text-foam/70 transition-colors hover:bg-foam/15"
            >
              换上
            </button>
          ) : (
            <button
              type="button"
              disabled={money < def.price}
              onClick={() => buyToolVariant(id)}
              className="rounded-md bg-gold/12 px-2 py-1 text-[8.5px] text-gold transition-colors hover:bg-gold/22 disabled:opacity-30"
            >
              购入
            </button>
          )}
        </div>
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
          <Gauge className="size-3" />
          进阶捕捞工具
          <span className="ml-auto text-[8.5px] normal-case tracking-normal text-foam/25">
            按 Z 切换型号
          </span>
        </div>
        {(['harpoon', 'net'] as const).map((category) => (
          <div key={category} className="mb-2 last:mb-0">
            <div className="mb-1 flex items-center gap-1.5 text-[8.5px] tracking-[0.16em] text-foam/30">
              {category === 'harpoon' ? <Crosshair className="size-2.5" /> : <Grid3X3 className="size-2.5" />}
              {category === 'harpoon' ? '鱼叉系' : '渔网系'}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {variantsFor(category).map((variant) => (
                <VariantCard key={variant.id} id={variant.id} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-foam/45">
          <Sword className="size-3" />
          防身武器
          <span className="ml-auto text-[8.5px] normal-case tracking-normal text-foam/25">
            J 挥刀 · K 鱼枪
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEAPONS.map((weapon) => (
            <WeaponCard key={weapon.id} id={weapon.id} />
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
        鱼叉适合点杀稀有鱼，渔网适合清小鱼，鱼笼放着就能干活。工具没耐久时无法出手；鱼枪与炸药叉头需要定期补给。
      </div>
    </div>
  )
}
