/**
 * EditorTagGroups Component
 * Displays collapsible tag groups in editor mode with ability to:
 * - Highlight all regions with a specific tag value
 * - Paint mode: click regions to add the selected tag
 */

class EditorTagGroups {
  /**
   * Create an EditorTagGroups component
   * @param {Store} store - Application store
   * @param {HTMLElement} container - Container element
   */
  constructor(store, container) {
    this.store = store
    this.container = container
    this.activePaintTag = null // { key: string, value: string }

    this.bindEvents()
  }

  /**
   * Bind store events
   */
  bindEvents() {
    this.store.on('tags:extracted', () => this.render())
    this.store.on('tags:added', () => this.render())
    this.store.on('tag:removed', () => this.render())
    this.store.on('editorPaintTag:changed', (tag) => this.updatePaintTagUI(tag))
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
        <div class="empty-message">No tags found. Add tags using the form above.</div>
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
        <div class="editor-tag-group" data-tag="${Helpers.escapeHtml(tagKey)}">
          <div class="editor-tag-group__header">
            <span class="editor-tag-group__collapse-icon">▼</span>
            <div class="editor-tag-group__color" style="background-color: ${color}"></div>
            <span class="editor-tag-group__name">${Helpers.escapeHtml(
              displayName
            )}</span>
            <span class="editor-tag-group__count">${
              tagData.values.size
            } values · ${totalRegions} regions</span>
          </div>
          <div class="editor-tag-group__values">
            ${this.renderTagValues(tagKey, tagData, valueColors)}
          </div>
        </div>
      `
    })

    this.container.innerHTML = html
    this.attachListeners()

    // Re-apply paint tag UI if one was active
    if (this.activePaintTag) {
      this.updatePaintTagUI(this.activePaintTag)
    }
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

      // Check if regions with this tag have a custom color
      const regionColor = this.getRegionColorForTag(tagKey, value)

      html += `
        <div class="editor-tag-value" 
             data-tag="${Helpers.escapeHtml(tagKey)}" 
             data-value="${Helpers.escapeHtml(value)}">
          <div class="editor-tag-value__color" style="background-color: ${color}"></div>
          <span class="editor-tag-value__name">${Helpers.escapeHtml(
            value
          )}</span>
          <span class="editor-tag-value__count">${valueData.count}</span>
          <div class="editor-tag-value__actions">
            <button class="editor-tag-value__btn editor-tag-value__btn--highlight" 
                    title="Highlight regions with this tag">
              👁️
            </button>
            <button class="editor-tag-value__btn editor-tag-value__btn--paint" 
                    title="Paint mode: click regions to add this tag">
              🖌️
            </button>
            <input type="color" 
                   class="editor-tag-value__color-picker" 
                   value="${regionColor || '#ffffff'}" 
                   title="Assign color to all regions with this tag">
          </div>
        </div>
      `
    })

    return html
  }

  /**
   * Get the custom region color for a specific tag value
   * @param {string} tagKey - Tag key
   * @param {string} value - Tag value
   * @returns {string|null} Color hex or null
   */
  getRegionColorForTag(tagKey, value) {
    const tags = this.store.getState('tags')
    const tagData = tags.get(tagKey)
    if (!tagData) return null

    const valueData = tagData.values.get(value)
    if (!valueData || valueData.regions.length === 0) return null

    // Get color from first region with this tag
    const regions = this.store.getState('regions')
    const firstRegionIndex = valueData.regions[0]
    const region = regions[firstRegionIndex]

    if (region && region.element) {
      return region.element.getAttribute('data-region-color') || null
    }
    return null
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    // Toggle collapse on header click
    DOM.delegate(
      this.container,
      'click',
      '.editor-tag-group__header',
      (e, header) => {
        const group = header.closest('.editor-tag-group')
        group.classList.toggle('collapsed')
      }
    )

    // Highlight button click
    DOM.delegate(
      this.container,
      'click',
      '.editor-tag-value__btn--highlight',
      (e, btn) => {
        e.stopPropagation()
        const item = btn.closest('.editor-tag-value')
        const tagKey = item.dataset.tag
        const value = item.dataset.value

        this.highlightTagValue(tagKey, value, item)
      }
    )

    // Paint button click
    DOM.delegate(
      this.container,
      'click',
      '.editor-tag-value__btn--paint',
      (e, btn) => {
        e.stopPropagation()
        const item = btn.closest('.editor-tag-value')
        const tagKey = item.dataset.tag
        const value = item.dataset.value

        this.togglePaintMode(tagKey, value)
      }
    )

    // Color picker change
    DOM.delegate(
      this.container,
      'change',
      '.editor-tag-value__color-picker',
      (e, picker) => {
        e.stopPropagation()
        const item = picker.closest('.editor-tag-value')
        const tagKey = item.dataset.tag
        const value = item.dataset.value
        const color = picker.value

        this.assignColorToTag(tagKey, value, color)
      }
    )

    // Prevent click propagation on color picker
    DOM.delegate(
      this.container,
      'click',
      '.editor-tag-value__color-picker',
      (e) => {
        e.stopPropagation()
      }
    )

    // Click on value row to toggle highlight
    DOM.delegate(this.container, 'click', '.editor-tag-value', (e, item) => {
      // Only if not clicking on a button or color picker
      if (
        e.target.closest('.editor-tag-value__btn') ||
        e.target.closest('.editor-tag-value__color-picker')
      )
        return

      const tagKey = item.dataset.tag
      const value = item.dataset.value

      this.highlightTagValue(tagKey, value, item)
    })
  }

  /**
   * Assign a color to all regions with a specific tag value
   * @param {string} tagKey - Tag key
   * @param {string} value - Tag value
   * @param {string} color - Color hex value
   */
  assignColorToTag(tagKey, value, color) {
    const tags = this.store.getState('tags')
    const tagData = tags.get(tagKey)

    if (!tagData) return

    const valueData = tagData.values.get(value)
    if (!valueData) return

    // Set color on all regions with this tag value
    this.store.setRegionColorForTag(valueData.regions, color)

    Toast.success(
      `Assigned color ${color} to ${
        valueData.count
      } region(s) with ${tagKey.replace('data-', '')}="${value}"`
    )
  }

  /**
   * Highlight all regions with a specific tag value
   * @param {string} tagKey - Tag key
   * @param {string} value - Tag value
   * @param {HTMLElement} item - The clicked item element
   */
  highlightTagValue(tagKey, value, item) {
    const tags = this.store.getState('tags')
    const tagData = tags.get(tagKey)

    if (!tagData) return

    const valueData = tagData.values.get(value)
    if (!valueData) return

    // Toggle highlight state
    const wasHighlighted = item.classList.contains('highlighting')

    // Clear all highlights first
    this.container
      .querySelectorAll('.editor-tag-value.highlighting')
      .forEach((el) => {
        el.classList.remove('highlighting')
      })

    if (!wasHighlighted) {
      // Set this value as highlighted
      item.classList.add('highlighting')

      // Select all regions with this tag value
      const regionIndices = valueData.regions
      this.store.setHighlightedRegions(regionIndices)
    } else {
      // Clear highlights
      this.store.clearHighlightedRegions()
    }
  }

  /**
   * Toggle paint mode for a specific tag value
   * @param {string} tagKey - Tag key
   * @param {string} value - Tag value
   */
  togglePaintMode(tagKey, value) {
    const currentPaintTag = this.store.getState('editorPaintTag')

    if (
      currentPaintTag &&
      currentPaintTag.key === tagKey &&
      currentPaintTag.value === value
    ) {
      // Turn off paint mode
      this.store.setEditorPaintTag(null)
      this.activePaintTag = null
    } else {
      // Set paint mode
      const paintTag = { key: tagKey, value }
      this.store.setEditorPaintTag(paintTag)
      this.activePaintTag = paintTag
    }
  }

  /**
   * Update UI to reflect paint tag state
   * @param {Object|null} paintTag - Active paint tag or null
   */
  updatePaintTagUI(paintTag) {
    // Clear all paint-active states
    this.container
      .querySelectorAll('.editor-tag-value.paint-active')
      .forEach((el) => {
        el.classList.remove('paint-active')
      })
    this.container
      .querySelectorAll('.editor-tag-value__btn--paint.active')
      .forEach((el) => {
        el.classList.remove('active')
      })

    if (paintTag) {
      // Find and activate the paint button for this tag value
      const item = this.container.querySelector(
        `.editor-tag-value[data-tag="${CSS.escape(
          paintTag.key
        )}"][data-value="${CSS.escape(paintTag.value)}"]`
      )
      if (item) {
        item.classList.add('paint-active')
        const btn = item.querySelector('.editor-tag-value__btn--paint')
        if (btn) btn.classList.add('active')
      }
    }
  }

  /**
   * Expand all groups
   */
  expandAll() {
    this.container.querySelectorAll('.editor-tag-group').forEach((group) => {
      group.classList.remove('collapsed')
    })
  }

  /**
   * Collapse all groups
   */
  collapseAll() {
    this.container.querySelectorAll('.editor-tag-group').forEach((group) => {
      group.classList.add('collapsed')
    })
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EditorTagGroups
} else {
  window.EditorTagGroups = EditorTagGroups
}
