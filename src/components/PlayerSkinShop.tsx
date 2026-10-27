import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Check, Coins, Shirt, X } from 'lucide-react'
import { PLAYER_SKINS } from '@/game/player/playerSkins'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/lib/utils'

export function PlayerSkinShop() {
  const open = useGameStore((s) => s.skinShopOpen)
  const setOpen = useGameStore((s) => s.setSkinShopOpen)
  const money = useGameStore((s) => s.money)
  const owned = useGameStore((s) => s.ownedPlayerSkins)
  const equipped = useGameStore((s) => s.playerSkin)
  const buy = useGameStore((s) => s.buyPlayerSkin)
  const equip = useGameStore((s) => s.equipPlayerSkin)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'b') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="关闭皮肤商店"
        className="absolute inset-0 bg-abyss/72 backdrop-blur-sm"
      />
      <motion.section
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gold/30 bg-[#081b1e]/97 shadow-[0_40px_120px_-34px_rgba(0,0,0,1)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 12% -8%, rgba(242,193,92,0.15), transparent 52%), radial-gradient(ellipse at 94% 4%, rgba(111,224,207,0.1), transparent 44%)',
          }}
        />

        <header className="relative flex items-start gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/12 text-gold">
            <Shirt className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold tracking-[0.12em] text-foam">皮肤商店</h2>
            <p className="mt-0.5 text-[10px] text-foam/40">
              海风裁缝铺 · 买下即刻换装，甲板上的你会同步变样
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
              <Coins className="size-3" />¥{money.toLocaleString('zh-CN')}
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
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAYER_SKINS.map((skin) => {
              const isOwned = owned.includes(skin.id)
              const isEquipped = equipped === skin.id
              const affordable = money >= skin.price
              return (
                <div
                  key={skin.id}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-xl border px-3 py-3 transition-colors',
                    isEquipped
                      ? 'border-gold/40 bg-gold/6'
                      : isOwned
                        ? 'border-tide/30 bg-tide/5'
                        : 'border-white/8 bg-white/[0.025]',
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                      background: `radial-gradient(ellipse at 8% 0%, ${skin.body}55, transparent 52%)`,
                    }}
                  />
                  <div className="relative flex items-start gap-2.5">
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-full border text-[16px] font-semibold"
                      style={{
                        background: `${skin.body}40`,
                        borderColor: `${skin.hood}99`,
                        color: skin.trim,
                      }}
                    >
                      {skin.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-foam">{skin.name}</span>
                        {isEquipped && (
                          <span className="flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-px text-[8px] font-semibold text-gold">
                            <Check className="size-2.5" />
                            穿着中
                          </span>
                        )}
                        {!isOwned && skin.price > 0 && (
                          <span className="rounded-full bg-white/8 px-1.5 py-px text-[8px] text-foam/50">
                            未解锁
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-relaxed text-foam/40">
                        {skin.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-2 flex items-center justify-between gap-2 rounded-lg bg-black/22 px-2 py-1.5">
                    <span className="flex items-center gap-1 text-[9.5px] font-medium text-foam/55">
                      {skin.price === 0 ? (
                        '默认外观'
                      ) : (
                        <>
                          <Coins className="size-3 text-gold/70" />¥{skin.price}
                        </>
                      )}
                    </span>
                    {isEquipped ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-semibold text-gold">
                        <Check className="size-3" />
                        使用中
                      </span>
                    ) : isOwned ? (
                      <button
                        type="button"
                        onClick={() => equip(skin.id)}
                        className="shrink-0 rounded-full bg-tide/15 px-2.5 py-1 text-[10px] font-semibold text-tide transition-colors hover:bg-tide/25"
                      >
                        换上
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => buy(skin.id)}
                        disabled={!affordable}
                        className={cn(
                          'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors',
                          affordable
                            ? 'bg-gold/15 text-gold hover:bg-gold/25'
                            : 'bg-white/5 text-foam/25',
                        )}
                      >
                        <Coins className="size-3" />
                        {affordable ? '购买' : '金币不足'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-3 rounded-xl border border-white/8 bg-black/22 px-3 py-2 text-[9.5px] leading-relaxed text-foam/35">
            提示：购买后自动换上，即时生效并随存档保留。战斗中（第三人称视角）也能看到你的新造型。
          </p>
        </div>

        <footer className="relative border-t border-white/8 px-4 py-2 text-center text-[8px] tracking-[0.18em] text-foam/22">
          按 B 或 ESC 关闭
        </footer>
      </motion.section>
    </div>
  )
}