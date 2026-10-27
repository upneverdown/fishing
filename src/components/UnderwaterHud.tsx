import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Crosshair,
  Eye,
  Keyboard,
  Network,
  PackageOpen,
  ScanEye,
  Timer,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { input } from '@/game/input'
import {
  bagCapacity,
  isModalOpen,
  UNDERWATER_MODE_LABEL,
  useGameStore,
} from '@/store/useGameStore'
import { CAPTURE_TOOLS, toolStats } from '@/game/capture/tools'
import { variantById, variantStats } from '@/game/capture/variants'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { Joystick } from '@/components/TouchControls'
import { FishArt } from '@/components/FishArt'
import { Bar, useNow } from '@/components/town/shared'
import { BAITS } from '@/game/fishing/baitTable'
import { RARITIES, fishById } from '@/game/fishing/fishTable'
import { DAY_PERIOD_LABEL, SEASONS } from '@/game/world/seasons'
import { cn } from '@/lib/utils'
import type { CaptureToolId } from '@/types'

const TOOL_ICONS: Record<CaptureToolId, LucideIcon> = {
  harpoon: Crosshair,
  net: Network,
  trap: PackageOpen,
}

const HINTS = [
  { keys: ['W', 'A', 'S', 'D'], label: '游动 / 横移' },
  { keys: ['Space'], label: '上浮' },
  { keys: ['Shift'], label: '下潜' },
  { keys: ['Ctrl'], label: '加速游动' },
  { keys: ['1', '2', '3'], label: '换捕捞工具' },
  { keys: ['E', '点击'], label: '出手捕捞' },
  { keys: ['点击'], label: '观察鱼群' },
  { keys: ['Q'], label: '切换工具型号' },
  { keys: ['J'], label: '挥刀' },
  { keys: ['K'], label: '鱼枪射击' },
  { keys: ['F'], label: '开宝箱 / 切换视角' },
  { keys: ['V'], label: '浮回水面' },
]

