// Small module of helpers extracted from CustomizeSettingsSection
export function stripHtmlWrapper(str) {
  let start = 0
  let end = str.length
  while (start < end && /\s/.test(str.charAt(start))) start++
  while (end > start && /\s/.test(str.charAt(end - 1))) end--
  if (end - start >= 6 && str.substring(start, start + 6).toLowerCase() === '<html>') {
    start += 6
    while (start < end && /\s/.test(str.charAt(start))) start++
  }
  if (end - start >= 7 && str.substring(end - 7, end).toLowerCase() === '</html>') {
    end -= 7
    while (end > start && /\s/.test(str.charAt(end - 1))) end--
  }
  return str.substring(start, end)
}

export function removeTags(str) {
  let out = ''
  let inTag = false
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i)
    if (!inTag) {
      if (ch === '<') inTag = true
      else out += ch
    } else if (ch === '>') inTag = false
  }
  return out
}

export function pick(obj, keys) {
  const out = {}
  if (!obj) return out
  for (const k of keys) {
    if (Object.hasOwn(obj, k)) out[k] = obj[k]
  }
  return out
}

export const modalBackdropStyle = Object.freeze({
  position: 'fixed',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: 0,
  border: 'none',
})

export const modalContentStyle = {
  background: '#fff',
  padding: 12,
  borderRadius: 8,
  boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  border: 'none',
  backgroundClip: 'padding-box',
  WebkitBackgroundClip: 'padding-box',
}
