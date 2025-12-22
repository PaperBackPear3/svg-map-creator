/**
 * TagGroups Component
 * Displays filterable tag groups in viewer mode
 */

class TagGroups {
  /**
   * Create a TagGroups component
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
    this.store.on('tags:extracted', () => this.render())
    this.store.on('filters:changed', () => this.updateActiveStates())
    this.store.on('search:changed', (query) => this.handleSearch(query))
  }

  /**
   * Render the tag groups
   */
  render() {
    const tags = this.store.getState('tags')
    const tagColors = this.store.getState('tagColors')
    const valueColors = this.store.getState('valueColors')

    if (tags.size === 0) {
      this.container.innerHTML = `
                <div class="empty-message">No tags found in SVG</div>
            `
      return
    }

    let html = ''

    tags.forEach((tagData, tagKey) => {
      const color = tagColors.get(tagKey) || '#999'
      const displayName = tagData.name
      const totalRegions = Array.from(tagData.values.values()).reduce(
        (sum, v) => sum + v.count,
        0
      )

      html += `
                <div class="tag-group" data-tag="${Helpers.escapeHtml(tagKey)}">
                    <div class="tag-group__header">
                        <span class="tag-group__collapse-icon">▼</span>
                        <div class="tag-group__color" style="background-color: ${color}"></div>
                        <span class="tag-group__name">${Helpers.escapeHtml(
                          displayName
                        )}</span>
                        <span class="tag-group__count">${
                          tagData.values.size
                        } values · ${totalRegions} regions</span>
                    </div>
                    <div class="tag-group__values">
                        ${this.renderTagValues(tagKey, tagData, valueColors)}
                    </div>
                </div>
            `
    })

    this.container.innerHTML = html
    this.attachListeners()
  }

  /**
   * Render values for a tag
   * @param {string} tagKey - Tag key
   * @param {Object} tagData - Tag data
   * @param {Map} valueColors - Value colors map
   * @returns {string} HTML string
   */
  renderTagValues(tagKey, tagData, valueColors) {
    // Sort values (numeric if possible, otherwise alphabetic)
    const sortedValues = Array.from(tagData.values.entries()).sort((a, b) => {
      const numA = parseFloat(a[0])
      const numB = parseFloat(b[0])
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return a[0].localeCompare(b[0])
    })

    let html = ''

    sortedValues.forEach(([value, valueData]) => {
      const colorKey = `${tagKey}:${value}`
      const color = valueColors.get(colorKey) || '#999'

      html += `
                <div class="tag-value" 
                     data-tag="${Helpers.escapeHtml(tagKey)}" 
                     data-value="${Helpers.escapeHtml(value)}">
                    <div class="tag-value__color" style="background-color: ${color}"></div>
                    <span class="tag-value__name">${Helpers.escapeHtml(
                      value
                    )}</span>
                    <span class="tag-value__count">${valueData.count}</span>
                </div>
            `
    })

    return html
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    // Toggle collapse on header click
    DOM.delegate(this.container, 'click', '.tag-group__header', (e, header) => {
      const group = header.closest('.tag-group')
      group.classList.toggle('collapsed')
    })

    // Toggle filter on value click
    DOM.delegate(this.container, 'click', '.tag-value', (e, item) => {
      e.stopPropagation()
      const tagKey = item.dataset.tag
      const value = item.dataset.value
      this.store.toggleFilter(tagKey, value)
    })
  }

  /**
   * Update active states based on current filters
   */
  updateActiveStates() {
    const activeFilters = this.store.getState('activeFilters')

    // Update value items
    this.container.querySelectorAll('.tag-value').forEach((item) => {
      const tagKey = item.dataset.tag
      const value = item.dataset.value

      const isActive =
        activeFilters.has(tagKey) && activeFilters.get(tagKey).has(value)

      item.classList.toggle('active', isActive)
    })

    // Update header states
    this.container.querySelectorAll('.tag-group').forEach((group) => {
      const tagKey = group.dataset.tag
      const header = group.querySelector('.tag-group__header')

      const hasActive =
        activeFilters.has(tagKey) && activeFilters.get(tagKey).size > 0

      header.classList.toggle('has-active', hasActive)
    })
  }

  /**
   * Handle search filtering
   * @param {string} query - Search query
   */
  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim()

    this.container.querySelectorAll('.tag-group').forEach((group) => {
      const tagKey = group.dataset.tag.toLowerCase()
      let hasVisibleValues = false

      group.querySelectorAll('.tag-value').forEach((item) => {
        const value = item.dataset.value.toLowerCase()
        const matches =
          tagKey.includes(searchTerm) || value.includes(searchTerm)

        if (matches || searchTerm === '') {
          item.classList.remove('hidden')
          hasVisibleValues = true
        } else {
          item.classList.add('hidden')
        }
      })

      if (hasVisibleValues || searchTerm === '') {
        group.classList.remove('hidden')
        if (searchTerm !== '') {
          group.classList.remove('collapsed')
        }
      } else {
        group.classList.add('hidden')
      }
    })
  }

  /**
   * Expand all groups
   */
  expandAll() {
    this.container.querySelectorAll('.tag-group').forEach((group) => {
      group.classList.remove('collapsed')
    })
  }

  /**
   * Collapse all groups
   */
  collapseAll() {
    this.container.querySelectorAll('.tag-group').forEach((group) => {
      group.classList.add('collapsed')
    })
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TagGroups
} else {
  window.TagGroups = TagGroups
}
