/**
 * RegionList Component
 * Displays and manages the list of selected regions
 */

class RegionList {
  /**
   * Create a RegionList component
   * @param {Store} store - Application store
   * @param {HTMLElement} container - Container element
   */
  constructor(store, container) {
    this.store = store
    this.container = container

    this.bindEvents()
  }

  /**
   * Bind store events
   */
  bindEvents() {
    this.store.on('selection:changed', () => this.render())
    this.store.on('regions:loaded', () => this.render())
    this.store.on('region:updated', () => this.render())
  }

  /**
   * Render the region list
   */
  render() {
    const regions = this.store.getState('regions')
    const selectedRegions = this.store.getState('selectedRegions')
    const activeRegion = this.store.getState('activeRegion')

    if (selectedRegions.size === 0) {
      this.container.innerHTML = `
                <p class="empty-message">Click regions on the map to select them</p>
            `
      return
    }

    let html = ''

    selectedRegions.forEach((index) => {
      const region = regions[index]
      if (!region) return

      const isActive = index === activeRegion
      const displayName = region.name || '(Unnamed)'

      html += `
                <div class="region-item ${isActive ? 'active' : ''}" 
                     data-index="${index}">
                    <div class="region-item__info">
                        <span class="region-item__name">${Helpers.escapeHtml(
                          displayName
                        )}</span>
                        <span class="region-item__id">#${Helpers.escapeHtml(
                          region.id
                        )}</span>
                    </div>
                    <button class="region-item__remove" 
                            data-action="remove" 
                            data-index="${index}"
                            title="Remove from selection">×</button>
                </div>
            `
    })

    this.container.innerHTML = html

    // Add event listeners
    this.attachListeners()
  }

  /**
   * Attach event listeners to rendered items
   */
  attachListeners() {
    // Click on region item to show info
    DOM.delegate(this.container, 'click', '.region-item', (e, item) => {
      // Ignore if clicking remove button
      if (e.target.closest('[data-action="remove"]')) return

      const index = parseInt(item.dataset.index)
      this.store.setActiveRegion(index)
    })

    // Remove button click
    DOM.delegate(
      this.container,
      'click',
      '[data-action="remove"]',
      (e, btn) => {
        e.stopPropagation()
        const index = parseInt(btn.dataset.index)
        this.store.toggleRegionSelection(index)
      }
    )
  }

  /**
   * Scroll to and highlight a specific region in the list
   * @param {number} index - Region index
   */
  scrollToRegion(index) {
    const item = this.container.querySelector(`[data-index="${index}"]`)
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      item.classList.add('active')
    }
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegionList
} else {
  window.RegionList = RegionList
}
