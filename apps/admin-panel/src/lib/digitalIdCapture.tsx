'use client'

import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

const DEFAULT_CAPTURE_WIDTH = 492
const DEFAULT_CAPTURE_SCALE = 2
const IMAGE_LOAD_TIMEOUT_MS = 10_000
const FONT_LOAD_TIMEOUT_MS = 8_000
const CANVAS_RENDER_TIMEOUT_MS = 20_000

export async function captureDigitalIdNode(
  node: ReactNode,
  options: {
    width?: number
    scale?: number
  } = {}
) {
  const width = options.width || DEFAULT_CAPTURE_WIDTH
  const scale = options.scale || DEFAULT_CAPTURE_SCALE
  const host = document.createElement('div')

  Object.assign(host.style, {
    backgroundColor: 'transparent',
    color: '#0b2f5b',
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    pointerEvents: 'none',
    zIndex: '-2147483648',
    colorScheme: 'light',
  })

  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    root.render(
      <div data-digital-id-export-root style={{ width: `${width}px` }}>
        {node}
      </div>
    )

    await waitForPaint()

    const target = host.querySelector<HTMLElement>('[data-digital-id-export-root]')
    if (!target) {
      throw new Error('Digital ID export preview did not render.')
    }

    return await capturePreparedDigitalIdElement(target, scale)
  } finally {
    root.unmount()
    host.remove()
  }
}

export async function captureDigitalIdElement(
  target: HTMLElement,
  options: {
    scale?: number
  } = {}
) {
  const scale = options.scale || DEFAULT_CAPTURE_SCALE

  await waitForPaint()
  return await capturePreparedDigitalIdElement(target, scale)
}

async function capturePreparedDigitalIdElement(
  target: HTMLElement,
  scale: number
) {
  if (document.fonts?.ready) {
    await withTimeout(
      document.fonts.ready,
      FONT_LOAD_TIMEOUT_MS,
      'Digital ID fonts took too long to load.'
    )
  }

  await waitForImages(target)
  await waitForPaint()

  const { default: html2canvas } = await import('html2canvas')
  return await withTimeout(
    html2canvas(target, {
      allowTaint: false,
      backgroundColor: null,
      imageTimeout: IMAGE_LOAD_TIMEOUT_MS,
      logging: false,
      onclone: sanitizeExportDocument,
      scale,
      useCORS: true,
    }),
    CANVAS_RENDER_TIMEOUT_MS,
    'Digital ID rendering took too long. Please retry.'
  )
}

function sanitizeExportDocument(
  clonedDocument: Document,
  clonedElement: HTMLElement
) {
  clonedDocument.documentElement.style.setProperty(
    'background-color',
    'transparent',
    'important'
  )
  clonedDocument.documentElement.style.setProperty(
    'color',
    '#0b2f5b',
    'important'
  )
  clonedDocument.body.style.setProperty('background', 'transparent', 'important')
  clonedDocument.body.style.setProperty('color', '#0b2f5b', 'important')
  clonedElement.style.setProperty('background-color', 'transparent', 'important')
  clonedElement.style.setProperty('color', '#0b2f5b', 'important')

  const colorProperties = [
    'background-color',
    'background-image',
    'border-bottom-color',
    'border-left-color',
    'border-right-color',
    'border-top-color',
    'box-shadow',
    'caret-color',
    'color',
    'outline-color',
    'text-decoration-color',
    'text-shadow',
    '-webkit-text-stroke-color',
  ]
  const elements = [
    clonedElement,
    ...Array.from(clonedElement.querySelectorAll<HTMLElement>('*')),
  ]

  for (const element of elements) {
    const computedStyle = clonedDocument.defaultView?.getComputedStyle(element)
    if (!computedStyle) continue

    for (const property of colorProperties) {
      const value = computedStyle.getPropertyValue(property)
      if (!value.includes('color(')) continue

      element.style.setProperty(
        property,
        replaceModernColorFunctions(value),
        'important'
      )
    }
  }
}

function replaceModernColorFunctions(value: string) {
  return value.replace(
    /color\(\s*(srgb|srgb-linear|display-p3)\s+([^)]+)\)/gi,
    (_, colorSpace: string, channels: string) =>
      convertModernColor(colorSpace.toLowerCase(), channels)
  )
}

