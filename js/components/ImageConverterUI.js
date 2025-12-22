/**
 * ImageConverterUI - User Interface for Image to Map Converter
 * Manages the converter panel, settings, and preview
 */

class ImageConverterUI {
  constructor(app) {
    this.app = app
    this.converter = new ImageConverter()
    this.currentImage = null
    this.currentResult = null
    this.previewCanvases = {}

    this.init()
  }

  init() {
    this.cacheElements()
    this.bindEvents()
  }

  cacheElements() {
    this.elements = {
      // Upload
      uploadZone: DOM.$('#converterUploadZone'),
      imageInput: DOM.$('#converterImageInput'),

      // Workspace
      workspace: DOM.$('#converterWorkspace'),

      // Previews
      originalPreview: DOM.$('#originalPreview'),
      processedPreview: DOM.$('#processedPreview'),
      svgPreview: DOM.$('#svgPreview'),
      processingOverlay: DOM.$('#processingOverlay'),

      // Pipeline preview
      pipelinePreview: DOM.$('#pipelinePreview'),

      // Settings
      edgeThresholdSlider: DOM.$('#edgeThreshold'),
      edgeThresholdValue: DOM.$('#edgeThresholdValue'),
      edgeRadiusSlider: DOM.$('#edgeRadius'),
      edgeRadiusValue: DOM.$('#edgeRadiusValue'),

      blurSlider: DOM.$('#blurAmount'),
      blurValue: DOM.$('#blurValue'),
      posterizeSlider: DOM.$('#posterizeLevels'),
      posterizeValue: DOM.$('#posterizeValue'),

      grayscaleCheck: DOM.$('#grayscaleCheck'),
      invertCheck: DOM.$('#invertCheck'),

      minAreaSlider: DOM.$('#minRegionArea'),
      minAreaValue: DOM.$('#minAreaValue'),
      simplifySlider: DOM.$('#simplifyTolerance'),
      simplifyValue: DOM.$('#simplifyValue'),
      smoothingSlider: DOM.$('#smoothingAmount'),
      smoothingValue: DOM.$('#smoothingValue'),

      // Stats
      statsContainer: DOM.$('#converterStats'),
      regionCount: DOM.$('#converterRegionCount'),
      regionBadge: DOM.$('#converterRegionBadge'),
      largestArea: DOM.$('#converterLargestArea'),
      totalPoints: DOM.$('#converterTotalPoints'),

      // Actions
      processBtn: DOM.$('#processImageBtn'),
      resetBtn: DOM.$('#resetConverterBtn'),
      exportSvgBtn: DOM.$('#exportSvgBtn'),
      loadInEditorBtn: DOM.$('#loadInEditorBtn'),

      // Step indicator
      steps: DOM.$$('.converter-step'),
    }
  }

  bindEvents() {
    // Upload zone
    if (this.elements.uploadZone) {
      this.elements.uploadZone.addEventListener('click', () => {
        this.elements.imageInput?.click()
      })

      this.elements.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault()
        this.elements.uploadZone.classList.add('drag-over')
      })

      this.elements.uploadZone.addEventListener('dragleave', () => {
        this.elements.uploadZone.classList.remove('drag-over')
      })

