import { clamp } from '@/game/utils/math'

class InputController {
  throttle = 0
  steer = 0
  actionDown = false
  spaceHeld = false
  touchVertical = 0
  touchSprint = false

  private keys = new Set<string>()
  private actionSources = new Set<string>()
  private actionPress = false
  private interactPress = false
  private bagPress = false
  private shopPress = false
  private skinPress = false
  private divePress = false
  private baitPress = false
  private seasonPress = false
  private toolPress = false
  private townPress = false
  private knifePress = false
  private gunPress = false
  private anchorPress = false
  private lightPress = false
  private grillPress = false
  private variantPress = false
  private achievementsPress = false
  private crewPress = false
  private slotPress = 0
  private joy = { x: 0, y: 0, active: false }
  private canvas: HTMLCanvasElement | null = null
  private lookEnabled = false
  private dragging = false
  private lastPointer: { x: number; y: number } | null = null
  private pointerTravel = 0
  private lookX = 0
  private lookY = 0
  private clickPoint: { x: number; y: number } | null = null

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('blur', this.clear)
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    canvas.addEventListener('pointerdown', this.onCanvasPointerDown)
  }

  detach() {
    if (this.canvas) this.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown)
    this.canvas = null
  }

  setLookEnabled(enabled: boolean) {
    this.lookEnabled = enabled
    if (!enabled) {
      this.dragging = false
      this.lastPointer = null
      this.lookX = 0
      this.lookY = 0
      this.clickPoint = null
    }
  }

  private onCanvasPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if (this.lookEnabled) {
      this.dragging = true
      this.lastPointer = { x: e.clientX, y: e.clientY }
      this.pointerTravel = 0
      return
    }
    this.pressAction('pointer')
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging || !this.lastPointer) return
    const dx = e.clientX - this.lastPointer.x
    const dy = e.clientY - this.lastPointer.y
    this.lastPointer = { x: e.clientX, y: e.clientY }
    this.pointerTravel += Math.abs(dx) + Math.abs(dy)
    this.lookX += dx
    this.lookY += dy
  }

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (this.dragging) {
      if (this.pointerTravel < 7) this.clickPoint = { x: e.clientX, y: e.clientY }
      this.dragging = false
      this.lastPointer = null
    }
    this.releaseAction('pointer')
    this.releaseAction('touch')
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (key === ' ' || key === 'spacebar') {
      e.preventDefault()
      this.spaceHeld = true
      if (!e.repeat) this.pressAction('keyboard')
      return
    }
    if (e.repeat) return
    if (key === 'e') this.interactPress = true
    if (key === 'i') this.bagPress = true
    if (key === 'b') this.skinPress = true
    if (key === 'c') this.shopPress = true
    if (key === 'v') this.divePress = true
    if (key === 'r') this.baitPress = true
    if (key === 't') this.seasonPress = true
    if (key === 'f') this.toolPress = true
    if (key === 'g') this.townPress = true
    if (key === 'z') this.knifePress = true
    if (key === 'x') this.gunPress = true
    if (key === 'y') this.anchorPress = true
    if (key === 'l') this.lightPress = true
    if (key === 'h') this.grillPress = true
    if (key === 'q') this.variantPress = true
    if (key === 'j') this.achievementsPress = true
    if (key === 'k') this.crewPress = true
    if (key === '1') this.slotPress = 1
    if (key === '2') this.slotPress = 2
    if (key === '3') this.slotPress = 3
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault()
    this.keys.add(key)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    this.keys.delete(key)
    if (key === ' ' || key === 'spacebar') {
      this.spaceHeld = false
      this.releaseAction('keyboard')
    }
  }

  pressAction(source: string) {
    if (this.actionSources.has(source)) return
    if (this.actionSources.size === 0) this.actionPress = true
    this.actionSources.add(source)
    this.actionDown = true
  }

  releaseAction(source: string) {
    this.actionSources.delete(source)
    this.actionDown = this.actionSources.size > 0
  }

  setJoystick(x: number, y: number, active: boolean) {
    this.joy = { x, y, active }
    if (!active) {
      this.joy.x = 0
      this.joy.y = 0
    }
    if (!active) this.releaseAction('joystick')
  }

  update() {
    let throttle = 0
    let steer = 0
    if (this.joy.active) {
      throttle = -this.joy.y
      steer = this.joy.x
    } else {
      if (this.keys.has('w') || this.keys.has('arrowup')) throttle += 1
      if (this.keys.has('s') || this.keys.has('arrowdown')) throttle -= 1
      if (this.keys.has('a') || this.keys.has('arrowleft')) steer -= 1
      if (this.keys.has('d') || this.keys.has('arrowright')) steer += 1
    }
    this.throttle = clamp(throttle, -1, 1)
    this.steer = clamp(steer, -1, 1)
  }

  consumeAction() {
    const pressed = this.actionPress
    this.actionPress = false
    return pressed
  }

  consumeInteract() {
    const pressed = this.interactPress
    this.interactPress = false
    return pressed
  }

  consumeBag() {
    const pressed = this.bagPress
    this.bagPress = false
    return pressed
  }

  consumeShop() {
    const pressed = this.shopPress
    this.shopPress = false
    return pressed
  }

  consumeSkin() {
    const pressed = this.skinPress
    this.skinPress = false
    return pressed
  }

  consumeDive() {
    const pressed = this.divePress
    this.divePress = false
    return pressed
  }

  consumeBait() {
    const pressed = this.baitPress
    this.baitPress = false
    return pressed
  }

  consumeSeason() {
    const pressed = this.seasonPress
    this.seasonPress = false
    return pressed
  }

  consumeTool() {
    const pressed = this.toolPress
    this.toolPress = false
    return pressed
  }

  consumeTown() {
    const pressed = this.townPress
    this.townPress = false
    return pressed
  }

  consumeSlot() {
    const slot = this.slotPress
    this.slotPress = 0
    return slot
  }

  consumeKnife() {
    const pressed = this.knifePress
    this.knifePress = false
    return pressed
  }

  consumeGun() {
    const pressed = this.gunPress
    this.gunPress = false
    return pressed
  }

  consumeAnchor() {
    const pressed = this.anchorPress
    this.anchorPress = false
    return pressed
  }

  consumeLight() {
    const pressed = this.lightPress
    this.lightPress = false
    return pressed
  }

  consumeGrill() {
    const pressed = this.grillPress
    this.grillPress = false
    return pressed
  }

  consumeVariant() {
    const pressed = this.variantPress
    this.variantPress = false
    return pressed
  }

  consumeAchievements() {
    const pressed = this.achievementsPress
    this.achievementsPress = false
    return pressed
  }

  consumeCrew() {
    const pressed = this.crewPress
    this.crewPress = false
    return pressed
  }

  consumeLook() {
    const dx = this.lookX
    const dy = this.lookY
    this.lookX = 0
    this.lookY = 0
    return { dx, dy }
  }

  consumeClick() {
    const point = this.clickPoint
    this.clickPoint = null
    return point
  }

  setTouchVertical(value: number) {
    this.touchVertical = clamp(value, -1, 1)
  }

  setTouchSprint(enabled: boolean) {
    this.touchSprint = enabled
  }

  get vertical() {
    const keyboard = (this.spaceHeld ? 1 : 0) - (this.keys.has('shift') ? 1 : 0)
    return clamp(keyboard + this.touchVertical, -1, 1)
  }

  get sprint() {
    return this.keys.has('control') || this.touchSprint
  }

  get boost() {
    return this.keys.has('shift') || this.touchSprint
  }

  tapInteract() {
    this.interactPress = true
  }

  tapBag() {
    this.bagPress = true
  }

  tapSkin() {
    this.skinPress = true
  }

  tapCapture() {
    this.interactPress = true
  }

  tapSlot(slot: number) {
    this.slotPress = slot
  }

  tapTown() {
    this.townPress = true
  }

  tapKnife() {
    this.knifePress = true
  }

  tapGun() {
    this.gunPress = true
  }

  tapAnchor() {
    this.anchorPress = true
  }

  tapLight() {
    this.lightPress = true
  }

  tapGrill() {
    this.grillPress = true
  }

  tapVariant() {
    this.variantPress = true
  }

  clear() {
    this.keys.clear()
    this.actionSources.clear()
    this.actionDown = false
    this.actionPress = false
    this.interactPress = false
    this.bagPress = false
    this.shopPress = false
    this.skinPress = false
    this.divePress = false
    this.baitPress = false
    this.seasonPress = false
    this.toolPress = false
    this.townPress = false
    this.knifePress = false
    this.gunPress = false
    this.anchorPress = false
    this.lightPress = false
    this.grillPress = false
    this.variantPress = false
    this.achievementsPress = false
    this.crewPress = false
    this.slotPress = 0
    this.spaceHeld = false
    this.touchVertical = 0
    this.touchSprint = false
    this.dragging = false
    this.lastPointer = null
    this.lookX = 0
    this.lookY = 0
    this.clickPoint = null
    this.joy = { x: 0, y: 0, active: false }
    this.throttle = 0
    this.steer = 0
  }

  clearQueued() {
    this.actionPress = false
    this.interactPress = false
    this.bagPress = false
    this.shopPress = false
    this.skinPress = false
    this.divePress = false
    this.baitPress = false
    this.seasonPress = false
    this.toolPress = false
    this.townPress = false
    this.knifePress = false
    this.gunPress = false
    this.anchorPress = false
    this.lightPress = false
    this.grillPress = false
    this.variantPress = false
    this.achievementsPress = false
    this.crewPress = false
    this.slotPress = 0
    this.clickPoint = null
  }
}

export const input = new InputController()
