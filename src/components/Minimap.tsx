import { Navigation } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { WATERS } from '@/game/world/waters'
import { DOCK_POINT } from '@/game/world/worldMap'

const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 94
const RANGE = 96
const SCALE = RADIUS / RANGE
const GRID = 24

function project(x: number, z: number, px: number, pz: number) {
  return {
    x: CENTER + (x - px) * SCALE,
    y: CENTER + (z - pz) * SCALE,
  }
}

function clampToEdge(point: { x: number; y: number }) {
  const dx = point.x - CENTER
  const dy = point.y - CENTER
  const dist = Math.hypot(dx, dy)
  if (dist <= RADIUS - 7) return { x: point.x, y: point.y, outside: false }
  const k = (RADIUS - 7) / (dist || 1)
  return { x: CENTER + dx * k, y: CENTER + dy * k, outside: true }
}

export function Minimap() {
  const nav = useGameStore((s) => s.nav)
  const bossHud = useGameStore((s) => s.boss)

  if (!nav) {
    return (
      <div className="pointer-events-none absolute right-3 top-[3.8rem] z-20 grid size-[8.5rem] place-items-center rounded-full border border-foam/15 bg-[#061b1c]/80 backdrop-blur-md sm:right-5 sm:top-[4.2rem] sm:size-40">
        <span className="flex flex-col items-center gap-1 text-[9px] tracking-[0.2em] text-foam/35">
          <Navigation className="size-4 animate-pulse text-tide/60" />
          定位中
        </span>
      </div>
    )
  }

  const { px, pz, heading, underwater } = nav
  const player = { x: CENTER, y: CENTER }
  const boat = clampToEdge(project(nav.boatX, nav.boatZ, px, pz))
  const bossPoint = nav.boss ? project(nav.boss.x, nav.boss.z, px, pz) : null
  const boss = bossPoint ? clampToEdge(bossPoint) : null
  const arena = nav.boss ? project(nav.boss.arenaX, nav.boss.arenaZ, px, pz) : null
  const dock = clampToEdge(project(DOCK_POINT.x, DOCK_POINT.z, px, pz))
  const bossDistance = nav.boss ? Math.hypot(nav.boss.x - px, nav.boss.z - pz) : 0
  const dockDistance = Math.hypot(DOCK_POINT.x - px, DOCK_POINT.z - pz)

  const gridX: number[] = []
  const gridY: number[] = []
  for (let x = ((CENTER - px * SCALE) % GRID + GRID) % GRID; x <= SIZE; x += GRID) gridX.push(x)
  for (let y = ((CENTER - pz * SCALE) % GRID + GRID) % GRID; y <= SIZE; y += GRID) gridY.push(y)

  return (
    <div
      className="pointer-events-none absolute right-3 top-[3.8rem] z-20 w-[8.5rem] sm:right-5 sm:top-[4.2rem] sm:w-40"
      role="img"
      aria-label={nav.boss ? `海图 · 距龙王 ${Math.round(bossDistance)} 米` : '海图'}
    >
      <div className="relative overflow-hidden rounded-full border border-foam/18 bg-[#061b1c]/82 shadow-[0_18px_44px_-22px_rgba(0,0,0,0.9)] backdrop-blur-md">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full">
          <defs>
            <clipPath id="minimap-clip">
              <circle cx={CENTER} cy={CENTER} r={RADIUS} />
            </clipPath>
            <radialGradient id="minimap-bg" cx="50%" cy="46%" r="58%">
              <stop offset="0%" stopColor="#0f3b3a" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#082324" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#041415" stopOpacity="0.98" />
            </radialGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#minimap-bg)" />

          <g clipPath="url(#minimap-clip)">
            {WATERS.map((water) => {
              const point = project(water.center.x, water.center.z, px, pz)
              return (
                <circle
                  key={water.id}
                  cx={point.x}
                  cy={point.y}
                  r={water.radius * SCALE}
                  fill={water.color}
                  fillOpacity={0.07}
                  stroke={water.color}
                  strokeOpacity={0.3}
                  strokeWidth={0.9}
                />
              )
            })}

            {gridX.map((x) => (
              <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={SIZE} stroke="#6fe0cf" strokeOpacity={0.055} strokeWidth={0.7} />
            ))}
            {gridY.map((y) => (
              <line key={`gz-${y}`} x1={0} y1={y} x2={SIZE} y2={y} stroke="#6fe0cf" strokeOpacity={0.055} strokeWidth={0.7} />
            ))}

            {arena && nav.boss && (
              <>
                <circle
                  cx={arena.x}
                  cy={arena.y}
                  r={(nav.boss.arenaR + 14) * SCALE}
                  fill="none"
                  stroke="#ff8a72"
                  strokeOpacity={0.16}
                  strokeWidth={1}
                  strokeDasharray="2 5"
                />
                <circle
                  cx={arena.x}
                  cy={arena.y}
                  r={nav.boss.arenaR * SCALE}
                  fill="#ff5f52"
                  fillOpacity={0.05}
                  stroke="#ff6d5a"
                  strokeOpacity={0.5}
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                />
              </>
            )}

            <circle cx={dock.x} cy={dock.y} r={dock.outside ? 2 : 3} fill="#f2c15c" fillOpacity={dock.outside ? 0.35 : 0.9} />
            {nav.npcs.map((npc) => {
              const point = project(npc.x, npc.z, px, pz)
              if (Math.hypot(point.x - CENTER, point.y - CENTER) > RADIUS - 4) return null
              return <circle key={npc.id} cx={point.x} cy={point.y} r={1.7} fill="#f2c15c" fillOpacity={0.68} />
            })}

            <circle cx={boat.x} cy={boat.y} r={boat.outside ? 2.2 : 3.4} fill="#f4fbf8" fillOpacity={boat.outside ? 0.45 : 1} stroke="#06201f" strokeWidth={1.2} />

            {boss && (
              <>
                <circle cx={boss.x} cy={boss.y} r={7} fill="#ff5f52" fillOpacity={0.18} className="animate-pulse" />
                <circle cx={boss.x} cy={boss.y} r={boss.outside ? 2.6 : 3.8} fill="#ff5f52" fillOpacity={boss.outside ? 0.65 : 1} stroke="#2b0906" strokeWidth={1} />
              </>
            )}
          </g>

          <g transform={`translate(${player.x} ${player.y}) rotate(${(-heading * 180) / Math.PI})`}>
            <path
              d="M 0 -7.2 L 4.8 5.2 L 0 2.7 L -4.8 5.2 Z"
              fill="#7cf29a"
              stroke="#04221a"
              strokeWidth={1.2}
              style={{ filter: 'drop-shadow(0 0 3px rgba(124,242,154,0.85))' }}
            />
          </g>

          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#6fe0cf" strokeOpacity={0.24} strokeWidth={1.4} />
          <text x={CENTER} y={15} textAnchor="middle" fontSize={8} letterSpacing={2} fill="#cff6ee" fillOpacity={0.5}>
            N
          </text>
        </svg>

        <div className="absolute inset-x-0 top-6 flex items-center justify-center gap-1 text-[7.5px] uppercase tracking-[0.22em] text-tide/55">
          <Navigation className="size-2.5" />
          海图
        </div>

        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1 text-[8.5px] font-medium text-foam/60">
          {nav.boss && bossHud ? (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-[#ff5f52]" />
              <span className="tnum">龙王 {Math.round(bossDistance)}m</span>
            </>
          ) : underwater ? (
            <span className="text-tide/65">水下 · 北 ↑</span>
          ) : (
            <span className="tnum text-foam/45">码头 {Math.round(dockDistance)}m</span>
          )}
        </div>
      </div>
    </div>
  )
}
