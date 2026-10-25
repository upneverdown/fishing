import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Boat } from '@/game/entities/boat'
import type { BoatSkinId } from '@/game/shop/catalog'

export function BoatPreview({ skin, className }: { skin: BoatSkinId; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const boatRef = useRef<Boat | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60)
    camera.position.set(0, 2.65, 7.1)
    camera.lookAt(0, 0.42, 0)

    scene.add(new THREE.HemisphereLight('#c9f4ec', '#082326', 2.1))
    const key = new THREE.DirectionalLight('#ffe7b0', 2.4)
    key.position.set(4, 7, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight('#6fe0cf', 1.5)
    rim.position.set(-5, 2.5, -4)
    scene.add(rim)

    const waterMaterial = new THREE.MeshStandardMaterial({
      color: '#0d3a3a',
      transparent: true,
      opacity: 0.55,
      roughness: 0.22,
      metalness: 0.25,
    })
    const water = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), waterMaterial)
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.03
    scene.add(water)

    const boat = new Boat(scene)
    boat.group.position.set(0, 0, 0)
    boat.group.rotation.set(0, 0.62, 0)
    boatRef.current = boat

    const resize = () => {
      const width = el.clientWidth || 1
      const height = el.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)

    const start = performance.now()
    let frame = 0
    const loop = () => {
      frame = requestAnimationFrame(loop)
      const t = (performance.now() - start) / 1000
      boat.group.rotation.y = 0.62 + t * 0.34
      boat.group.position.y = Math.sin(t * 1.15) * 0.075
      boat.group.rotation.z = Math.sin(t * 0.86) * 0.03
      boat.group.rotation.x = Math.sin(t * 0.67) * 0.018
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      boatRef.current = null
      scene.remove(boat.group)
      boat.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose()
      })
      water.geometry.dispose()
      waterMaterial.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    boatRef.current?.setBoatSkin(skin)
  }, [skin])

  return <div ref={containerRef} className={className} aria-hidden />
}
