import { useState } from 'react'
import {
  ArrowUpFromLine,
  Backpack,
  Coins,
  Compass,
  Droplets,
  Fish,
  Leaf,
  MapPinned,
  ScanEye,
  Ship,
<<<<<<< HEAD
  Trophy,
  Users,
  Video,
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react'
<<<<<<< HEAD
import { UNDERWATER_MODE_LABEL, bagCapacity, useGameStore } from '@/store/useGameStore'
=======
import {
  BAG_CAPACITY,
  UNDERWATER_MODE_LABEL,
  useGameStore,
} from '@/store/useGameStore'
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
import { useIsTouch } from '@/hooks/useMediaQuery'
import { audio } from '@/game/audio/gameAudio'
import { baitById } from '@/game/fishing/baitTable'
import { DAY_PERIOD_LABEL, SEASONS } from '@/game/world/seasons'
import { cn } from '@/lib/utils'

function MuteButton() {
  const [muted, setMuted] = useState(audio.muted)
  return (
    <button
      type="button"
      onClick={() => setMuted(audio.toggle())}
      className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-foam/25 hover:text-foam active:translate-y-px"
      aria-label={muted ? '开启声音' : '静音'}
      title={muted ? '开启声音' : '静音'}
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  )
}

function UnderwaterBar() {
  const oxygen = useGameStore((s) => s.oxygen)
  const depth = useGameStore((s) => s.depth)
  const zone = useGameStore((s) => s.zone)
  const mode = useGameStore((s) => s.underwaterMode)
  const setUnderwater = useGameStore((s) => s.setUnderwater)
  const cycleUnderwaterMode = useGameStore((s) => s.cycleUnderwaterMode)
  const setBaitOpen = useGameStore((s) => s.setBaitOpen)
  const setSeasonOpen = useGameStore((s) => s.setSeasonOpen)
<<<<<<< HEAD
  const setCrewOpen = useGameStore((s) => s.setCrewOpen)
  const toggleAchievements = useGameStore((s) => s.toggleAchievements)
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  const low = oxygen < 30

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'glass flex items-center gap-2 rounded-full py-1 pl-2 pr-3',
              low && 'border-destructive/45',
            )}
          >
            <span
              className={cn(
                'grid size-6 place-items-center rounded-full',
                low ? 'bg-destructive/18 text-destructive' : 'bg-tide/15 text-tide',
              )}
            >
              <Droplets className="size-3.5" />
            </span>
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[8px] uppercase tracking-[0.2em] text-foam/40">氧气</span>
                <span
                  className={cn(
                    'tnum text-[11px] font-semibold',
                    low ? 'text-destructive' : 'text-tide',
                  )}
                >
                  {Math.round(oxygen)}%
                </span>
              </div>
              <div className="mt-0.5 h-1 w-20 overflow-hidden rounded-full bg-foam/10 sm:w-24">
                <div
                  className={cn('h-full rounded-full', low ? 'bg-destructive' : 'bg-tide')}
                  style={{ width: `${oxygen}%` }}
                />
              </div>
            </div>
          </div>

          <div className="glass flex items-center gap-1.5 rounded-full px-2.5 py-1.5">
            <Waves className="size-3.5 text-tide/80" />
            <span className="tnum text-[11px] font-medium text-foam/85">
              {depth.toFixed(1)}<span className="text-[9px] text-foam/40">m</span>
            </span>
          </div>

          <div className="glass hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:flex">
            <Compass className="size-3.5 text-tide/80" />
            <span className="text-[11px] text-foam/80">{zone}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-1 text-[10px] text-foam/35">
          <ScanEye className="size-3" />
          {UNDERWATER_MODE_LABEL[mode]} · 点击鱼群可观察
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUnderwater(false)}
          className="glass pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border-gold/35 px-3 text-gold transition-colors hover:border-gold/55 active:translate-y-px"
          aria-label="浮回水面"
          title="浮回水面 (V)"
        >
          <ArrowUpFromLine className="size-4" />
          <span className="hidden text-[11px] font-medium sm:inline">上浮</span>
        </button>
        <button
          type="button"
          onClick={cycleUnderwaterMode}
          className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-tide/40 hover:text-tide active:translate-y-px"
          aria-label="切换水下视角"
          title="切换水下视角 (F)"
        >
          <ScanEye className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setBaitOpen(true)}
          className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-tide/40 hover:text-tide active:translate-y-px"
          aria-label="打开饵盒"
          title="饵盒 (R)"
        >
          <Fish className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setSeasonOpen(true)}
          className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-gold/40 hover:text-gold active:translate-y-px"
          aria-label="切换季节"
          title="季节 (T)"
        >
          <Leaf className="size-4" />
        </button>
