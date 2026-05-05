'use client'

import {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

export interface SignaturePadHandle {
  clear: () => void
  getSignatureDataUrl: () => string | null
  hasSignature: () => boolean
}

interface SignaturePadProps {
  disabled?: boolean
  height?: number
  initialValue?: string | null
  onSignatureChange?: (value: string | null) => void
}

function SignaturePad(
  {
    disabled = false,
    height = 180,
    initialValue = null,
    onSignatureChange,
  }: SignaturePadProps,
  ref: ForwardedRef<SignaturePadHandle>
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const canvasSnapshotRef = useRef<string | null>(null)
  const trimmedSignatureDataUrlRef = useRef<string | null>(null)
  const lastLoadedFromPropsRef = useRef<string | null>(null)
  const [hasSignature, setHasSignature] = useState(false)

  const applyCanvasStyles = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return null

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.6
    context.strokeStyle = '#014384'
    context.fillStyle = '#014384'
    return context
  }

  const redrawFromSnapshot = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const dataUrl = canvasSnapshotRef.current

    if (!canvas || !context || !dataUrl) {
      return
    }

    const image = new Image()
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      applyCanvasStyles()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      context.drawImage(image, 0, 0, canvas.width / ratio, canvas.height / ratio)
    }
    image.src = dataUrl
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current

    if (!canvas || !wrapper) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const width = Math.max(wrapper.clientWidth, 1)

    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    applyCanvasStyles()

    if (canvasSnapshotRef.current) {
      redrawFromSnapshot()
    }
  }

  const getTrimmedSignatureDataUrl = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return null
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = imageData

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha <= 8) continue

        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    if (maxX < 0 || maxY < 0) {
      return null
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const padding = Math.round(14 * ratio)
    const left = Math.max(minX - padding, 0)
    const top = Math.max(minY - padding, 0)
    const right = Math.min(maxX + padding, width - 1)
    const bottom = Math.min(maxY + padding, height - 1)
    const trimmedWidth = right - left + 1
    const trimmedHeight = bottom - top + 1

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = trimmedWidth
    exportCanvas.height = trimmedHeight

    const exportContext = exportCanvas.getContext('2d')
    if (!exportContext) {
      return null
    }

    exportContext.drawImage(
      canvas,
      left,
      top,
      trimmedWidth,
      trimmedHeight,
      0,
      0,
      trimmedWidth,
      trimmedHeight
    )

    return exportCanvas.toDataURL('image/png')
  }

  const clearCanvasState = (notify = true) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    applyCanvasStyles()
    canvasSnapshotRef.current = null
    trimmedSignatureDataUrlRef.current = null
    lastLoadedFromPropsRef.current = null
    setHasSignature(false)

    if (notify) {
      onSignatureChange?.(null)
    }
  }

  const loadSignatureFromDataUrl = (dataUrl: string) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const image = new Image()

    image.onload = () => {
      const displayWidth = canvas.width / ratio
      const displayHeight = canvas.height / ratio
      const padding = 16
      const maxWidth = Math.max(displayWidth - padding * 2, 1)
      const maxHeight = Math.max(displayHeight - padding * 2, 1)
      const imageRatio = image.width > 0 && image.height > 0 ? image.width / image.height : 1

      let targetWidth = maxWidth
      let targetHeight = targetWidth / imageRatio

      if (targetHeight > maxHeight) {
        targetHeight = maxHeight
        targetWidth = targetHeight * imageRatio
      }

      const x = (displayWidth - targetWidth) / 2
      const y = (displayHeight - targetHeight) / 2

      context.clearRect(0, 0, canvas.width, canvas.height)
      applyCanvasStyles()
      context.drawImage(image, x, y, targetWidth, targetHeight)

      canvasSnapshotRef.current = canvas.toDataURL('image/png')
      trimmedSignatureDataUrlRef.current = dataUrl
      lastLoadedFromPropsRef.current = dataUrl
      setHasSignature(true)
    }

    image.src = dataUrl
  }

  useEffect(() => {
    resizeCanvas()

    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [height])

  useEffect(() => {
    if (!canvasRef.current) return

    if (!initialValue) {
      if (canvasSnapshotRef.current || trimmedSignatureDataUrlRef.current) {
        clearCanvasState(false)
      }
      return
    }

    if (
      initialValue === trimmedSignatureDataUrlRef.current ||
      initialValue === lastLoadedFromPropsRef.current
    ) {
      return
    }

    window.requestAnimationFrame(() => {
      loadSignatureFromDataUrl(initialValue)
    })
  }, [initialValue])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const commitSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasSnapshot = canvas.toDataURL('image/png')
    const trimmedDataUrl = getTrimmedSignatureDataUrl()

    canvasSnapshotRef.current = canvasSnapshot
    trimmedSignatureDataUrlRef.current = trimmedDataUrl
    setHasSignature(Boolean(trimmedDataUrl))
    onSignatureChange?.(trimmedDataUrl)
  }

  const clear = () => {
    clearCanvasState(true)
  }

  useImperativeHandle(ref, () => ({
    clear,
    getSignatureDataUrl: () => trimmedSignatureDataUrlRef.current,
    hasSignature: () => hasSignature,
  }), [hasSignature])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const point = getPoint(event)
    isDrawingRef.current = true
    hasMovedRef.current = false
    canvas.setPointerCapture(event.pointerId)

    context.beginPath()
    context.moveTo(point.x, point.y)
    context.arc(point.x, point.y, 1.2, 0, Math.PI * 2)
    context.fill()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawingRef.current) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const point = getPoint(event)
    hasMovedRef.current = true
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return

    const canvas = canvasRef.current
    if (!canvas || !isDrawingRef.current) return

    isDrawingRef.current = false
    canvas.releasePointerCapture(event.pointerId)

    if (!hasMovedRef.current) {
      const context = canvas.getContext('2d')
      const point = getPoint(event)
      if (context) {
        context.beginPath()
        context.arc(point.x, point.y, 1.4, 0, Math.PI * 2)
        context.fill()
      }
    }

    commitSignature()
  }

  const handlePointerLeave = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    commitSignature()
  }

  return (
    <div
      ref={wrapperRef}
      className={`overflow-hidden rounded-[24px] border border-dashed ${
        disabled ? 'border-gray-200 bg-gray-50' : 'border-[#9fbfe6] bg-[#f7fbff]'
      }`}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full touch-none ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  )
}

export default forwardRef(SignaturePad)
