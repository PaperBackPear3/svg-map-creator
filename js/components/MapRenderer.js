/**
 * MapRenderer Component
 * Handles SVG map rendering and region interactions
 */

class MapRenderer {
  /**
   * Create a MapRenderer component
   * @param {Store} store - Application store
   * @param {HTMLElement} container - Map container element
   * @param {HTMLElement} svgContainer - SVG container element
   * @param {HTMLElement} placeholder - Placeholder element
   */
  constructor(store, container, svgContainer, placeholder) {
    this.store = store
    this.container = container
    this.svgContainer = svgContainer
    this.placeholder = placeholder

    this.bindEvents()
  }

  /**
   * Bind store events
   */
  bindEvents() {
    // Note: regions:loaded is emitted by render() after setRegions(),
    // so we only attach listeners here, not re-render
    this.store.on('regions:loaded', () => {
      this.attachRegionListeners()
    })

    this.store.on('selection:changed', () => this.updateSelectionStyles())
    this.store.on('region:active', (index) => this.highlightRegion(index))
    this.store.on('colorTag:changed', () => this.applyColors())
    this.store.on('tags:extracted', () => this.applyColors())
    this.store.on('filters:changed', () => this.applyFilterColors())
    this.store.on('editorPaintTag:changed', (tag) => this.updatePaintMode(tag))
    this.store.on('highlightedRegions:changed', (regions) =>
      this.updateTagHighlights(regions)
    )
    this.store.on('regionColors:changed', () => this.applyRegionColors())
  }

  /**
   * Render the SVG map
   */
  render() {
    const svgContent = this.store.getState('svgContent')

    if (!svgContent) {
      this.placeholder.style.display = 'block'
      this.svgContainer.innerHTML = ''
      return
    }

    // Parse and display SVG
    const parseResult = SVGParser.parse(svgContent)

    if (parseResult.error) {
      Toast.error(parseResult.error)
      return
    }

    // Hide placeholder
    this.placeholder.style.display = 'none'

    // Display SVG
    this.svgContainer.innerHTML = parseResult.svgElement.outerHTML

    // Store regions
    this.store.setRegions(parseResult.regions)

    // Extract tags
    this.store.extractTags()
  }

