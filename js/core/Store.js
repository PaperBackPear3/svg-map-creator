/**
 * Store
 * Centralized state management for the application
 */

class Store extends EventEmitter {
  constructor(initialState = {}) {
    super()

    this._state = {
      // App mode
      mode: 'editor', // 'editor' or 'viewer'

      // File state
      fileName: '',
      modified: false,
      svgContent: null,

      // Regions data
      regions: [],
      selectedRegions: new Set(),
      activeRegion: null,

      // Tags data
      tags: new Map(), // tagKey -> { name, values: Map<value, { count, regions }> }
      tagColors: new Map(), // tagKey -> color
      valueColors: new Map(), // "tagKey:value" -> color
      currentColorTag: '', // Currently selected tag for coloring

      // Filter state (viewer mode)
      activeFilters: new Map(), // tagKey -> Set of active values
      searchQuery: '',

      // Editor paint mode state
      editorPaintTag: null, // { key: string, value: string } or null
      highlightedRegions: new Set(), // Region indices highlighted by tag selection

      // Override with initial state
      ...initialState,
    }
  }

  /**
   * Get current state or a specific key
   * @param {string} key - State key (optional)
   * @returns {any} State or state value
   */
  getState(key) {
    if (key) {
      return this._state[key]
    }
    return { ...this._state }
  }

  /**
   * Set state values
   * @param {Object|Function} updates - State updates or updater function
   */
  setState(updates) {
    const prevState = { ...this._state }

    if (typeof updates === 'function') {
      updates = updates(prevState)
    }

    // Merge updates
    Object.entries(updates).forEach(([key, value]) => {
      this._state[key] = value
    })

    // Emit change events
    Object.keys(updates).forEach((key) => {
      if (this._state[key] !== prevState[key]) {
        this.emit(`change:${key}`, this._state[key], prevState[key])
      }
    })

    this.emit('change', this._state, prevState)
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.setState({
      fileName: '',
      modified: false,
      svgContent: null,
      regions: [],
      selectedRegions: new Set(),
      activeRegion: null,
      tags: new Map(),
      tagColors: new Map(),
      valueColors: new Map(),
      currentColorTag: '',
      activeFilters: new Map(),
      searchQuery: '',
      editorPaintTag: null,
      highlightedRegions: new Set(),
    })
    this.emit('reset')
  }

  // ============================================
  // Region Methods
  // ============================================

  /**
   * Add regions from parsed SVG
   * @param {Array} regions - Array of region objects
   */
  setRegions(regions) {
    this.setState({ regions })
    this.emit('regions:loaded', regions)
  }

  /**
   * Get a region by index
   * @param {number} index - Region index
   * @returns {Object|null} Region object
   */
  getRegion(index) {
    return this._state.regions[index] || null
  }

  /**
   * Toggle region selection
   * @param {number} index - Region index
   */
  toggleRegionSelection(index) {
    const selected = new Set(this._state.selectedRegions)

    if (selected.has(index)) {
      selected.delete(index)
    } else {
      selected.add(index)
    }

    this.setState({ selectedRegions: selected })
    this.emit('selection:changed', selected)
  }

  /**
   * Select all regions
   */
  selectAllRegions() {
    const selected = new Set(this._state.regions.map((_, i) => i))
    this.setState({ selectedRegions: selected })
    this.emit('selection:changed', selected)
  }

  /**
   * Deselect all regions
   */
  deselectAllRegions() {
    this.setState({ selectedRegions: new Set() })
    this.emit('selection:changed', new Set())
  }

  /**
   * Invert region selection
   */
  invertSelection() {
    const selected = new Set()
    this._state.regions.forEach((_, index) => {
      if (!this._state.selectedRegions.has(index)) {
        selected.add(index)
      }
    })
    this.setState({ selectedRegions: selected })
    this.emit('selection:changed', selected)
  }

  /**
   * Set active region (for info panel)
   * @param {number|null} index - Region index or null
   */
  setActiveRegion(index) {
    this.setState({ activeRegion: index })
    this.emit('region:active', index)
  }

  // ============================================
  // Tag Methods
  // ============================================

  /**
   * Extract and set tags from regions
   */
  extractTags() {
    const tags = new Map()
    const tagColors = new Map()
    const valueColors = new Map()

    // Collect all tags and their values
    this._state.regions.forEach((region, regionIndex) => {
      if (!region.element) return

      Array.from(region.element.attributes).forEach((attr) => {
        if (
          attr.name.startsWith('data-') &&
          !['data-index', 'data-label-for'].includes(attr.name)
        ) {
          const tagKey = attr.name
          const tagValue = attr.value

          if (!tags.has(tagKey)) {
            tags.set(tagKey, {
              name: tagKey.replace('data-', ''),
              values: new Map(),
            })
          }

          const tagData = tags.get(tagKey)
          if (!tagData.values.has(tagValue)) {
            tagData.values.set(tagValue, {
              count: 0,
              regions: [],
            })
          }

          tagData.values.get(tagValue).count++
          tagData.values.get(tagValue).regions.push(regionIndex)
        }
      })
    })

    // Generate colors
    let hueStep = 360 / Math.max(tags.size, 1)
    let hue = 0

    tags.forEach((tagData, tagKey) => {
      tagColors.set(tagKey, `hsl(${hue}, 70%, 55%)`)

      let valueIndex = 0
      const valueCount = tagData.values.size

      tagData.values.forEach((_, value) => {
        const lightness = 40 + (valueIndex / Math.max(valueCount, 1)) * 30
        const colorKey = `${tagKey}:${value}`
        valueColors.set(colorKey, `hsl(${hue}, 70%, ${lightness}%)`)
        valueIndex++
      })

      hue += hueStep
    })

    // Auto-select first tag for coloring
    const firstTag = tags.size > 0 ? Array.from(tags.keys())[0] : ''

    this.setState({
      tags,
      tagColors,
      valueColors,
      currentColorTag: firstTag,
    })

    this.emit('tags:extracted', tags)
  }

