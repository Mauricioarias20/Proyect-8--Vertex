import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }

// Effervescent bubbles: only enabled for primary (celeste) buttons.
const BubbleButton: React.FC<Props> = ({ children, className = '', onClick, ...rest }) => {
  const containerRef = useRef<HTMLButtonElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const enabled = (className as string).includes('primary')

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    // On touch/coarse pointers, skip heavy WebGL and use a lightweight CSS fallback
    const isCoarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches
    if (isCoarse) {
      container.classList.add('bubble-lite')
      return () => { container.classList.remove('bubble-lite') }
    }

    const canvasHolder = document.createElement('div')
    canvasHolder.style.position = 'absolute'
    canvasHolder.style.inset = '0'
    canvasHolder.style.pointerEvents = 'none'
    canvasHolder.className = 'bubble-canvas'
    container.appendChild(canvasHolder)
    canvasRef.current = canvasHolder

    let w = container.clientWidth
    let h = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -1000, 1000)
    camera.position.z = 10

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    // Prevent the WebGL canvas from intercepting pointer events so button clicks work
    renderer.domElement.style.pointerEvents = 'none'
    renderer.domElement.style.zIndex = '0'
    canvasHolder.appendChild(renderer.domElement)

    // Create a small circular texture for sprites (black bubbles)
    const makeTexture = (colorHex: string) => {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      // Black center, transparent edges for softer bubble look
      const grd = ctx.createRadialGradient(size/2, size/2, size*0.08, size/2, size/2, size/2)
      grd.addColorStop(0, 'rgba(0,0,0,0.95)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(size/2, size/2, size/2, 0, Math.PI*2)
      ctx.fill()
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      return tex
    }

    // force black bubbles regardless of theme color
    const spriteTex = makeTexture('#000000')

    const bubbles: Array<{
      sprite: THREE.Sprite
      vx: number
      vy: number
      life: number
      ttl: number
      scaleBase: number
    }> = []

    // more particles, smaller and varied sizes
    const particleCount = 18
    for (let i = 0; i < particleCount; i++) {
      const mat = new THREE.SpriteMaterial({ map: spriteTex, transparent: true })
      const spr = new THREE.Sprite(mat)
      // randomize initial position and scale
      resetBubble(spr)
      scene.add(spr)
      bubbles.push({ sprite: spr, vx: (Math.random()-0.5)*0.25, vy: 0.18 + Math.random()*0.6, life: 0, ttl: 1.2 + Math.random()*1.8, scaleBase: 0.06 + Math.random()*0.38 })
    }

    function resetBubble(s: THREE.Sprite) {
      const x = (Math.random() - 0.5) * w * 0.9
      const y = -h/2 + Math.random()*6
      s.position.set(x, y, 0)
      // start very small; will grow with life
      s.scale.set(0.05,0.05,1)
    }

    let last = performance.now()
    let rafId: number
    const animate = () => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        b.life += dt
        // effervescent behavior: accelerate slightly, wobble, scale up then fade
        const spr = b.sprite
        spr.position.x += b.vx * (1 + Math.sin(b.life*6) * 0.2)
        spr.position.y += b.vy * (0.6 + Math.sin(b.life*4)*0.4) * dt * 60

        const t = b.life / b.ttl
        // smaller overall multiplier and more variety
        const scale = b.scaleBase * (0.6 + t*1.6)
        spr.scale.set(scale * 8, scale * 8, 1)

        const mat = spr.material as THREE.SpriteMaterial
        // maintain some opacity until near end for a subtle effect
        mat.opacity = Math.max(0, 0.95 - t*1.15)

        if (b.life > b.ttl || Math.abs(spr.position.x) > w / 1.1 || spr.position.y > h/2 + 10) {
          b.life = 0
          b.ttl = 1.5 + Math.random()*2.2
          b.vx = (Math.random()-0.5)*0.4
          b.vy = 0.25 + Math.random()*0.7
          b.scaleBase = 0.2 + Math.random()*0.9
          resetBubble(spr)
        }
      }

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    animate()

    // intensify on hover
    let hoverBoost = 1
    const onEnter = () => { hoverBoost = 1.8; bubbles.forEach(b=>{ b.vy *= 1.2 }) }
    const onLeave = () => { hoverBoost = 1; bubbles.forEach(b=>{ b.vy *= 0.85 }) }
    container.addEventListener('mouseenter', onEnter)
    container.addEventListener('mouseleave', onLeave)

    // debug pointer events
    const onPointerDown = (e: PointerEvent) => { console.debug('BubbleButton pointerdown', e.type, e.pointerType) }
    container.addEventListener('pointerdown', onPointerDown)

    const handleResize = () => {
      w = container.clientWidth
      h = container.clientHeight
      renderer.setSize(w, h)
      camera.left = -w / 2
      camera.right = w / 2
      camera.top = h / 2
      camera.bottom = -h / 2
      camera.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mouseenter', onEnter)
      container.removeEventListener('mouseleave', onLeave)
      container.removeEventListener('pointerdown', onPointerDown)
      cancelAnimationFrame(rafId)
      renderer.dispose()
      spriteTex.dispose()
      scene.children.forEach(c => {
        if ((c as any).material) {
          ;(c as any).material.dispose()
        }
      })
      if (canvasHolder.parentElement) canvasHolder.parentElement.removeChild(canvasHolder)
      // also remove any fallback class if present
      container.classList.remove('bubble-lite')
    }
  }, [enabled])

    return (
    <button ref={containerRef} type="button" onClick={(e)=>{ console.debug('BubbleButton clicked'); if (onClick) onClick(e); }} {...rest} className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  )
}

export default BubbleButton
