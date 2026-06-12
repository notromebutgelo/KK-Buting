'use client'

export const DIGITAL_ID_CANVAS_WIDTH = 1628
export const DIGITAL_ID_CANVAS_HEIGHT = 1040

export interface DigitalIdFrontRenderData {
  backgroundSrc?: string
  fullName: string
  address: string
  purok: string
  birthday: string
  gender: string
  contactNumber: string
  memberId: string
  photoUrl?: string | null
  signatureUrl?: string | null
}

export interface DigitalIdBackRenderData {
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  validThru: string
}

export interface DigitalIdRenderData {
  front: DigitalIdFrontRenderData
  back: DigitalIdBackRenderData
}

const FRONT_BACKGROUND_SRC = '/images/KK ID - Front BG.png'
const SIGNATORY_SIGNATURE_SRC = '/images/sk-chairperson-signature.png'
const BARANGAY_LOGO_SRC = '/images/brgy logo.png'
const SK_LOGO_SRC = '/images/SKButingLogo.png'
const TERMS_TEXT =
  'This card is non-transferable and must be used only by the cardholder whose signature appears herein. Cardholder privileges remain subject to implementing guidelines approved by the Sangguniang Kabataan Council.'
const SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const SIGNATORY_TITLE = 'SK CHAIRPERSON'

export async function renderDigitalIdFrontCanvas(data: DigitalIdFrontRenderData) {
  const canvas = createDigitalIdCanvas()
  const context = getCanvasContext(canvas)

  await document.fonts?.ready
  const [backgroundImage, photoImage, signatureImage, barangayLogo, skLogo] = await Promise.all([
    loadImage(data.backgroundSrc || FRONT_BACKGROUND_SRC),
    loadOptionalImage(data.photoUrl),
    loadOptionalImage(data.signatureUrl),
    loadOptionalImage(BARANGAY_LOGO_SRC),
    loadOptionalImage(SK_LOGO_SRC),
  ])

  drawRoundedCard(context, () => {
    drawImageCover(context, backgroundImage, 0, 0, DIGITAL_ID_CANVAS_WIDTH, DIGITAL_ID_CANVAS_HEIGHT)
    drawFrontHeader(context, barangayLogo, skLogo)
    drawFrontDetails(context, data, photoImage, signatureImage)
  })

  return canvas
}

export async function renderDigitalIdBackCanvas(data: DigitalIdBackRenderData) {
  const canvas = createDigitalIdCanvas()
  const context = getCanvasContext(canvas)

  await document.fonts?.ready
  const signatorySignature = await loadOptionalImage(SIGNATORY_SIGNATURE_SRC)

  drawBackCard(context, data, signatorySignature)

  return canvas
}

export async function renderDigitalIdCanvases(data: DigitalIdRenderData) {
  const [front, back] = await Promise.all([
    renderDigitalIdFrontCanvas(data.front),
    renderDigitalIdBackCanvas(data.back),
  ])

  return { front, back }
}

function createDigitalIdCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = DIGITAL_ID_CANVAS_WIDTH
  canvas.height = DIGITAL_ID_CANVAS_HEIGHT
  return canvas
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not prepare the Digital ID image.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return context
}

function drawRoundedCard(context: CanvasRenderingContext2D, draw: () => void) {
  context.save()
  roundedRect(context, 0, 0, DIGITAL_ID_CANVAS_WIDTH, DIGITAL_ID_CANVAS_HEIGHT, 52)
  context.clip()
  draw()
  context.restore()

  context.save()
  roundedRect(context, 1, 1, DIGITAL_ID_CANVAS_WIDTH - 2, DIGITAL_ID_CANVAS_HEIGHT - 2, 52)
  context.strokeStyle = '#d7e3f1'
  context.lineWidth = 2
  context.stroke()
  context.restore()
}

