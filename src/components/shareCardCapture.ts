export type ShareCardOrientation = 'landscape' | 'portrait'

export function getShareCardOrientation(): ShareCardOrientation {
  return window.matchMedia('(max-width: 768px)').matches ? 'portrait' : 'landscape'
}

export function downloadImage(dataUrl: string, filename = 'my-constellation.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