function ObservedFish() {
  const observed = useGameStore((s) => s.observedFish)
  const setObservedFish = useGameStore((s) => s.setObservedFish)
  const def = observed ? fishById(observed) : undefined
  if (!def) return null
  const meta = RARITIES[def.rarity]
  const seasons = (def.seasons ?? []).map((s) => SEASONS[s].name).join(' · ')
  const periods = (def.periods ?? []).map((p) => DAY_PERIOD_LABEL[p]).join(' · ')
  const baits = BAITS.filter((b) => b.favors[def.id]).map((b) => b.name).join(' / ')

  return (
    <div className="pointer-events-auto absolute right-3 top-20 z-20 w-[min(17rem,calc(100%-1.5rem))] overflow-hidden rounded-xl border border-tide/30 bg-[#072226]/92 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-md sm:right-5 sm:top-24">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.24em] text-foam/40">
          <Eye className="size-3" />
          水下观察
        </span>
        <button
          type="button"
          onClick={() => setObservedFish(null)}
          className="grid size-6 place-items-center rounded-full text-foam/40 hover:bg-white/8 hover:text-foam"
          aria-label="关闭观察"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="relative h-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_52%_45%,rgba(94,216,201,0.16),transparent_68%)]" />
        <FishArt rarity={def.rarity} defId={def.id} className="relative h-full w-full" />
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-wide text-foam">{def.name}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
            style={{ background: meta.soft, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
          {def.desc}
        </p>
        <div className="mt-2 flex flex-col gap-1 text-[9.5px] text-foam/45">
          {seasons && <span>季节 · {seasons}</span>}
          {periods && <span>时段 · {periods}</span>}
          {baits && <span>偏爱 · {baits}</span>}
          <span className="tnum">
            水深 · {def.minDepth.toFixed(1)}–{def.maxDepth.toFixed(1)} m
          </span>
        </div>
      </div>
    </div>
  )
}

function ToolDock({ compact = false }: { compact?: boolean }) {
  const activeTool = useGameStore((s) => s.activeTool)
  const tools = useGameStore((s) => s.tools)
  const toolVariants = useGameStore((s) => s.toolVariants)
  const variantAmmo = useGameStore((s) => s.variantAmmo)
  const trapCount = useGameStore((s) => s.traps.length)
  const setActiveTool = useGameStore((s) => s.setActiveTool)

  return (
    <div className={cn('pointer-events-auto flex items-end', compact ? 'gap-1.5' : 'gap-2')}>
      {CAPTURE_TOOLS.map((tool, index) => {
        const state = tools[tool.id]
        const Icon = TOOL_ICONS[tool.id]
        const active = activeTool === tool.id
        const broken = state.wear <= 0
        const variant = tool.id === 'trap' ? undefined : variantById(toolVariants[tool.id])
        const ammo = variant && variant.ammoMax > 0 ? (variantAmmo[variant.id] ?? 0) : null
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActiveTool(tool.id)}
            title={`${variant?.name ?? tool.title} · Lv${state.level}${ammo !== null ? ` · 弹药 ${ammo}` : ''}`}
            className={cn(
              'glass relative flex flex-col rounded-xl border transition-all active:translate-y-px',
              compact ? 'w-11 items-center gap-1 px-1.5 py-1.5' : 'w-[4.6rem] gap-1 px-2 py-2',
              active ? 'bg-foam/10' : 'opacity-70 hover:opacity-100',
            )}
            style={
              active
                ? {
                    borderColor: `${tool.color}99`,
                    boxShadow: `0 0 26px -10px ${tool.color}`,
                  }
                : undefined
            }
          >
            <div className={cn('flex w-full items-center', compact ? 'justify-center' : 'justify-between')}>
              <Icon
                className={cn(compact ? 'size-5' : 'size-4')}
                style={{ color: active ? tool.color : 'rgba(243,238,226,0.66)' }}
              />
              {!compact && (
                <span className="tnum text-[8.5px] tracking-wide text-foam/40">Lv{state.level}</span>
              )}
            </div>
            {!compact && (
              <span className={cn('text-[10px] font-medium', active ? 'text-foam' : 'text-foam/55')}>
                {variant?.name ?? tool.name}
              </span>
            )}
            <Bar
              value={state.wear}
              color={broken ? '#e2685a' : tool.color}
              className={cn('w-full', compact ? 'h-[3px]' : 'h-1')}
            />
            {!compact && (
              <span className="absolute -left-1 -top-1.5 grid size-4 place-items-center rounded-full border border-foam/15 bg-abyss/90 text-[8.5px] font-semibold text-foam/50">
                {index + 1}
              </span>
            )}
            {compact && ammo !== null && (
              <span
                className="tnum absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 text-[8px] font-bold text-abyss"
                style={{ background: ammo > 0 ? tool.color : '#e2685a' }}
              >
                {ammo}
              </span>
            )}
            {compact && tool.id === 'trap' && trapCount > 0 && (
              <span className="tnum absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-gold px-0.5 text-[8px] font-bold text-abyss">
                {trapCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function CaptureReticle() {
  const target = useGameStore((s) => s.captureTarget)
  const activeTool = useGameStore((s) => s.activeTool)
  const tool = useGameStore((s) => s.tools[s.activeTool])
  const toolVariants = useGameStore((s) => s.toolVariants)
  const variantAmmo = useGameStore((s) => s.variantAmmo)
  const bagCount = useGameStore((s) => s.bag.length)
  const capacity = useGameStore((s) => bagCapacity(s))
  const modal = useGameStore((s) => isModalOpen(s))
  const def = target?.defId ? fishById(target.defId) : undefined
  const meta = def ? RARITIES[def.rarity] : null
  const toolDef = CAPTURE_TOOLS.find((t) => t.id === activeTool)
  const variant = activeTool === 'trap' ? undefined : variantById(toolVariants[activeTool])
  const stats = variantStats(toolStats(activeTool, tool.level), variant)
  const ammo = variant && variant.ammoMax > 0 ? (variantAmmo[variant.id] ?? 0) : null
  const color = meta?.color ?? variant?.color ?? toolDef?.color ?? '#6fe0cf'
  const locked = Boolean(target && (target.defId || activeTool === 'trap'))

  if (modal) return null

  const reason = !target
    ? '对准鱼群'
    : tool.wear <= 0
      ? '工具损坏 · 回码头修理'
      : ammo === 0
        ? '弹药耗尽 · 回渔具铺补给'
        : bagCount >= capacity
        ? '鱼篓已满 · 回码头卸货'
        : def && target.distance > stats.range
          ? `再靠近 ${(target.distance - stats.range).toFixed(1)}m`
          : !target.ready
            ? activeTool === 'trap'
              ? '鱼笼装填中…'
              : '收势中…'
            : activeTool === 'trap'
              ? '按 E / 点击布设鱼笼'
              : '按 E / 点击出手'

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
        style={{ color }}
      >
        <div className="relative grid size-16 place-items-center">
          <span
            className="absolute inset-0 rounded-full border transition-all duration-200"
            style={{
              borderColor: locked ? `${color}bb` : 'rgba(243,238,226,0.28)',
              boxShadow: locked ? `0 0 26px -8px ${color}, inset 0 0 16px -10px ${color}` : 'none',
            }}
          />
          <span
            className={cn(
              'absolute inset-[9px] rounded-full border border-dashed',
              locked && 'animate-[spin_8s_linear_infinite]',
            )}
            style={{
              borderColor: locked ? `${color}55` : 'rgba(243,238,226,0.14)',
            }}
          />
          <span
            className="size-1.5 rounded-full"
            style={{ background: locked ? color : 'rgba(243,238,226,0.5)' }}
          />
          <span className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2" style={{ background: locked ? color : 'rgba(243,238,226,0.35)' }} />
          <span className="absolute bottom-0 left-1/2 h-2.5 w-px -translate-x-1/2" style={{ background: locked ? color : 'rgba(243,238,226,0.35)' }} />
          <span className="absolute left-0 top-1/2 h-px w-2.5 -translate-y-1/2" style={{ background: locked ? color : 'rgba(243,238,226,0.35)' }} />
          <span className="absolute right-0 top-1/2 h-px w-2.5 -translate-y-1/2" style={{ background: locked ? color : 'rgba(243,238,226,0.35)' }} />
        </div>
      </div>

      <div className="absolute left-1/2 top-[calc(50%+46px)] flex w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 flex-col items-center gap-1.5">
        {target ? (
          <div
            className="glass flex items-center gap-2 rounded-full py-1 pl-2.5 pr-3"
            style={{ borderColor: `${color}55` }}
          >
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
            <span className="truncate text-[12px] font-medium text-foam">{target.label}</span>
            {meta && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold"
                style={{ background: meta.soft, color: meta.color }}
              >
                {meta.label}
              </span>
            )}
            {def && (
              <span className="tnum shrink-0 text-[9.5px] text-foam/45">
                {target.distance.toFixed(1)}m / {stats.range}m
              </span>
            )}
            {toolDef && (
              <span className="flex shrink-0 items-center gap-1 text-[9px] text-foam/40">
                {toolDef.id === 'trap' ? (
                  <PackageOpen className="size-3" />
                ) : toolDef.id === 'net' ? (
                  <Network className="size-3" />
                ) : (
                  <Crosshair className="size-3" />
                )}
                {variant?.name ?? toolDef.name}
              </span>
            )}
          </div>
        ) : (
          <div className="glass rounded-full px-3 py-1 text-[11px] text-foam/45">
            摆动准星，对准一条鱼
          </div>
        )}
        <div
          className={cn(
            'text-[10px] font-medium tracking-[0.08em]',
            target?.ready ? 'text-gold/90' : 'text-foam/45',
          )}
        >
          {reason}
        </div>
      </div>
    </div>
  )
}

function ChestPrompt() {
  const prompt = useGameStore((s) => s.chestPrompt)
  if (!prompt) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(50%+124px)] z-30 -translate-x-1/2">
      <div className="glass flex items-center gap-2 rounded-full border-gold/45 bg-gold/10 px-3 py-1.5 text-[11.5px] font-medium text-gold shadow-[0_0_34px_-10px_rgba(242,193,92,0.85)]">
        <PackageOpen className="size-3.5" />
        <span>{prompt}</span>
        <kbd className="rounded border border-gold/45 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold">
          F
        </kbd>
      </div>
    </div>
  )
}

function TrapStatus() {
  const traps = useGameStore((s) => s.traps)
  const now = useNow(1000)
  if (!traps.length) return null

  return (
    <div className="pointer-events-none absolute bottom-44 right-3 z-20 w-40 sm:bottom-4 sm:right-5 sm:w-52">
      <div className="glass rounded-xl px-2.5 py-2">
        <div className="mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-foam/40">
          <span className="flex items-center gap-1">
            <PackageOpen className="size-3" />
            鱼笼
          </span>
          <span className="tnum">{traps.length}/3</span>
        </div>
        <div className="space-y-1">
          {traps.map((trap, index) => {
            const remaining = Math.max(0, trap.readyAt - now)
            const ready = remaining <= 0
            return (
              <div key={trap.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[10px] text-foam/55">
                  <span className="tnum text-foam/35">#{index + 1}</span>
                  <span className="tnum text-foam/30">{trap.depth.toFixed(1)}m</span>
                </span>
                <span
                  className={cn(
                    'tnum flex items-center gap-1 text-[9.5px]',
                    ready ? 'text-tide' : 'text-foam/45',
                  )}
                >
                  {ready ? (
                    <>
                      <span className="size-1 animate-pulse rounded-full bg-tide" />
                      就绪
                    </>
                  ) : (
                    <>
                      <Timer className="size-2.5" />
                      {Math.ceil(remaining / 1000)}s
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 border-t border-white/6 pt-1 text-[8.5px] leading-relaxed text-foam/30">
          游到笼子 4m 内自动收笼
        </div>
      </div>
    </div>
  )
}

export function UnderwaterHud() {
  const isTouch = useIsTouch()
  const mode = useGameStore((s) => s.underwaterMode)
  const cycleUnderwaterMode = useGameStore((s) => s.cycleUnderwaterMode)
  const setUnderwater = useGameStore((s) => s.setUnderwater)
  const depth = useGameStore((s) => s.depth)
  const activeTool = useGameStore((s) => s.activeTool)
  const tool = useGameStore((s) => s.tools[s.activeTool])
  const bagCount = useGameStore((s) => s.bag.length)
  const capacity = useGameStore((s) => bagCapacity(s))
  const toolVariants = useGameStore((s) => s.toolVariants)
  const variantAmmo = useGameStore((s) => s.variantAmmo)
  const toolDef = CAPTURE_TOOLS.find((t) => t.id === activeTool)
  const variant = activeTool === 'trap' ? undefined : variantById(toolVariants[activeTool])
  const ammo = variant && variant.ammoMax > 0 ? (variantAmmo[variant.id] ?? 0) : null
  const [sprint, setSprint] = useState(false)

  useEffect(() => {
    return () => {
      input.setTouchVertical(0)
      input.setTouchSprint(false)
    }
  }, [])

  const toggleSprint = () => {
    setSprint((prev) => {
      input.setTouchSprint(!prev)
      return !prev
    })
  }

  const hold = (value: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      input.setTouchVertical(value)
    },
    onPointerUp: () => input.setTouchVertical(0),
    onPointerCancel: () => input.setTouchVertical(0),
    onPointerLeave: () => input.setTouchVertical(0),
  })

  return (
    <>
      <ObservedFish />
      <CaptureReticle />
      <ChestPrompt />
      <TrapStatus />

      {isTouch ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Joystick label="游动" />

          <div className="flex flex-col items-center gap-2">
            <ToolDock compact />

            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  {...hold(1)}
                  className="glass pointer-events-auto grid size-12 touch-none select-none place-items-center rounded-full text-foam active:scale-95"
                  aria-label="上浮"
                >
                  <ArrowUp className="size-4.5" />
                </button>
                <button
                  type="button"
                  {...hold(-1)}
                  className="glass pointer-events-auto grid size-12 touch-none select-none place-items-center rounded-full text-foam active:scale-95"
                  aria-label="下潜"
                >
                  <ArrowDown className="size-4.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => input.tapCapture()}
                className="pointer-events-auto grid size-16 touch-none select-none place-items-center rounded-full border-2 bg-abyss/55 text-foam shadow-[0_14px_36px_-14px_rgba(0,0,0,0.9)] backdrop-blur-md transition-transform active:scale-95"
                style={{
                  borderColor: `${toolDef?.color ?? '#6fe0cf'}aa`,
                  boxShadow: `0 0 30px -12px ${toolDef?.color ?? '#6fe0cf'}`,
                }}
                aria-label="捕捞"
              >
                <Crosshair
                  className="size-7"
                  style={{ color: tool.wear > 0 ? toolDef?.color ?? '#6fe0cf' : '#e2685a' }}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSprint}
                className={cn(
                  'glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium active:scale-95',
                  sprint ? 'border-gold/50 text-gold' : 'text-foam/70',
                )}
              >
                <Zap className="size-3.5" />
                冲刺
              </button>
              <button
                type="button"
                onClick={cycleUnderwaterMode}
                className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium text-foam/70 active:scale-95"
              >
                <ScanEye className="size-3.5" />
                {UNDERWATER_MODE_LABEL[mode]}
              </button>
              <button
                type="button"
                onClick={() => setUnderwater(false)}
                className="glass pointer-events-auto flex items-center gap-1.5 rounded-full border-gold/40 px-3 py-2 text-[11px] font-medium text-gold active:scale-95"
              >
                <Waves className="size-3.5" />
                上浮
              </button>
            </div>
            <div className="tnum text-[9.5px] tracking-[0.16em] text-foam/35">
              深度 {depth.toFixed(1)}m · {variant?.name ?? toolDef?.name}磨损 {Math.round(tool.wear)}%
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
            <div className="flex flex-col items-center gap-1.5">
              <ToolDock />
              <div className="tnum text-[9px] tracking-[0.18em] text-foam/30">
                {variant?.name ?? toolDef?.name}磨损 {Math.round(tool.wear)}% · 鱼篓 {bagCount}/
                {capacity}
                {ammo !== null && ` · 弹药 ${ammo}/${variant?.ammoMax}`}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-5 z-20 hidden lg:block">
            <div className="glass rounded-xl px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-foam/40">
                <Keyboard className="size-3" />
                水下操作 · {UNDERWATER_MODE_LABEL[mode]}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {HINTS.map((h) => (
                  <div key={h.label} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {h.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-foam/18 bg-foam/8 px-1.5 py-0.5 text-[9px] font-semibold text-foam/65"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-[10.5px] text-muted-foreground">{h.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 text-[9.5px] text-foam/30">氧气耗尽会自动浮回水面</div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
