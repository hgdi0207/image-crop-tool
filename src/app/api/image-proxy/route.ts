import { NextRequest } from 'next/server'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response('Invalid URL protocol', { status: 400 })
    }
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      return new Response('URL does not point to an image', { status: 400 })
    }

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return new Response('Image too large (max 20 MB)', { status: 413 })
    }

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new Response('Failed to fetch image', { status: 500 })
  }
}
