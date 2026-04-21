export function stringValueOrEmpty(value) {
  return typeof value === 'string' && value ? value : ''
}

export function seedStringOrEmpty(value) {
  return value !== undefined && value !== null && value !== '' ? String(value) : ''
}

export function selectCityIconType(previousType, types) {
  if (previousType && types.includes(previousType)) {
    return previousType
  }
  return ''
}

export function dimensionFromSize(width, height) {
  if (width === 4096 && height === 4096) return 'Square'
  if (width === 4096 && height === 2304) return 'Sixteen_by_9'
  if (width === 4096 && height === 2531) return 'Golden_Ratio'
  return ''
}

export function fetchJson(url) {
  return fetch(url).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`Failed to fetch ${url}`))
  )
}

export function appendIfSet(fd, key, value) {
  if (value !== null && value !== undefined && value !== '') fd.append(key, String(value))
}

export async function handleResponseError(res) {
  const headersObj = Object.fromEntries(res.headers.entries())
  let txt = await res.text()
  try {
    const j = JSON.parse(txt)
    txt = j.message || txt
  } catch (e) {
    console.warn('Failed to parse error response as JSON', e)
  }
  console.error('API /generate error:', {
    status: res.status,
    headers: headersObj,
    bodyPreview: txt.slice(0, 200),
  })
  throw new Error(`Server returned ${res.status}: ${txt}`)
}
