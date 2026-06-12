const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#07549a"/>
  <circle cx="256" cy="256" r="168" fill="#f5b331"/>
  <circle cx="256" cy="256" r="128" fill="#f6f9fc"/>
  <path fill="#07549a" d="M156 186h72v72h-72zm128 0h72v72h-72zM156 286h72v72h-72zm128 0h72v72h-72z"/>
  <path fill="#0f9b8e" d="M238 238h36v36h-36z"/>
</svg>`

export function GET() {
  return new Response(iconSvg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