function drawFrontHeader(
  context: CanvasRenderingContext2D,
  barangayLogo: HTMLImageElement | null,
  skLogo: HTMLImageElement | null
) {
  const width = DIGITAL_ID_CANVAS_WIDTH
  const height = DIGITAL_ID_CANVAS_HEIGHT
  const headerHeight = height * 0.189
  const logoSize = headerHeight * 0.62
  const logoTop = headerHeight * 0.16
  const logoInset = width * 0.041
  const headerTextWidth = width * (1 - 0.132 * 2)
  const titleFontSize = width * 0.044
  const subtitleFontSize = width * 0.0125
  const titleTop = headerHeight * 0.15
  const subtitleTop = titleTop + titleFontSize + headerTextWidth * 0.012

  context.fillStyle = '#014384'
  context.fillRect(0, 0, width, headerHeight)

  if (barangayLogo) {
    drawImageContain(context, barangayLogo, logoInset, logoTop, logoSize, logoSize)
  }

  if (skLogo) {
    drawImageContain(context, skLogo, width - logoInset - logoSize, logoTop, logoSize, logoSize)
  }

  drawCenteredFittedLetterSpacedText(context, 'KATIPUNAN NG KABATAAN', width / 2, titleTop, {
    color: '#ffffff',
    fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    fontSize: titleFontSize,
    fontWeight: 700,
    letterSpacingRatio: 0.08,
    maxWidth: headerTextWidth,
    minFontSize: width * 0.036,
  })

  drawCenteredFittedLetterSpacedText(
    context,
    'SANGGUNIANG KABATAAN NG BARANGAY BUTING, PASIG CITY',
    width / 2,
    subtitleTop,
    {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: subtitleFontSize,
      fontWeight: 700,
      letterSpacingRatio: 0.08,
      maxWidth: headerTextWidth,
      minFontSize: width * 0.0102,
    }
  )
}

function drawFrontDetails(
  context: CanvasRenderingContext2D,
  data: DigitalIdFrontRenderData,
  photoImage: HTMLImageElement | null,
  signatureImage: HTMLImageElement | null
) {
  const width = DIGITAL_ID_CANVAS_WIDTH
  const height = DIGITAL_ID_CANVAS_HEIGHT
  const contentLeft = width * 0.082
  const contentTop = width * 0.184
  const contentBottom = width * 0.105
  const contentHeight = Math.max(1, height - contentTop - contentBottom)
  const contentWidth = width - contentLeft * 2
  const leftColumnWidth = contentWidth * 0.27
  const gap = contentWidth * 0.065
  const rightColumnLeft = contentLeft + leftColumnWidth + gap
  const rightColumnWidth = width - rightColumnLeft - contentLeft

  const idRowHeight = contentHeight * 0.052
  const photoTop = contentTop + contentHeight * 0.075
  const photoHeight = contentHeight * 0.49
  const signatureTop = contentTop + contentHeight * 0.611
  const signatureHeight = contentHeight * 0.13
  const signatureLineTop = contentTop + contentHeight * 0.741

  drawCenteredLetterSpacedText(context, data.memberId || 'DRAFT', contentLeft + leftColumnWidth / 2, contentTop + idRowHeight * 0.15, {
    color: '#0b2f5b',
    font: `900 ${width * 0.0114}px Arial, sans-serif`,
    letterSpacing: width * 0.0114 * 0.05,
    maxWidth: leftColumnWidth * 0.94,
  })

  context.fillStyle = '#eef4fb'
  context.fillRect(contentLeft, photoTop, leftColumnWidth, photoHeight)
  context.strokeStyle = '#2c5a8f'
  context.lineWidth = 2
  context.strokeRect(contentLeft, photoTop, leftColumnWidth, photoHeight)

  if (photoImage) {
    context.save()
    context.beginPath()
    context.rect(contentLeft + 2, photoTop + 2, leftColumnWidth - 4, photoHeight - 4)
    context.clip()
    drawImageCover(context, photoImage, contentLeft + 2, photoTop + 2, leftColumnWidth - 4, photoHeight - 4)
    context.restore()
  } else {
    drawCenteredLetterSpacedText(context, getInitials(data.fullName), contentLeft + leftColumnWidth / 2, photoTop + photoHeight / 2 - width * 0.02, {
      color: '#014384',
      font: `900 ${width * 0.0285}px Arial, sans-serif`,
      letterSpacing: 0,
      maxWidth: leftColumnWidth,
    })
  }

  if (signatureImage) {
    drawImageContain(
      context,
      signatureImage,
      contentLeft + leftColumnWidth * 0.04,
      signatureTop,
      leftColumnWidth * 0.92,
      signatureHeight
    )
  }

  context.strokeStyle = '#808080'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(contentLeft, signatureLineTop)
  context.lineTo(contentLeft + leftColumnWidth, signatureLineTop)
  context.stroke()

  drawCenteredLetterSpacedText(context, 'SIGNATURE', contentLeft + leftColumnWidth / 2, signatureLineTop + width * 0.0075, {
    color: '#1a1a1a',
    font: `500 ${width * 0.0124}px Arial, sans-serif`,
    letterSpacing: width * 0.0124 * 0.07,
    maxWidth: leftColumnWidth,
  })

  let fieldY = contentTop - contentHeight * 0.033
  fieldY += drawFrontField(context, 'Name', data.fullName, rightColumnLeft, fieldY, rightColumnWidth, width)
  fieldY += width * 0.018
  fieldY += drawFrontField(context, 'Home Address', data.address, rightColumnLeft, fieldY, rightColumnWidth, width)
  fieldY += width * 0.012
  fieldY += drawFrontField(context, 'Purok', data.purok, rightColumnLeft, fieldY, rightColumnWidth, width)
  fieldY += width * 0.012

  const columnGap = rightColumnWidth * 0.06
  const columnWidth = (rightColumnWidth - columnGap) / 2
  const birthHeight = drawFrontField(context, 'Date of Birth', data.birthday, rightColumnLeft, fieldY, columnWidth, width)
  drawFrontField(context, 'Gender', data.gender.toUpperCase(), rightColumnLeft + columnWidth + columnGap, fieldY, columnWidth, width)
  drawFrontField(context, 'Contact No', data.contactNumber, rightColumnLeft, fieldY + birthHeight + width * 0.004, columnWidth, width)
}

