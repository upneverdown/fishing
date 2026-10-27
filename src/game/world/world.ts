import * as THREE from 'three'
import { depthAt } from './worldMap'
import { Water } from './water'
import { createTerrain, paintTerrain } from './terrain'
import {
  createBuoys,
  createDock,
  createForest,
  createIceFloes,
  createLilies,
  createRocks,
  createWaterfall,
  recolorFoliage,
  recolorLilies,
  updateIceFloes,
  type Buoy,
  type IceFloeField,
} from './props'
import { Foam } from '@/game/fx/foam'
import { createSky } from './sky'
import { SEASONS, type SeasonProfile } from './seasons'
import { CollisionWorld } from './colliders'
import type { SeasonId } from '@/types'

interface SeasonLook {
  zenith: THREE.Color
  horizon: THREE.Color
  skySun: THREE.Color
  fog: THREE.Color
  waterShallow: THREE.Color
  waterDeep: THREE.Color
  waterScatter: THREE.Color
  waterSkyZenith: THREE.Color
  waterSkyHorizon: THREE.Color
  hemiSky: THREE.Color
  hemiGround: THREE.Color
  fill: THREE.Color
  sun: THREE.Color
  hemiIntensity: number
  fillIntensity: number
  sunIntensity: number
  exposure: number
  waveScale: number
  fogNear: number
  fogFar: number
  sunOffset: THREE.Vector3
}

function lookFrom(profile: SeasonProfile): SeasonLook {
  return {
    zenith: new THREE.Color(profile.sky.zenith),
    horizon: new THREE.Color(profile.sky.horizon),
    skySun: new THREE.Color(profile.sky.sun),
    fog: new THREE.Color(profile.sky.fog),
    waterShallow: new THREE.Color(profile.water.shallow),
    waterDeep: new THREE.Color(profile.water.deep),
    waterScatter: new THREE.Color(profile.water.scatter),
    waterSkyZenith: new THREE.Color(profile.water.skyZenith),
    waterSkyHorizon: new THREE.Color(profile.water.skyHorizon),
    hemiSky: new THREE.Color(profile.light.hemiSky),
    hemiGround: new THREE.Color(profile.light.hemiGround),
    fill: new THREE.Color(profile.light.fill),
    sun: new THREE.Color(profile.light.sun),
    hemiIntensity: profile.light.hemi,
    fillIntensity: profile.light.fillIntensity,
    sunIntensity: profile.light.sunIntensity,
    exposure: profile.exposure,
    waveScale: profile.waveScale,
    fogNear: profile.fog.near,
    fogFar: profile.fog.far,
    sunOffset: new THREE.Vector3(...profile.sunOffset),
  }
}

function copyLook(dst: SeasonLook, src: SeasonLook) {
  dst.zenith.copy(src.zenith)
  dst.horizon.copy(src.horizon)
  dst.skySun.copy(src.skySun)
  dst.fog.copy(src.fog)
  dst.waterShallow.copy(src.waterShallow)
  dst.waterDeep.copy(src.waterDeep)
  dst.waterScatter.copy(src.waterScatter)
  dst.waterSkyZenith.copy(src.waterSkyZenith)
  dst.waterSkyHorizon.copy(src.waterSkyHorizon)
  dst.hemiSky.copy(src.hemiSky)
  dst.hemiGround.copy(src.hemiGround)
  dst.fill.copy(src.fill)
  dst.sun.copy(src.sun)
  dst.hemiIntensity = src.hemiIntensity
  dst.fillIntensity = src.fillIntensity
  dst.sunIntensity = src.sunIntensity
  dst.exposure = src.exposure
  dst.waveScale = src.waveScale
  dst.fogNear = src.fogNear
  dst.fogFar = src.fogFar
  dst.sunOffset.copy(src.sunOffset)
}

const UNDERWATER_FOG = new THREE.Color('#0b3540')
const UNDERWATER_BG = new THREE.Color('#0a2b36')
const UNDERWATER_SHALLOW = new THREE.Color('#2b7f83')
const UNDERWATER_DEEP = new THREE.Color('#031a24')
const UNDERWATER_SCATTER = new THREE.Color('#58d6c4')

