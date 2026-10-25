import {
  Anchor,
  Crosshair,
  Flame,
  Flashlight,
  Heart,
  Radar,
  RotateCcw,
  Skull,
  Sword,
  Video,
} from 'lucide-react'
import { useGameStore, MAX_HP } from '@/store/useGameStore'
import { WEAPONS, weaponById } from '@/game/combat/weapons'
import { facilityById } from '@/game/boat/facilities'
import { useNow } from '@/components/town/shared'
import { cn } from '@/lib/utils'
import type { FacilityId, RadarContact } from '@/types'

const CONTACT_COLOR: Record<RadarContact['kind'], string> = {
  fish: '#6fe0cf',
  shark: '#ff7a5f',
  whale: '#b57cff',
  boss: '#ffb13d',
}

function WeaponButton({ id }: { id: (typeof WEAPONS)[number]['id'] }) {
  const def = weaponById(id)
  const owned = useGameStore((s) => s.ownedWeapons.includes(id))
  const equipped = useGameStore((s) => s.equippedWeapon === id)
  const ammo = useGameStore((s) => s.weaponAmmo[id] ?? 0)
  const equipWeapon = useGameStore((s) => s.equipWeapon)
  const toast = useGameStore((s) => s.toast)
  if (!def) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (!owned) {
          toast(`${def.name}还没买 · 去小镇渔具铺看看`, 'info')
          return
        }
        equipWeapon(id)
      }}
      className={cn(
        'pointer-events-auto relative flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg border px-1.5 py-1 text-left transition-colors',
        equipped
          ? 'border-gold/45 bg-gold/8 text-gold'
          : owned
            ? 'border-border/50 bg-abyss/40 text-foam/60 hover:border-foam/25'
            : 'border-border/30 bg-abyss/25 text-foam/30',
      )}
      title={`${def.name} · ${def.notes[0]}`}
    >
      <span className="flex items-center justify-between gap-1">
        {id === 'knife' ? <Sword className="size-3" /> : <Crosshair className="size-3" />}
        <span className="tnum text-[8px] opacity-70">
          {!owned ? '未购' : def.ammoMax > 0 ? `${ammo}/${def.ammoMax}` : '∞'}
        </span>
      </span>
      <span className="truncate text-[9.5px] font-medium">{def.name}</span>
      <span className="hidden text-[7.5px] tracking-[0.12em] opacity-50 sm:block">
        {id === 'knife' ? 'Z' : 'X'}
      </span>
    </button>
  )
}

function FacilityButton({ id }: { id: FacilityId }) {
  const def = facilityById(id)
  const active = useGameStore((s) => Boolean(s.facilityActive[id]))
  const toggleFacility = useGameStore((s) => s.toggleFacility)
  const grillCatch = useGameStore((s) => s.grillCatch)
  if (!def) return null

  const Icon = id === 'anchor' ? Anchor : id === 'searchlight' ? Flashlight : Flame
  const onClick = id === 'grill' ? () => grillCatch() : () => toggleFacility(id)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pointer-events-auto grid size-6 place-items-center rounded-full border transition-colors',
        active
          ? 'border-gold/45 bg-gold/15 text-gold'
          : 'border-border/40 bg-abyss/40 text-foam/45 hover:text-foam/80',
      )}
      title={id === 'grill' ? '烤一条鱼 · 恢复 22 生命' : `${def.name} · ${active ? '开启中' : '已关闭'}`}
    >
      <Icon className="size-3" />
    </button>
  )
}

