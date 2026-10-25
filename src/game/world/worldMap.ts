import { lerp, smoothstep } from '@/game/utils/math'

export const WORLD_SIZE = 340
export const WORLD_HALF = WORLD_SIZE / 2
export const MAX_WATER_DEPTH = 10.5

export const DOCK_POINT = { x: 2, z: 33 }
export const DOCK_DECK = { x: 2, z: 37.5, width: 5.6, length: 15, y: 1.12 }
export const SELL_RADIUS = 10
export const SPAWN = { x: 2, z: 17, heading: 0 }

export const TRENCH = { x: -82, z: -58, r: 30, name: '沉船深沟' }
export const MIRROR_LAKE = { x: 88, z: -42, r: 34, name: '镜湖' }
export const FAR_SEA = { x: 128, z: 8, r: 35, name: '黑潮外海' }

export const SPOTS = [
  { x: 0, z: 18, name: '主海湾深水区' },
  { x: -55, z: 32, name: '林间小湾' },
  { x: 40, z: 46, name: '瀑布深潭' },
  { x: 88, z: -42, name: '镜湖心' },
  { x: -82, z: -58, name: '沉船深沟' },
  { x: 128, z: 8, name: '黑潮外海' },
  { x: 112, z: -22, name: '潮汐海峡' },
]

interface WaterCircle {
  x: number
  z: number
  r: number
}

const WATER: WaterCircle[] = [
  { x: 0, z: 6, r: 44 },
  { x: -55, z: 32, r: 23 },
  { x: -30, z: 32, r: 15 },
  { x: 40, z: 46, r: 19 },
  { x: 18, z: 32, r: 11 },
  { x: -82, z: -58, r: 30 },
  { x: -50, z: -42, r: 14 },
  { x: -30, z: -25, r: 13 },
  { x: 88, z: -42, r: 34 },
  { x: 66, z: -33, r: 16 },
  { x: 40, z: -20, r: 14 },
  { x: 104, z: -29, r: 15 },
  { x: 112, z: -22, r: 18 },
  { x: 128, z: 8, r: 35 },
]

const K = 0.55

/** Signed distance-ish field: positive inside water, negative on land. */
export function waterField(x: number, z: number): number {
  let max = -Infinity
  const values: number[] = []
  for (const c of WATER) {
    const d = Math.hypot(x - c.x, z - c.z)
    const f = c.r - d
    values.push(f)
    if (f > max) max = f
  }
  let sum = 0
  for (const f of values) sum += Math.exp(K * (f - max))
  return max + Math.log(sum) / K
}

function hills(x: number, z: number) {
  return (
    Math.sin(x * 0.045) * Math.cos(z * 0.039) * 2.4 +
    Math.sin(x * 0.092 + z * 0.061) * 1.1 +
    Math.cos(x * 0.021 - z * 0.083) * 1.7
  )
}

export function terrainHeight(x: number, z: number): number {
  const f = waterField(x, z)
  if (f > 0) {
    const basin = (1 - smoothstep(4, TRENCH.r, Math.hypot(x - TRENCH.x, z - TRENCH.z))) * 2.6
    return -(0.55 + Math.min(f * 0.225, 8.4) + basin)
  }
  const d = -f
  let h = Math.pow(Math.min(d, 90), 1.32) * 0.05
  h += hills(x, z) * smoothstep(4, 34, d) * 0.75
  const r = Math.hypot(x, z)
  h += smoothstep(118, 158, r) * 30
  const dockDist = Math.hypot(x - DOCK_POINT.x, z - 48)
  h = lerp(h, 0.34, (1 - smoothstep(5, 16, dockDist)) * 0.9)
  return h
}

export function depthAt(x: number, z: number): number {
  const h = terrainHeight(x, z)
  return Math.max(0, -h)
}

export function isWater(x: number, z: number): boolean {
  return depthAt(x, z) > 0.12
}

export function zoneAt(x: number, z: number): string {
  if (Math.hypot(x - TRENCH.x, z - TRENCH.z) < TRENCH.r + 4) return TRENCH.name
  if (Math.hypot(x - FAR_SEA.x, z - FAR_SEA.z) < FAR_SEA.r + 4) return FAR_SEA.name
  if (Math.hypot(x - 112, z + 22) < 22) return '潮汐海峡'
  if (Math.hypot(x - MIRROR_LAKE.x, z - MIRROR_LAKE.z) < MIRROR_LAKE.r + 4) return MIRROR_LAKE.name
  if (z > 31 && x > 13) return '瀑布深潭'
  if (x < -33) return '林间小湾'
  if (z > 25 && Math.abs(x - DOCK_POINT.x) < 17) return '老码头'
  if (z < -18 && x > 24) return '镜湖外湾'
  return '主海湾'
}

export function waterDepthAtSpot() {
  return SPOTS.map((s) => ({ ...s, depth: depthAt(s.x, s.z) }))
}
