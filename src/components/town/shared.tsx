import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(id)
  }, [interval])
  return now
}

export function CoinPill({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-1 rounded-full bg-gold/12 px-2 py-0.5 text-[11px] font-semibold text-gold',
        className,
      )}
    >
      <Coins className="size-3" />¥{value.toLocaleString('zh-CN')}
    </span>
  )
}

export function Chip({
  children,
  color,
  soft,
  className,
}: {
  children: React.ReactNode
  color?: string
  soft?: string
  className?: string
}) {
  return (
    <span
      className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-medium', className)}
      style={{ color, background: soft ?? 'rgba(243,238,226,0.07)' }}
    >
      {children}
    </span>
  )
}

export function Bar({ value, color = '#6fe0cf', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-foam/10', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }}
      />
    </div>
  )
}

export function Empty({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-foam/5 text-foam/25">{icon}</div>
      <div className="text-[12px] text-foam/55">{title}</div>
      {hint && <div className="max-w-[16rem] text-[10.5px] leading-relaxed text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function PanelHead({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[13px] font-semibold tracking-wide text-foam">{title}</div>
        {desc && <div className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{desc}</div>}
      </div>
      {right}
    </div>
  )
}
