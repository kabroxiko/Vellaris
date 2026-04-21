export function requestWantsNortContent(requestOptions) {
  if (!requestOptions?.body) return false
  if (typeof requestOptions.body === 'string') {
    try {
      const parsed = JSON.parse(requestOptions.body)
      return !!parsed.returnNortContent
    } catch {
      return false
    }
  }
  if (requestOptions.body instanceof FormData) {
    return requestOptions.body.get('returnNortContent') === 'true'
  }
  return false
}

export function cloneRequestWithoutNortContent(requestOptions) {
  if (!requestOptions?.body) return null
  if (typeof requestOptions.body === 'string') {
    try {
      const parsed = JSON.parse(requestOptions.body)
      delete parsed.returnNortContent
      return {
        ...requestOptions,
        body: JSON.stringify(parsed),
      }
    } catch {
      return null
    }
  }
  if (requestOptions.body instanceof FormData) {
    const form = new FormData()
    for (const [key, value] of requestOptions.body.entries()) {
      if (key !== 'returnNortContent') {
        form.append(key, value)
      }
    }
    return {
      ...requestOptions,
      body: form,
    }
  }
  return null
}

function appendOptionalField(form, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    form.append(key, String(value))
  }
}

function buildFormDataFromParsedJson(parsed) {
  const form = new FormData()
  const nortBlob = new Blob([parsed.nortContent], { type: 'text/plain' })
  form.append('nortFile', nortBlob, 'generated-settings.nort')
  appendOptionalField(form, 'width', parsed.width)
  appendOptionalField(form, 'height', parsed.height)
  appendOptionalField(form, 'seed', parsed.seed)
  if (parsed.saveNort) form.append('saveNort', 'true')
  form.append('returnImageBytes', 'true')
  return form
}

function buildFormDataFromFormData(original) {
  const form = new FormData()
  const allowedKeys = new Set(['nortFile', 'width', 'height', 'seed', 'saveNort'])
  for (const [key, value] of original.entries()) {
    if (allowedKeys.has(key)) {
      form.append(key, value)
    }
  }
  form.append('returnImageBytes', 'true')
  return form
}

export function buildLegacyCompatibleRequest(requestOptions) {
  if (!requestOptions?.body) return null

  if (typeof requestOptions.body === 'string') {
    try {
      const parsed = JSON.parse(requestOptions.body)
      if (!parsed.nortContent) {
        return null
      }
      return {
        method: 'POST',
        body: buildFormDataFromParsedJson(parsed),
      }
    } catch {
      return null
    }
  }

  if (requestOptions.body instanceof FormData) {
    if (!requestOptions.body.get('nortFile')) {
      return null
    }
    return {
      method: 'POST',
      body: buildFormDataFromFormData(requestOptions.body),
    }
  }

  return null
}

export function sanitizeNortContentForServer(nortContent) {
  try {
    const parsed = JSON.parse(nortContent)

    const rewrite = (value) => {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value)) {
        value.forEach(rewrite)
        return
      }

      for (const key of Object.keys(value)) {
        const child = value[key]
        if (key === 'customImagesPath' && typeof child === 'string' && child.length > 0) {
          value[key] = ''
          continue
        }
        if (key === 'artPack' && child === 'custom') {
          value[key] = 'nortantis'
          continue
        }
        if (key === 'backgroundTextureSource' && child === 'File') {
          value[key] = 'Assets'
        }
        if (key === 'backgroundTextureImage' && typeof child === 'string' && child.length > 0) {
          value[key] = ''
        }
        rewrite(child)
      }
    }

    rewrite(parsed)
    return JSON.stringify(parsed)
  } catch {
    return nortContent
  }
}

export function buildSanitizedNortContentRequest(requestOptions) {
  if (!requestOptions?.body || typeof requestOptions.body !== 'string') return null
  try {
    const parsed = JSON.parse(requestOptions.body)
    if (!parsed.nortContent) return null
    parsed.nortContent = sanitizeNortContentForServer(parsed.nortContent)
    delete parsed.returnNortContent
    return {
      ...requestOptions,
      body: JSON.stringify(parsed),
    }
  } catch {
    return null
  }
}