function StatusPanel() {
  const hp = useGameStore((s) => s.hp)
  const installed = useGameStore((s) => s.installedFacilities)
  const active = useGameStore((s) => s.facilityActive)
  const low = hp <= 30
  const usable = installed.filter((id): id is FacilityId => Boolean(id))
  const quick = usable.filter((id) => id === 'anchor' || id === 'searchlight' || id === 'grill')
  const passive = usable.filter((id) => id === 'fishfinder' || id === 'livewell')
  const anchored = active.anchor && usable.includes('anchor')

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-3 top-[30%] z-20 w-[9.8rem] rounded-xl border bg-[#072226]/86 p-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md sm:left-5 sm:w-[10.4rem]',
        low ? 'border-destructive/55' : 'border-foam/12',
      )}
    >
      <div className="flex items-center justify-between text-[8.5px] uppercase tracking-[0.18em]">
        <span className={cn('flex items-center gap-1', low ? 'text-destructive' : 'text-foam/45')}>
          <Heart className={cn('size-3', low && 'animate-pulse')} />
          生命
        </span>
        <span className={cn('tnum text-[10px] font-semibold', low ? 'text-destructive' : 'text-foam/75')}>
          {hp}/{MAX_HP}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foam/10">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, (hp / MAX_HP) * 100))}%`,
            background: low
              ? 'linear-gradient(90deg,#e2685a,#ff9a6b)'
              : 'linear-gradient(90deg,#6fe0cf,#a8f0e1)',
            boxShadow: low ? '0 0 12px #e2685a88' : '0 0 12px #6fe0cf55',
          }}
        />
      </div>

      <div className="mt-2 flex items-stretch gap-1">
        {WEAPONS.map((weapon) => (
          <WeaponButton key={weapon.id} id={weapon.id} />
        ))}
      </div>

      {quick.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 border-t border-white/6 pt-1.5">
          {quick.map((id) => (
            <FacilityButton key={id} id={id} />
          ))}
          {passive.map((id) => {
            const def = facilityById(id)
            if (!def) return null
            return (
              <span
                key={id}
                className="grid size-6 place-items-center rounded-full bg-tide/10 text-tide/70"
                title={`${def.name} · ${def.effect}`}
              >
                {id === 'fishfinder' ? <Radar className="size-3" /> : <Heart className="size-3" />}
              </span>
            )
          })}
          <span className="ml-auto truncate text-[7.5px] tracking-[0.08em] text-foam/30">
            {anchored ? '已抛锚' : active.searchlight ? '探照灯' : '船上'}
          </span>
        </div>
      )}
    </div>
  )
}

function BossBar() {
  const boss = useGameStore((s) => s.boss)
  const combatCamera = useGameStore((s) => s.combatCamera)
  const toggleCombatCamera = useGameStore((s) => s.toggleCombatCamera)
  if (!boss) return null
  const pct = Math.max(0, Math.min(100, (boss.hp / Math.max(1, boss.maxHp)) * 100))
  const enraged = boss.phase > 1
  const ultimate = Boolean(boss.ultimate)

  return (
    <div className="pointer-events-none absolute left-1/2 top-[13.6rem] z-30 w-[calc(100%-1.5rem)] -translate-x-1/2 sm:top-[6.2rem] sm:w-[min(21rem,calc(100%-22rem))] lg:w-[min(26rem,calc(100%-22rem))]">
      <div
        className={cn(
          'rounded-xl border bg-[#1a0d0d]/88 px-3 py-2 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)] backdrop-blur-md',
          enraged || ultimate ? 'border-destructive/70' : 'border-gold/45',
          ultimate && 'ring-1 ring-gold/25 shadow-[0_0_38px_-10px_rgba(242,193,92,0.45)]',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold tracking-wide text-foam">
            <Skull className={cn('size-3.5 shrink-0', enraged ? 'text-destructive' : 'text-gold')} />
            <span className="truncate">{boss.name}</span>
          </span>
          <button
            type="button"
            onClick={toggleCombatCamera}
            className={cn(
              'pointer-events-auto flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.06em] transition-colors',
              combatCamera
                ? 'border-tide/55 bg-tide/15 text-tide'
                : 'border-foam/20 bg-abyss/40 text-foam/55 hover:text-foam/85',
            )}
            title="切换战斗视角 (V)"
          >
            <Video className="size-2.5" />
            {combatCamera ? '锁定中' : '战斗视角'}
            <kbd className="rounded border border-current/25 px-0.5 text-[7px] opacity-70">V</kbd>
          </button>
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.08em]',
              enraged || ultimate ? 'bg-destructive/20 text-destructive' : 'bg-gold/15 text-gold',
            )}
          >
            {ultimate && boss.phase <= 1
              ? '终极 · 龙王降临'
              : enraged
                ? `狂暴 · 第${boss.phase}阶段`
                : '首领战'}
          </span>
        </div>
        <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{
              width: `${pct}%`,
              background: enraged
                ? 'linear-gradient(90deg,#e2685a,#ffb13d)'
                : 'linear-gradient(90deg,#c9945e,#f2c15c)',
              boxShadow: enraged ? '0 0 14px #e2685aaa' : '0 0 12px #f2c15c88',
            }}
          />
          <span className="absolute inset-y-0 left-1/2 w-px bg-black/60" />
        </div>
        <div className="mt-1 flex items-center justify-between text-[8.5px] text-foam/45">
          <span className="tnum">
            {Math.ceil(boss.hp)} / {boss.maxHp}
          </span>
          <span className={enraged ? 'text-destructive/80' : 'text-gold/70'}>{boss.skill}</span>
        </div>
      </div>
    </div>
  )
}

