import * as THREE from 'three'
import { mulberry32 } from '@/game/utils/math'
import { SPOTS, depthAt, terrainHeight } from './worldMap'

const woodLight = new THREE.MeshStandardMaterial({ color: '#a97a4b', roughness: 0.92, flatShading: true })
const woodDark = new THREE.MeshStandardMaterial({ color: '#6d4a2d', roughness: 0.95, flatShading: true })
const woodPale = new THREE.MeshStandardMaterial({ color: '#c09463', roughness: 0.9, flatShading: true })
const stoneMat = new THREE.MeshStandardMaterial({ color: '#7b837a', roughness: 1, flatShading: true })
const metalMat = new THREE.MeshStandardMaterial({ color: '#4c5450', roughness: 0.6, metalness: 0.35 })

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  cast = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}

function makeSignTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f0e1bf'
  ctx.fillRect(0, 0, 640, 200)
  ctx.strokeStyle = '#6d4a2d'
  ctx.lineWidth = 10
  ctx.strokeRect(12, 12, 616, 176)
  ctx.fillStyle = '#3a2a1b'
  ctx.font = '700 76px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('渔获收购站', 320, 88)
  ctx.fillStyle = '#8a6a45'
  ctx.font = '600 28px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('FRESH CATCH · OPEN', 320, 152)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function createDock(): THREE.Group {
  const group = new THREE.Group()

  const deckY = 1.12
  const startZ = 30.4
  const plankCount = 16
  for (let i = 0; i < plankCount; i++) {
    const mat = i % 3 === 0 ? woodPale : woodLight
    const plank = box(5.6, 0.16, 1.0, mat, 2, deckY, startZ + i * 1.04)
    plank.castShadow = true
    group.add(plank)
  }

  group.add(box(0.22, 0.34, 14.8, woodDark, 2 - 2.3, deckY - 0.22, 37.3))
  group.add(box(0.22, 0.34, 14.8, woodDark, 2 + 2.3, deckY - 0.22, 37.3))

  const postPositions = [30.6, 34.8, 39.2, 43.6, 45.4]
  for (const z of postPositions) {
    for (const x of [2 - 2.5, 2 + 2.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 5.2, 6), woodDark)
      post.position.set(x, -1.2, z)
      post.castShadow = true
      group.add(post)
    }
  }

  const hut = new THREE.Group()
  hut.position.set(2, 0.34, 49.6)
  hut.add(box(5.2, 0.4, 4.6, stoneMat, 0, 0.2, 0))
  hut.add(box(4.7, 2.5, 4.1, woodLight, 0, 1.65, 0))
  hut.add(box(4.9, 0.18, 4.3, woodDark, 0, 2.92, 0))

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.15, 1.7, 4),
    new THREE.MeshStandardMaterial({ color: '#8d4d3d', roughness: 0.9, flatShading: true }),
  )
  roof.position.set(0, 3.85, 0)
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  hut.add(roof)

  hut.add(box(1.15, 1.9, 0.12, woodDark, 0, 1.25, -2.08))
  hut.add(box(1.4, 0.14, 0.5, woodPale, 0, 0.3, -2.3))

  const windowMat = new THREE.MeshStandardMaterial({
    color: '#ffe6a8',
    emissive: '#ffbf5e',
    emissiveIntensity: 0.7,
    roughness: 0.5,
  })
  hut.add(box(1.0, 0.8, 0.1, windowMat, -1.45, 1.8, -2.08, false))

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 0.84),
    new THREE.MeshStandardMaterial({ map: makeSignTexture(), roughness: 0.9 }),
  )
  sign.position.set(0.75, 2.5, -2.12)
  sign.rotation.y = Math.PI
  hut.add(sign)

  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({
      color: '#ffd98c',
      emissive: '#ffb347',
      emissiveIntensity: 2.2,
    }),
  )
  lantern.position.set(2.15, 2.35, -2.25)
  hut.add(lantern)
  const lanternLight = new THREE.PointLight(0xffb35c, 6, 14, 2)
  lanternLight.position.copy(lantern.position)
  hut.add(lanternLight)

  group.add(hut)

  const crateMat = new THREE.MeshStandardMaterial({ color: '#b78952', roughness: 0.95, flatShading: true })
  group.add(box(1.1, 1.0, 1.1, crateMat, 4.9, 0.9, 45.4))
  group.add(box(0.9, 0.8, 0.9, crateMat, 5.6, 0.75, 44.3))
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.95, 10), woodDark)
  barrel.position.set(-0.7, 0.85, 44.6)
  barrel.castShadow = true
  group.add(barrel)

  const scaleTop = box(1.5, 0.12, 0.8, woodPale, 2, 1.9, 33.4)
  group.add(scaleTop)
  group.add(box(0.16, 0.75, 0.16, metalMat, 2, 1.5, 33.4))
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14), metalMat)
  plate.position.set(2, 2.0, 33.4)
  plate.castShadow = true
  group.add(plate)

  return group
}

