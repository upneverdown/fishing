import * as THREE from 'three'
import { WORLD_SIZE, terrainHeight } from './worldMap'
import { SEASONS, type TerrainPalette } from './seasons'

interface TerrainSamples {
  x: Float32Array
  z: Float32Array
  h: Float32Array
}

function colorSet(palette: TerrainPalette) {
  return {
    bedShallow: new THREE.Color(palette.bedShallow),
    bedDeep: new THREE.Color(palette.bedDeep),
    sand: new THREE.Color(palette.sand),
    wetSand: new THREE.Color(palette.wetSand),
    grass: new THREE.Color(palette.grass),
    grassDark: new THREE.Color(palette.grassDark),
    grassLight: new THREE.Color(palette.grassLight),
    rock: new THREE.Color(palette.rock),
    rockDark: new THREE.Color(palette.rockDark),
  }
}

export function paintTerrain(mesh: THREE.Mesh, palette: TerrainPalette) {
  const samples = mesh.userData.samples as TerrainSamples | undefined
  if (!samples) return
  const attr = mesh.geometry.getAttribute('color') as THREE.BufferAttribute
  const colors = attr.array as Float32Array
  const c = colorSet(palette)
  const color = new THREE.Color()

  for (let i = 0; i < samples.h.length; i++) {
    const x = samples.x[i]
    const z = samples.z[i]
    const h = samples.h[i]
    const wobble = (Math.sin(x * 0.7 + z * 1.3) + Math.sin(x * 1.9 - z * 0.6)) * 0.014

    if (h < -0.1) {
      const t = Math.min(1, -h / 8.5)
      color.copy(c.bedShallow).lerp(c.bedDeep, t)
      color.offsetHSL(0, 0, wobble)
    } else if (h < 0.65) {
      color.copy(c.wetSand).lerp(c.sand, Math.min(1, h / 0.65))
      color.offsetHSL(0, 0, wobble)
    } else if (h < 1.35) {
      color.copy(c.sand).lerp(c.grass, (h - 0.65) / 0.7)
      color.offsetHSL(0, 0, wobble)
    } else if (h < 7.5) {
      const patch = (Math.sin(x * 0.28) + Math.cos(z * 0.31) + 2) / 4
      color.copy(c.grass).lerp(c.grassLight, patch * 0.55)
      color.lerp(c.grassDark, Math.sin(x * 0.07 - z * 0.09) * 0.5 + 0.5)
      color.offsetHSL(0, 0, wobble)
    } else if (h < 13) {
      color.copy(c.grassDark).lerp(c.rock, Math.min(1, (h - 7.5) / 4.5))
      color.offsetHSL(0, 0, wobble)
    } else {
      const t = Math.min(1, (h - 13) / 18)
      color.copy(c.rock).lerp(c.rockDark, t)
      color.offsetHSL(0, 0, wobble)
    }

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  attr.needsUpdate = true
}

export function createTerrain(): THREE.Mesh {
  const segments = 220
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const samples: TerrainSamples = {
    x: new Float32Array(pos.count),
    z: new Float32Array(pos.count),
    h: new Float32Array(pos.count),
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = terrainHeight(x, z)
    pos.setY(i, h)
    samples.x[i] = x
    samples.z[i] = z
    samples.h[i] = h
  }

  const colors = new Float32Array(pos.count * 3)
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  mesh.userData.samples = samples
  paintTerrain(mesh, SEASONS.spring.terrain)
  return mesh
}
