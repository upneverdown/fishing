import * as THREE from 'three'

/**
 * 手绘怪物图的存放路径：把这四张图丢进 public/assets/ 即可自动替换掉程序化涂鸦。
 * 图片按白底手绘扫描效果处理，接近白色的像素会被抠成透明。
 */
export const DOODLE_FILES = [
  'monster_1.png',
  'monster_2.png',
  'monster_3.png',
  'monster_4.png',
] as const

export function doodleAssetUrl(index: number) {
  const file = DOODLE_FILES[Math.max(0, Math.min(DOODLE_FILES.length - 1, index))]
  return `${import.meta.env.BASE_URL}assets/${file}`
}

function makeCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  return canvas
}

/** 白底纸面 → 透明背景：亮度越高越透明，保留墨线 */
export function keyOutPaper(source: HTMLImageElement | HTMLCanvasElement) {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 256)
  ctx.drawImage(source, 0, 0, 256, 256)
  const data = ctx.getImageData(0, 0, 256, 256)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    // 纸白直接透掉，墨线保留；中间调按软硬边压一次
    const ink = Math.max(0, 1 - (luminance - 0.42) / 0.5)
    px[i + 3] = Math.round(px[i + 3] * Math.min(1, ink * 1.35))
    const tint = 0.72 + ink * 0.28
    px[i] = Math.round(r * tint)
    px[i + 1] = Math.round(g * tint)
    px[i + 2] = Math.round(b * tint)
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}

function textureFrom(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** 没有图片时的兜底：按涂鸦手感画的四只小鬼 */
function doodleFallback(index: number) {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')!
  const ink = '#1b1024'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const blob = (cx: number, cy: number, rx: number, ry: number, lobes: number, seed: number) => {
    ctx.beginPath()
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2
      const wob = 1 + Math.sin(a * 3 + seed) * 0.14 + Math.cos(a * 5 - seed * 0.7) * 0.08
      const x = cx + Math.cos(a) * rx * wob
      const y = cy + Math.sin(a) * ry * wob
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  ctx.strokeStyle = ink
  ctx.lineWidth = 7
  ctx.fillStyle = 'rgba(255,255,255,0.94)'

  switch (index % 4) {
    case 0: {
      // 长角的水滴鬼
      blob(128, 150, 66, 78, 26, 1.2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(84, 88)
      ctx.lineTo(62, 34)
      ctx.lineTo(104, 72)
      ctx.moveTo(172, 88)
      ctx.lineTo(196, 32)
      ctx.lineTo(154, 72)
      ctx.stroke()
      break
    }
    case 1: {
      // 三只眼的圆球
      blob(128, 138, 84, 72, 30, 3.1)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(60, 190)
      ctx.quadraticCurveTo(48, 236, 84, 224)
      ctx.moveTo(196, 190)
      ctx.quadraticCurveTo(208, 238, 172, 226)
      ctx.stroke()
      break
    }
    case 2: {
      // 锯齿嘴的方块精
      ctx.beginPath()
      ctx.rect(56, 72, 144, 132)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(56, 72)
      ctx.lineTo(28, 26)
      ctx.lineTo(92, 56)
      ctx.moveTo(200, 72)
      ctx.lineTo(230, 24)
      ctx.lineTo(166, 54)
      ctx.stroke()
      break
    }
    default: {
      // 飘带的无脸长条
      blob(128, 128, 52, 96, 34, 5.4)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        ctx.moveTo(76 + i * 26, 214)
        ctx.quadraticCurveTo(70 + i * 26, 240, 88 + i * 26, 250)
      }
      ctx.stroke()
    }
  }

  // 眼睛：永远画歪，才对味
  const eye = (x: number, y: number, r: number) => {
    ctx.beginPath()
    ctx.fillStyle = '#ffffff'
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.fillStyle = ink
    ctx.arc(x + r * 0.28, y + r * 0.2, r * 0.42, 0, Math.PI * 2)
    ctx.fill()
  }
  eye(104, 122, 17)
  eye(152, 118, 14)
  if (index % 4 === 1) eye(128, 86, 11)

  // 嘴
  ctx.beginPath()
  ctx.fillStyle = ink
  if (index % 2 === 0) {
    ctx.moveTo(96, 172)
    for (let i = 0; i < 6; i++) {
      ctx.lineTo(96 + i * 13, i % 2 === 0 ? 172 : 190)
    }
    ctx.lineTo(162, 172)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.ellipse(128, 178, 30, 14, 0.1, 0, Math.PI * 2)
    ctx.fill()
  }

  // 黑紫阴影一笔
  ctx.strokeStyle = 'rgba(88,32,112,0.55)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(128, 150, 74, 0.6, 2.2)
  ctx.stroke()

  return canvas
}

interface Slot {
  texture: THREE.Texture
  listeners: ((texture: THREE.Texture) => void)[]
  loaded: boolean
}

/**
 * 贴图槽位：先给一张程序化涂鸦保证立刻能用，
 * 再异步尝试 public/assets 里的手绘原图，成功就换脸。
 */
export class DoodleTextures {
  private slots: Slot[] = []
  private loader = new THREE.TextureLoader()

  constructor(count = DOODLE_FILES.length) {
    for (let i = 0; i < count; i++) {
      this.slots.push({ texture: textureFrom(doodleFallback(i)), listeners: [], loaded: false })
    }
    this.slots.forEach((slot, i) => this.tryLoad(i, slot))
  }

  private tryLoad(index: number, slot: Slot) {
    this.loader.load(
      doodleAssetUrl(index),
      (texture) => {
        const image = texture.image as HTMLImageElement | undefined
        if (!image) return
        try {
          const keyed = keyOutPaper(image)
          const replaced = textureFrom(keyed)
          slot.texture.dispose()
          slot.texture = replaced
          slot.loaded = true
          for (const listener of slot.listeners) listener(replaced)
          slot.listeners = []
        } catch {
          // 跨域画布取不到像素，就用原图凑合
          slot.texture = texture
          slot.loaded = true
          for (const listener of slot.listeners) listener(texture)
          slot.listeners = []
        }
      },
      undefined,
      () => {
        // public/assets 里还没有图，程序化涂鸦继续顶着
      },
    )
  }

  get count() {
    return this.slots.length
  }

  get(index: number) {
    return this.slots[Math.max(0, Math.min(this.slots.length - 1, index))]?.texture ?? this.slots[0].texture
  }

  /** 已上身的模型也能在图片到货后换脸 */
  onChange(index: number, listener: (texture: THREE.Texture) => void) {
    const slot = this.slots[Math.max(0, Math.min(this.slots.length - 1, index))]
    if (!slot) return
    if (slot.loaded) listener(slot.texture)
    else slot.listeners.push(listener)
  }

  dispose() {
    for (const slot of this.slots) slot.texture.dispose()
    this.slots = []
  }
}