export function createForest(): { group: THREE.Group; foliage: THREE.InstancedMesh } {
  const group = new THREE.Group()
  const rand = mulberry32(20261024)

  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1.4, 5)
  const foliageGeo = new THREE.ConeGeometry(1.18, 3.9, 7)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1, flatShading: true })
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })

  const total = 300
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, total)
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, total)
  trunks.castShadow = true
  foliage.castShadow = true
  foliage.receiveShadow = true
  trunks.receiveShadow = true

  const palette = ['#3a673c', '#477544', '#528349', '#35603b', '#5d8c4d', '#41703e']
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let count = 0
  let attempts = 0

  while (count < total && attempts < 12000) {
    attempts++
    const x = (rand() * 2 - 1) * 150
    const z = (rand() * 2 - 1) * 150
    const h = terrainHeight(x, z)
    if (h < 0.7 || h > 10.5) continue
    if (z > 35 && Math.abs(x - 2) < 14) continue
    if (x > 23 && x < 56 && z > 52) continue
    if (Math.hypot(x - 2, z - 49.6) < 14) continue
    if (rand() < 0.18 && h > 5) continue

    const s = 0.75 + rand() * 0.9
    const lean = (rand() - 0.5) * 0.08

    dummy.position.set(x, h + 0.7 * s, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.set(0, rand() * Math.PI * 2, lean)
    dummy.updateMatrix()
    trunks.setMatrixAt(count, dummy.matrix)

    dummy.position.set(x + lean * 2, h + 3.3 * s, z)
    dummy.scale.set(s * (0.85 + rand() * 0.3), s * (0.9 + rand() * 0.25), s * (0.85 + rand() * 0.3))
    dummy.rotation.set(0, rand() * Math.PI * 2, 0)
    dummy.updateMatrix()
    foliage.setMatrixAt(count, dummy.matrix)
    color.set(palette[Math.floor(rand() * palette.length)])
    color.offsetHSL(0, 0, (rand() - 0.5) * 0.05)
    foliage.setColorAt(count, color)

    count++
  }

  trunks.count = count
  foliage.count = count
  trunks.instanceMatrix.needsUpdate = true
  foliage.instanceMatrix.needsUpdate = true
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true

  group.add(trunks, foliage)
  return { group, foliage }
}

export function createRocks(): THREE.Group {
  const group = new THREE.Group()
  const rand = mulberry32(778899)
  const geo = new THREE.DodecahedronGeometry(1, 0)
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true })
  const total = 90
  const mesh = new THREE.InstancedMesh(geo, mat, total)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let count = 0
  let attempts = 0

  while (count < total && attempts < 4000) {
    attempts++
    const x = (rand() * 2 - 1) * 145
    const z = (rand() * 2 - 1) * 145
    const h = terrainHeight(x, z)
    if (h < -1.4 || h > 2.6) continue
    if (z > 32 && Math.abs(x - 2) < 8) continue

    const s = 0.45 + rand() * 1.35
    dummy.position.set(x, h + s * 0.25, z)
    dummy.scale.set(s * (0.8 + rand() * 0.6), s * (0.55 + rand() * 0.5), s * (0.8 + rand() * 0.6))
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    dummy.updateMatrix()
    mesh.setMatrixAt(count, dummy.matrix)
    color.set(rand() > 0.5 ? '#7e877c' : '#6a746b')
    color.offsetHSL(0, 0, (rand() - 0.5) * 0.08)
    mesh.setColorAt(count, color)
    count++
  }
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  group.add(mesh)

  const isletMat = new THREE.MeshStandardMaterial({ color: '#77806f', roughness: 1, flatShading: true })
  const islet = new THREE.Group()
  for (let i = 0; i < 4; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + Math.random() * 0.9, 0), isletMat)
    rock.position.set(14 + i * 0.9, -0.1, 6 + i * 0.6)
    rock.scale.set(1.1, 0.75, 1)
    rock.castShadow = true
    islet.add(rock)
  }
  group.add(islet)

  return group
}

