/** 心魔题库：高中到大一高数的基础公式，残缺处由玩家补全 */
export interface QuizDef {
  /** 心魔空间里那行残缺公式（大字） */
  formula: string
  /** 一句话题干 */
  question: string
  /** 心魔的低语提示，只点方向不给答案 */
  hint: string
  /** 规范答案，判定时双方都先归一化 */
  answer: string
  /** 同样算对的其他写法 */
  alts?: string[]
  /** 答案里出现、但标准键盘上没有的字 */
  extraKeys?: string[]
  tag: '三角' | '导数' | '积分' | '极限' | '性质' | '函数'
}

export const QUIZ_BANK: QuizDef[] = [
  {
    formula: 'sin²x + cos²x = ?',
    question: '同角三角函数的平方关系',
    hint: '单位圆上，横纵坐标的平方和……',
    answer: '1',
    tag: '三角',
  },
  {
    formula: '1 - 2sin²x = ?',
    question: '二倍角公式的余弦形式',
    hint: '把 cos2x = cos²x - sin²x 换掉一半',
    answer: 'cos2x',
    alts: ['cos²x-sin²x', 'cos(2x)'],
    tag: '三角',
  },
  {
    formula: 'sin2x = 2sinx · ?',
    question: '补全二倍角正弦公式',
    hint: '正余互为一对，别写反了',
    answer: 'cosx',
    alts: ['cos(x)'],
    tag: '三角',
  },
  {
    formula: 'tanx = sinx / ?',
    question: '商关系',
    hint: '正切是弦比弦',
    answer: 'cosx',
    tag: '三角',
  },
  {
    formula: 'sin(π/6) = ?',
    question: '特殊角三角函数值',
    hint: '三十度所对的直角边是斜边的几分之几',
    answer: '1/2',
    alts: ['0.5'],
    tag: '三角',
  },
  {
    formula: '(sinx)′ = ?',
    question: '基本求导公式',
    hint: '口诀：正变余，余变负正',
    answer: 'cosx',
    tag: '导数',
  },
  {
    formula: '(cosx)′ = ?',
    question: '基本求导公式',
    hint: '余弦求导要添一个负号',
    answer: '-sinx',
    alts: ['-sin(x)'],
    tag: '导数',
  },
  {
    formula: '(x²)′ = ?',
    question: '幂函数求导',
    hint: '指数搬下来当系数',
    answer: '2x',
    alts: ['2*x'],
    tag: '导数',
  },
  {
    formula: '(eˣ)′ = ?',
    question: '指数函数求导',
    hint: '它是唯一一个自己求导还是自己的家伙',
    answer: 'e^x',
    alts: ['eˣ', 'ex'],
    extraKeys: ['ˣ'],
    tag: '导数',
  },
  {
    formula: '(lnx)′ = ?',
    question: '对数函数求导',
    hint: '答案是 x 的倒数',
    answer: '1/x',
    tag: '导数',
  },
  {
    formula: '(aˣ)′ = aˣ · ?',
    question: '一般指数函数求导',
    hint: '多出来的那一位是自然对数',
    answer: 'lna',
    tag: '导数',
  },
  {
    formula: '∫2x dx = ? + C',
    question: '最基础的积分',
    hint: '求导的逆运算，谁 derivative 是 2x',
    answer: 'x²',
    alts: ['x^2'],
    extraKeys: ['²'],
    tag: '积分',
  },
  {
    formula: '∫cosx dx = ? + C',
    question: '余弦的原函数',
    hint: '求导之后能变回 cosx 的那个',
    answer: 'sinx',
    tag: '积分',
  },
  {
    formula: '∫1/x dx = ? + C',
    question: '反比例函数的原函数',
    hint: '对数，别忘绝对值也行',
    answer: 'lnx',
    alts: ['ln|x|', 'ln|x'],
    tag: '积分',
  },
  {
    formula: 'lim(x→0) sinx / x = ?',
    question: '第一个重要极限',
    hint: '这个极限干净得只剩一个数',
    answer: '1',
    tag: '极限',
  },
  {
    formula: 'lim(x→∞) (1 + 1/x)ˣ = ?',
    question: '第二个重要极限',
    hint: '一个以字母 e 记号的常数',
    answer: 'e',
    tag: '极限',
  },
  {
    formula: 'f(x) = x² 是奇函数还是偶函数？',
    question: '奇偶性判定',
    hint: '看 f(-x) 与 f(x) 的关系',
    answer: '偶',
    extraKeys: ['偶', '奇'],
    tag: '性质',
  },
  {
    formula: 'f(x) = sinx 是奇函数还是偶函数？',
    question: '奇偶性判定',
    hint: 'sin(-x) = -sinx',
    answer: '奇',
    extraKeys: ['奇', '偶'],
    tag: '性质',
  },
  {
    formula: 'f(-x) = f(x) 代表的是?函数',
    question: '奇偶性的定义式',
    hint: '图象关于 y 轴对称的那一类',
    answer: '偶',
    extraKeys: ['偶', '奇'],
    tag: '性质',
  },
  {
    formula: 'f(x) = x³ 在 R 上是增函数还是减函数？',
    question: '单调性判定',
    hint: '它的导数 3x² 永远不小于零',
    answer: '增',
    extraKeys: ['增', '减'],
    tag: '性质',
  },
  {
    formula: 'f′(x₀) = 0 且两侧导数异号，x₀ 是函数的?',
    question: '导数与极值',
    hint: '山顶和谷底都满足这一条',
    answer: '极值',
    extraKeys: ['极', '值', '拐', '点'],
    tag: '性质',
  },
  {
    formula: 'tanx 的最小正周期 = ?',
    question: '正切函数的周期',
    hint: '比正弦短一半',
    answer: 'π',
    extraKeys: ['π'],
    tag: '性质',
  },
  {
    formula: 'log₂8 = ?',
    question: '对数求值',
    hint: '2 的几次方等于 8',
    answer: '3',
    tag: '函数',
  },
  {
    formula: '向量 a⊥b，则 a·b = ?',
    question: '数量积',
    hint: '夹角 90°，余弦是零',
    answer: '0',
    tag: '函数',
  },
  {
    formula: '(x³)′ = ?x²',
    question: '幂函数求导的系数',
    hint: '指数搬下来当系数',
    answer: '3',
    tag: '导数',
  },
  {
    formula: 'sin²x = (1 - cos?x) / 2',
    question: '降幂公式',
    hint: '二倍角公式反着用',
    answer: '2',
    tag: '三角',
  },
]

