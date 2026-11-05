import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Terminal } from 'lucide-react'
import type { Game } from '@/game/game'

function liveGame() {
  return (window as unknown as { __game?: Game }).__game ?? null
}

interface Line {
  kind: 'in' | 'out'
  text: string
}

/** F8 唤出的开发者作弊控制台：只在这台机器上手搓，不算正式玩法 */
export function DevConsole() {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: '输入 help 看指令表 · F8 收起' },
  ])
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F8') return
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function submit() {
    const raw = draft.trim()
    setDraft('')
    if (!raw) return
    const game = liveGame()
    const answer = game ? game.runDevCommand(raw) : '游戏还没跑起来 · 控制台无从下手'
    setLines((prev) => [...prev.slice(-40), { kind: 'in', text: raw }, { kind: 'out', text: answer }])
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 z-[88] w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#3d6b5f] bg-[#04100e]/94 shadow-[0_22px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-md"
        >
          <div className="flex items-center gap-2 border-b border-[#3d6b5f]/60 px-3 py-2">
            <Terminal className="size-3.5 text-accent" />
            <span className="text-[11px] uppercase tracking-[0.24em] text-accent/80">
              开发者作弊控制台
            </span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto rounded px-1.5 py-0.5 text-[10px] text-foam/40 transition-colors hover:text-foam"
            >
              F8 关闭
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed">
            {lines.map((line, i) => (
              <div
                key={i}
                className={line.kind === 'in' ? 'text-accent' : 'text-foam/65'}
              >
                {line.kind === 'in' ? `> ${line.text}` : line.text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-[#3d6b5f]/40 px-3 py-2">
            <span className="font-mono text-[12px] text-accent/70">$</span>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                e.stopPropagation()
              }}
              placeholder="summon_pig"
              spellCheck={false}
              className="flex-1 bg-transparent font-mono text-[12px] text-foam outline-none placeholder:text-foam/25"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
