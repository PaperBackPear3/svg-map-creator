/**
 * InfoPanel Component
 * Shows detailed information about a selected region
 */

class InfoPanel {
  /**
   * Create an InfoPanel component
   * @param {Store} store - Application store
   * @param {HTMLElement} panel - Panel element
   * @param {HTMLElement} contentContainer - Content container element
   */
  constructor(store, panel, contentContainer) {
    this.store = store
    this.panel = panel
    this.contentContainer = contentContainer

    this.bindEvents()
  }

  /**
   * Bind store events
   */
  bindEvents() {
    this.store.on('region:active', (index) => {
      if (index !== null) {
        this.show(index)
      } else {
        this.hide()
      }
    })

    this.store.on('tags:added', () => this.refresh())
    this.store.on('tag:removed', () => this.refresh())
    this.store.on('region:updated', () => this.refresh())
  }

  /**
   * Show panel with region info
   * @param {number} index - Region index
   */
  show(index) {
    const regions = this.store.getState('regions')
    const region = regions[index]

    if (!region) return

    this.currentRegionIndex = index
    this.render(region)
    this.panel.classList.remove('hidden')
  }

  /**
   * Hide the panel
   */
  hide() {
    this.panel.classList.add('hidden')
    this.currentRegionIndex = null
  }

  /**
   * Refresh current panel content
   */
  refresh() {
    if (this.currentRegionIndex !== null) {
      this.show(this.currentRegionIndex)
    }
  }

  /**
   * Render region information
   * @param {Object} region - Region object
   */
  render(region) {
    const mode = this.store.getState('mode')
    const valueColors = this.store.getState('valueColors')
    const tagColors = this.store.getState('tagColors')

    // Extract tags
    const tags = SVGParser.extractTags(region.element)

    let html = `
            <div class="info-section">
                <h4 class="info-section__title">Name</h4>
                <p class="info-section__value">${Helpers.escapeHtml(
                  region.name || '(Unnamed)'
                )}</p>
            </div>
            
            <div class="info-section">
                <h4 class="info-section__title">ID</h4>
                <p class="info-section__value">${Helpers.escapeHtml(
                  region.id
                )}</p>
            </div>
        `

    // Tags section
    html += `<div class="info-section">
            <h4 class="info-section__title">Tags (${tags.length})</h4>`

    if (tags.length > 0) {
      html += '<div class="tag-list">'

      tags.forEach((tag) => {
        const colorKey = `data-${tag.key}:${tag.value}`
        const color =
          valueColors.get(colorKey) ||
          tagColors.get(`data-${tag.key}`) ||
          '#999'

        html += `
                    <div class="tag-item">
                        <span class="tag-item__key">${Helpers.escapeHtml(
                          tag.key
                        )}</span>
                        <span class="tag-item__value">${Helpers.escapeHtml(
                          tag.value
                        )}</span>
                        ${
                          mode === 'editor'
                            ? `
                            <button class="tag-item__delete" 
                                    data-action="delete-tag" 
                                    data-tag="${tag.fullKey}"
                                    title="Delete tag">×</button>
                        `
                            : ''
                        }
                    </div>
                `
      })

      html += '</div>'
    } else {
      html += '<p class="no-tags">No custom tags</p>'
    }

    html += '</div>'

    // Tag badges (visual)
    if (tags.length > 0) {
      html += `
                <div class="info-section">
                    <h4 class="info-section__title">Visual Tags</h4>
                    <div class="tag-list tag-list--wrap">
            `

      tags.forEach((tag) => {
        const colorKey = `data-${tag.key}:${tag.value}`
        const color =
          valueColors.get(colorKey) ||
          tagColors.get(`data-${tag.key}`) ||
          '#999'

        html += `
                    <span class="tag-badge" style="background-color: ${color}">
                        ${Helpers.escapeHtml(tag.key)}: ${Helpers.escapeHtml(
          tag.value
        )}
                    </span>
                `
      })

      html += '</div></div>'
    }

    // Quick add tag form (editor mode only)
    if (mode === 'editor') {
      html += `
                <div class="quick-tag-form">
                    <h4 class="quick-tag-form__title">Quick Add Tag</h4>
                    <div class="quick-tag-form__inputs">
                        <input type="text" 
                               id="quickTagKey" 
                               class="form-input" 
                               placeholder="Key">
                        <input type="text" 
                               id="quickTagValue" 
                               class="form-input" 
                               placeholder="Value">
                    </div>
                    <button class="btn btn--success btn--block" 
                            data-action="quick-add-tag">
                        Add Tag
                    </button>
                </div>
            `
    }

    this.contentContainer.innerHTML = html
    this.attachListeners()
  }

  /**
   * Attach event listeners to panel content
   */
  attachListeners() {
    // Delete tag button
    DOM.delegate(
      this.contentContainer,
      'click',
      '[data-action="delete-tag"]',
      (e, btn) => {
        const tagKey = btn.dataset.tag
        if (this.currentRegionIndex !== null) {
          this.store.removeTagFromRegion(this.currentRegionIndex, tagKey)
          Toast.success(`Removed ${tagKey}`)
        }
      }
    )

    // Quick add tag button
    DOM.delegate(
      this.contentContainer,
      'click',
      '[data-action="quick-add-tag"]',
      () => {
        this.handleQuickAddTag()
      }
    )

    // Enter key in quick add inputs
    const keyInput = this.contentContainer.querySelector('#quickTagKey')
    const valueInput = this.contentContainer.querySelector('#quickTagValue')

    if (keyInput && valueInput) {
      const handleEnter = (e) => {
        if (e.key === 'Enter') {
          this.handleQuickAddTag()
        }
      }

      keyInput.addEventListener('keypress', handleEnter)
      valueInput.addEventListener('keypress', handleEnter)
    }
  }

  /**
   * Handle quick add tag action
   */
  handleQuickAddTag() {
    const keyInput = this.contentContainer.querySelector('#quickTagKey')
    const valueInput = this.contentContainer.querySelector('#quickTagValue')

    if (!keyInput || !valueInput) return

    const key = keyInput.value.trim()
    const value = valueInput.value.trim()

    if (!key) {
      Toast.error('Please enter a tag key')
      keyInput.focus()
      return
    }

    if (!value) {
      Toast.error('Please enter a tag value')
      valueInput.focus()
      return
    }

    if (this.currentRegionIndex !== null) {
      this.store.addTagToRegions([this.currentRegionIndex], key, value)
      Toast.success(`Added ${key}="${value}"`)

      // Clear inputs
      keyInput.value = ''
      valueInput.value = ''
      keyInput.focus()
    }
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InfoPanel
} else {
  window.InfoPanel = InfoPanel
}
