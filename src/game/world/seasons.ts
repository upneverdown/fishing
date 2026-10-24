import type { DayPeriod, SeasonId } from '@/types'

export interface TerrainPalette {
  bedShallow: string
  bedDeep: string
  sand: string
  wetSand: string
  grass: string
  grassDark: string
  grassLight: string
  rock: string
  rockDark: string
}

export interface ParticleProfile {
  kind: 'petal' | 'firefly' | 'leaf' | 'snow'
  colors: string[]
  size: number
  opacity: number
  fall: number
  drift: number
  additive: boolean
}

export interface SeasonProfile {
  id: SeasonId
  name: string
  en: string
  period: DayPeriod
  accent: string
  tagline: string
  desc: string
  fishNote: string
  sky: { zenith: string; horizon: string; sun: string; fog: string }
  fog: { near: number; far: number }
  water: {
    shallow: string
    deep: string
    scatter: string
    skyZenith: string
    skyHorizon: string
  }
  light: {
    hemiSky: string
    hemiGround: string
    hemi: number
    fill: string
    fillIntensity: number
    sun: string
    sunIntensity: number
  }
  sunOffset: [number, number, number]
  exposure: number
  waveScale: number
  terrain: TerrainPalette
  foliage: string[]
  lilies: string
  particle: ParticleProfile
  ice: number
}

export const DAY_PERIOD_LABEL: Record<DayPeriod, string> = {
  dawn: '黎明',
  day: '白昼',
  dusk: '黄昏',
  night: '深夜',
}

export const SEASON_ORDER: SeasonId[] = ['spring', 'summer', 'autumn', 'winter']

