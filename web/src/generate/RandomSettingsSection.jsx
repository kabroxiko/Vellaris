import React from 'react'
import PropTypes from 'prop-types'
import FileUploadButton from './FileUploadButton'

const MAP_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
]

export default function RandomSettingsSection({ values, handlers, options, ui }) {
  const {
    dimension,
    worldSize,
    landShape,
    regionCount,
    landColoringMethod,
    artPack,
    cityIconType,
    cityFrequency,
    selectedBooks,
    mapLanguage,
    fileName,
  } = values

  const {
    setDimension,
    setWorldSize,
    setLandShape,
    setRegionCount,
    setLandColoringMethod,
    setArtPack,
    setCityIconType,
    setCityFrequency,
    setSelectedBooks,
    setMapLanguage,
    handleRandomMap,
    handleFileInput,
    onDrop,
  } = handlers

  const { artPacks, cityIconTypes, allBooks, i18n } = options
  const { loading } = ui

  const labels = i18n?.labels
  const backendOptions = i18n?.options
  const translateLabel = (key) => {
    const v = labels?.[key] || key
    if (typeof v === 'string' && /<br\s*\/?>/i.test(v)) {
      const parts = v.split(/<br\s*\/?>/i)
      return parts.flatMap((p) => (p === parts.at(-1) ? [p] : [p, React.createElement('br', { key: `br-${String(p).slice(0,20)}` })]))
    }
    return v
  }
  const dimensions = backendOptions?.dimensions
  const landShapes = backendOptions?.landShapes
  const landColoringMethods = backendOptions?.landColoringMethods

  return (
    <section className="generator-section">
      <h3>{translateLabel('ui.title')}</h3>
      <p className="section-hint">
        {translateLabel('ui.subtitle')}
      </p>
      <form className="section-fields" onSubmit={handleRandomMap}>
        <div className="fields-grid two-col-layout">
          <div className="fields-column">
            <label htmlFor="map-language-input">
              {translateLabel('ui.mapLanguage')}
            </label>
            <select
              id="map-language-input"
              value={mapLanguage}
              onChange={(e) => setMapLanguage(e.target.value)}
            >
              {MAP_LANGUAGE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <fieldset className="books-widget">
              <legend>{translateLabel('textTool.booksForText.label')}</legend>
              {Array.isArray(allBooks) && allBooks.length > 0 ? (
                <div className="books-wrapper">
                  <div className="books-actions">
                    <button type="button" onClick={() => setSelectedBooks(new Set(Array.isArray(allBooks) ? allBooks : []))}>
                      {translateLabel('books.checkAll')}
                    </button>
                    <button type="button" onClick={() => setSelectedBooks(new Set())}>
                      {translateLabel('books.uncheckAll')}
                    </button>
                  </div>
                  <div className="books-list">
                    {Array.isArray(allBooks) ? allBooks.map((book) => (
                      <label key={book} className="book-item">
                        <input
                          type="checkbox"
                          checked={selectedBooks.has(book)}
                          onChange={(e) => {
                            const next = new Set(selectedBooks)
                            if (e.target.checked) next.add(book)
                            else next.delete(book)
                            setSelectedBooks(next)
                          }}
                        />
                        <span className="book-title">{book}</span>
                      </label>
                    )) : null}
                  </div>
                </div>
              ) : (
                <div className="disabled-note">{translateLabel('textTool.booksForText.none')}</div>
              )}
            </fieldset>
          </div>

          <div className="fields-column">
            <label htmlFor="dimension-input">{translateLabel('newSettingsDialog.dimensions.label')}</label>
            <select
              id="dimension-input"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
            >
              {Array.isArray(dimensions) ? dimensions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
                )) : null}
            </select>

            <label htmlFor="world-size-input">
              {translateLabel('newSettingsDialog.worldSize.label')}
            </label>
            <div className="slider-row">
              <input
                id="world-size-input"
                type="range"
                min={2000}
                max={32000}
                step={1000}
                value={worldSize}
                onChange={(e) => setWorldSize(Number(e.target.value))}
              />
              <span className="slider-value">{worldSize.toLocaleString()}</span>
            </div>

            <label htmlFor="land-shape-input">{translateLabel('newSettingsDialog.landShape.label')}</label>
            <select
              id="land-shape-input"
              value={landShape}
              onChange={(e) => setLandShape(e.target.value)}
            >
              {Array.isArray(landShapes) ? landShapes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
                )) : null}
            </select>

            <label htmlFor="region-count-input">
              {translateLabel('newSettingsDialog.regionCount.label')}
            </label>
            <div className="slider-row">
              <input
                id="region-count-input"
                type="range"
                min={2}
                max={20}
                step={1}
                value={regionCount}
                onChange={(e) => setRegionCount(Number(e.target.value))}
              />
              <span className="slider-value">{regionCount}</span>
            </div>

            <label htmlFor="land-coloring-input">
              {translateLabel('theme.landColoringMethod.label')}{' '}
            </label>
            <select
              id="land-coloring-input"
              value={landColoringMethod}
              onChange={(e) => setLandColoringMethod(e.target.value)}
            >
              {Array.isArray(landColoringMethods) ? landColoringMethods.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                )) : null}
            </select>

            <label htmlFor="art-pack-input" className={Array.isArray(artPacks) && artPacks.length === 0 ? 'is-disabled' : ''}>{translateLabel('newSettingsDialog.artPack.label')}</label>
            <select
              id="art-pack-input"
              value={artPack}
              onChange={(e) => setArtPack(e.target.value)}
              disabled={artPacks.length === 0}
            >
              {artPacks.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label htmlFor="city-icon-type-input" className={cityIconTypes.length === 0 ? 'is-disabled' : ''}>{translateLabel('newSettingsDialog.cityIconType.label')}</label>
            <select
              id="city-icon-type-input"
              value={cityIconType}
              onChange={(e) => setCityIconType(e.target.value)}
              disabled={cityIconTypes.length === 0}
            >
              {cityIconTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label htmlFor="city-frequency-input">
              {translateLabel('newSettingsDialog.cityFrequency.label')}
            </label>
            <div className="slider-row">
              <input
                id="city-frequency-input"
                type="range"
                min={0}
                max={100}
                step={1}
                value={cityFrequency}
                onChange={(e) => setCityFrequency(Number(e.target.value))}
              />
              <span className="slider-value">{cityFrequency}%</span>
            </div>

            {/* Random seed input removed from Random panel; seed is handled in Customize */}
          </div>
        </div>

        <div className="section-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? translateLabel('ui.generating')
              : translateLabel('ui.generate')}
          </button>
        </div>

        <div className="section-divider">
          <span>{translateLabel('ui.section.or')}</span>
        </div>

        <div className="upload-group">
          <FileUploadButton
            onFileSelect={(file) => handleFileInput({ target: { files: [file] } })}
            onDrop={onDrop}
            ariaLabel={translateLabel('ui.upload.aria')}
            chooseLabel={translateLabel('common.choose')}
            fileName={fileName}
            loadedPrefix={translateLabel('ui.upload.loadedPrefix')}
            uploadHint={translateLabel('ui.upload.hint')}
            disabled={loading}
          />
        </div>
      </form>
    </section>
  )
}