  /**
   * Attach event listeners to region elements
   */
  attachRegionListeners() {
    const paths = this.svgContainer.querySelectorAll('path.region')

    paths.forEach((path, index) => {
      // Style the region
      SVGParser.styleRegionElement(path)

      // Click handler
      path.addEventListener('click', (e) => {
        e.stopPropagation()

        const mode = this.store.getState('mode')

        if (mode === 'editor') {
          // Check if paint mode is active
          const paintTag = this.store.getState('editorPaintTag')
          if (paintTag) {
            // Paint mode: add tag to clicked region
            this.store.paintRegion(index)
            Toast.success(
              `Applied ${paintTag.key.replace('data-', '')}="${
                paintTag.value
              }" to region`
            )
            return
          }

          if (e.shiftKey) {
            // Shift+click to view details
            this.store.setActiveRegion(index)
          } else {
            // Normal click to toggle selection
            this.store.toggleRegionSelection(index)
          }
        } else {
          // Viewer mode - click to view details
          this.store.setActiveRegion(index)
        }
      })

      // Double-click to view details
      path.addEventListener('dblclick', (e) => {
        e.stopPropagation()
        this.store.setActiveRegion(index)
      })
    })

    // Click outside to clear active region
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container || e.target === this.svgContainer) {
        // Don't clear in editor mode to keep selection
        const mode = this.store.getState('mode')
        if (mode === 'viewer') {
          this.store.setActiveRegion(null)
        }
      }
    })
  }

  /**
   * Update selection styles on regions
   */
  updateSelectionStyles() {
    const selectedRegions = this.store.getState('selectedRegions')
    const paths = this.svgContainer.querySelectorAll('path.region')

    paths.forEach((path, index) => {
      if (selectedRegions.has(index)) {
        path.classList.add('selected')
      } else {
        path.classList.remove('selected')
      }
    })
  }

  /**
   * Highlight a specific region
   * @param {number|null} index - Region index or null to clear
   */
  highlightRegion(index) {
    const paths = this.svgContainer.querySelectorAll('path.region')

    paths.forEach((path, i) => {
      if (i === index) {
        path.classList.add('highlighted')
      } else {
        path.classList.remove('highlighted')
      }
    })
  }

  /**
   * Apply colors based on current color tag
   */
  applyColors() {
    const mode = this.store.getState('mode')

    if (mode === 'viewer') {
      // In viewer mode, colors are controlled by filters
      return
    }

    const currentColorTag = this.store.getState('currentColorTag')
    const valueColors = this.store.getState('valueColors')
    const regions = this.store.getState('regions')
    const paths = this.svgContainer.querySelectorAll('path.region')

    paths.forEach((path, index) => {
      const region = regions[index]
      if (!region || !region.element) return

      // Reset styles
      path.style.fill = ''
      path.style.fillOpacity = ''

      if (currentColorTag && region.element.hasAttribute(currentColorTag)) {
        const tagValue = region.element.getAttribute(currentColorTag)
        const colorKey = `${currentColorTag}:${tagValue}`
        const color = valueColors.get(colorKey)

        if (color) {
          path.style.fill = color
          path.style.fillOpacity = '0.7'
        }
      }
    })
  }

  /**
   * Apply colors based on active filters (viewer mode)
   */
  applyFilterColors() {
    const mode = this.store.getState('mode')

    if (mode !== 'viewer') return

    const activeFilters = this.store.getState('activeFilters')
    const valueColors = this.store.getState('valueColors')
    const regions = this.store.getState('regions')
    const paths = this.svgContainer.querySelectorAll('path.region')

    regions.forEach((region, index) => {
      const path = paths[index]
      if (!path || !region || !region.element) return

      // Check if region matches any active filter
      let matchedColor = null

      const tags = SVGParser.extractTags(region.element)

      for (const tag of tags) {
        const fullKey = `data-${tag.key}`
        if (activeFilters.has(fullKey)) {
          const activeValues = activeFilters.get(fullKey)
          if (activeValues.has(tag.value)) {
            const colorKey = `${fullKey}:${tag.value}`
            matchedColor = valueColors.get(colorKey)
            break
          }
        }
      }

      if (matchedColor) {
        path.style.fill = matchedColor
        path.style.fillOpacity = '0.7'
      } else {
        path.style.fill = 'rgba(200, 200, 200, 0.1)'
        path.style.fillOpacity = '0.1'
      }
    })
  }

  /**
   * Add labels to regions
   */
  addLabels() {
    const regions = this.store.getState('regions')
    const svg = this.svgContainer.querySelector('svg')

    if (!svg) return

    // Remove existing labels
    svg.querySelectorAll('text[data-label-for]').forEach((el) => el.remove())

    regions.forEach((region) => {
      if (!region.name) return

      const path =
        this.svgContainer.querySelectorAll('path.region')[region.index]
      if (!path) return

      const bbox = path.getBBox()
      const centerX = bbox.x + bbox.width / 2
      const centerY = bbox.y + bbox.height / 2

      const text = DOM.createSVGElement('text', {
        x: centerX,
        y: centerY,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-size': '14',
        'font-weight': 'bold',
        fill: '#333',
        'pointer-events': 'none',
        'data-label-for': region.id,
        'paint-order': 'stroke',
        stroke: 'white',
        'stroke-width': '3',
        'stroke-linejoin': 'round',
      })

      text.textContent = region.name
      svg.appendChild(text)
    })
  }

  /**
   * Get the current SVG content
   * @returns {string} SVG string
   */
  getSVGContent() {
    const svg = this.svgContainer.querySelector('svg')
    return svg ? SVGParser.serialize(svg) : ''
  }

  /**
   * Update paint mode visual state
   * @param {Object|null} paintTag - Active paint tag or null
   */
  updatePaintMode(paintTag) {
    if (paintTag) {
      this.container.classList.add('paint-mode')
    } else {
      this.container.classList.remove('paint-mode')
    }
  }

  /**
   * Update tag-based region highlighting
   * @param {Set} highlightedRegions - Set of region indices to highlight
   */
  updateTagHighlights(highlightedRegions) {
    const paths = this.svgContainer.querySelectorAll('path.region')

    paths.forEach((path, index) => {
      if (highlightedRegions.has(index)) {
        path.classList.add('tag-highlighted')
      } else {
        path.classList.remove('tag-highlighted')
      }
    })
  }

  /**
   * Apply custom region colors from data-region-color attribute
   */
  applyRegionColors() {
    const regions = this.store.getState('regions')
    const paths = this.svgContainer.querySelectorAll('path.region')

    regions.forEach((region, index) => {
      const path = paths[index]
      if (!path || !region || !region.element) return

      const customColor = region.element.getAttribute('data-region-color')
      if (customColor) {
        path.style.fill = customColor
        path.style.fillOpacity = '0.7'
      }
    })
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapRenderer
} else {
  window.MapRenderer = MapRenderer
}
