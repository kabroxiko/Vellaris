export function clampColorChannel(value) {
  return Math.max(0, Math.min(255, value))
}

export function parseColorChannels(value) {
  if (!value) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return {
        r: Number.parseInt(trimmed.slice(1, 3), 16),
        g: Number.parseInt(trimmed.slice(3, 5), 16),
        b: Number.parseInt(trimmed.slice(5, 7), 16),
        a: 255,
      }
    }

    const parts = trimmed.split(',').map((part) => Number(part.trim()))
    if (parts.length >= 3 && parts.slice(0, 3).every((part) => Number.isFinite(part))) {
      const [r, g, b, a = 255] = parts
      return {
        r: clampColorChannel(r),
        g: clampColorChannel(g),
        b: clampColorChannel(b),
        a: clampColorChannel(a),
      }
    }

    return null
  }

  if (typeof value === 'object') {
    const r = value.r ?? value.red
    const g = value.g ?? value.green
    const b = value.b ?? value.blue
    const a = value.a ?? value.alpha ?? 255
    if ([r, g, b, a].every((part) => Number.isFinite(Number(part)))) {
      return {
        r: clampColorChannel(Number(r)),
        g: clampColorChannel(Number(g)),
        b: clampColorChannel(Number(b)),
        a: clampColorChannel(Number(a)),
      }
    }
  }

  return null
}

export function colorToHex(value) {
  const channels = parseColorChannels(value)
  if (!channels) return null

  return (
    `#${channels.r.toString(16).padStart(2, '0')}` +
    `${channels.g.toString(16).padStart(2, '0')}` +
    `${channels.b.toString(16).padStart(2, '0')}`
  )
}

export function colorToAlphaPercent(value, fallback = 100) {
  const channels = parseColorChannels(value)
  if (!channels) return fallback
  return Math.round((channels.a / 255) * 100)
}

export function formatColorString(hex, alphaPercent = 100) {
  const channels = parseColorChannels(hex)
  if (!channels) return null

  const alpha = clampColorChannel(Math.round((Number(alphaPercent) / 100) * 255))
  if (alpha >= 255) {
    return `${channels.r},${channels.g},${channels.b}`
  }

  return `${channels.r},${channels.g},${channels.b},${alpha}`
}

export function parseFontSpec(value) {
  if (typeof value !== 'string') return null
  const parts = value.split('\t')
  if (parts.length !== 3) return null

  const styleNumber = Number(parts[1])
  const size = Number(parts[2])
  if (!parts[0] || !Number.isFinite(styleNumber) || !Number.isFinite(size)) {
    return null
  }

  return {
    family: parts[0],
    styleNumber,
    size,
  }
}

export function fontSpecToFamily(value) {
  return parseFontSpec(value)?.family ?? ''
}

export function updateFontFamilyInSpec(existingValue, family, fallbackSize = 24) {
  const trimmedFamily = family?.trim()
  if (!trimmedFamily) return existingValue

  const parsed = parseFontSpec(existingValue)
  const styleNumber = parsed?.styleNumber ?? 0
  const size = parsed?.size ?? fallbackSize
  return `${trimmedFamily}\t${styleNumber}\t${size}`
}

export function base64ToBlob(base64, mimeType) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.codePointAt(0) ?? 0)
  return new Blob([bytes], { type: mimeType })
}
