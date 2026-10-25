import type { FacilityId } from '@/types'

export interface FacilityDef {
  id: FacilityId
  name: string
  title: string
  tagline: string
  price: number
  color: string
  effect: string
  toggle: boolean
  notes: string[]
}

export const FACILITIES: FacilityDef[] = [
  {
    id: 'fishfinder',
    name: '探鱼器',
    title: '回声测深仪',
    tagline: '把水下的鱼群变成雷达上的光点，深度和方向一眼看清。',
    price: 680,
    color: '#6fe0cf',
    effect: '鱼群雷达',
    toggle: false,
    notes: ['显示附近鱼群方向', '标注鱼群深度', '水面与水下都有效'],
  },
  {
    id: 'livewell',
    name: '活水舱',
    title: '循环活水舱',
    tagline: '海水一直在舱里流动，鱼能活着回码头，卖相更好。',
    price: 540,
    color: '#58b4ff',
    effect: '载重 +6 · 鲜度 +12%',
    toggle: false,
    notes: ['鱼篓容量 +6', '出售鲜度提升', '占用一个设施槽'],
  },
  {
    id: 'searchlight',
    name: '探照灯',
    title: '船首探照灯',
    tagline: '夜里或雾天把水面切开一道光，早一点看见浮标和鲨鱼鳍。',
    price: 420,
    color: '#ffe7a8',
    effect: '夜间照明',
    toggle: true,
    notes: ['按 L 开关', '照亮船头水面', '夜间与雾天最有用'],
  },
  {
    id: 'grill',
    name: '船载烤架',
    title: '铸铁小烤架',
    tagline: '现钓现烤，香味能把整片海的馋虫都勾出来。',
    price: 360,
    color: '#e2a354',
    effect: '烤鱼回血',
    toggle: false,
    notes: ['按 H 烤一条鱼', '恢复 22 点生命', '消耗鱼篓里最小的一条'],
  },
  {
    id: 'anchor',
    name: '船锚',
    title: '四爪锚',
    tagline: '抛下去，船就钉在这片水上，浪再大也不会漂走。',
    price: 280,
    color: '#c9945e',
    effect: '固定船位',
    toggle: true,
    notes: ['按 Y 抛锚 / 起锚', '抛锚后无法航行', '钓鱼时船身更稳'],
  },
]

const FACILITY_MAP = new Map(FACILITIES.map((f) => [f.id, f]))

export function facilityById(id: FacilityId) {
  return FACILITY_MAP.get(id)
}

export function isFacilityId(id: string): id is FacilityId {
  return FACILITY_MAP.has(id as FacilityId)
}
