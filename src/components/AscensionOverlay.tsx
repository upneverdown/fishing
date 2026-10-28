import { motion } from 'motion/react'
import { Sparkles, Waves } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

/** 飞升过场：通天河道逆流而上 + 穿云白屏 */
export function AscensionOverlay() {
  const hud = useGameStore((s) => s.ascension)
  if (!hud) return null

  if (hud.phase === 'crossing') {
    const ramp = hud.progress < 0.5 ? hud.progress / 0.5 : (1 - hud.progress) / 0.5
    const opacity = Math.min(1, Math.max(0, ramp)) ** 0.75
    return (
      <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
        <motion.div
          animate={{ opacity }}
          transition={{ duration: 0.05 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#ffffff_28%,#fff2d4_58%,#ffd9a8_100%)]"
        />
      </div>
    )
  }

  const altitude = Math.max(0, hud.altitude)
  return (
    <div className="pointer-events-none absolute inset-0 z-[75] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(150,215,255,0.16),transparent_60%)]" />

      <div className="absolute left-1/2 top-[12%] flex -translate-x-1/2 flex-col items-center text-center">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.44em] text-[#bfe9ff]/80">
          <Sparkles className="size-3" />
          通天河道
        </span>
        <h2 className="mt-2 text-[22px] font-semibold tracking-[0.26em] text-[#eaf7ff] drop-shadow-[0_0_18px_rgba(120,210,255,0.55)]">
          天界之门已开
        </h2>
        <p className="mt-1 text-[11.5px] tracking-[0.2em] text-foam/70">逆流而上 · 莫回首</p>
      </div>

      <div className="absolute bottom-[14%] left-1/2 w-[min(30rem,80vw)] -translate-x-1/2">
        <div className="flex items-center justify-between text-[10px] tracking-[0.18em] text-[#cbeeff]/70">
          <span className="flex items-center gap-1">
            <Waves className="size-3" />
            天门
          </span>
          <span className="tnum">{Math.round(hud.progress * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#7fd8ff,#c9a6ff,#ffe1a8)] transition-[width] duration-100"
            style={{ width: `${Math.round(hud.progress * 100)}%` }}
          />
        </div>
        <div className="mt-1.5 text-center text-[10.5px] tnum tracking-[0.16em] text-foam/55">
          离水 {altitude.toFixed(1)} 丈
        </div>
      </div>
    </div>
  )
}
