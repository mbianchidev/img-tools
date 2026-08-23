import type { LoadedImage } from '../types/editor'

const MAX_FILE_BYTES = 80 * 1024 * 1024

export const validateImageFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    return 'Choose an image file such as JPG, PNG, WebP, AVIF, or GIF.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'This image is larger than 80 MB. Resize it before opening it here.'
  }
  return null
}

export const loadImageFile = async (file: File): Promise<LoadedImage> => {
  const validationError = validateImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.src = objectUrl

  try {
    await image.decode()
  } catch {
    URL.revokeObjectURL(objectUrl)
    throw new Error('This image could not be decoded. Try converting it to JPG or PNG.')
  }

  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    URL.revokeObjectURL(objectUrl)
    throw new Error('This image has no readable pixels.')
  }

  return {
    element: image,
    name: file.name,
    size: file.size,
    width: image.naturalWidth,
    height: image.naturalHeight,
    objectUrl,
  }
}

export const createDemoFile = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1050" viewBox="0 0 1600 1050">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#5547c8"/>
          <stop offset="1" stop-color="#9a8cff"/>
        </linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-opacity=".18"/></filter>
      </defs>
      <rect width="1600" height="1050" fill="#f3f0fb"/>
      <circle cx="1320" cy="180" r="230" fill="#ff6f6f"/>
      <circle cx="180" cy="870" r="320" fill="#35c2bd"/>
      <rect x="155" y="115" width="1290" height="820" rx="56" fill="url(#sky)" filter="url(#shadow)"/>
      <path d="M155 710 L520 420 L760 620 L1020 330 L1445 710 V935 H155Z" fill="#19172d" opacity=".86"/>
      <circle cx="475" cy="330" r="88" fill="#ffcf5c"/>
      <g fill="none" stroke="#fff" stroke-width="3" opacity=".35">
        <path d="M225 190H1375M225 290H1375M225 390H1375M225 490H1375M225 590H1375"/>
        <path d="M325 160V690M525 160V690M725 160V690M925 160V690M1125 160V690M1325 160V690"/>
      </g>
      <text x="230" y="820" fill="#fff" font-family="Arial, sans-serif" font-size="92" font-weight="800">BUILD / CROP / SHIP</text>
      <text x="234" y="875" fill="#e5e1ff" font-family="Arial, sans-serif" font-size="28" letter-spacing="8">A PRIVATE PIXEL WORKSPACE</text>
    </svg>
  `

  return new File([svg], 'img-tools-demo.svg', { type: 'image/svg+xml' })
}
