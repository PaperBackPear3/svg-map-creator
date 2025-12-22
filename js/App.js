/**
 * App - Main Application Controller
 * Coordinates all components and handles user interactions
 */

class App {
  constructor() {
    // Initialize store
    this.store = new Store()

    // Toast reference for components
    this.toast = Toast

    // Cache DOM elements
    this.cacheElements()

    // Initialize components
    this.initComponents()

    // Bind event handlers
    this.bindEvents()

    // Set initial state
    this.updateUI()

    console.log('SVG Map Editor initialized')
  }

  /**
   * Cache DOM elements for quick access
   */
  cacheElements() {
    this.elements = {
      // Header
      loadBtn: DOM.$('#loadBtn'),
      saveBtn: DOM.$('#saveBtn'),
      fileInput: DOM.$('#fileInput'),
      placeholderLoadBtn: DOM.$('#placeholderLoadBtn'),
      tabBtns: DOM.$$('.tab-btn'),

      // Map
      mapContainer: DOM.$('#mapContainer'),
      mapSvgContainer: DOM.$('#mapSvgContainer'),
      mapPlaceholder: DOM.$('#mapPlaceholder'),

      // Sidebar sections
      selectionSection: DOM.$('#selectionSection'),
      tagEditorSection: DOM.$('#tagEditorSection'),
      nameEditorSection: DOM.$('#nameEditorSection'),
      filterSection: DOM.$('#filterSection'),
      selectedListSection: DOM.$('#selectedListSection'),

      // Selection actions
      selectAllBtn: DOM.$('#selectAllBtn'),
      deselectAllBtn: DOM.$('#deselectAllBtn'),
      invertSelectionBtn: DOM.$('#invertSelectionBtn'),

      // Tag editor
      tagKeyInput: DOM.$('#tagKeyInput'),
      tagValueInput: DOM.$('#tagValueInput'),
      applyTagBtn: DOM.$('#applyTagBtn'),
      applyTagCount: DOM.$('#applyTagCount'),

      // Name editor
      regionNameInput: DOM.$('#regionNameInput'),
      regionDescInput: DOM.$('#regionDescInput'),
      saveRegionBtn: DOM.$('#saveRegionBtn'),
      clearRegionBtn: DOM.$('#clearRegionBtn'),

      // Filter controls
      filterSelectAllBtn: DOM.$('#filterSelectAllBtn'),
      filterDeselectAllBtn: DOM.$('#filterDeselectAllBtn'),
      expandAllBtn: DOM.$('#expandAllBtn'),
      collapseAllBtn: DOM.$('#collapseAllBtn'),
      tagGroupsContainer: DOM.$('#tagGroupsContainer'),

      // Editor tags controls
      editorTagsSection: DOM.$('#editorTagsSection'),
      editorExpandAllBtn: DOM.$('#editorExpandAllBtn'),
      editorCollapseAllBtn: DOM.$('#editorCollapseAllBtn'),
      editorTagGroupsContainer: DOM.$('#editorTagGroupsContainer'),

      // Info panel
      infoPanel: DOM.$('#infoPanel'),
      infoPanelContent: DOM.$('#infoPanelContent'),
      closeInfoPanelBtn: DOM.$('#closeInfoPanelBtn'),

      // Selected regions list
      selectedRegionsList: DOM.$('#selectedRegionsList'),

      // Search
      searchInput: DOM.$('#searchInput'),

      // Stats
      statTotalRegions: DOM.$('#statTotalRegions'),
      statSelectedCount: DOM.$('#statSelectedCount'),
      statTotalTags: DOM.$('#statTotalTags'),
      statNamedRegions: DOM.$('#statNamedRegions'),
    }
  }

