/**
 * Legend Component
 * Shows color legend for the current tag coloring
 */

class Legend {
  /**
   * Create a Legend component
   * @param {Store} store - Application store
   * @param {HTMLElement} container - Legend container element
   * @param {HTMLElement} selectElement - Color tag select element
   * @param {HTMLElement} contentElement - Legend content element
   */
  constructor(store, container, selectElement, contentElement) {
    this.store = store
    this.container = container
    this.selectElement = selectElement
    this.contentElement = contentElement

    this.bindEvents()
  }

  /**
   * Bind store events
   */
  bindEvents() {
    this.store.on('tags:extracted', () => {
      this.updateSelect()
      this.render()
      this.show()
    })

    this.store.on('colorTag:changed', () => this.render())

    // Handle select change
    if (this.selectElement) {
      this.selectElement.addEventListener('change', (e) => {
        this.store.setColorTag(e.target.value)
      })
    }
  }

  /**
   * Update the tag select dropdown
   */
  updateSelect() {
    if (!this.selectElement) return

    const tags = this.store.getState('tags')
    const currentColorTag = this.store.getState('currentColorTag')

    let html = '<option value="">-- No coloring --</option>'

    const sortedKeys = Array.from(tags.keys()).sort()

    sortedKeys.forEach((tagKey) => {
      const tagData = tags.get(tagKey)
      const displayName = tagData.name
      const selected = tagKey === currentColorTag ? 'selected' : ''

      html += `
                <option value="${Helpers.escapeHtml(tagKey)}" ${selected}>
                    ${Helpers.escapeHtml(displayName)} (${
        tagData.values.size
      } values)
                </option>
            `
    })

    this.selectElement.innerHTML = html
  }

  /**
   * Render the legend content
   */
  render() {
    if (!this.contentElement) return

    const currentColorTag = this.store.getState('currentColorTag')
    const tags = this.store.getState('tags')
    const valueColors = this.store.getState('valueColors')
    const regions = this.store.getState('regions')

    if (!currentColorTag || !tags.has(currentColorTag)) {
      this.contentElement.innerHTML = `
                <p class="legend--empty">Select a tag to see colors</p>
            `
      return
    }

    const tagData = tags.get(currentColorTag)
    const values = Array.from(tagData.values.keys()).sort((a, b) => {
      const numA = parseFloat(a)
      const numB = parseFloat(b)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return a.localeCompare(b)
    })

    // Count regions per value
    const valueCounts = {}
    values.forEach((v) => (valueCounts[v] = 0))

    regions.forEach((region) => {
      if (region.element && region.element.hasAttribute(currentColorTag)) {
        const val = region.element.getAttribute(currentColorTag)
        if (valueCounts[val] !== undefined) {
          valueCounts[val]++
        }
      }
    })

    let html = '<div class="legend-group">'

    values.forEach((value) => {
      const colorKey = `${currentColorTag}:${value}`
      const color = valueColors.get(colorKey) || '#999'

      html += `
                <div class="legend-item">
                    <div class="legend-item__color" style="background-color: ${color}"></div>
                    <span class="legend-item__label">${Helpers.escapeHtml(
                      value
                    )}</span>
                    <span class="legend-item__count">(${
                      valueCounts[value]
                    })</span>
                </div>
            `
    })

    html += '</div>'

    // Show regions without this tag
    const withoutTag = regions.filter(
      (r) => r.element && !r.element.hasAttribute(currentColorTag)
    ).length

    if (withoutTag > 0) {
      const tagName = currentColorTag.replace('data-', '')
      html += `
                <div class="legend-item" style="color: var(--text-muted); font-style: italic;">
                    <span>No ${Helpers.escapeHtml(
                      tagName
                    )}: ${withoutTag}</span>
                </div>
            `
    }

    this.contentElement.innerHTML = html
  }

  /**
   * Show the legend
   */
  show() {
    const tags = this.store.getState('tags')
    if (tags.size > 0) {
      this.container.style.display = 'block'
    }
  }

  /**
   * Hide the legend
   */
  hide() {
    this.container.style.display = 'none'
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Legend
} else {
  window.Legend = Legend
}
