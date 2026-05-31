export async function captureShareCard(): Promise<string | null> {
  const element = document.getElementById('share-card')
  if (!element) return null

  const { toPng } = await import('html-to-image')
  return toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#050314',
  })
}

export function downloadImage(dataUrl: string, filename = 'my-constellation.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
