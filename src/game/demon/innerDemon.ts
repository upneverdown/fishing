import * as THREE from 'three'
import { DoodleTextures } from '@/game/demon/doodleTexture'
import { randomGlyph } from '@/game/demon/quizBank'

const GLYPH_CACHE = new Map<string, THREE.CanvasTexture>()

function glyphTexture(glyph: string) {
  const cached = GLYPH_CACHE.get(glyph)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 128, 128)
  ctx.font = 'bold 62px "Segoe UI Symbol", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#b06cff'
  ctx.shadowBlur = 22
  ctx.fillStyle = '#f0e2ff'
  ctx.fillText(glyph, 64, 66)
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'
  ctx.fillText(glyph, 64, 66)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  GLYPH_CACHE.set(glyph, texture)
  return texture
}

function mistTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(176,108,255,0.85)')
  g.addColorStop(0.42, 'rgba(76,24,110,0.5)')
  g.addColorStop(1, 'rgba(24,6,38,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

interface Billboards {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  base: Float32Array
  slot: number
  phase: number
  sway: number
}

interface Bullet {
  sprite: THREE.Sprite
  velocity: THREE.Vector3
  spin: number
  life: number
  age: number
}

const MAX_BULLETS = 42
const MIST_COUNT = 90

/** 心魔涂鸦：手绘小鬼本体，只做视觉与弹幕，伤害结算交给调用方 */
export class InnerDemon {
  readonly group = new THREE.Group()

  private textures = new DoodleTextures()
  private boards: Billboards[] = []
  private bullets: Bullet[] = []
  private mist: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private mistVelocity: Float32Array
  private aura = new THREE.PointLight('#b06cff', 0, 46, 2)
  private flash = 0
  private dying = 0
  private dyingTotal = 0.9
  private active = false
  private origin = new THREE.Vector3()
  private head = new THREE.Vector3()

  constructor(scene: THREE.Scene) {
    this.group.visible = false
    this.group.frustumCulled = false
    this.aura.castShadow = false
    this.group.add(this.aura)
    scene.add(this.group)

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(MIST_COUNT * 3)
    for (let i = 0; i < MIST_COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 1.2 + Math.random() * 3.4
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = -1.4 + Math.random() * 4.2
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.mistVelocity = new Float32Array(MIST_COUNT)
    for (let i = 0; i < MIST_COUNT; i++) this.mistVelocity[i] = 0.24 + Math.random() * 0.5
    this.mist = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        map: mistTexture(),
        color: '#8f4fd8',
        size: 1.5,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
        fog: false,
      }),
    )
    this.mist.frustumCulled = false
    this.group.add(this.mist)
  }

  get isActive() {
    return this.active
  }

  get headPosition() {
    return this.head
  }

  /** 小鬼始终绕着锚点悬停，否则打久了会飘出镜头 */
  retarget(at: THREE.Vector3, dt: number) {
    if (!this.active) return
    this.origin.lerp(at, Math.min(1, dt * 1.1))
    this.origin.y = at.y
  }

  /** 在玩家面前撕开一道口子，放出 count 只涂鸦小鬼 */
  summon(at: THREE.Vector3, count = 3) {
    this.clearBoards()
    this.origin.copy(at)
    this.dying = 0
    this.active = true
    this.group.visible = true
    this.group.position.copy(at)
    this.aura.intensity = 260

    const total = Math.max(1, Math.min(count, 4))
    for (let i = 0; i < total; i++) {
      const slot = i % this.textures.count
      const angle = (i / total) * Math.PI * 2 + Math.random() * 0.4
      const radius = total === 1 ? 0 : 2.6 + Math.random() * 1.1
      const width = 2.6 + Math.random() * 1.5
      const geometry = new THREE.PlaneGeometry(width, width * (0.92 + Math.random() * 0.2), 7, 7)
      const material = new THREE.MeshBasicMaterial({
        map: this.textures.get(slot),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
        color: '#e6d2ff',
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(
        Math.cos(angle) * radius,
        0.4 + Math.sin(i * 1.7) * 1.1,
        Math.sin(angle) * radius,
      )
      mesh.renderOrder = 8
      this.group.add(mesh)
      const base = (geometry.getAttribute('position') as THREE.BufferAttribute)
        .array as Float32Array
      this.boards.push({
        mesh,
        base: Float32Array.from(base),
        slot,
        phase: Math.random() * Math.PI * 2,
        sway: 0.7 + Math.random() * 0.6,
      })
      // 手绘图到货后无缝换脸
      this.textures.onChange(slot, (texture) => {
        material.map = texture
        material.needsUpdate = true
      })
    }
  }

  /** 玩家攻击无效时的一记闷响：小鬼被抽得变形并闪红 */
  hurt(strength = 1) {
    if (!this.active) return
    this.flash = Math.min(1.4, 0.55 + strength * 0.55)
    for (const board of this.boards) {
      board.mesh.position.x += (Math.random() - 0.5) * 0.3
      board.mesh.position.z += (Math.random() - 0.5) * 0.3
    }
  }

  /** 答对了：金色符号自鬼体炸开，小鬼被抽得当场变形 */
  celebrate() {
    if (!this.active) return
    for (let i = 0; i < 16; i++) {
      if (this.bullets.length >= MAX_BULLETS) break
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glyphTexture(randomGlyph()),
          color: '#ffe1a4',
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      )
      sprite.position
        .copy(this.group.position)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1.8,
            0.9 + Math.random() * 1.8,
            (Math.random() - 0.5) * 1.8,
          ),
        )
      sprite.scale.setScalar(0.9 + Math.random() * 0.6)
      sprite.renderOrder = 9
      this.group.parent?.add(sprite)
      this.bullets.push({
        sprite,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0.7 + Math.random() * 1.8,
          (Math.random() - 0.5) * 2,
        )
          .normalize()
          .multiplyScalar(4 + Math.random() * 4),
        spin: (Math.random() - 0.5) * 3,
        life: 1.15,
        age: 0,
      })
    }
    this.flash = 1.25
    this.recoil()
  }

  /** 金光爆发式的正确反馈：全体向后缩一下 */
  recoil() {
    for (const board of this.boards) {
      board.mesh.scale.setScalar(0.78)
    }
  }

  /** 数学符号弹幕：朝 target 抛出 count 枚 */
  fireBarrage(target: THREE.Vector3, count = 10, speed = 9) {
    if (!this.active) return
    for (let i = 0; i < count; i++) {
      if (this.bullets.length >= MAX_BULLETS) break
      const glyph = randomGlyph()
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glyphTexture(glyph),
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      )
      const world = this.group.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          0.6 + Math.random() * 1.8,
          (Math.random() - 0.5) * 2.4,
        ),
      )
      sprite.position.copy(world)
      sprite.scale.setScalar(1.1 + Math.random() * 0.5)
      sprite.renderOrder = 9
      const aim = target
        .clone()
        .sub(world)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 3.2,
            (Math.random() - 0.5) * 1.6,
            (Math.random() - 0.5) * 3.2,
          ),
        )
        .normalize()
        .multiplyScalar(speed * (0.75 + Math.random() * 0.5))
      this.group.parent?.add(sprite)
      this.bullets.push({
        sprite,
        velocity: aim,
        spin: (Math.random() - 0.5) * 5,
        life: 2.6,
        age: 0,
      })
    }
  }

  /** 小鬼散场：fade 秒内化成黑雾 */
  dismiss(fade = 0.9) {
    if (!this.active) return
    this.dyingTotal = Math.max(0.2, fade)
    this.dying = this.dyingTotal
  }

  get dyingOut() {
    return this.dying > 0
  }

  private clearBoards() {
    for (const board of this.boards) {
      this.group.remove(board.mesh)
      board.mesh.geometry.dispose()
      board.mesh.material.dispose()
    }
    this.boards = []
  }

  private clearBullets() {
    for (const bullet of this.bullets) {
      bullet.sprite.removeFromParent()
      bullet.sprite.material.dispose()
    }
    this.bullets = []
  }

  update(dt: number, time: number, camera: THREE.Camera, chase = true) {
    if (!this.active) return

    const fade = this.dying > 0 ? Math.max(0, this.dying / this.dyingTotal) : 1
    if (this.dying > 0) {
      this.dying = Math.max(0, this.dying - dt)
      if (this.dying === 0) {
        this.active = false
        this.group.visible = false
        this.aura.intensity = 0
        this.clearBoards()
        this.clearBullets()
        return
      }
    }

    // 整体缓慢漂移，贴着玩家的船转
    if (chase) {
      this.origin.x += Math.sin(time * 0.31) * dt * 1.2
      this.origin.z += Math.cos(time * 0.27) * dt * 1.2
    }
    this.group.position.x = this.origin.x
    this.group.position.z = this.origin.z
    this.group.position.y = this.origin.y + Math.sin(time * 0.9) * 0.35
    this.head.copy(this.group.position).add(new THREE.Vector3(0, 1.4, 0))

    this.flash = Math.max(0, this.flash - dt * 2.2)
    this.aura.intensity = (180 + Math.sin(time * 3.1) * 40 + this.flash * 420) * fade

    for (const board of this.boards) {
      const mesh = board.mesh
      mesh.position.y += Math.sin(time * 1.6 * board.sway + board.phase) * dt * 0.9
      // 手绘的抖动感：整体不规则缩放 + 顶点错位
      const wobble = 1 + Math.sin(time * 5.2 + board.phase) * 0.05 + Math.sin(time * 11.7) * 0.02
      const target = board.phase > Math.PI ? wobble : 2 - wobble
      mesh.scale.x += (target - mesh.scale.x) * Math.min(1, dt * 6)
      mesh.scale.y += (1 / target - mesh.scale.y) * Math.min(1, dt * 6)
      mesh.scale.z = 1
      mesh.rotation.z = Math.sin(time * 2.3 + board.phase) * 0.16
      // 广告牌：永远正对镜头
      mesh.lookAt(camera.position)

      const attribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const array = attribute.array as Float32Array
      for (let i = 0; i < array.length; i += 3) {
        const bx = board.base[i]
        const by = board.base[i + 1]
        array[i] = bx + Math.sin(time * 6.4 + by * 2.1 + board.phase) * 0.06
        array[i + 1] = by + Math.cos(time * 5.1 + bx * 2.4 + board.phase) * 0.06
      }
      attribute.needsUpdate = true

      const material = mesh.material
      material.opacity += (fade - material.opacity) * Math.min(1, dt * 3.4)
      const red = this.flash
      material.color.setRGB(1 + red * 0.6, 0.83 - red * 0.6, 1 - red * 0.85)
    }

    // 黑紫色雾气：绕着小鬼打转往上蒸
    const attribute = this.mist.geometry.getAttribute('position') as THREE.BufferAttribute
    const mist = attribute.array as Float32Array
    for (let i = 0; i < MIST_COUNT; i++) {
      const y = mist[i * 3 + 1] + this.mistVelocity[i] * dt
      const angle = Math.atan2(mist[i * 3 + 2], mist[i * 3]) + dt * 0.42
      const radius = Math.hypot(mist[i * 3], mist[i * 3 + 2]) * (1 + dt * 0.06)
      if (y > 4.6) {
        const a = Math.random() * Math.PI * 2
        const r = 1.2 + Math.random() * 2.2
        mist[i * 3] = Math.cos(a) * r
        mist[i * 3 + 1] = -1.4
        mist[i * 3 + 2] = Math.sin(a) * r
      } else {
        mist[i * 3] = Math.cos(angle) * radius
        mist[i * 3 + 1] = y
        mist[i * 3 + 2] = Math.sin(angle) * radius
      }
    }
    attribute.needsUpdate = true
    this.mist.material.opacity = (0.34 + Math.sin(time * 1.7) * 0.07) * fade

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]
      bullet.age += dt
      if (bullet.age >= bullet.life) {
        bullet.sprite.removeFromParent()
        bullet.sprite.material.dispose()
        this.bullets.splice(i, 1)
        continue
      }
      bullet.velocity.y -= dt * 1.6
      bullet.sprite.position.addScaledVector(bullet.velocity, dt)
      bullet.sprite.material.rotation += bullet.spin * dt
      const k = bullet.age / bullet.life
      bullet.sprite.material.opacity = 0.95 * (1 - k * k)
      bullet.sprite.scale.setScalar((1.1 + k * 0.5) * (1 - k * 0.35))
    }
  }

  get bulletCount() {
    return this.bullets.length
  }

  dispose() {
    this.clearBullets()
    this.clearBoards()
    this.textures.dispose()
    this.mist.geometry.dispose()
    ;(this.mist.material as THREE.PointsMaterial).map?.dispose()
    this.mist.material.dispose()
    this.group.removeFromParent()
  }
}
