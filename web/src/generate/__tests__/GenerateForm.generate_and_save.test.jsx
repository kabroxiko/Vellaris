import { expect } from 'chai'
import { vi } from 'vitest'
import * as RH from '../responseHandlers'

describe('responseHandlers: downloadNortContent and processGenerateResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloadNortContent creates anchor and revokes object URL', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://u1')
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const appendSpy = vi.spyOn(document.body, 'appendChild')

    RH.downloadNortContent('{"title":"My Map"}', null)

    expect(createSpy).to.have.been.called
    expect(revokeSpy).to.have.been.called
    expect(appendSpy).to.have.been.called
  })

  it('processGenerateResponse handles binary image bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer
    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://img')

    await RH.processGenerateResponse(bytes, 'image/png', {
      outputMode: 'preview',
      baseName: 'bname',
      source: { type: 'test' },
      fileName: 'f.png',
      setPreview,
      setCurrentSource,
    })

    expect(createSpy).to.have.been.called
    expect(setPreview).to.have.been.called
  })

  it('processGenerateResponse handles JSON nort-only response by calling downloadNortContent', async () => {
    const data = { nortContent: '{"title":"X"}' }
    const encoded = new TextEncoder().encode(JSON.stringify(data)).buffer
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://x')
    const setCurrentSource = vi.fn()

    await RH.processGenerateResponse(encoded, 'application/json', {
      outputMode: 'nort-only',
      baseName: 'bn',
      source: { type: 'test' },
      fileName: 'f.nort',
      setPreview: () => {},
      setCurrentSource,
    })
      expect(createSpy).to.have.been.called
    expect(setCurrentSource).to.have.been.called
  })
})