const NORMALIZERS: [RegExp, string][] = [
  [/\s+/g, ''],
  [/（/g, '('],
  [/）/g, ')'],
  [/＾/g, '^'],
  [/×/g, '*'],
  [/·/g, '*'],
  [/＊/g, '*'],
  [/－/g, '-'],
  [/[|｜]/g, ''],
]

/** 判定归一化：大小写、全半角、乘号、绝对值竖线都不算差异 */
export function normalizeAnswer(raw: string) {
  let out = raw
  for (const [pattern, replacement] of NORMALIZERS) {
    out = out.replace(pattern, replacement)
  }
  out = out.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^x/g, 'ˣ')
  return out.toLowerCase()
}

export function isCorrectAnswer(raw: string, quiz: QuizDef) {
  const value = normalizeAnswer(raw)
  if (!value) return false
  if (value === normalizeAnswer(quiz.answer)) return true
  return Boolean(quiz.alts?.some((alt) => normalizeAnswer(alt) === value))
}

export function randomQuiz(exclude: string[] = []): QuizDef {
  const pool = QUIZ_BANK.filter((q) => !exclude.includes(q.formula))
  const list = pool.length ? pool : QUIZ_BANK
  return list[Math.floor(Math.random() * list.length)] ?? QUIZ_BANK[0]
}

/** 弹幕与飘字用的数学符号 */
export const MATH_GLYPHS = ['sin', 'cos', 'tan', '∫', 'π', '′', 'Σ', '√', 'lim', 'eˣ', 'Δ', 'θ']

export function randomGlyph() {
  return MATH_GLYPHS[Math.floor(Math.random() * MATH_GLYPHS.length)] ?? 'sin'
}
