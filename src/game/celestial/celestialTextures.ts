import * as THREE from 'three'
import { mulberry32 } from '@/game/utils/math'

const FONT_STACK = '"PingFang SC", "Microsoft YaHei", sans-serif'

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d')! }
}

function toTexture(canvas: HTMLCanvasElement, anisotropy = 1) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

/** 加法粒子用的软圆点：白金核心 + 暖金外晕 */
export function softSprite(size = 64): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size, size)
  const r = size / 2
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, 'rgba(255,250,230,0.86)')
  g.addColorStop(0.52, 'rgba(255,226,164,0.3)')
  g.addColorStop(0.8, 'rgba(255,206,132,0.07)')
  g.addColorStop(1, 'rgba(255,198,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

/** 大范围光晕：用于阵法、灯笼、雷龙巢的辉光 */
export function glowSprite(size = 192): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size, size)
  const r = size / 2
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, 'rgba(255,248,226,0.92)')
  g.addColorStop(0.16, 'rgba(255,226,166,0.5)')
  g.addColorStop(0.42, 'rgba(255,198,126,0.16)')
  g.addColorStop(0.72, 'rgba(255,182,140,0.05)')
  g.addColorStop(1, 'rgba(255,170,130,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

/** 地面/岛底的柔光环，贴在自己的平面网格上，天然不共面 */
export function haloRing(size = 256): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size, size)
  const r = size / 2
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, 'rgba(255,232,190,0.1)')
  g.addColorStop(0.5, 'rgba(255,228,182,0.06)')
  g.addColorStop(0.7, 'rgba(255,242,214,0.42)')
  g.addColorStop(0.82, 'rgba(255,222,166,0.14)')
  g.addColorStop(1, 'rgba(255,210,150,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = 'rgba(255,246,222,0.3)'
  ctx.lineWidth = size * 0.012
  ctx.beginPath()
  ctx.arc(r, r, r * 0.74, 0, Math.PI * 2)
  ctx.stroke()
  return toTexture(canvas)
}

/** 程序化符文环：同心弧 + 刻度 + 伪笔画，纯装饰用 */
export function runeRing(seed: number, size = 512): THREE.CanvasTexture {
  const rand = mulberry32(seed * 7919 + 31)
  const { canvas, ctx } = makeCanvas(size, size)
  const c = size / 2
  ctx.translate(c, c)

  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(255,222,158,0.85)'
  ctx.shadowBlur = size * 0.03

  const rings = [0.94, 0.8, 0.62, 0.44, 0.3]
  for (let i = 0; i < rings.length; i++) {
    const radius = c * rings[i]
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,244,214,0.72)' : 'rgba(255,208,138,0.5)'
    ctx.lineWidth = size * (i % 2 === 0 ? 0.006 : 0.0035)
    const arcs = 2 + Math.floor(rand() * 3)
    for (let a = 0; a < arcs; a++) {
      const start = rand() * Math.PI * 2
      const sweep = 0.4 + rand() * 1.9
      ctx.beginPath()
      ctx.arc(0, 0, radius, start, start + sweep)
      ctx.stroke()
    }
  }

  const ticks = 44
  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * Math.PI * 2
    const inner = c * (i % 4 === 0 ? 0.66 : 0.86)
    const outer = c * (i % 4 === 0 ? 0.77 : 0.92)
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(255,250,232,0.85)' : 'rgba(255,226,178,0.42)'
    ctx.lineWidth = size * 0.004
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
    ctx.stroke()
  }

  const glyphs = 12
  for (let i = 0; i < glyphs; i++) {
    const angle = (i / glyphs) * Math.PI * 2 + rand() * 0.2
    const radius = c * 0.53
    const gx = Math.cos(angle) * radius
    const gy = Math.sin(angle) * radius
    ctx.save()
    ctx.translate(gx, gy)
    ctx.rotate(angle + Math.PI / 2)
    ctx.strokeStyle = 'rgba(255,246,220,0.78)'
    ctx.lineWidth = size * 0.0045
    const strokes = 2 + Math.floor(rand() * 3)
    for (let s = 0; s < strokes; s++) {
      const w = (rand() - 0.5) * size * 0.05
      const h = (rand() - 0.5) * size * 0.055
      ctx.beginPath()
      ctx.moveTo(w, h)
      ctx.lineTo(w + (rand() - 0.5) * size * 0.03, h + (rand() - 0.5) * size * 0.03)
      if (rand() > 0.55) ctx.arc(w, h, size * 0.012, 0, Math.PI * (0.6 + rand()))
      ctx.stroke()
    }
    ctx.restore()
  }

  ctx.setLineDash([size * 0.02, size * 0.026])
  ctx.strokeStyle = 'rgba(184,246,255,0.5)'
  ctx.lineWidth = size * 0.003
  ctx.beginPath()
  ctx.arc(0, 0, c * 0.36, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.28)
  core.addColorStop(0, 'rgba(255,252,238,0.62)')
  core.addColorStop(0.6, 'rgba(255,226,176,0.18)')
  core.addColorStop(1, 'rgba(255,214,158,0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, c * 0.28, 0, Math.PI * 2)
  ctx.fill()

  return toTexture(canvas, 4)
}

/** 仙商幌子：竖排「仙商」 */
export function bannerTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 416)
  const g = ctx.createLinearGradient(0, 0, 0, 416)
  g.addColorStop(0, '#b6503a')
  g.addColorStop(1, '#8d3524')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 416)
  ctx.strokeStyle = '#f5d68f'
  ctx.lineWidth = 10
  ctx.strokeRect(9, 9, 110, 398)
  ctx.fillStyle = '#fdf1d2'
  ctx.font = `700 82px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('仙', 64, 122)
  ctx.fillText('商', 64, 262)
  ctx.strokeStyle = 'rgba(253,241,210,0.6)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(20, 348)
  ctx.lineTo(108, 348)
  ctx.stroke()
  return toTexture(canvas, 4)
}