  /**
   * Initialize components
   */
  initComponents() {
    // Map renderer
    this.mapRenderer = new MapRenderer(
      this.store,
      this.elements.mapContainer,
      this.elements.mapSvgContainer,
      this.elements.mapPlaceholder
    )

    // Info panel
    this.infoPanel = new InfoPanel(
      this.store,
      this.elements.infoPanel,
      this.elements.infoPanelContent
    )

    // Region list
    this.regionList = new RegionList(
      this.store,
      this.elements.selectedRegionsList
    )

    // Tag groups (for viewer mode)
    this.tagGroups = new TagGroups(this.store, this.elements.tagGroupsContainer)

    // Editor tag groups (for editor mode)
    this.editorTagGroups = new EditorTagGroups(
      this.store,
      this.elements.editorTagGroupsContainer
    )

    // Image converter UI
    this.imageConverterUI = new ImageConverterUI(this)

    // SVG Parser
    this.parser = new SVGParser()
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // File operations
    this.elements.loadBtn.addEventListener('click', () =>
      this.handleLoadClick()
    )
    this.elements.placeholderLoadBtn.addEventListener('click', () =>
      this.handleLoadClick()
    )
    this.elements.saveBtn.addEventListener('click', () => this.handleSave())
    this.elements.fileInput.addEventListener('change', (e) =>
      this.handleFileSelect(e)
    )

    // Tab switching
    this.elements.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.handleTabSwitch(btn.dataset.tab))
    })

    // Selection actions
    this.elements.selectAllBtn.addEventListener('click', () =>
      this.store.selectAllRegions()
    )
    this.elements.deselectAllBtn.addEventListener('click', () =>
      this.store.deselectAllRegions()
    )
    this.elements.invertSelectionBtn.addEventListener('click', () =>
      this.store.invertSelection()
    )

    // Tag editor
    this.elements.applyTagBtn.addEventListener('click', () =>
      this.handleApplyTag()
    )
    this.elements.tagKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleApplyTag()
    })
    this.elements.tagValueInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleApplyTag()
    })

    // Name editor
    this.elements.saveRegionBtn.addEventListener('click', () =>
      this.handleSaveRegion()
    )
    this.elements.clearRegionBtn.addEventListener('click', () =>
      this.handleClearRegion()
    )

    // Filter controls
    this.elements.filterSelectAllBtn.addEventListener('click', () =>
      this.store.selectAllFilters()
    )
    this.elements.filterDeselectAllBtn.addEventListener('click', () =>
      this.store.deselectAllFilters()
    )
    this.elements.expandAllBtn.addEventListener('click', () =>
      this.tagGroups.expandAll()
    )
    this.elements.collapseAllBtn.addEventListener('click', () =>
      this.tagGroups.collapseAll()
    )

    // Editor tags controls
    this.elements.editorExpandAllBtn.addEventListener('click', () =>
      this.editorTagGroups.expandAll()
    )
    this.elements.editorCollapseAllBtn.addEventListener('click', () =>
      this.editorTagGroups.collapseAll()
    )

    // Info panel
    this.elements.closeInfoPanelBtn.addEventListener('click', () => {
      this.store.setActiveRegion(null)
    })

    // Search
    this.elements.searchInput.addEventListener(
      'input',
      Helpers.debounce((e) => this.handleSearch(e.target.value), 200)
    )

    // Store events
    this.store.on('selection:changed', () => this.updateSelectionUI())
    this.store.on('regions:loaded', () => this.updateStats())
    this.store.on('tags:extracted', () => this.updateStats())
    this.store.on('region:active', (index) => this.handleRegionActive(index))
    this.store.on('change:modified', (modified) => {
      this.elements.saveBtn.disabled = !modified
    })
  }

  /**
   * Handle load button click
   */
  handleLoadClick() {
    this.elements.fileInput.click()
  }

  /**
   * Handle file selection
   * @param {Event} e - Change event
   */
  async handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    try {
      const content = await FileService.readAsText(file)

      this.store.setState({
        fileName: file.name,
        svgContent: content,
        modified: false,
      })

      // Render will be triggered by store events
      this.mapRenderer.render()

      Toast.success(`Loaded ${file.name}`)
    } catch (error) {
      Toast.error(`Failed to load file: ${error.message}`)
    }

    // Reset input to allow reloading same file
    e.target.value = ''
  }

  /**
   * Handle save
   */
  handleSave() {
    const modified = this.store.getState('modified')
    const fileName = this.store.getState('fileName')

    if (!modified) {
      Toast.info('No changes to save')
      return
    }

    const svgContent = this.mapRenderer.getSVGContent()
    if (!svgContent) {
      Toast.error('No SVG content to save')
      return
    }

    const outputName = FileService.getBasename(fileName) + '_modified.svg'
    FileService.downloadSVG(svgContent, outputName)

    Toast.success('SVG saved!')
  }

  /**
   * Handle tab switching
   * @param {string} tab - Tab name ('editor', 'viewer', or 'converter')
   */
  handleTabSwitch(tab) {
    // Update active tab button
    this.elements.tabBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab)
    })

    // Update store
    this.store.setState({ mode: tab })

    // Update UI visibility
    this.updateModeUI(tab)

    // Handle map-related tabs
    if (tab === 'viewer') {
      this.mapRenderer.applyFilterColors()
    } else if (tab === 'editor') {
      this.mapRenderer.applyColors()
    }
  }

  /**
   * Update UI based on mode
   * @param {string} mode - Current mode
   */
  updateModeUI(mode) {
    const isEditor = mode === 'editor'
    const isConverter = mode === 'converter'
    const isMapMode = mode === 'editor' || mode === 'viewer'

    // Get main content and converter section
    const mainContent = DOM.$('.main-content')
    const converterSection = DOM.$('#converterSection')

    // Show/hide main content vs converter
    if (mainContent) {
      mainContent.style.display = isMapMode ? 'flex' : 'none'
    }
    if (converterSection) {
      converterSection.classList.toggle('active', isConverter)
    }

    // Show/hide editor-only sections
    this.elements.selectionSection.style.display = isEditor ? 'block' : 'none'
    this.elements.tagEditorSection.style.display = isEditor ? 'block' : 'none'
    this.elements.nameEditorSection.style.display = isEditor ? 'block' : 'none'
    this.elements.selectedListSection.style.display = isEditor ? 'flex' : 'none'
    this.elements.editorTagsSection.style.display = isEditor ? 'block' : 'none'

    // Show/hide viewer-only sections
    this.elements.filterSection.style.display =
      mode === 'viewer' ? 'block' : 'none'

    // Show/hide header actions for map modes (use visibility to prevent layout shift)
    this.elements.loadBtn.style.visibility = isMapMode ? 'visible' : 'hidden'
    this.elements.loadBtn.style.pointerEvents = isMapMode ? 'auto' : 'none'
    this.elements.saveBtn.style.visibility = isEditor ? 'visible' : 'hidden'
    this.elements.saveBtn.style.pointerEvents = isEditor ? 'auto' : 'none'

    // Clear paint mode and highlights when switching modes
    if (!isEditor) {
      this.store.setEditorPaintTag(null)
      this.store.clearHighlightedRegions()
    }
  }

  /**
   * Handle apply tag button
   */
  handleApplyTag() {
    const key = this.elements.tagKeyInput.value.trim()
    const value = this.elements.tagValueInput.value.trim()
    const selectedRegions = this.store.getState('selectedRegions')

    if (selectedRegions.size === 0) {
      Toast.error('Please select regions first')
      return
    }

    if (!key) {
      Toast.error('Please enter a tag key')
      this.elements.tagKeyInput.focus()
      return
    }

    if (!value) {
      Toast.error('Please enter a tag value')
      this.elements.tagValueInput.focus()
      return
    }

    const indices = Array.from(selectedRegions)
    this.store.addTagToRegions(indices, key, value)

    Toast.success(`Added ${key}="${value}" to ${indices.length} region(s)`)

    // Clear inputs
    this.elements.tagKeyInput.value = ''
    this.elements.tagValueInput.value = ''
  }

  /**
   * Handle save region (name editor)
   */
  handleSaveRegion() {
    const activeRegion = this.store.getState('activeRegion')

    if (activeRegion === null) {
      Toast.error('Please select a region first')
      return
    }

    const name = this.elements.regionNameInput.value.trim()
    const description = this.elements.regionDescInput.value.trim()

    if (!name) {
      Toast.error('Please enter a region name')
      this.elements.regionNameInput.focus()
      return
    }

    this.store.updateRegionName(activeRegion, name, description)

    // Add label to map
    this.mapRenderer.addLabels()

    Toast.success('Region saved')
  }

  /**
   * Handle clear region (name editor)
   */
  handleClearRegion() {
    this.elements.regionNameInput.value = ''
    this.elements.regionDescInput.value = ''
    this.store.setActiveRegion(null)
  }

  /**
   * Handle region becoming active
   * @param {number|null} index - Region index
   */
  handleRegionActive(index) {
    if (index !== null) {
      const regions = this.store.getState('regions')
      const region = regions[index]

      if (region) {
        this.elements.regionNameInput.value = region.name || ''
        this.elements.regionDescInput.value = region.description || ''
      }
    } else {
      this.elements.regionNameInput.value = ''
      this.elements.regionDescInput.value = ''
    }
  }

  /**
   * Handle search input
   * @param {string} query - Search query
   */
  handleSearch(query) {
    const mode = this.store.getState('mode')

    if (mode === 'viewer') {
      this.store.setSearchQuery(query)
    } else {
      // In editor mode, search through selected regions
      // (Could implement highlighting matching regions)
    }
  }

  /**
   * Update selection UI
   */
  updateSelectionUI() {
    const selectedRegions = this.store.getState('selectedRegions')

    // Update apply button
    this.elements.applyTagBtn.disabled = selectedRegions.size === 0
    this.elements.applyTagCount.textContent = selectedRegions.size

    // Update stats
    this.updateStats()
  }

  /**
   * Update statistics display
   */
  updateStats() {
    const stats = this.store.getStats()

    this.elements.statTotalRegions.textContent = stats.totalRegions
    this.elements.statSelectedCount.textContent = stats.selectedCount
    this.elements.statTotalTags.textContent = stats.totalTags
    this.elements.statNamedRegions.textContent = stats.namedRegions
  }

  /**
   * Update overall UI state
   */
  updateUI() {
    const mode = this.store.getState('mode')
    this.updateModeUI(mode)
    this.updateStats()
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App
} else {
  window.App = App
}
