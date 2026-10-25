import type { Catch } from '@/types'

interface JunkDef {
  id: string
  name: string
  desc: string
  value: number
  weight: number
}

export const JUNK: JunkDef[] = [
  {
    id: 'oldboot',
    name: '破旧靴子',
    desc: '……谁把靴子扔进海里的？靴筒里还卡着半只螃蟹。',
    value: 2,
    weight: 1,
  },
  {
    id: 'rustycan',
    name: '生锈罐头',
    desc: '标签早泡烂了，摇一摇里面还有响声。最好别打开。',
    value: 3,
    weight: 1,
  },
  {
    id: 'seagrass',
    name: '一团海藻',
    desc: '缠在钩上沉甸甸的，滴着水，像一顶绿色的假发。',
    value: 1,
    weight: 1.2,
  },
  {
    id: 'driftwood',
    name: '烂木板',
    desc: '被海水泡得发软，指甲一掐就是一个印子。',
    value: 4,
    weight: 1.1,
  },
  {
    id: 'lostnet',
    name: '缠死的旧渔网',
    desc: '不知道在海底挂了多久，网眼里还卡着几片鱼鳞。',
    value: 3,
    weight: 0.9,
  },
]

let junkSeq = 0

export function createJunk(): Catch {
  const total = JUNK.reduce((sum, j) => sum + j.weight, 0)
  let roll = Math.random() * total
  let def = JUNK[0]
  for (const item of JUNK) {
    roll -= item.weight
    if (roll <= 0) {
      def = item
      break
    }
  }
  junkSeq += 1
  const kg = +(0.3 + Math.random() * 2.2).toFixed(2)
  return {
    id: `${Date.now().toString(36)}-j${junkSeq}`,
    defId: `junk:${def.id}`,
    name: def.name,
    rarity: 'common',
    kg,
    cm: Math.round(12 + Math.random() * 38),
    value: def.value,
    unitPrice: def.value,
    desc: def.desc,
    caughtAt: Date.now(),
    method: 'rod',
    junk: true,
  }
}