function convertModernColor(colorSpace: string, channels: string) {
  const [colorChannels, alphaChannel] = channels.split('/').map((part) => part.trim())
  const components = colorChannels
    .split(/\s+/)
    .slice(0, 3)
    .map(parseColorComponent)

  if (components.length !== 3 || components.some((component) => !Number.isFinite(component))) {
    return 'rgba(0, 0, 0, 0)'
  }

  let [red, green, blue] = components

  if (colorSpace === 'srgb-linear') {
    red = linearToSrgb(red)
    green = linearToSrgb(green)
    blue = linearToSrgb(blue)
  } else if (colorSpace === 'display-p3') {
    ;[red, green, blue] = displayP3ToSrgb(red, green, blue)
  }

  const alpha = alphaChannel ? parseColorComponent(alphaChannel) : 1
  return `rgba(${toByte(red)}, ${toByte(green)}, ${toByte(blue)}, ${clamp(alpha)})`
}

function parseColorComponent(value: string) {
  if (value.endsWith('%')) {
    return Number.parseFloat(value) / 100
  }

  return Number.parseFloat(value)
}

function displayP3ToSrgb(red: number, green: number, blue: number) {
  const linearRed = srgbToLinear(red)
  const linearGreen = srgbToLinear(green)
  const linearBlue = srgbToLinear(blue)
  const srgbRed =
    1.22474527 * linearRed - 0.22490437 * linearGreen - 0.00000004 * linearBlue
  const srgbGreen =
    -0.04205797 * linearRed + 1.042081 * linearGreen - 0.00000008 * linearBlue
  const srgbBlue =
    -0.01964227 * linearRed - 0.0786549 * linearGreen + 1.09853719 * linearBlue

  return [
    linearToSrgb(srgbRed),
    linearToSrgb(srgbGreen),
    linearToSrgb(srgbBlue),
  ]
}

function srgbToLinear(value: number) {
  const normalized = clamp(value)
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

function linearToSrgb(value: number) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(Math.max(0, value), 1 / 2.4) - 0.055
}

function toByte(value: number) {
  return Math.round(clamp(value) * 255)
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function stackDigitalIdCanvases(
  front: HTMLCanvasElement,
  back: HTMLCanvasElement
) {
  const margin = 32
  const gap = 36
  const width = Math.max(front.width, back.width) + margin * 2
  const height = front.height + back.height + margin * 2 + gap
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare the Digital ID image.')
  }

  context.fillStyle = '#f5f9ff'
  context.fillRect(0, 0, width, height)
  context.drawImage(front, (width - front.width) / 2, margin)
  context.drawImage(back, (width - back.width) / 2, margin + front.height + gap)

  return canvas
}

export async function canvasToJpegBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('JPEG encoding took too long. Please retry.')),
      10_000
    )

    canvas.toBlob(
      (nextBlob) => {
        window.clearTimeout(timeout)

        if (nextBlob) {
          resolve(nextBlob)
        } else {
          reject(new Error('Could not encode the Digital ID image.'))
        }
      },
      'image/jpeg',
      0.98
    )
  })
}

export async function downloadCanvasAsJpeg(
  canvas: HTMLCanvasElement,
  fileName: string
) {
  const blob = await canvasToJpegBlob(canvas)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    const fallback = window.setTimeout(resolve, 250)

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.clearTimeout(fallback)
        resolve()
      })
    )
  })
}

async function waitForImages(target: HTMLElement) {
  const images = Array.from(target.querySelectorAll('img'))

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          const handleLoad = () => finish(resolve)
          const handleError = () =>
            finish(() =>
              reject(new Error(`Failed to load Digital ID image: ${image.src}`))
            )
          const timeout = window.setTimeout(
            () =>
              finish(() =>
                reject(new Error(`Digital ID image timed out: ${image.src}`))
              ),
            IMAGE_LOAD_TIMEOUT_MS
          )
          const finish = (complete: () => void) => {
            window.clearTimeout(timeout)
            image.removeEventListener('load', handleLoad)
            image.removeEventListener('error', handleError)
            complete()
          }

          image.addEventListener('load', handleLoad)
          image.addEventListener('error', handleError)
        })
      }

      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error(`Failed to load Digital ID image: ${image.src}`)
      }

      if (typeof image.decode === 'function') {
        await withTimeout(
          image.decode(),
          IMAGE_LOAD_TIMEOUT_MS,
          `Digital ID image could not be decoded: ${image.src}`
        )
      }
    })
  )
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs)

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  })
}
