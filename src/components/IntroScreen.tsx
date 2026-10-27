import { ArrowRight, Keyboard, Smartphone, Sparkles, WavesHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { FishArt } from '@/components/FishArt'
import { useGameStore } from '@/store/useGameStore'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { input } from '@/game/input'

const DESKTOP_CONTROLS = [
  { keys: 'W A S D', text: '划船穿行海湾' },
  { keys: '空格', text: '按住蓄力 · 松手抛竿' },
  { keys: '按住空格', text: '咬钩后收线' },
  { keys: 'E / I', text: '码头卖鱼 / 查看鱼篓' },
  { keys: 'Shift', text: '按住加速冲刺 · 船尾激起浪花' },
  { keys: 'R / T', text: '切换鱼饵 / 四季' },
  { keys: 'B / K', text: '皮肤商店 / 船员名册' },
  { keys: 'V / F', text: '潜入水下 / 切换视角' },
]

const TOUCH_CONTROLS = [
  { keys: '左侧摇杆', text: '划船穿行海湾' },
  { keys: '右侧按钮', text: '按住蓄力 · 松手抛竿' },
  { keys: '提竿 · 收线', text: '咬钩后按住按钮' },
  { keys: '卖鱼', text: '靠近码头自动出现' },
  { keys: '左上角图标', text: '切换鱼饵与四季' },
  { keys: '潜水', text: '水下观察鱼群 · 氧气耗尽自动上浮' },
]

export function IntroScreen({ onStart }: { onStart: () => void }) {
  const isTouch = useIsTouch()
  const controls = isTouch ? TOUCH_CONTROLS : DESKTOP_CONTROLS
  const money = useGameStore((s) => s.money)
  const bagCount = useGameStore((s) => s.bag.length)
  const hasProgress = useGameStore((s) => s.totalEarned > 0 || s.bag.length > 0)

  const start = () => {
    input.clear()
    useGameStore.getState().setStarted(true)
    onStart()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-40 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_18%,rgba(18,58,61,0.55),rgba(7,27,29,0.94)_62%,rgba(7,27,29,0.98))] px-5 py-8 backdrop-blur-[2px]"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 22 }}
          className="relative"
        >
          <span className="absolute inset-0 -z-10 rounded-full bg-gold/20 blur-3xl" />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FishArt rarity="legendary" defId="redfin" className="h-28 w-44 drop-shadow-[0_12px_30px_rgba(0,0,0,0.5)]" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.42em] text-gold/70"
        >
          <WavesHorizontal className="size-3.5" />
          Low-poly fishing
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-2 bg-gradient-to-b from-foam via-foam to-foam/55 bg-clip-text text-[clamp(2.6rem,10vw,3.6rem)] font-bold leading-none tracking-[0.12em] text-transparent"
        >
          潮汐渔歌
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 max-w-[22rem] text-[12.5px] leading-relaxed text-muted-foreground"
        >
          晨雾未散，划向海湾深处。抛一竿，等一条属于你的鱼，
          再把它带回老码头，换成叮当作响的银钱。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {controls.map((c) => (
            <div
              key={c.keys}
              className="glass flex items-center gap-2.5 rounded-lg px-3 py-2 text-left"
            >
              <span className="shrink-0 rounded border border-foam/16 bg-foam/8 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide text-foam/70">
                {c.keys}
              </span>
              <span className="text-[11px] text-foam/65">{c.text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="mt-6 flex w-full flex-col items-center gap-3"
        >
          <Button
            size="lg"
            onClick={start}
            className="group h-12 w-full max-w-[260px] rounded-full bg-gradient-to-b from-[#f6cf7a] to-[#e7ab3c] text-[15px] font-semibold text-[#1a2a26] shadow-[0_14px_40px_-14px_rgba(242,193,92,0.75)] hover:from-[#f8d58c] hover:to-[#ecb44a]"
          >
            <Sparkles className="size-4 transition-transform group-hover:rotate-12" />
            启航
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <div className="flex items-center gap-2 text-[10px] text-foam/35">
            {isTouch ? <Smartphone className="size-3" /> : <Keyboard className="size-3" />}
            {isTouch ? '触屏操作 · 竖屏横屏皆可' : '键盘鼠标操作 · 双端自适应'}
            <span className="text-foam/20">·</span>
            <span>进度自动保存</span>
          </div>
          {hasProgress && (
            <div className="tnum rounded-full border border-foam/12 bg-foam/5 px-3 py-1 text-[10px] text-foam/45">
              读取存档 · 现有 ¥{money.toLocaleString('zh-CN')} · 鱼篓里还有 {bagCount} 条鱼
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