const STORM_BG = new THREE.Color('#0a1418')
const STORM_FOG = new THREE.Color('#13252a')
const STORM_ZENITH = new THREE.Color('#0d161b')
const STORM_HORIZON = new THREE.Color('#26383b')
const STORM_HEMI = new THREE.Color('#4b6a72')
const STORM_SUN = new THREE.Color('#7d97a4')
const FLASH_COLOR = new THREE.Color('#dff8ff')

const DOOM_BG = new THREE.Color('#2a0b0d')
const DOOM_FOG = new THREE.Color('#3c0f12')
const DOOM_ZENITH = new THREE.Color('#160406')
const DOOM_HORIZON = new THREE.Color('#6b1a1c')
const DOOM_HEMI = new THREE.Color('#8a2c2a')
const DOOM_SUN = new THREE.Color('#b0483a')

function lightningTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 512)
  ctx.strokeStyle = '#f2fdff'
  ctx.shadowColor = '#9ff3ff'
  ctx.shadowBlur = 26
  ctx.lineWidth = 9
  ctx.lineJoin = 'round'
  const points: { x: number; y: number }[] = []
  let x = 128
  for (let y = 4; y <= 496; y += 28) {
    x += (Math.random() - 0.5) * 74
    x = Math.max(18, Math.min(238, x))
    points.push({ x, y })
  }
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  ctx.shadowBlur = 10
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class World {
  readonly water: Water
  readonly foam: Foam
  readonly colliders = new CollisionWorld()

  private buoys: Buoy[]
  private waterfallMaterial: THREE.ShaderMaterial
  private waterfallUpdate: (time: number, dt: number) => void
  private hemi: THREE.HemisphereLight
  private sun: THREE.DirectionalLight
  private fill: THREE.DirectionalLight
  private sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  private terrain: THREE.Mesh
  private foliage: THREE.InstancedMesh
  private lilies: THREE.InstancedMesh
  private ice: IceFloeField
  private diveLight: THREE.PointLight
  private lightningLight: THREE.PointLight
  private lightningSprite: THREE.Sprite
  private lightningFlash = 0
  private lightningOffset = new THREE.Vector3()
  private storm = 0
  private stormTarget = 0
  private doom = 0
  private doomTarget = 0

  private seasonId: SeasonId = 'spring'
  private look: SeasonLook
  private target: SeasonLook
  private underwater = false
  private time = 0
  private sunDir = new THREE.Vector3()

  constructor(private scene: THREE.Scene) {
    const spring = lookFrom(SEASONS.spring)
    this.look = lookFrom(SEASONS.spring)
    this.target = spring

    scene.background = new THREE.Color(SEASONS.spring.sky.horizon)
    scene.fog = new THREE.Fog(SEASONS.spring.sky.fog, SEASONS.spring.fog.near, SEASONS.spring.fog.far)

    const lights = this.setupLights(scene)
    this.hemi = lights.hemi
    this.sun = lights.sun
    this.fill = lights.fill

    this.sky = createSky(this.sun.position)
    scene.add(this.sky)

    this.terrain = createTerrain()
    scene.add(this.terrain)

    this.water = new Water()
    this.water.setSun(this.sun.position, this.sun.color)
    this.water.setFogColor(scene.fog.color)
    this.water.setFogRange(scene.fog.near, scene.fog.far)
    scene.add(this.water.mesh)

    scene.add(createDock(this.colliders))
    const forest = createForest()
    scene.add(forest.group)
    this.foliage = forest.foliage
    scene.add(createRocks(this.colliders))
    const lilies = createLilies()
    scene.add(lilies.group)
    this.lilies = lilies.mesh

    const waterfall = createWaterfall()
    scene.add(waterfall.group)
    this.waterfallMaterial = waterfall.material
    this.waterfallUpdate = waterfall.update

    this.lightningLight = new THREE.PointLight('#dff6ff', 0, 320, 2)
    this.lightningLight.position.set(0, 45, 0)
    scene.add(this.lightningLight)

    const boltTexture = lightningTexture()
    const boltMaterial = new THREE.SpriteMaterial({
      map: boltTexture,
      color: '#f2fdff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
    this.lightningSprite = new THREE.Sprite(boltMaterial)
    this.lightningSprite.scale.set(46, 92, 1)
    this.lightningSprite.visible = false
    this.lightningSprite.renderOrder = 8
    scene.add(this.lightningSprite)

    this.buoys = createBuoys()
    for (const buoy of this.buoys) scene.add(buoy.group)
    this.buoys.forEach((buoy, i) => this.water.setContact(i + 1, buoy.x, buoy.z, 0.62, 0.2))

    this.ice = createIceFloes()
    scene.add(this.ice.group)

    this.diveLight = new THREE.PointLight('#67e2d2', 0, 34, 2)
    this.diveLight.position.set(0, -2, 0)
    scene.add(this.diveLight)

    this.foam = new Foam(scene, (x, z) => this.waveHeight(x, z, this.time))

    this.applySeasonTargets()
    this.applyScene(new THREE.Vector3())
  }

  private setupLights(scene: THREE.Scene) {
    const hemi = new THREE.HemisphereLight('#d5efe7', '#3d5a3c', 1.3)
    scene.add(hemi)

    const sun = new THREE.DirectionalLight('#ffe9cc', 3.05)
    sun.position.set(-16, 32, -78)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -82
    sun.shadow.camera.right = 82
    sun.shadow.camera.top = 82
    sun.shadow.camera.bottom = -82
    sun.shadow.camera.near = 10
    sun.shadow.camera.far = 240
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.035
    scene.add(sun)
    scene.add(sun.target)

    const fill = new THREE.DirectionalLight('#9fd8d4', 0.55)
    fill.position.set(38, 24, 26)
    scene.add(fill)
    scene.add(fill.target)

    return { hemi, sun, fill }
  }

  setSeason(season: SeasonId, immediate = false) {
    if (season === this.seasonId && !immediate) return
    this.seasonId = season
    this.target = lookFrom(SEASONS[season])
    if (immediate) copyLook(this.look, this.target)
    this.applySeasonTargets()
  }

  private applySeasonTargets() {
    const profile = SEASONS[this.seasonId]
    paintTerrain(this.terrain, profile.terrain)
    recolorFoliage(this.foliage, profile.foliage)
    recolorLilies(this.lilies, profile.lilies)
    this.lilies.visible = this.seasonId !== 'winter'
    this.ice.group.visible = this.seasonId === 'winter' && profile.ice > 0
  }

  setUnderwater(underwater: boolean) {
    this.underwater = underwater
    this.sky.visible = !underwater
    if (underwater) this.diveLight.intensity = 2.4
    else this.diveLight.intensity = 0
  }

  setDiveLightPosition(position: THREE.Vector3) {
    this.diveLight.position.copy(position)
  }

  setStorm(strength: number) {
    this.stormTarget = THREE.MathUtils.clamp(strength, 0, 1)
  }

  /** 渡劫时的压抑暗红天象 */
  setDoom(amount: number) {
    this.doomTarget = THREE.MathUtils.clamp(amount, 0, 1)
  }

  get doomStrength() {
    return this.doom
  }

  get stormStrength() {
    return this.storm
  }

  flashLightning(power = 1) {
    this.lightningFlash = Math.max(this.lightningFlash, THREE.MathUtils.clamp(power, 0.25, 1.3))
    this.lightningOffset.set((Math.random() - 0.5) * 90, 0, (Math.random() - 0.5) * 90)
    const material = this.lightningSprite.material as THREE.SpriteMaterial
    material.opacity = 1
    this.lightningSprite.visible = true
    this.lightningSprite.scale.set(34 + Math.random() * 28, 80 + Math.random() * 46, 1)
    this.lightningSprite.material.rotation = (Math.random() - 0.5) * 0.16
  }

  private lerpLook(dt: number) {
    const k = 1 - Math.exp(-dt * 2.2)
    const a = this.look
    const b = this.target
    a.zenith.lerp(b.zenith, k)
    a.horizon.lerp(b.horizon, k)
    a.skySun.lerp(b.skySun, k)
    a.fog.lerp(b.fog, k)
    a.waterShallow.lerp(b.waterShallow, k)
    a.waterDeep.lerp(b.waterDeep, k)
    a.waterScatter.lerp(b.waterScatter, k)
    a.waterSkyZenith.lerp(b.waterSkyZenith, k)
    a.waterSkyHorizon.lerp(b.waterSkyHorizon, k)
    a.hemiSky.lerp(b.hemiSky, k)
    a.hemiGround.lerp(b.hemiGround, k)
    a.fill.lerp(b.fill, k)
    a.sun.lerp(b.sun, k)
    a.hemiIntensity += (b.hemiIntensity - a.hemiIntensity) * k
    a.fillIntensity += (b.fillIntensity - a.fillIntensity) * k
    a.sunIntensity += (b.sunIntensity - a.sunIntensity) * k
    a.exposure += (b.exposure - a.exposure) * k
    a.waveScale += (b.waveScale - a.waveScale) * k
    a.fogNear += (b.fogNear - a.fogNear) * k
    a.fogFar += (b.fogFar - a.fogFar) * k
    a.sunOffset.lerp(b.sunOffset, k)
  }

  private applyScene(center: THREE.Vector3) {
    const look = this.look
    const fog = this.scene.fog as THREE.Fog
    const background = this.scene.background as THREE.Color

    this.sun.position.copy(center).add(look.sunOffset)
    this.sun.target.position.copy(center)
    this.sun.target.updateMatrixWorld()
    this.fill.position.copy(center).add(new THREE.Vector3(38, 24, 26))
    this.fill.target.position.copy(center)
    this.fill.target.updateMatrixWorld()

    this.sunDir.copy(look.sunOffset).normalize()
    const skyUniforms = this.sky.material.uniforms
    ;(skyUniforms.uZenith.value as THREE.Color).copy(look.zenith)
    ;(skyUniforms.uHorizon.value as THREE.Color).copy(look.horizon)
    ;(skyUniforms.uSunColor.value as THREE.Color).copy(look.skySun)
    ;(skyUniforms.uSunDir.value as THREE.Vector3).copy(this.sunDir)
    this.sky.position.copy(center)

    this.sun.color.copy(look.sun)
    this.hemi.color.copy(look.hemiSky)
    this.hemi.groundColor.copy(look.hemiGround)
    this.fill.color.copy(look.fill)

    if (this.underwater) {
      background.copy(UNDERWATER_BG)
      fog.color.copy(UNDERWATER_FOG)
      fog.near = 0.5
      fog.far = 46
      this.hemi.intensity = 0.92
      this.sun.intensity = 0.6
      this.fill.intensity = 0.4
      this.water.setSeasonWater({
        shallow: `#${UNDERWATER_SHALLOW.getHexString()}`,
        deep: `#${UNDERWATER_DEEP.getHexString()}`,
        scatter: `#${UNDERWATER_SCATTER.getHexString()}`,
        skyZenith: '#2a6070',
        skyHorizon: '#6fa9ad',
      })
      this.water.setFogColor(UNDERWATER_FOG)
      this.water.setFogRange(0.5, 46)
      this.water.setWaveScale(look.waveScale)
      this.water.setSun(new THREE.Vector3(0.2, 1, 0.15).normalize(), new THREE.Color('#bfeefc'))
    } else {
      background.copy(look.horizon)
      fog.color.copy(look.fog)
      fog.near = look.fogNear
      fog.far = look.fogFar
      this.hemi.intensity = look.hemiIntensity
      this.sun.intensity = look.sunIntensity
      this.fill.intensity = look.fillIntensity
      this.water.setSeasonWater({
        shallow: `#${look.waterShallow.getHexString()}`,
        deep: `#${look.waterDeep.getHexString()}`,
        scatter: `#${look.waterScatter.getHexString()}`,
        skyZenith: `#${look.waterSkyZenith.getHexString()}`,
        skyHorizon: `#${look.waterSkyHorizon.getHexString()}`,
      })
      this.water.setFogColor(fog.color)
      this.water.setFogRange(fog.near, fog.far)
      this.water.setWaveScale(look.waveScale)
      this.water.setSun(this.sunDir, look.sun)
    }

    if (!this.underwater && this.storm > 0.002) {
      const s = this.storm
      background.lerp(STORM_BG, s * 0.78)
      fog.color.lerp(STORM_FOG, s * 0.76)
      const uniforms = this.sky.material.uniforms
      ;(uniforms.uZenith.value as THREE.Color).copy(look.zenith).lerp(STORM_ZENITH, s)
      ;(uniforms.uHorizon.value as THREE.Color).copy(look.horizon).lerp(STORM_HORIZON, s)
      ;(uniforms.uSunColor.value as THREE.Color).copy(look.skySun).lerp(STORM_SUN, s * 0.9)
      this.hemi.color.copy(look.hemiSky).lerp(STORM_HEMI, s * 0.72)
      this.hemi.intensity *= 1 - s * 0.5
      this.sun.color.copy(look.sun).lerp(STORM_SUN, s * 0.85)
      this.sun.intensity *= 1 - s * 0.72
      this.fill.intensity *= 1 - s * 0.5
    }

    if (this.doom > 0.004 && !this.underwater) {
      const s = this.doom
      background.lerp(DOOM_BG, s * 0.86)
      fog.color.lerp(DOOM_FOG, s * 0.82)
      const uniforms = this.sky.material.uniforms
      ;(uniforms.uZenith.value as THREE.Color).lerp(DOOM_ZENITH, s * 0.9)
      ;(uniforms.uHorizon.value as THREE.Color).lerp(DOOM_HORIZON, s * 0.88)
      ;(uniforms.uSunColor.value as THREE.Color).lerp(DOOM_SUN, s * 0.8)
      this.hemi.color.lerp(DOOM_HEMI, s * 0.75)
      this.hemi.intensity *= 1 - s * 0.45
      this.sun.color.lerp(DOOM_SUN, s * 0.8)
      this.sun.intensity *= 1 - s * 0.6
      this.fill.intensity *= 1 - s * 0.55
    }

    if (this.lightningFlash > 0.01 && !this.underwater) {
      this.hemi.intensity += this.lightningFlash * 3.4
      this.sun.intensity += this.lightningFlash * 2.2
      background.lerp(FLASH_COLOR, this.lightningFlash * 0.3)
      fog.color.lerp(FLASH_COLOR, this.lightningFlash * 0.12)
    }
  }

  update(time: number, dt: number, center: THREE.Vector3) {
    this.time = time
    this.storm += (this.stormTarget - this.storm) * (1 - Math.exp(-dt * 1.7))
    this.doom += (this.doomTarget - this.doom) * (1 - Math.exp(-dt * 2.6))
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.6)
    this.lerpLook(dt)
    this.applyScene(center)

    this.water.setTime(time)
    this.waterfallMaterial.uniforms.uTime.value = time
    this.waterfallUpdate(time, dt)
    this.sky.material.uniforms.uTime.value = time

    this.lightningLight.position.copy(center).add(this.lightningOffset)
    this.lightningLight.position.y += 42
    this.lightningLight.intensity = this.lightningFlash * 900
    this.lightningSprite.position.copy(center).add(this.lightningOffset)
    this.lightningSprite.position.y += 36
    ;(this.lightningSprite.material as THREE.SpriteMaterial).opacity = this.lightningFlash
    this.lightningSprite.visible = this.lightningFlash > 0.02

    if (this.storm > 0.01) {
      this.water.setFogRange(4, 118)
    }

    for (const buoy of this.buoys) {
      const wave = this.water.waveHeight(buoy.x, buoy.z, time)
      buoy.group.position.y = wave + 0.02
      buoy.group.rotation.z = Math.sin(time * 1.4 + buoy.phase) * 0.09
      buoy.group.rotation.x = Math.cos(time * 1.1 + buoy.phase) * 0.06
    }

    if (this.ice.group.visible) {
      updateIceFloes(this.ice, time, (x, z) => this.water.waveHeight(x, z, time))
    }
  }

  get exposure() {
    return this.underwater ? this.look.exposure * 1.02 : this.look.exposure
  }

  get sunDirection() {
    return this.sunDir
  }

  get currentSeason() {
    return this.seasonId
  }

  get isUnderwater() {
    return this.underwater
  }

  waveHeight(x: number, z: number, time: number) {
    return this.water.waveHeight(x, z, time)
  }

  depthAt(x: number, z: number) {
    return depthAt(x, z)
  }

  updateFoam(dt: number) {
    this.foam.update(dt)
  }
}