export const SEASONS: Record<SeasonId, SeasonProfile> = {
  spring: {
    id: 'spring',
    name: '春潮',
    en: 'Spring tide',
    period: 'dawn',
    accent: '#f0a8b8',
    tagline: '薄雾、花瓣与第一尾苏醒的鱼',
    desc: '晨雾贴着水面，樱花落在船舷。浅湾回暖，鱼群靠岸觅食，是耐心的季节。',
    fishNote: '鲫鱼、锦鲤、樱花鲤在浅湾活跃',
    sky: { zenith: '#7bbbc9', horizon: '#f2d9d3', sun: '#ffe3c8', fog: '#d6e5df' },
    fog: { near: 70, far: 210 },
    water: {
      shallow: '#48bfae',
      deep: '#0a3542',
      scatter: '#86e8d6',
      skyZenith: '#6aaebf',
      skyHorizon: '#cfe3dd',
    },
    light: {
      hemiSky: '#e7f2e8',
      hemiGround: '#4f6a46',
      hemi: 1.25,
      fill: '#b7e7dc',
      fillIntensity: 0.5,
      sun: '#ffe6c8',
      sunIntensity: 2.9,
    },
    sunOffset: [-30, 40, -70],
    exposure: 1.08,
    waveScale: 0.95,
    terrain: {
      bedShallow: '#b7a87a',
      bedDeep: '#2f6f6b',
      sand: '#dccb98',
      wetSand: '#a89a70',
      grass: '#7dab5c',
      grassDark: '#548347',
      grassLight: '#97c16b',
      rock: '#7f877d',
      rockDark: '#5d675f',
    },
    foliage: ['#4a8247', '#5b9550', '#6aa55b', '#3f7340', '#d78fa2', '#e3a7b5'],
    lilies: '#5aa36b',
    particle: {
      kind: 'petal',
      colors: ['#f7c9d4', '#f3b6c6', '#ffe1e8'],
      size: 0.32,
      opacity: 0.85,
      fall: 0.35,
      drift: 0.5,
      additive: false,
    },
    ice: 0,
  },
  summer: {
    id: 'summer',
    name: '盛夏',
    en: 'High summer',
    period: 'day',
    accent: '#f2c15c',
    tagline: '正午的光、深蓝的水与不肯停歇的鱼',
    desc: '日光把水面烧成碎金，深水区凉意诱人。大鱼在阴影里巡游，萤火鱲只在夜里发光。',
    fishNote: '黑鱼、鲶鱼、河豚进入旺季',
    sky: { zenith: '#4b9cc9', horizon: '#def1e4', sun: '#fff3ce', fog: '#c7e6df' },
    fog: { near: 85, far: 240 },
    water: {
      shallow: '#3cc4c7',
      deep: '#032f42',
      scatter: '#74f0dd',
      skyZenith: '#3f92bb',
      skyHorizon: '#c9e7dc',
    },
    light: {
      hemiSky: '#e9f7ec',
      hemiGround: '#3e6a3e',
      hemi: 1.35,
      fill: '#a9e7e0',
      fillIntensity: 0.6,
      sun: '#fff0c9',
      sunIntensity: 3.25,
    },
    sunOffset: [-18, 44, -62],
    exposure: 1.16,
    waveScale: 0.82,
    terrain: {
      bedShallow: '#b3a273',
      bedDeep: '#286965',
      sand: '#e0cf9a',
      wetSand: '#a99b6e',
      grass: '#6ea84f',
      grassDark: '#4a7d3f',
      grassLight: '#8fc45f',
      rock: '#7a8279',
      rockDark: '#58635b',
    },
    foliage: ['#33683a', '#3f7a42', '#4a8a4a', '#2d5f34', '#57984f', '#3d7540'],
    lilies: '#4f9a63',
    particle: {
      kind: 'firefly',
      colors: ['#d8ff9a', '#ffe89a', '#b6ffb0'],
      size: 0.18,
      opacity: 0.9,
      fall: 0.02,
      drift: 0.15,
      additive: true,
    },
    ice: 0,
  },
  autumn: {
    id: 'autumn',
    name: '秋暮',
    en: 'Amber dusk',
    period: 'dusk',
    accent: '#de9a4c',
    tagline: '起风了，红叶与肥美的洄游鱼',
    desc: '风把山坡染成铜色，浪头比夏天更高。洄游的鲑鱼与鳟鱼在暮色里成群穿过海湾。',
    fishNote: '银鲑、鳟鱼、枫叶鳟随落叶洄游',
    sky: { zenith: '#5d6f98', horizon: '#f0c08d', sun: '#ffcf9d', fog: '#d8bda6' },
    fog: { near: 65, far: 195 },
    water: {
      shallow: '#4d9d93',
      deep: '#173137',
      scatter: '#e9bd83',
      skyZenith: '#566a8d',
      skyHorizon: '#d9b391',
    },
    light: {
      hemiSky: '#f3d8c2',
      hemiGround: '#6a4c3a',
      hemi: 1.05,
      fill: '#d9b28d',
      fillIntensity: 0.55,
      sun: '#ffcd96',
      sunIntensity: 2.7,
    },
    sunOffset: [42, 30, -58],
    exposure: 1.02,
    waveScale: 1.32,
    terrain: {
      bedShallow: '#ac9a6f',
      bedDeep: '#2a5d5c',
      sand: '#cdb383',
      wetSand: '#9a8262',
      grass: '#b08a4b',
      grassDark: '#8a5d34',
      grassLight: '#caa45e',
      rock: '#7d766c',
      rockDark: '#5a544d',
    },
    foliage: ['#b9762f', '#c98a38', '#a75e2a', '#d8a34a', '#8a5a2a', '#c07a2e'],
    lilies: '#a68a4c',
    particle: {
      kind: 'leaf',
      colors: ['#d79a45', '#c47a34', '#e6b45c'],
      size: 0.36,
      opacity: 0.9,
      fall: 0.55,
      drift: 0.9,
      additive: false,
    },
    ice: 0,
  },
  winter: {
    id: 'winter',
    name: '冬夜',
    en: 'Frozen night',
    period: 'night',
    accent: '#a9d6e8',
    tagline: '浮冰、极静的雪与深水下古老的心跳',
    desc: '海面结起薄冰，雪落在船灯的光里。水下的世界反而更安静，传说级的大鱼在渊底苏醒。',
    fishNote: '冰湖白鱼、月光鲟、渊底鲟在深夜出没',
    sky: { zenith: '#2a3f5e', horizon: '#93a9b8', sun: '#d9e9ff', fog: '#9fb3be' },
    fog: { near: 55, far: 180 },
    water: {
      shallow: '#5e8fa6',
      deep: '#041c2e',
      scatter: '#b3ddec',
      skyZenith: '#344e6c',
      skyHorizon: '#9ab0be',
    },
    light: {
      hemiSky: '#dfeef7',
      hemiGround: '#3a4a50',
      hemi: 0.95,
      fill: '#a8ccdd',
      fillIntensity: 0.45,
      sun: '#d6e8ff',
      sunIntensity: 2,
    },
    sunOffset: [-52, 26, 48],
    exposure: 0.94,
    waveScale: 0.3,
    terrain: {
      bedShallow: '#9fa89f',
      bedDeep: '#27535c',
      sand: '#cfd3cc',
      wetSand: '#97a3a3',
      grass: '#dbe4e4',
      grassDark: '#9aa9ac',
      grassLight: '#eef4f4',
      rock: '#89939b',
      rockDark: '#616b74',
    },
    foliage: ['#32594c', '#3c6b58', '#2b4d43', '#8fa9a2', '#4a6d5e', '#7f9a90'],
    lilies: '#8fb0a8',
    particle: {
      kind: 'snow',
      colors: ['#f4fbff', '#dff1fb', '#ffffff'],
      size: 0.26,
      opacity: 0.95,
      fall: 0.7,
      drift: 0.35,
      additive: false,
    },
    ice: 30,
  },
}

export function isSeasonId(value: unknown): value is SeasonId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SEASONS, value)
}

export function seasonById(id: SeasonId) {
  return SEASONS[id]
}