<<<<<<< HEAD
        <button
          type="button"
          onClick={toggleAchievements}
          className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-gold/40 hover:text-gold active:translate-y-px"
          aria-label="打开成就"
          title="成就 (J)"
        >
          <Trophy className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCrewOpen(true)}
          className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-tide/40 hover:text-tide active:translate-y-px"
          aria-label="打开船员名册"
          title="船员 (K)"
        >
          <Users className="size-4" />
        </button>
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
        <div className="hidden sm:block">
          <MuteButton />
        </div>
      </div>
    </div>
  )
}

export function Hud() {
  const money = useGameStore((s) => s.money)
  const bagCount = useGameStore((s) => s.bag.length)
<<<<<<< HEAD
  const capacity = useGameStore((s) => bagCapacity(s))
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  const zone = useGameStore((s) => s.zone)
  const phase = useGameStore((s) => s.phase)
  const underwater = useGameStore((s) => s.underwater)
  const season = useGameStore((s) => s.season)
  const baitId = useGameStore((s) => s.baitId)
  const baitWear = useGameStore((s) => s.baitWear)
  const setBagOpen = useGameStore((s) => s.setBagOpen)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const setTownOpen = useGameStore((s) => s.setTownOpen)
  const setBaitOpen = useGameStore((s) => s.setBaitOpen)
  const setSeasonOpen = useGameStore((s) => s.setSeasonOpen)
  const setUnderwater = useGameStore((s) => s.setUnderwater)
<<<<<<< HEAD
  const boss = useGameStore((s) => s.boss)
  const combatCamera = useGameStore((s) => s.combatCamera)
  const toggleCombatCamera = useGameStore((s) => s.toggleCombatCamera)
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
  const toast = useGameStore((s) => s.toast)
  const isTouch = useIsTouch()

  const seasonProfile = SEASONS[season]
  const bait = baitById(baitId)

  if (underwater) return <UnderwaterBar />

  const openBag = () => {
    if (phase !== 'idle') {
      toast('先收线，再查看鱼篓')
      return
    }
    setBagOpen(true)
  }

  const openShop = () => {
    if (phase !== 'idle') {
      toast('先收线，再逛船坞')
      return
    }
    setShopOpen(true)
  }

  const openBait = () => {
    if (phase !== 'idle') {
      toast('先收线，再换鱼饵')
      return
    }
    setBaitOpen(true)
  }

  const openSeason = () => {
    if (phase !== 'idle') {
      toast('先收线，再切换季节')
      return
    }
    setSeasonOpen(true)
  }

  const dive = () => {
<<<<<<< HEAD
    if (boss) {
      toggleCombatCamera()
      return
    }
=======
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
    if (phase !== 'idle') {
      toast('先收线，再潜下水')
      return
    }
    setUnderwater(true)
  }

  const openTown = () => setTownOpen(true)

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
        <div className="flex flex-col gap-2">
          <div className="hidden items-center gap-2 pl-1 text-[10px] font-medium uppercase tracking-[0.38em] text-foam/40 sm:flex">
            <span className="size-1.5 rounded-full bg-gold/80" />
            Tidewater
          </div>
          <div className="flex items-center gap-2">
            <div className="glass flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3">
              <span className="grid size-6 place-items-center rounded-full bg-gold/15 text-gold">
                <Coins className="size-3.5" />
              </span>
              <span className="tnum text-[13px] font-semibold text-gold">¥{money.toLocaleString('zh-CN')}</span>
            </div>

            <button
              type="button"
              onClick={openBag}
              className="glass pointer-events-auto flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3 text-left transition-colors hover:border-foam/25 active:translate-y-px"
              aria-label="打开鱼篓"
            >
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full transition-colors',
<<<<<<< HEAD
                  bagCount >= capacity ? 'bg-destructive/20 text-destructive' : 'bg-tide/15 text-tide',
=======
                  bagCount >= BAG_CAPACITY ? 'bg-destructive/20 text-destructive' : 'bg-tide/15 text-tide',
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
                )}
              >
                <Fish className="size-3.5" />
              </span>
              <span className="tnum text-[13px] font-semibold text-foam">{bagCount}</span>
