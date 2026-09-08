export async function encodeQrDataUrl(text: string): Promise<string> {
  const QR = await import('qrcode')
  return QR.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#0a0a0a', light: '#ffffff' },
  })
}
