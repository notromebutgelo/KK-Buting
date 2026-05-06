import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_IMAGE_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]

function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function isAllowedImageHost(hostname: string) {
  return (
    ALLOWED_IMAGE_HOSTS.includes(hostname) ||
    hostname.endsWith('.googleusercontent.com')
  )
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url')?.trim()

  if (!target) {
    return NextResponse.json({ error: 'Missing image url.' }, { status: 400 })
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(target)
  } catch {
    return NextResponse.json({ error: 'Invalid image url.' }, { status: 400 })
  }

  const requestOrigin = request.nextUrl.origin
  const isSameOriginTarget = parsedUrl.origin === requestOrigin
  const isLoopbackTarget =
    parsedUrl.protocol === 'http:' && isLoopbackHostname(parsedUrl.hostname)

  if (parsedUrl.protocol !== 'https:' && !isSameOriginTarget && !isLoopbackTarget) {
    return NextResponse.json(
      { error: 'Only HTTPS image URLs are supported.' },
      { status: 400 }
    )
  }

  if (
    !isAllowedImageHost(parsedUrl.hostname) &&
    !isSameOriginTarget &&
    !isLoopbackTarget
  ) {
    return NextResponse.json({ error: 'Image host is not allowed.' }, { status: 400 })
  }

  const upstream = await fetch(parsedUrl.toString(), { cache: 'no-store' })

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch image asset.' },
      { status: upstream.status || 502 }
    )
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  const payload = await upstream.arrayBuffer()

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