RandomSettingsSection.propTypes = {
  values: PropTypes.shape({
    dimension: PropTypes.string,
    worldSize: PropTypes.number,
    landShape: PropTypes.string,
    regionCount: PropTypes.number,
    landColoringMethod: PropTypes.string,
    artPack: PropTypes.string,
    cityIconType: PropTypes.string,
    cityFrequency: PropTypes.number,
    selectedBooks: PropTypes.instanceOf(Set),
    randomSeed: PropTypes.string,
    mapLanguage: PropTypes.string,
    fileName: PropTypes.string,
  }),
  handlers: PropTypes.shape({
    setDimension: PropTypes.func.isRequired,
    setWorldSize: PropTypes.func.isRequired,
    setLandShape: PropTypes.func.isRequired,
    setRegionCount: PropTypes.func.isRequired,
    setLandColoringMethod: PropTypes.func.isRequired,
    setArtPack: PropTypes.func.isRequired,
    setCityIconType: PropTypes.func.isRequired,
    setCityFrequency: PropTypes.func.isRequired,
    setSelectedBooks: PropTypes.func.isRequired,
    setRandomSeed: PropTypes.func.isRequired,
    setMapLanguage: PropTypes.func.isRequired,
    handleRandomMap: PropTypes.func.isRequired,
    handleFileInput: PropTypes.func.isRequired,
    onDrop: PropTypes.func.isRequired,
  }).isRequired,
  options: PropTypes.shape({
    artPacks: PropTypes.arrayOf(PropTypes.string),
    cityIconTypes: PropTypes.arrayOf(PropTypes.string),
    allBooks: PropTypes.arrayOf(PropTypes.string),
    i18n: PropTypes.object,
  }),
  ui: PropTypes.shape({
    loading: PropTypes.bool.isRequired,
    dropRef: PropTypes.shape({ current: PropTypes.any }),
  }).isRequired,
}
