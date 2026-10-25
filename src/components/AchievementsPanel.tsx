import { useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Check,
  Compass,
  Coins,
  Lock,
  Package,
  Ship,
  Sparkles,
  Swords,
  Trophy,
  Waves,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  achievementTotal,
  formatAchievementValue,
  type AchievementIconId,
} from '@/game/achievements/catalog'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

const ICONS: Record<AchievementIconId, LucideIcon> = {
  swords: Swords,
  waves: Waves,
  ship: Ship,
  sparkles: Sparkles,
  compass: Compass,
  chest: Package,
}

export function AchievementsPanel() {
  const open = useGameStore((s) => s.achievementsOpen)
  const setOpen = useGameStore((s) => s.setAchievementsOpen)
  const achievements = useGameStore((s) => s.achievements)
  const relics = useGameStore((s) => s.relics)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'j') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const { unlocked, total } = achievementTotal(achievements)
  const blueprints = relics.filter((r) => r === 'pirate-blueprint').length
  const otherRelics = relics.filter((r) => r !== 'pirate-blueprint').length

  return (
    <div className="fixed inset-0 z-[76] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="关闭成就"
        className="absolute inset-0 bg-abyss/72 backdrop-blur-sm"
      />
      <motion.section
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gold/30 bg-[#0a1c1c]/97 shadow-[0_40px_120px_-34px_rgba(0,0,0,1)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 12% -8%, rgba(242,193,92,0.2), transparent 50%), radial-gradient(ellipse at 90% 8%, rgba(111,224,207,0.1), transparent 46%)',
          }}
        />

        <header className="relative flex items-start gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/12 text-gold">
            <Trophy className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold tracking-[0.12em] text-foam">成就</h2>
            <p className="mt-0.5 text-[10px] text-foam/40">
              长线航程的勋章 · 达成后自动发放金币奖励
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
              {unlocked} / {total}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-full text-foam/40 transition-colors hover:bg-foam/8 hover:text-foam"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-tide via-gold to-gold transition-[width] duration-500"
              style={{ width: `${total ? (unlocked / total) * 100 : 0}%` }}
            />
          </div>

          {ACHIEVEMENT_CATEGORIES.map((cat) => {
            const list = ACHIEVEMENTS.filter((a) => a.category === cat.id)
            const got = list.filter((a) => (achievements[a.id]?.unlockedAt ?? 0) > 0).length
            return (
              <section key={cat.id} className="mb-4 last:mb-0">
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: cat.accent, boxShadow: `0 0 8px ${cat.accent}88` }}
                  />
                  <span className="text-[10px] font-semibold tracking-[0.24em] text-foam/55">
                    {cat.label}
                  </span>
                  <span className="text-[9px] text-foam/25">
                    {got}/{list.length}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                <div className="grid gap-1.5">
                  {list.map((def) => {
                    const entry = achievements[def.id] ?? { progress: 0, unlockedAt: 0 }
                    const done = entry.unlockedAt > 0
                    const masked = Boolean(def.hidden) && !done
                    const pct = Math.min(100, (entry.progress / def.target) * 100)
                    const Icon = ICONS[def.icon]
                    return (
                      <div
                        key={def.id}
                        className={cn(
                          'relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                          done
                            ? 'border-gold/35 bg-gold/8'
                            : masked
                              ? 'border-white/8 bg-black/25'
                              : 'border-white/8 bg-white/[0.025]',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-9 shrink-0 place-items-center rounded-lg border',
                            done
                              ? 'border-gold/45 bg-gold/15 text-gold'
                              : 'border-white/10 bg-white/5 text-foam/35',
                          )}
                        >
                          {masked ? <Lock className="size-4" /> : <Icon className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'truncate text-[12.5px] font-semibold',
                                done ? 'text-gold' : masked ? 'text-foam/40' : 'text-foam/85',
                              )}
                            >
                              {masked ? '？？？' : def.name}
                            </span>
                            {def.hidden && (
                              <span className="shrink-0 rounded-full bg-[#b58cff]/12 px-1.5 py-px text-[7.5px] font-semibold tracking-[0.08em] text-[#b58cff]/80">
                                隐藏
                              </span>
                            )}
                            {done && (
                              <span className="ml-auto hidden shrink-0 text-[8.5px] text-gold/45 sm:block">
                                {new Date(entry.unlockedAt).toLocaleDateString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[9.5px] text-foam/35">
                            {masked ? '隐藏成就 · 达成后揭晓' : def.desc}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-[width] duration-500',
                                  done ? 'bg-gold' : 'bg-tide/70',
                                )}
                                style={{ width: `${masked ? 0 : pct}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                'tnum shrink-0 text-[8.5px]',
                                done ? 'text-gold/70' : 'text-foam/35',
                              )}
                            >
                              {masked ? '神秘' : formatAchievementValue(def, entry.progress)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-semibold',
                            done
                              ? 'bg-gold/15 text-gold'
                              : 'bg-white/5 text-foam/30',
                          )}
                        >
                          {done ? <Check className="size-3" /> : <Coins className="size-3" />}
                          {def.reward}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {(blueprints > 0 || otherRelics > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/22 px-3 py-2 text-[9.5px] text-foam/45">
              <span className="font-semibold tracking-[0.14em] text-foam/35">沉船藏品</span>
              {blueprints > 0 && (
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-gold/80">
                  海盗图纸 ×{blueprints}
                </span>
              )}
              {otherRelics > 0 && (
                <span className="rounded-full bg-tide/10 px-2 py-0.5 text-tide/80">
                  稀有打捞物 ×{otherRelics}
                </span>
              )}
            </div>
          )}
        </div>

        <footer className="relative border-t border-white/8 px-4 py-2 text-center text-[8px] tracking-[0.18em] text-foam/22">
          按 J 或 ESC 关闭 · 成就进度随存档保留
        </footer>
      </motion.section>
    </div>
  )
}