export function createLilies(): { group: THREE.Group; mesh: THREE.InstancedMesh } {
  const group = new THREE.Group()
  const rand = mulberry32(4242)
  const geo = new THREE.CircleGeometry(0.55, 9)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true })
  const mesh = new THREE.InstancedMesh(geo, mat, 46)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let count = 0
  let attempts = 0

  while (count < 46 && attempts < 2500) {
    attempts++
    const x = (rand() * 2 - 1) * 95
    const z = (rand() * 2 - 1) * 80
    const depth = depthAt(x, z)
    if (depth < 0.45 || depth > 1.9) continue

    dummy.position.set(x, 0.045, z)
    const s = 0.5 + rand() * 1.1
    dummy.scale.set(s, 1, s)
    dummy.rotation.set(0, rand() * Math.PI * 2, 0)
    dummy.updateMatrix()
    mesh.setMatrixAt(count, dummy.matrix)
    color.set(rand() > 0.5 ? '#4f9a63' : '#619f5a')
    color.offsetHSL(0, 0, (rand() - 0.5) * 0.06)
    mesh.setColorAt(count, color)
    count++
  }
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  group.add(mesh)
  return { group, mesh }
}

export function recolorFoliage(foliage: THREE.InstancedMesh, palette: string[]) {
  const color = new THREE.Color()
  for (let i = 0; i < foliage.count; i++) {
    const base = palette[i % palette.length]
    color.set(base)
    const shift = Math.sin(i * 12.9898) * 0.5 + 0.5
    color.offsetHSL((shift - 0.5) * 0.02, 0, (shift - 0.5) * 0.06)
    foliage.setColorAt(i, color)
  }
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true
}

