const MAX_UPLOAD_DATA_LENGTH = 900_000

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The selected file is not a readable image.'))
    image.src = src
  })
}

export async function prepareMerchantImage(file: File, maxDimension = 1600) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Please choose an image smaller than 10 MB.')
  }

  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * ratio))
  canvas.height = Math.max(1, Math.round(image.height * ratio))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image processing is not available in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
    const output = canvas.toDataURL('image/webp', quality)
    if (output.length <= MAX_UPLOAD_DATA_LENGTH) return output
  }

  throw new Error('This image is still too large after compression. Please choose a smaller image.')
}
