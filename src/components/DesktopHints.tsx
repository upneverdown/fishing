import { Keyboard } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

const HINTS = [
  { keys: ['W', 'A', 'S', 'D'], label: '划船' },
  { keys: ['Shift'], label: '加速冲刺' },
  { keys: ['Space'], label: '蓄力 / 抛竿' },
  { keys: ['按住', 'Space'], label: '收线' },
  { keys: ['F'], label: '抽动假饵' },
  { keys: ['E'], label: '码头卖鱼' },
  { keys: ['G'], label: '回小镇' },
  { keys: ['I'], label: '鱼篓' },
  { keys: ['B'], label: '皮肤商店' },
  { keys: ['R'], label: '鱼饵' },
  { keys: ['T'], label: '季节' },
  { keys: ['V'], label: '潜入水下' },
  { keys: ['Z'], label: '挥刀' },
  { keys: ['X'], label: '鱼枪' },
  { keys: ['Y'], label: '抛锚' },
  { keys: ['L'], label: '探照灯' },
  { keys: ['H'], label: '船载烤鱼' },
  { keys: ['Q'], label: '切换工具型号' },
]

export function DesktopHints() {
  const boss = useGameStore((s) => s.boss)
  const combatCamera = useGameStore((s) => s.combatCamera)
  const hints = HINTS.map((hint) =>
    hint.keys[0] === 'V'
      ? {
          ...hint,
          label: boss ? (combatCamera ? '解除战斗视角' : '锁定战斗视角') : '潜入水下',
        }
      : hint,
  )

  return (
    <div className="pointer-events-none absolute bottom-4 left-5 z-20 hidden sm:block">
      <div className="glass rounded-xl px-3 py-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-foam/40">
          <Keyboard className="size-3" />
          操作
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {hints.map((h) => (
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
      </div>
    </div>
  )
}