export function recolorLilies(mesh: THREE.InstancedMesh, colorHex: string) {
  const color = new THREE.Color()
  for (let i = 0; i < mesh.count; i++) {
    color.set(colorHex)
    color.offsetHSL(0, 0, (Math.sin(i * 4.7) * 0.5) * 0.05)
    mesh.setColorAt(i, color)
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

export interface IceFloeField {
  group: THREE.Group
  mesh: THREE.InstancedMesh
  base: { x: number; z: number; scale: number; phase: number; rotation: number }[]
}

export function createIceFloes(count = 34): IceFloeField {
  const rand = mulberry32(90210)
  const geo = new THREE.CylinderGeometry(1, 0.86, 0.07, 7)
  const mat = new THREE.MeshStandardMaterial({
    color: '#dcecf2',
    roughness: 0.35,
    metalness: 0.05,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.castShadow = false
  mesh.receiveShadow = true
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const base: IceFloeField['base'] = []
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let n = 0
  let attempts = 0

  while (n < count && attempts < 6000) {
    attempts++
    const x = (rand() * 2 - 1) * 118
    const z = (rand() * 2 - 1) * 118
    if (depthAt(x, z) < 1.1) continue
    if (Math.hypot(x - 2, z - 30) < 18) continue
    const scale = 0.8 + rand() * 2.6
    const phase = rand() * Math.PI * 2
    const rotation = rand() * Math.PI * 2
    base.push({ x, z, scale, phase, rotation })
    dummy.position.set(x, 0.02, z)
    dummy.rotation.set(0, rotation, 0)
    dummy.scale.set(scale, 1, scale * (0.6 + rand() * 0.5))
    dummy.updateMatrix()
    mesh.setMatrixAt(n, dummy.matrix)
    color.set(rand() > 0.5 ? '#dcecf2' : '#c5dbe4')
    mesh.setColorAt(n, color)
    n++
  }
  mesh.count = n
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  const group = new THREE.Group()
  group.add(mesh)
  group.visible = false
  return { group, mesh, base }
}

export function updateIceFloes(field: IceFloeField, time: number, waveHeight: (x: number, z: number) => number) {
  const dummy = new THREE.Object3D()
  for (let i = 0; i < field.base.length; i++) {
    const b = field.base[i]
    dummy.position.set(b.x, waveHeight(b.x, b.z) + 0.03, b.z)
    dummy.rotation.set(Math.sin(time * 0.5 + b.phase) * 0.03, b.rotation + time * 0.008, 0)
    dummy.scale.set(b.scale, 1, b.scale * 0.78)
    dummy.updateMatrix()
    field.mesh.setMatrixAt(i, dummy.matrix)
  }
  field.mesh.instanceMatrix.needsUpdate = true
}

const fallVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fallFragment = /* glsl */ `
  #include <common>

  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float t = uTime;
    float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(0.0, 0.07, 1.0 - vUv.x);
    float fade = smoothstep(0.02, 0.12, vUv.y) * smoothstep(0.0, 0.1, 1.0 - vUv.y);

    float wave = sin(vUv.y * 14.0 + t * 2.1 + sin(vUv.x * 8.0 + t * 0.7) * 0.6) * 0.5 + 0.5;
    float stream = sin(vUv.y * 42.0 - t * 8.4 + vUv.x * 8.0 + wave * 1.4) * 0.5 + 0.5;
    stream = smoothstep(0.18, 0.92, stream);
    float fine = sin(vUv.y * 104.0 - t * 17.0 + vUv.x * 26.0) * 0.5 + 0.5;
    float shine = smoothstep(0.72, 1.0, fine);
    float bottom = smoothstep(0.72, 1.0, 1.0 - vUv.y);
    float top = smoothstep(0.5, 1.0, vUv.y);

    vec3 deep = vec3(0.24, 0.58, 0.62);
    vec3 light = vec3(0.9, 0.99, 1.0);
    vec3 color = mix(deep, light, 0.2 + stream * 0.52 + shine * 0.26);
    color += vec3(0.04, 0.11, 0.13) * sin(vUv.y * 20.0 - t * 3.2);
    color += vec3(0.34, 0.5, 0.52) * bottom * 0.55;
    color = mix(color, vec3(1.0), top * 0.18);

    float alpha = (0.22 + stream * 0.38 + shine * 0.22 + bottom * 0.24) * edge * fade;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function mistTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.45, 'rgba(220,248,244,0.38)')
  g.addColorStop(1, 'rgba(220,248,244,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createWaterfall(): {
  group: THREE.Group
  material: THREE.ShaderMaterial
  update: (time: number, dt: number) => void
} {
  const group = new THREE.Group()

  const cliffMat = new THREE.MeshStandardMaterial({ color: '#6c746b', roughness: 1, flatShading: true })
  const cliffDark = new THREE.MeshStandardMaterial({ color: '#565f57', roughness: 1, flatShading: true })

  const blocks = [
    { x: 31, z: 66, w: 9, h: 9, d: 7, r: -0.1 },
    { x: 40, z: 67.5, w: 10, h: 12, d: 8, r: 0.08 },
    { x: 48, z: 65, w: 8, h: 8, d: 6, r: -0.06 },
    { x: 34.5, z: 69, w: 9, h: 15, d: 7, r: 0.12 },
    { x: 45, z: 70, w: 11, h: 14, d: 8, r: -0.08 },
  ]
  for (const b of blocks) {
    const mesh = box(b.w, b.h, b.d, Math.random() > 0.5 ? cliffMat : cliffDark, b.x, b.h / 2 - 1.2, b.z)
    mesh.rotation.y = b.r
    group.add(mesh)
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: fallVertex,
    fragmentShader: fallFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    side: THREE.DoubleSide,
  })
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 12.5), material)
  fall.position.set(38.5, 5.4, 61.6)
  fall.renderOrder = 2
  group.add(fall)

  const foamMat = new THREE.MeshBasicMaterial({
    color: '#eafff8',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  for (let i = 0; i < 5; i++) {
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1.4 + i * 0.9, 18), foamMat.clone())
    foam.rotation.x = -Math.PI / 2
    foam.position.set(38.5 + (i % 2 === 0 ? -1 : 1) * 0.9, 0.06, 60.6 + i * 0.55)
    group.add(foam)
  }

  const splashCount = 110
  const splashPositions = new Float32Array(splashCount * 3)
  const splashVelocity = new Float32Array(splashCount * 3)
  const splashLife = new Float32Array(splashCount)
  const splashGeo = new THREE.BufferGeometry()
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3))
  const splash = new THREE.Points(
    splashGeo,
    new THREE.PointsMaterial({
      size: 0.42,
      map: mistTexture(),
      color: '#e8fffb',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  )
  splash.frustumCulled = false
  group.add(splash)

  const mistTex = mistTexture()
  const mists: THREE.Sprite[] = []
  for (let i = 0; i < 7; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: mistTex,
        color: '#dff7f3',
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    sprite.position.set(
      38.5 + (Math.random() - 0.5) * 7.4,
      1.2 + Math.random() * 3.4,
      60.4 + (Math.random() - 0.5) * 3.4,
    )
    const size = 7 + Math.random() * 7
    sprite.scale.set(size, size * 0.7, 1)
    group.add(sprite)
    mists.push(sprite)
  }

  const respawn = (i: number) => {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 2.6
    splashPositions[i * 3] = 38.5 + Math.cos(angle) * radius
    splashPositions[i * 3 + 1] = 0.15 + Math.random() * 0.5
    splashPositions[i * 3 + 2] = 61.2 + Math.sin(angle) * radius * 0.5
    splashVelocity[i * 3] = Math.cos(angle) * (1.4 + Math.random() * 2.4)
    splashVelocity[i * 3 + 1] = 2.8 + Math.random() * 4.2
    splashVelocity[i * 3 + 2] = (Math.random() - 0.5) * 2.2
    splashLife[i] = 0.5 + Math.random() * 0.9
  }
  for (let i = 0; i < splashCount; i++) {
    respawn(i)
    splashLife[i] = Math.random() * 1.4
  }

  const update = (time: number, dt: number) => {
    for (let i = 0; i < splashCount; i++) {
      splashLife[i] -= dt
      if (splashLife[i] <= 0) respawn(i)
      splashVelocity[i * 3 + 1] -= 9.4 * dt
      splashPositions[i * 3] += splashVelocity[i * 3] * dt
      splashPositions[i * 3 + 1] += splashVelocity[i * 3 + 1] * dt
      splashPositions[i * 3 + 2] += splashVelocity[i * 3 + 2] * dt
      if (splashPositions[i * 3 + 1] < 0.05) respawn(i)
    }
    ;(splashGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true

    for (let i = 0; i < mists.length; i++) {
      const sprite = mists[i]
      const phase = time * (0.32 + i * 0.045) + i * 1.7
      sprite.position.y = 1.3 + Math.sin(phase) * 1.1 + (i % 3) * 0.55
      sprite.position.x = 38.5 + Math.sin(phase * 0.6 + i) * 3.4
      const breathe = 0.5 + 0.5 * Math.sin(phase * 1.3 + i)
      const size = 6.5 + breathe * 5.5
      sprite.scale.set(size, size * 0.65, 1)
      ;(sprite.material as THREE.SpriteMaterial).opacity = 0.06 + breathe * 0.11
      ;(sprite.material as THREE.SpriteMaterial).rotation = Math.sin(phase * 0.5) * 0.35
    }
  }

  return { group, material, update }
}

export interface Buoy {
  group: THREE.Group
  x: number
  z: number
  phase: number
}

export function createBuoys(): Buoy[] {
  const buoys: Buoy[] = []
  SPOTS.forEach((spot, index) => {
    const group = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.55, 10),
      new THREE.MeshStandardMaterial({ color: '#e8e3d3', roughness: 0.8, flatShading: true }),
    )
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.255, 0.255, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: '#d9695a', roughness: 0.8, flatShading: true }),
    )
    band.position.y = 0.1
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5),
      new THREE.MeshStandardMaterial({ color: '#5a4a34', roughness: 1 }),
    )
    pole.position.y = 0.85
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.34),
      new THREE.MeshStandardMaterial({
        color: '#f2c15c',
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    )
    flag.position.set(0.28, 1.28, 0)
    group.add(body, band, pole, flag)
    group.position.set(spot.x, 0, spot.z)
    group.rotation.y = index * 1.7
    buoys.push({ group, x: spot.x, z: spot.z, phase: index * 1.9 })
  })
  return buoys
}
