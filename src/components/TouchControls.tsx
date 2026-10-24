import { useCallback, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Cast,
  Fish,
  RotateCcw,
} from 'lucide-react'
import { input } from '@/game/input'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const RADIUS = 44

const ACTION_META = {
  idle: { label: '抛竿', icon: Cast, hint: '按住蓄力' },
  charging: { label: '松开', icon: ArrowUpRight, hint: '抛出鱼线' },
  casting: { label: '…', icon: Cast, hint: '' },
  waiting: { label: '收回', icon: RotateCcw, hint: '重新抛竿' },
  bite: { label: '提竿', icon: Fish, hint: '就是现在' },
  fight: { label: '收线', icon: ArrowDownToLine, hint: '按住不放' },
  landed: { label: '…', icon: Fish, hint: '' },
} as const

export function Joystick({ label = '划船' }: { label?: string }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const moveTo = useCallback((clientX: number, clientY: number) => {
    const el = baseRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy) || 1
    const clamped = Math.min(len, RADIUS)
    const nx = (dx / len) * (clamped / RADIUS)
    const ny = (dy / len) * (clamped / RADIUS)
    setKnob({ x: nx * RADIUS, y: ny * RADIUS })
    input.setJoystick(nx, ny, true)
  }, [])

  const release = useCallback(() => {
    pointerId.current = null
    setKnob({ x: 0, y: 0 })
    input.setJoystick(0, 0, false)
  }, [])

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        pointerId.current = e.pointerId
        moveTo(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (pointerId.current !== e.pointerId) return
        moveTo(e.clientX, e.clientY)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      className="pointer-events-auto touch-none select-none"
      aria-label="划船摇杆"
    >
      <div className="glass relative grid size-[7.5rem] place-items-center rounded-full border-foam/15 bg-abyss/45">
        <span className="absolute inset-3 rounded-full border border-dashed border-foam/12" />
        <span className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-foam/25" />
        <span className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-foam/25" />
        <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-foam/25" />
        <span className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-foam/25" />
        <div
          className="grid size-14 place-items-center rounded-full border border-foam/25 bg-gradient-to-b from-foam/25 to-foam/10 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.7)] transition-transform duration-75"
          style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
        >
          <span className="size-3 rounded-full bg-foam/40" />
        </div>
      </div>
      <div className="mt-1.5 text-center text-[10px] tracking-[0.2em] text-foam/35">{label}</div>
    </div>
  )
}

export function TouchControls() {
  const phase = useGameStore((s) => s.phase)
  const nearDock = useGameStore((s) => s.nearDock)
  const fight = useGameStore((s) => s.fight)
  const meta = ACTION_META[phase]
  const Icon = meta.icon
  const disabled = phase === 'casting' || phase === 'landed'
  const danger = (fight?.tension ?? 0) >= 78
  const active = phase === 'bite' || phase === 'fight' || phase === 'charging'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Joystick />

      <div className="flex flex-col items-center gap-3">
        {nearDock && (
          <button
            type="button"
            onClick={() => input.tapInteract()}
            className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-medium text-gold shadow-lg active:translate-y-px"
          >
            <Banknote className="size-3.5" />
            卖鱼
          </button>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onPointerDown={(e) => {
              if (disabled) return
              e.preventDefault()
              input.pressAction('touch')
            }}
            onPointerUp={() => input.releaseAction('touch')}
            onPointerCancel={() => input.releaseAction('touch')}
            className={cn(
              'pointer-events-auto grid size-[5.5rem] touch-none select-none place-items-center rounded-full border text-center transition-[transform,background-color,border-color] duration-150 active:scale-95 disabled:opacity-40',
              phase === 'bite'
                ? 'border-gold/70 bg-gold text-abyss shadow-[0_0_40px_-6px_rgba(242,193,92,0.75)]'
                : 'glass bg-abyss/55 text-foam',
              danger && phase === 'fight' && 'border-destructive/70 text-destructive',
            )}
          >
            <span className="flex flex-col items-center gap-1">
              <Icon className="size-5" />
              <span className="text-[12px] font-semibold tracking-[0.08em]">{meta.label}</span>
            </span>
          </button>
          <span
            className={cn(
              'text-[9.5px] tracking-[0.16em]',
              active ? 'text-gold/80' : 'text-foam/35',
            )}
          >
            {meta.hint}
          </span>
        </div>
      </div>
    </div>
  )
}