function RadarPanel() {
  const installed = useGameStore((s) => s.installedFacilities.includes('fishfinder'))
  const contacts = useGameStore((s) => s.radarContacts)
  if (!installed) return null
  const nearest = [...contacts].sort((a, b) => a.distance - b.distance)[0]
  const range = Math.max(40, nearest?.distance ?? 0)

  return (
    <div className="pointer-events-none absolute left-3 top-[calc(30%+9.6rem)] z-20 w-[9.8rem] rounded-xl border border-tide/20 bg-[#072226]/82 p-2 backdrop-blur-md sm:left-5 sm:w-[10.4rem]">
      <div className="flex items-center justify-between text-[8.5px] uppercase tracking-[0.16em] text-tide/60">
        <span className="flex items-center gap-1">
          <Radar className="size-3" />
          探鱼器
        </span>
        <span className="tnum text-foam/40">{contacts.length}</span>
      </div>
      <div className="relative mx-auto mt-1.5 aspect-square w-full max-w-[6.6rem] overflow-hidden rounded-full border border-tide/25 bg-[radial-gradient(circle,rgba(111,224,207,0.1),rgba(3,18,20,0.75))]">
        <span className="absolute inset-[18%] rounded-full border border-tide/12" />
        <span className="absolute inset-[38%] rounded-full border border-tide/12" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-tide/12" />
        <span className="absolute inset-x-0 top-1/2 h-px bg-tide/12" />
        <span className="absolute inset-0 animate-[spin_5s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(111,224,207,0.28)_42deg,transparent_70deg)]" />
        <span className="absolute left-1/2 top-[14%] size-1 -translate-x-1/2 rotate-180 rounded-full bg-tide/40" />
        {contacts.map((contact) => {
          const dist = Math.min(1, contact.distance / range)
          const x = 50 + Math.sin(contact.bearing) * dist * 42
          const y = 50 - Math.cos(contact.bearing) * dist * 42
          return (
            <span
              key={contact.id}
              className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                background: CONTACT_COLOR[contact.kind],
                boxShadow: `0 0 7px ${CONTACT_COLOR[contact.kind]}`,
              }}
              title={`${contact.label} · ${contact.distance.toFixed(1)}m · ${contact.depth.toFixed(1)}m`}
            />
          )
        })}
        <span
          className="absolute left-1/2 top-1/2 size-0 -translate-x-1/2 -translate-y-1/2 border-x-[3px] border-b-[6px] border-x-transparent border-b-foam/70"
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[8px] text-foam/35">
        <span className="truncate">
          {nearest ? `${nearest.label} ${nearest.distance.toFixed(0)}m` : '扫描中…'}
        </span>
        <span className="tnum shrink-0">
          {nearest ? `${nearest.depth.toFixed(1)}m 深` : '—'}
        </span>
      </div>
    </div>
  )
}

function DeathOverlay() {
  const dead = useGameStore((s) => s.dead)
  const bagCount = useGameStore((s) => s.bag.length)
  const respawn = useGameStore((s) => s.respawn)
  if (!dead) return null

  return (
    <div className="absolute inset-0 z-[80] grid place-items-center bg-abyss/82 px-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-[#160d0c]/95 p-5 text-center shadow-[0_36px_90px_-30px_rgba(0,0,0,0.95)]">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
          <Skull className="size-7" />
        </span>
        <h2 className="mt-3 text-[17px] font-semibold tracking-wide text-foam">你被打翻在海里</h2>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          海水灌进衣领，眼前一黑。再睁眼时已经躺在老码头的木板上，鱼篓里少了一半渔获。
        </p>
        <p className="tnum mt-2 text-[10px] text-foam/35">剩余渔获 {bagCount} 条 · 生命将恢复至满</p>
        <button
          type="button"
          onClick={respawn}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-gold/50 bg-gold/15 py-2.5 text-[12.5px] font-semibold text-gold transition-colors hover:bg-gold/25 active:translate-y-px"
        >
          <RotateCcw className="size-4" />
          在码头醒来
        </button>
        <div className="mt-2 text-[9px] text-foam/25">
          提示：鱼枪和渔刀能对付鲨鱼，探照灯能提前发现水面上的背鳍
        </div>
      </div>
    </div>
  )
}

export function CombatHud() {
  const hitAt = useGameStore((s) => s.hitAt)
  const now = useNow(120)
  const hurt = hitAt > 0 && now - hitAt < 520

  return (
    <>
      {hurt && (
        <div className="pointer-events-none absolute inset-0 z-30 animate-pulse bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(226,104,90,0.35)_100%)]" />
      )}
      <StatusPanel />
      <RadarPanel />
      <BossBar />
      <DeathOverlay />
    </>
  )
}