<<<<<<< HEAD
              <span className="tnum text-[11px] text-muted-foreground">/ {capacity}</span>
=======
              <span className="tnum text-[11px] text-muted-foreground">/ {BAG_CAPACITY}</span>
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={openSeason}
              className="glass pointer-events-auto flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[10.5px] text-foam/75 transition-colors hover:border-gold/35 hover:text-foam active:translate-y-px"
              aria-label="切换季节"
              title="切换季节 (T)"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: seasonProfile.accent, boxShadow: `0 0 8px ${seasonProfile.accent}` }}
              />
              {seasonProfile.name}
              <span className="hidden text-[9px] text-foam/35 sm:inline">
                {DAY_PERIOD_LABEL[seasonProfile.period]}
              </span>
            </button>

            <button
              type="button"
              onClick={openBait}
              className="glass pointer-events-auto flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[10.5px] text-foam/75 transition-colors hover:border-tide/35 hover:text-foam active:translate-y-px"
              aria-label="打开饵盒"
              title="鱼饵 (R)"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: bait?.color ?? '#c9755d' }}
              />
              {bait?.name ?? '鱼饵'}
              <span className="h-1 w-6 overflow-hidden rounded-full bg-foam/12">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    baitWear > 50 ? 'bg-tide' : baitWear > 20 ? 'bg-gold' : 'bg-destructive',
                  )}
                  style={{ width: `${baitWear}%` }}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={dive}
              className="glass pointer-events-auto flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[10.5px] text-foam/75 transition-colors hover:border-tide/35 hover:text-tide active:translate-y-px"
<<<<<<< HEAD
              aria-label={boss ? '切换战斗视角' : '潜入水下'}
              title={boss ? '切换战斗视角 (V)' : '潜入水下 (V)'}
            >
              {boss ? (
                <Video className={cn('size-3.5', combatCamera ? 'text-gold' : 'text-tide/80')} />
              ) : (
                <Waves className="size-3.5 text-tide/80" />
              )}
              {boss ? (combatCamera ? '自由视角' : '战斗视角') : '潜水'}
=======
              aria-label="潜入水下"
              title="潜入水下 (V)"
            >
              <Waves className="size-3.5 text-tide/80" />
              潜水
>>>>>>> d49125042e280aa62183c07294f8b20bed463f3a
              {!isTouch && <span className="text-[9px] text-foam/30">V</span>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass flex items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:gap-2 sm:px-3">
            <Compass className="size-3.5 text-tide/90" />
            <span className="hidden text-[11px] font-medium tracking-wide text-foam/90 sm:inline sm:text-xs">
              {zone}
            </span>
          </div>
          <button
            type="button"
            onClick={openTown}
            className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-tide/45 hover:text-tide active:translate-y-px"
            aria-label="回小镇"
            title="回小镇 (G)"
          >
            <MapPinned className="size-4" />
          </button>
          <button
            type="button"
            onClick={openShop}
            className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-foam/70 transition-colors hover:border-gold/40 hover:text-gold active:translate-y-px"
            aria-label="打开船坞"
            title="船坞 (C)"
          >
            <Ship className="size-4" />
          </button>
          <MuteButton />
          <button
            type="button"
            onClick={openBag}
            className="glass pointer-events-auto relative grid size-9 place-items-center rounded-full text-foam/80 transition-colors hover:border-foam/25 hover:text-foam active:translate-y-px sm:hidden"
            aria-label="打开鱼篓"
          >
            <Backpack className="size-4" />
            {bagCount > 0 && (
              <span className="tnum absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-abyss">
                {bagCount}
              </span>
            )}
          </button>
          {!isTouch && (
            <div className="glass hidden h-9 items-center gap-3 rounded-full px-2.5 sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="rounded border border-foam/20 bg-foam/10 px-1.5 py-0.5 text-[10px] font-semibold text-foam/70">
                  B
                </span>
                <span className="text-[11px] text-foam/60">鱼篓</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded border border-foam/20 bg-foam/10 px-1.5 py-0.5 text-[10px] font-semibold text-foam/70">
                  G
                </span>
                <span className="text-[11px] text-foam/60">小镇</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded border border-foam/20 bg-foam/10 px-1.5 py-0.5 text-[10px] font-semibold text-foam/70">
                  C
                </span>
                <span className="text-[11px] text-foam/60">船坞</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