function drawFrontField(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  cardWidth: number
) {
  const labelFontSize = cardWidth * 0.0124
  const valueFontSize = cardWidth * 0.0208
  const labelLineHeight = labelFontSize * 1.08
  const valueLineHeight = valueFontSize * 1.15

  context.textBaseline = 'top'
  context.fillStyle = '#1d5aa1'
  context.font = `700 ${labelFontSize}px Arial, sans-serif`
  context.fillText(`${label.toUpperCase()}:`, x, y)

  context.fillStyle = '#0b2f5b'
  context.font = `900 ${valueFontSize}px Arial, sans-serif`
  const lines = wrapText(context, value || '-', maxWidth)

  lines.forEach((line, index) => {
    context.fillText(line, x, y + labelLineHeight + index * valueLineHeight)
  })

  return labelLineHeight + lines.length * valueLineHeight
}

function drawBackCard(
  context: CanvasRenderingContext2D,
  data: DigitalIdBackRenderData,
  signatorySignature: HTMLImageElement | null
) {
  const width = DIGITAL_ID_CANVAS_WIDTH
  const height = DIGITAL_ID_CANVAS_HEIGHT

  drawRoundedCard(context, () => {
    const gradient = context.createRadialGradient(width / 2, height * 0.04, width * 0.08, width / 2, height * 0.45, width * 0.75)
    gradient.addColorStop(0, '#fffefd')
    gradient.addColorStop(0.58, '#f3f1eb')
    gradient.addColorStop(1, '#e9e5dc')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  })

  roundedRect(context, width * 0.036, height * 0.036, width * 0.928, height * 0.928, 46)
  context.strokeStyle = 'rgba(78,86,80,0.65)'
  context.lineWidth = 3
  context.stroke()

  roundedRect(context, width * 0.062, height * 0.062, width * 0.876, height * 0.876, 36)
  context.strokeStyle = 'rgba(131,139,133,0.35)'
  context.lineWidth = 2
  context.stroke()

  drawCenteredText(context, 'IN CASE OF EMERGENCY, PLEASE CONTACT:', width / 2, height * 0.098, {
    color: '#666d67',
    font: `700 ${width * 0.0124}px Arial, sans-serif`,
    letterSpacing: width * 0.0124 * 0.09,
    maxWidth: width * 0.75,
  })
  drawCenteredText(context, `${data.emergencyContactName} - ${data.emergencyContactPhone}`, width / 2, height * 0.165, {
    color: '#1f2621',
    font: `900 ${width * 0.0215}px Arial, sans-serif`,
    letterSpacing: width * 0.0215 * 0.01,
    maxWidth: width * 0.75,
  })
  drawCenteredText(context, `Relationship: ${data.emergencyContactRelationship}`, width / 2, height * 0.225, {
    color: '#6b726c',
    font: `600 ${width * 0.0111}px Arial, sans-serif`,
    letterSpacing: width * 0.0111 * 0.08,
    maxWidth: width * 0.75,
  })

  drawCenteredText(context, 'TERMS AND CONDITIONS', width / 2, height * 0.345, {
    color: '#767d78',
    font: `700 ${width * 0.0124}px Arial, sans-serif`,
    letterSpacing: width * 0.0124 * 0.18,
    maxWidth: width * 0.75,
  })

  drawCenteredWrappedText(context, TERMS_TEXT, width / 2, height * 0.395, width * 0.8, {
    color: '#424843',
    font: `600 ${width * 0.013}px Arial, sans-serif`,
    lineHeight: width * 0.013 * 1.32,
  })

  drawCenteredText(context, 'VALID UNTIL', width / 2, height * 0.61, {
    color: '#7a807b',
    font: `700 ${width * 0.0111}px Arial, sans-serif`,
    letterSpacing: width * 0.0111 * 0.16,
    maxWidth: width * 0.48,
  })
  drawCenteredText(context, data.validThru, width / 2, height * 0.645, {
    color: '#222823',
    font: `900 ${width * 0.0208}px Arial, sans-serif`,
    letterSpacing: 0,
    maxWidth: width * 0.5,
  })

  if (signatorySignature) {
    drawRotatedImageContain(
      context,
      signatorySignature,
      width / 2 - width * 0.34,
      height * 0.685,
      width * 0.68,
      width * 0.088,
      Math.PI
    )
  }

  context.fillStyle = '#4d544e'
  context.fillRect(width * 0.21, height * 0.79, width * 0.58, 2)

  drawCenteredText(context, SIGNATORY_NAME, width / 2, height * 0.815, {
    color: '#303731',
    font: `900 ${width * 0.0142}px Arial, sans-serif`,
    letterSpacing: width * 0.0142 * 0.06,
    maxWidth: width * 0.68,
  })
  drawCenteredText(context, SIGNATORY_TITLE, width / 2, height * 0.855, {
    color: '#303731',
    font: `900 ${width * 0.0122}px Arial, sans-serif`,
    letterSpacing: width * 0.0122 * 0.1,
    maxWidth: width * 0.68,
  })
}

function drawCenteredWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  options: {
    color: string
    font: string
    lineHeight: number
  }
) {
  context.font = options.font
  context.fillStyle = options.color
  context.textBaseline = 'top'

  const lines = wrapText(context, text, maxWidth)
  lines.forEach((line, index) => {
    context.fillText(line, centerX - context.measureText(line).width / 2, y + index * options.lineHeight)
  })
}

function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  options: {
    color: string
    font: string
    letterSpacing: number
    maxWidth: number
  }
) {
  drawCenteredLetterSpacedText(context, text, centerX, y, options)
}

function drawCenteredFittedLetterSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  options: {
    color: string
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacingRatio: number
    maxWidth: number
    minFontSize: number
  }
) {
  let fontSize = options.fontSize
  let letterSpacing = fontSize * options.letterSpacingRatio
  let font = `${options.fontWeight} ${fontSize}px ${options.fontFamily}`

  while (
    fontSize > options.minFontSize &&
    measureLetterSpacedText(context, text, font, letterSpacing) > options.maxWidth
  ) {
    fontSize -= 1
    letterSpacing = fontSize * options.letterSpacingRatio
    font = `${options.fontWeight} ${fontSize}px ${options.fontFamily}`
  }

  drawCenteredLetterSpacedText(context, text, centerX, y, {
    color: options.color,
    font,
    letterSpacing,
    maxWidth: options.maxWidth,
  })
}

function drawCenteredLetterSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  options: {
    color: string
    font: string
    letterSpacing: number
    maxWidth: number
  }
) {
  const fittedText = fitText(context, text, options.font, options.maxWidth, options.letterSpacing)
  let x = centerX - measureLetterSpacedText(context, fittedText, options.font, options.letterSpacing) / 2

  context.textBaseline = 'top'
  context.fillStyle = options.color
  context.font = options.font

  for (const char of fittedText) {
    context.fillText(char, x, y)
    x += context.measureText(char).width + options.letterSpacing
  }
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  font: string,
  maxWidth: number,
  letterSpacing: number
) {
  context.font = font

  if (measureLetterSpacedText(context, value, font, letterSpacing) <= maxWidth) {
    return value
  }

  const suffix = '...'
  let nextValue = value

  while (nextValue.length > 0) {
    nextValue = nextValue.slice(0, -1)
    const candidate = `${nextValue}${suffix}`

    if (measureLetterSpacedText(context, candidate, font, letterSpacing) <= maxWidth) {
      return candidate
    }
  }

  return suffix
}

function measureLetterSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
  letterSpacing: number
) {
  context.font = font
  const characters = Array.from(text)
  const textWidth = characters.reduce((total, char) => total + context.measureText(char).width, 0)
  return textWidth + Math.max(0, characters.length - 1) * letterSpacing
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = String(value || '-').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words.length ? words : ['-']) {
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine = ''
    }

    if (context.measureText(word).width <= maxWidth) {
      currentLine = word
      continue
    }

    const chunks = breakLongWord(context, word, maxWidth)
    lines.push(...chunks.slice(0, -1))
    currentLine = chunks[chunks.length - 1] || ''
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length ? lines : ['-']
}

function breakLongWord(context: CanvasRenderingContext2D, word: string, maxWidth: number) {
  const chunks: string[] = []
  let chunk = ''

  for (const char of word) {
    const candidate = `${chunk}${char}`

    if (context.measureText(candidate).width <= maxWidth || !chunk) {
      chunk = candidate
    } else {
      chunks.push(chunk)
      chunk = char
    }
  }

  if (chunk) {
    chunks.push(chunk)
  }

  return chunks
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const targetWidth = image.naturalWidth * scale
  const targetHeight = image.naturalHeight * scale
  context.drawImage(
    image,
    x + (width - targetWidth) / 2,
    y + (height - targetHeight) / 2,
    targetWidth,
    targetHeight
  )
}

function drawRotatedImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
) {
  context.save()
  context.translate(x + width / 2, y + height / 2)
  context.rotate(rotation)
  drawImageContain(context, image, -width / 2, -height / 2, width, height)
  context.restore()
}

async function loadOptionalImage(src?: string | null) {
  const normalizedSrc = String(src || '').trim()

  if (!normalizedSrc) {
    return null
  }

  try {
    return await loadImage(getExportSafeImageUrl(normalizedSrc))
  } catch {
    return null
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(
      () => reject(new Error(`Digital ID image timed out: ${src}`)),
      10_000
    )

    image.crossOrigin = 'anonymous'
    image.onload = () => {
      window.clearTimeout(timeout)
      resolve(image)
    }
    image.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error(`Failed to load Digital ID image: ${src}`))
    }
    image.src = src
  })
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const nextRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + nextRadius, y)
  context.lineTo(x + width - nextRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius)
  context.lineTo(x + width, y + height - nextRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height)
  context.lineTo(x + nextRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius)
  context.lineTo(x, y + nextRadius)
  context.quadraticCurveTo(x, y, x + nextRadius, y)
  context.closePath()
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function getExportSafeImageUrl(value: string) {
  const normalizedUrl = String(value || '').trim()

  if (
    !normalizedUrl ||
    normalizedUrl.startsWith('data:') ||
    normalizedUrl.startsWith('blob:') ||
    normalizedUrl.startsWith('/')
  ) {
    return normalizedUrl
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    try {
      const parsedUrl = new URL(normalizedUrl)

      if (typeof window !== 'undefined' && parsedUrl.origin === window.location.origin) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      }
    } catch {
      return normalizedUrl
    }

    return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`
  }

  return normalizedUrl
}