      this.elements.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault()
        this.elements.uploadZone.classList.remove('drag-over')
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
          this.loadImage(file)
        }
      })
    }

    // File input
    if (this.elements.imageInput) {
      this.elements.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (file) {
          this.loadImage(file)
        }
      })
    }

    // Sliders - Edge Detection
    this.bindSlider('edgeThreshold', 'edgeThresholdValue', '%')
    this.bindSlider('edgeRadius', 'edgeRadiusValue', 'px')

    // Sliders - Preprocessing
    this.bindSlider('blur', 'blurValue', 'px')
    this.bindSlider('posterize', 'posterizeValue', ' levels')

    // Sliders - Contour
    this.bindSlider('minArea', 'minAreaValue', 'px²')
    this.bindSlider('simplify', 'simplifyValue', '')
    this.bindSlider('smoothing', 'smoothingValue', '')

    // Checkboxes
    if (this.elements.grayscaleCheck) {
      this.elements.grayscaleCheck.addEventListener('change', () =>
        this.onSettingsChange()
      )
    }
    if (this.elements.invertCheck) {
      this.elements.invertCheck.addEventListener('change', () =>
        this.onSettingsChange()
      )
    }

    // Action buttons
    if (this.elements.processBtn) {
      this.elements.processBtn.addEventListener('click', () =>
        this.processImage()
      )
    }

    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', () => this.reset())
    }

    if (this.elements.exportSvgBtn) {
      this.elements.exportSvgBtn.addEventListener('click', () =>
        this.exportSVG()
      )
    }

    if (this.elements.loadInEditorBtn) {
      this.elements.loadInEditorBtn.addEventListener('click', () =>
        this.loadInEditor()
      )
    }
  }

  bindSlider(name, valueId, suffix = '', sliderId = null) {
    const slider = this.elements[sliderId || `${name}Slider`]
    const valueEl = this.elements[valueId]

    if (slider && valueEl) {
      slider.addEventListener('input', (e) => {
        valueEl.textContent = e.target.value + suffix
      })

      slider.addEventListener('change', () => this.onSettingsChange())
    }
  }

  async loadImage(file) {
    this.currentImage = file

    // Show workspace
    if (this.elements.uploadZone) {
      this.elements.uploadZone.style.display = 'none'
    }
    if (this.elements.workspace) {
      this.elements.workspace.style.display = 'grid'
    }

    // Update step indicator
    this.updateStepIndicator(1)

    // Display original image
    const img = new Image()
    img.onload = () => {
      if (this.elements.originalPreview) {
        this.elements.originalPreview.innerHTML = ''
        this.elements.originalPreview.appendChild(img.cloneNode())
      }
    }
    img.src = URL.createObjectURL(file)

    // Enable process button
    if (this.elements.processBtn) {
      this.elements.processBtn.disabled = false
    }

    // Auto-process with default settings
    await this.processImage()
  }

  getSettings() {
    return {
      edgeThreshold: parseInt(this.elements.edgeThresholdSlider?.value || 50),
      edgeRadius: parseInt(this.elements.edgeRadiusSlider?.value || 2),
      blur: parseInt(DOM.$('#blurAmount')?.value || 1),
      posterize: parseInt(DOM.$('#posterizeLevels')?.value || 0),
      grayscale: this.elements.grayscaleCheck?.checked ?? true,
      invert: this.elements.invertCheck?.checked ?? true,
      minRegionArea: parseInt(DOM.$('#minRegionArea')?.value || 100),
      simplifyTolerance: parseFloat(DOM.$('#simplifyTolerance')?.value || 2),
      smoothing: parseFloat(DOM.$('#smoothingAmount')?.value || 0.5),
    }
  }

  async processImage() {
    if (!this.currentImage) return

    // Show processing overlay
    this.showProcessing(true)
    this.updateStepIndicator(2)

    try {
      // Get settings
      const settings = this.getSettings()

      // Process image
      const result = await this.converter.processImage(
        this.currentImage,
        settings
      )
      this.currentResult = result

      // Show processed preview
      this.showProcessedPreview(result.steps)

      // Show SVG preview
      this.showSVGPreview(result.svg)

      // Update stats
      this.updateStats(result)

      // Update step indicator
      this.updateStepIndicator(3)

      // Enable export buttons
      if (this.elements.exportSvgBtn) {
        this.elements.exportSvgBtn.disabled = false
      }
      if (this.elements.loadInEditorBtn) {
        this.elements.loadInEditorBtn.disabled = false
      }
    } catch (error) {
      console.error('Processing error:', error)
      this.app.toast?.show('Error processing image: ' + error.message, 'error')
    } finally {
      this.showProcessing(false)
    }
  }

  showProcessedPreview(steps) {
    if (!this.elements.processedPreview) return

    // Show the last processing step (before contour finding)
    const lastImageStep = steps.filter((s) => s.data).pop()

    if (lastImageStep) {
      const canvas = document.createElement('canvas')
      canvas.width = lastImageStep.data.width
      canvas.height = lastImageStep.data.height
      const ctx = canvas.getContext('2d')
      ctx.putImageData(lastImageStep.data, 0, 0)

      this.elements.processedPreview.innerHTML = ''
      const img = new Image()
      img.src = canvas.toDataURL()
      this.elements.processedPreview.appendChild(img)
    }

    // Show pipeline preview
    this.showPipelinePreview(steps)
  }

  showPipelinePreview(steps) {
    if (!this.elements.pipelinePreview) return

    this.elements.pipelinePreview.innerHTML = ''

    steps.forEach((step) => {
      if (!step.data) return

      const stepEl = document.createElement('div')
      stepEl.className = 'pipeline-step'

      const canvas = document.createElement('canvas')
      canvas.width = step.data.width
      canvas.height = step.data.height
      const ctx = canvas.getContext('2d')
      ctx.putImageData(step.data, 0, 0)

      // Create thumbnail
      const thumb = document.createElement('canvas')
      thumb.width = 100
      thumb.height = 75
      const thumbCtx = thumb.getContext('2d')
      thumbCtx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        100,
        75
      )

      const label = document.createElement('div')
      label.className = 'pipeline-step__label'
      label.textContent = step.name

      stepEl.appendChild(thumb)
      stepEl.appendChild(label)
      this.elements.pipelinePreview.appendChild(stepEl)
    })
  }

  showSVGPreview(svgString) {
    if (!this.elements.svgPreview) return

    this.elements.svgPreview.innerHTML = svgString

    // Add expand button to header if not already there
    const svgPanel = this.elements.svgPreview.closest('.preview-panel')
    if (svgPanel && !svgPanel.classList.contains('preview-panel--svg')) {
      svgPanel.classList.add('preview-panel--svg')
      const header = svgPanel.querySelector('.preview-panel__header')
      if (header && !header.querySelector('.expand-btn')) {
        const expandBtn = document.createElement('button')
        expandBtn.className = 'expand-btn'
        expandBtn.title = 'Expand/Collapse'
        expandBtn.innerHTML = '⛶'
        expandBtn.addEventListener('click', () => this.toggleSVGExpand())
        header.appendChild(expandBtn)
      }
    }

    // Add hover effects to regions
    const paths = this.elements.svgPreview.querySelectorAll('path')
    paths.forEach((path) => {
      path.addEventListener('mouseenter', () => {
        path.style.fill = 'rgba(102, 126, 234, 0.4)'
      })
      path.addEventListener('mouseleave', () => {
        path.style.fill = `rgba(200, 200, 200, ${this.converter.settings.fillOpacity})`
      })
    })
  }

  toggleSVGExpand() {
    const previewArea = this.elements.svgPreview.closest(
      '.converter-preview-area'
    )
    if (previewArea) {
      previewArea.classList.toggle('svg-expanded')
      const expandBtn = previewArea.querySelector('.expand-btn')
      if (expandBtn) {
        expandBtn.innerHTML = previewArea.classList.contains('svg-expanded')
          ? '⛶'
          : '⛶'
        expandBtn.title = previewArea.classList.contains('svg-expanded')
          ? 'Collapse'
          : 'Expand'
      }
    }
  }

  updateStats(result) {
    if (this.elements.regionCount) {
      this.elements.regionCount.textContent = result.regions.length
    }

    if (this.elements.regionBadge) {
      this.elements.regionBadge.textContent = result.regions.length + ' regions'
    }

    if (this.elements.largestArea && result.regions.length > 0) {
      this.elements.largestArea.textContent =
        Math.round(result.regions[0].area).toLocaleString() + ' px²'
    }

    if (this.elements.totalPoints) {
      const totalPoints = result.regions.reduce(
        (sum, r) => sum + r.points.length,
        0
      )
      this.elements.totalPoints.textContent = totalPoints.toLocaleString()
    }
  }

  showProcessing(show) {
    if (this.elements.processingOverlay) {
      this.elements.processingOverlay.classList.toggle('hidden', !show)
    }
  }

  updateStepIndicator(activeStep) {
    this.elements.steps?.forEach((step, index) => {
      step.classList.remove('active', 'completed')
      if (index + 1 < activeStep) {
        step.classList.add('completed')
      } else if (index + 1 === activeStep) {
        step.classList.add('active')
      }
    })
  }

  onSettingsChange() {
    // Debounce and re-process
    clearTimeout(this.settingsTimeout)
    this.settingsTimeout = setTimeout(() => {
      if (this.currentImage) {
        this.processImage()
      }
    }, 300)
  }

  exportSVG() {
    if (!this.currentResult) return

    const blob = new Blob([this.currentResult.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted-map.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    this.app.toast?.show('SVG exported successfully!', 'success')
  }

  loadInEditor() {
    if (!this.currentResult) return

    // Parse the SVG and load it into the editor
    const parseResult = SVGParser.parse(this.currentResult.svg)

    if (parseResult.error) {
      this.app.toast?.show('Error loading SVG: ' + parseResult.error, 'error')
      return
    }

    if (parseResult.regions.length > 0) {
      // Switch to editor tab FIRST (before rendering)
      // This ensures the map container is visible when we render
      const editorTab = DOM.$('.tab-btn[data-tab="editor"]')
      if (editorTab) {
        editorTab.click()
      }

      // Update store with new regions
      this.app.store.setState({
        svgContent: this.currentResult.svg,
        fileName: 'converted-map.svg',
        modified: false,
      })

      // Render the map using the MapRenderer (now in visible container)
      this.app.mapRenderer.render()

      this.app.toast?.show(
        `Loaded ${parseResult.regions.length} regions into editor`,
        'success'
      )
    } else {
      this.app.toast?.show('No regions found in converted SVG', 'warning')
    }
  }

  reset() {
    this.currentImage = null
    this.currentResult = null

    // Reset UI
    if (this.elements.uploadZone) {
      this.elements.uploadZone.style.display = 'flex'
    }
    if (this.elements.workspace) {
      this.elements.workspace.style.display = 'none'
    }

    // Clear previews
    if (this.elements.originalPreview) {
      this.elements.originalPreview.innerHTML =
        '<div class="preview-placeholder">Original image will appear here</div>'
    }
    if (this.elements.processedPreview) {
      this.elements.processedPreview.innerHTML =
        '<div class="preview-placeholder">Processed image will appear here</div>'
    }
    if (this.elements.svgPreview) {
      this.elements.svgPreview.innerHTML =
        '<div class="preview-placeholder">SVG output will appear here</div>'
    }
    if (this.elements.pipelinePreview) {
      this.elements.pipelinePreview.innerHTML = ''
    }

    // Reset stats
    if (this.elements.regionCount) this.elements.regionCount.textContent = '0'
    if (this.elements.largestArea) this.elements.largestArea.textContent = '-'
    if (this.elements.totalPoints) this.elements.totalPoints.textContent = '0'

    // Disable buttons
    if (this.elements.processBtn) this.elements.processBtn.disabled = true
    if (this.elements.exportSvgBtn) this.elements.exportSvgBtn.disabled = true
    if (this.elements.loadInEditorBtn)
      this.elements.loadInEditorBtn.disabled = true

    // Reset step indicator
    this.updateStepIndicator(0)

    // Reset file input
    if (this.elements.imageInput) {
      this.elements.imageInput.value = ''
    }
  }
}

// Export
window.ImageConverterUI = ImageConverterUI
