export type ShareCardOrientation = 'landscape' | 'portrait'

export function getShareCardOrientation(): ShareCardOrientation {
  return window.matchMedia('(max-width: 768px)').matches ? 'portrait' : 'landscape'
}

async function waitForShareCardPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const img = document.querySelector('#share-card-download img') as HTMLImageElement | null
  if (!img) return
  if (img.complete && img.naturalWidth > 0) return

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load share card sky image'))
  })
}

export async function captureShareCardDownload(): Promise<string | null> {
  const element = document.getElementById('share-card-download')
  if (!element) return null

  await waitForShareCardPaint()

  const { toPng } = await import('html-to-image')
  return toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    filter: (node) =>
      !(node instanceof HTMLElement && node.classList.contains('share-card-download-btn')),
  })
}

export function downloadImage(dataUrl: string, filename = 'my-constellation.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
