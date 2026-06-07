'use client'

import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

const DEFAULT_CAPTURE_WIDTH = 492
const DEFAULT_CAPTURE_SCALE = 2

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

    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    await waitForImages(target)
    await waitForPaint()

    const { default: html2canvas } = await import('html2canvas')
    return await html2canvas(target, {
      allowTaint: false,
      backgroundColor: null,
      imageTimeout: 20_000,
      logging: false,
      scale,
      useCORS: true,
    })
  } finally {
    root.unmount()
    host.remove()
  }
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

export async function downloadCanvasAsJpeg(
  canvas: HTMLCanvasElement,
  fileName: string
) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
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
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function waitForImages(target: HTMLElement) {
  const images = Array.from(target.querySelectorAll('img'))

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener(
            'error',
            () => reject(new Error(`Failed to load Digital ID image: ${image.src}`)),
            { once: true }
          )
        })
      }

      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error(`Failed to load Digital ID image: ${image.src}`)
      }

      if (typeof image.decode === 'function') {
        await image.decode()
      }
    })
  )
}
