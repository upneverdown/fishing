import type { SeasonId, TownTab } from '@/types'

export type DialogueAction =
  | { type: 'tab'; tab: TownTab }
  | { type: 'market' }
  | { type: 'gift' }
  | { type: 'pet' }
  | { type: 'close' }

export interface DialogueCondition {
  season?: SeasonId
  minMoney?: number
  hasDish?: boolean
  petAffection?: number
}

export interface DialogueOption {
  label: string
  next?: string
  action?: DialogueAction
  condition?: DialogueCondition
  note?: string
}

export interface DialogueNode {
  text: string
  options?: DialogueOption[]
}

export interface NpcDef {
  id: string
  name: string
  role: string
  color: string
  accent: string
  tagline: string
  tab: TownTab
  root: string
  greetings: Record<SeasonId, string>
  nodes: Record<string, DialogueNode>
}

export const NPCS: NpcDef[] = [
  {
    id: 'zhou',
    name: '老周头',
    role: '渔获收购商',
    color: '#c9945e',
    accent: '#f2c15b',
    tagline: '秤杆子用了三十年，从不缺斤少两。',
    tab: 'shop',
    root: 'root',
    greetings: {
      spring: '春天的鱼最鲜。你那鱼篓里要是装了货，就趁早拿过来，别让太阳把冰晒化了。',
      summer: '天热，鱼坏得快。卖鱼趁早，剩下的冰我留给你。',
      autumn: '秋风一起，鱼就肥了。今天码头上人多，你来得正好。',
      winter: '冷天鱼价高，手也别冻僵了。有货就拿来，我给你现结。',
    },
    nodes: {
      root: {
        text: '老周头把算盘拨得噼啪响，抬头瞥了一眼你的鱼篓。',
        options: [
          { label: '看看今天的鱼价', action: { type: 'market' } },
          { label: '最近海里怎么样？', next: 'sea' },
          {
            label: '“听说你收稀有鱼？”',
            next: 'rare',
            note: '似乎需要点交情',
            condition: { minMoney: 200 },
          },
          { label: '回头见', action: { type: 'close' } },
        ],
      },
      sea: {
        text: '“湾口这几天水色发青，是深水鱼上来的样子。要我说，别总在码头边上打转。往镜湖那边去，或者干脆下水看看。”他把一枚铜板压在账本上，“稀有货不等人。”',
        options: [
          { label: '记下了', action: { type: 'close' } },
          { label: '顺便看看鱼价', action: { type: 'market' } },
        ],
      },
      rare: {
        text: '“传说鱼啊……”他压低声音，“月光鲟、赤鳍鲛、渊底鲟，都不是随便能见着的。看季节、看时辰、看天气，还得看你在哪片水里下钩。图鉴里记着几句老话，信不信由你。”',
        options: [
          { label: '去翻翻图鉴', action: { type: 'tab', tab: 'codex' } },
          { label: '谢了，老周头', action: { type: 'close' } },
        ],
      },
    },
  },
  {
    id: 'lan',
    name: '阿岚',
    role: '渔具铺老板',
    color: '#6fe0cf',
    accent: '#a8f0e1',
    tagline: '鱼叉、渔网、鱼笼，坏了的都能修。',
    tab: 'shop',
    root: 'root',
    greetings: {
      spring: '“来得正好。”阿岚把一副新网摊在柜台上，“春天水浅，网眼别选太密。”',
      summer: '“天热，工具磨损快。用完记得冲淡水，别让盐霜吃进缝里。”',
      autumn: '“深水季到了。鱼叉射程不够的话，别硬追，回来升一级。”',
      winter: '“冷天网绳会变硬，收网前先抖一抖。鱼笼的藤条我也换了新的。”',
    },
    nodes: {
      root: {
        text: '阿岚抬头，手里还攥着半截网绳。',
        options: [
          { label: '看看工具升级', action: { type: 'tab', tab: 'shop' } },
          { label: '鱼叉怎么用才稳？', next: 'harpoon' },
          { label: '渔网有什么讲究？', next: 'net' },
          { label: '先走了', action: { type: 'close' } },
        ],
      },
      harpoon: {
        text: '“别急着出手。准星锁住鱼，等它游直线的那一下。”她做了个短促的送腕动作，“深水里鱼叉会慢半拍，距离越远越明显。失手了就先退开，鱼受惊会绕圈。”',
        options: [{ label: '明白了', action: { type: 'close' } }],
      },
      net: {
        text: '“围网是吃小鱼的。撒下去别贪，网口收得越快，鱼越跑不掉。稀有鱼鳞硬，会撕网眼——所以网不是万能的。”她把补好的边绳扔给你看，“坏了就回来，别自己拿鱼线瞎缠。”',
        options: [{ label: '受教了', action: { type: 'close' } }],
      },
    },
  },
  {
    id: 'xiaoman',
    name: '小满',
    role: '码头委托员',
    color: '#e2a354',
    accent: '#ffd08a',
    tagline: '每天三条委托，做不做随你。',
    tab: 'quests',
    root: 'root',
    greetings: {
      spring: '“今天风小，适合出海。”小满把委托板翻了个面，“三条活，挑着接。”',
      summer: '“冰柜快满了，收购站催得紧。”她擦擦汗，“你要是能多带点回来，我请你喝酸梅汤。”',
      autumn: '“秋汛到了，委托也比平时多。”她把一张写着银鲑的纸按在板上，“这条我可等了三天。”',
      winter: '“天冷，别在水里待太久。”小满把热茶往你手边推了推，“委托不急，命要紧。”',
    },
    nodes: {
      root: {
        text: '委托板被海风吹得哗啦响，小满用一枚贝壳压住最上面那张。',
        options: [
          { label: '看看今天的委托', action: { type: 'tab', tab: 'quests' } },
          { label: '委托奖励是怎么算的？', next: 'pay' },
          { label: '知道了，先去忙', action: { type: 'close' } },
        ],
      },
      pay: {
        text: '“每天三条，完成得越多，老周头那边给的补贴越高。稀有鱼和当季货会额外加钱。别一次性全接，挑自己顺手的，超时也不罚，就是当天作废。”',
        options: [
          { label: '去看看委托', action: { type: 'tab', tab: 'quests' } },
          { label: '明白了', action: { type: 'close' } },
        ],
      },
    },
  },
  {
    id: 'apo',
    name: '阿婆',
    role: '菜园与潮间带',
    color: '#8fbf77',
    accent: '#c6e7ae',
    tagline: '土要松，水要透，别老盯着苗看。',
    tab: 'farm',
    root: 'root',
    greetings: {
      spring: '“春天的土刚化开，别急着下种。”阿婆蹲在菜畦边，把一块土捻碎在指间。',
      summer: '“日头毒，早晚各浇一次水。中午浇，根会烫坏。”',
      autumn: '“秋菜长得慢，但味道厚。南瓜再留两天，让霜打一打。”',
      winter: '“外头种不了什么了。雪豆还能撑一阵，实在想种，等小屋修出暖棚再说。”',
    },
    nodes: {
      root: {
        text: '阿婆把一把刚拔的野葱放在篮子里，葱根上还带着湿泥。',
        options: [
          { label: '去菜园看看', action: { type: 'tab', tab: 'farm' } },
          { label: '种菜有什么诀窍？', next: 'tips' },
          { label: '“能给我点种子吗？”', action: { type: 'gift' }, note: '每天一次' },
          { label: '先走了', action: { type: 'close' } },
        ],
      },
      tips: {
        text: '“先浇水再等，别反过来。苗期水少一点，结果的时候水多一点。季节不对也不是绝收，就是长得慢、结得少。等小屋升到第三级，搭个暖棚，冬天也能种。”',
        options: [{ label: '记住了', action: { type: 'close' } }],
      },
    },
  },
  {
    id: 'che',
    name: '阿澈',
    role: '小馆厨子',
    color: '#e2685a',
    accent: '#ffb08a',
    tagline: '火候比配方重要。',
    tab: 'kitchen',
    root: 'root',
    greetings: {
      spring: '“新葱下来了，烤鱼正好。”阿澈把一捆小葱挂在灶边。',
      summer: '“夏天别做太油的。浆果烤鱼，酸甜解腻。”',
      autumn: '“蘑菇出来了，我去林子里转了一圈。”他拍拍围裙上的松针，“今晚有得忙。”',
      winter: '“冬天就适合炖锅。鱼汤在灶上咕嘟着，人心也就热了。”',
    },
    nodes: {
      root: {
        text: '灶膛里的火苗舔着锅底，阿澈用刀背敲了敲砧板。',
        options: [
          { label: '借灶台用用', action: { type: 'tab', tab: 'kitchen' } },
          { label: '火候怎么掌握？', next: 'heat' },
          { label: '“有吃的吗？”', action: { type: 'gift' }, note: '每天一次' },
          { label: '先去忙了', action: { type: 'close' } },
        ],
      },
      heat: {
        text: '“看鱼皮。刚下锅时别动，等边缘起小泡再翻。火太急，外面焦了里面还生；火太慢，肉就柴了。起锅那一下要果断，别犹豫。”他用铲子在空中虚点了一下。',
        options: [{ label: '试试看', action: { type: 'tab', tab: 'kitchen' } }],
      },
    },
  },
  {
    id: 'azhou',
    name: '阿舟',
    role: '海湾向导',
    color: '#8fb0bd',
    accent: '#d3e6ff',
    tagline: '哪里水深，哪里有鱼，他都记得。',
    tab: 'codex',
    root: 'root',
    greetings: {
      spring: '“春天先看浅湾，樱花鲤只在清晨的薄雾里。”',
      summer: '“夏天往瀑布深潭去，河豚喜欢在乱石边转。”',
      autumn: '“秋汛最好认——跟着银鲑逆流的方向走。”',
      winter: '“冬天别乱跑。冰湖白鱼在镜湖，赤鳍鲛在深沟，都是夜里的事。”',
    },
    nodes: {
      root: {
        text: '阿舟摊开一张手绘海湾图，边角已经被潮气卷起来了。',
        options: [
          { label: '翻翻海湾图鉴', action: { type: 'tab', tab: 'codex' } },
          { label: '传说鱼在哪？', next: 'legend' },
          { label: '怎么去更远的水域？', next: 'water' },
          { label: '先走了', action: { type: 'close' } },
        ],
      },
      legend: {
        text: '“月光鲟看秋夜，赤鳍鲛看冬夜，渊底鲟在沉船深沟最深处。”他点了点地图上的阴影，“它们不认普通饵。带上好饵，耐心等，别在同一个点死磕。”',
        options: [{ label: '记下了', action: { type: 'close' } }],
      },
      water: {
        text: '“船坞里那几条船，目前只在近海转。更远的远海和沉船区，要等船体升级——不是换皮，是真正加装龙骨和货舱。眼下先把这条海湾摸熟吧。”',
        options: [{ label: '明白了', action: { type: 'close' } }],
      },
    },
  },
]

const NPC_MAP = new Map(NPCS.map((n) => [n.id, n]))

export function npcById(id: string | null) {
  if (!id) return undefined
  return NPC_MAP.get(id)
}