  /**
   * Set current color tag
   * @param {string} tagKey - Tag key
   */
  setColorTag(tagKey) {
    this.setState({ currentColorTag: tagKey })
    this.emit('colorTag:changed', tagKey)
  }

  /**
   * Add a tag to regions
   * @param {Array<number>} regionIndices - Region indices
   * @param {string} key - Tag key
   * @param {string} value - Tag value
   */
  addTagToRegions(regionIndices, key, value) {
    const fullKey = key.startsWith('data-') ? key : `data-${key}`

    regionIndices.forEach((index) => {
      const region = this._state.regions[index]
      if (region && region.element) {
        region.element.setAttribute(fullKey, value)
      }
    })

    this.setState({ modified: true })
    this.extractTags()
    this.emit('tags:added', { indices: regionIndices, key: fullKey, value })
  }

  /**
   * Remove a tag from a region
   * @param {number} regionIndex - Region index
   * @param {string} tagKey - Full tag key (with data- prefix)
   */
  removeTagFromRegion(regionIndex, tagKey) {
    const region = this._state.regions[regionIndex]
    if (region && region.element) {
      region.element.removeAttribute(tagKey)
      this.setState({ modified: true })
      this.extractTags()
      this.emit('tag:removed', { index: regionIndex, key: tagKey })
    }
  }

  /**
   * Update region name
   * @param {number} regionIndex - Region index
   * @param {string} name - New name
   * @param {string} description - New description
   */
  updateRegionName(regionIndex, name, description = '') {
    const region = this._state.regions[regionIndex]
    if (region) {
      region.name = name
      region.description = description

      if (region.element && name) {
        region.element.setAttribute('data-name', name)
      }

      this.setState({ modified: true })
      this.emit('region:updated', { index: regionIndex, name, description })
    }
  }

  // ============================================
  // Filter Methods (Viewer Mode)
  // ============================================

  /**
   * Toggle a filter value
   * @param {string} tagKey - Tag key
   * @param {string} value - Value to toggle
   */
  toggleFilter(tagKey, value) {
    const filters = new Map(this._state.activeFilters)

    if (!filters.has(tagKey)) {
      filters.set(tagKey, new Set())
    }

    const values = filters.get(tagKey)
    if (values.has(value)) {
      values.delete(value)
    } else {
      values.add(value)
    }

    this.setState({ activeFilters: filters })
    this.emit('filters:changed', filters)
  }

  /**
   * Select all filters
   */
  selectAllFilters() {
    const filters = new Map()

    this._state.tags.forEach((tagData, tagKey) => {
      filters.set(tagKey, new Set(tagData.values.keys()))
    })

    this.setState({ activeFilters: filters })
    this.emit('filters:changed', filters)
  }

  /**
   * Deselect all filters
   */
  deselectAllFilters() {
    this.setState({ activeFilters: new Map() })
    this.emit('filters:changed', new Map())
  }

  /**
   * Set search query
   * @param {string} query - Search query
   */
  setSearchQuery(query) {
    this.setState({ searchQuery: query })
    this.emit('search:changed', query)
  }

  // ============================================
  // Editor Paint Mode Methods
  // ============================================

  /**
   * Set the active paint tag for editor mode
   * @param {Object|null} paintTag - { key: string, value: string } or null
   */
  setEditorPaintTag(paintTag) {
    this.setState({ editorPaintTag: paintTag })
    this.emit('editorPaintTag:changed', paintTag)
  }

  /**
   * Set highlighted regions (for tag value selection)
   * @param {Array<number>} regionIndices - Array of region indices to highlight
   */
  setHighlightedRegions(regionIndices) {
    const highlighted = new Set(regionIndices)
    this.setState({ highlightedRegions: highlighted })
    this.emit('highlightedRegions:changed', highlighted)
  }

  /**
   * Clear all highlighted regions
   */
  clearHighlightedRegions() {
    this.setState({ highlightedRegions: new Set() })
    this.emit('highlightedRegions:changed', new Set())
  }

  /**
   * Paint a region with the current paint tag
   * @param {number} regionIndex - Region index to paint
   */
  paintRegion(regionIndex) {
    const paintTag = this._state.editorPaintTag
    if (!paintTag) return false

    this.addTagToRegions([regionIndex], paintTag.key, paintTag.value)
    return true
  }

  /**
   * Set region color for multiple regions
   * @param {Array<number>} regionIndices - Array of region indices
   * @param {string} color - Color hex value
   */
  setRegionColorForTag(regionIndices, color) {
    regionIndices.forEach((index) => {
      const region = this._state.regions[index]
      if (region && region.element) {
        region.element.setAttribute('data-region-color', color)
      }
    })

    this.setState({ modified: true })
    this.emit('regionColors:changed')
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const regions = this._state.regions
    const selected = this._state.selectedRegions
    const tags = this._state.tags
    const namedCount = regions.filter((r) => r.name).length

    let activeFiltersCount = 0
    this._state.activeFilters.forEach((values) => {
      activeFiltersCount += values.size
    })

    return {
      totalRegions: regions.length,
      selectedCount: selected.size,
      totalTags: tags.size,
      namedRegions: namedCount,
      activeFilters: activeFiltersCount,
    }
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store
} else {
  window.Store = Store
}
