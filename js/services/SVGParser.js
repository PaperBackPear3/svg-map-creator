/**
 * SVGParser
 * Service for parsing SVG files and extracting region data
 */

class SVGParser {
  /**
   * Parse SVG text content
   * @param {string} svgText - SVG file content
   * @returns {Object} Parsed data { svgElement, regions, error }
   */
  static parse(svgText) {
    const result = {
      svgElement: null,
      svgDocument: null,
      regions: [],
      error: null,
    }

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgText, 'image/svg+xml')

      // Check for parsing errors
      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        result.error = 'Error parsing SVG file: Invalid XML'
        return result
      }

      const svgElement = doc.querySelector('svg')
      if (!svgElement) {
        result.error = 'No SVG element found in file'
        return result
      }

      result.svgDocument = doc
      result.svgElement = svgElement

      // Extract regions (paths with class="region" or all paths)
      const paths = svgElement.querySelectorAll('path.region')

      // If no paths with class="region", get all paths
      const elements =
        paths.length > 0
          ? paths
          : svgElement.querySelectorAll('path, polygon, rect, circle, ellipse')

      // Process each element
      Array.from(elements).forEach((element, index) => {
        // Skip external perimeter if present
        const dataName = element.getAttribute('data-name') || ''
        const id = element.getAttribute('id') || ''

        if (dataName === 'external-perimeter' || id === 'external-perimeter') {
          element.style.display = 'none'
          return
        }

        const regionId = id || `region-${index}`
        const name = dataName || ''

        // Ensure element has proper styling for interaction
        if (!element.classList.contains('region')) {
          element.classList.add('region')
        }

        // Extract tags
        const tags = SVGParser.extractTags(element)

        result.regions.push({
          index: result.regions.length,
          element: element,
          id: regionId,
          name: name,
          description: '',
          tags: tags,
        })
      })
    } catch (error) {
      result.error = `Error parsing SVG: ${error.message}`
    }

    return result
  }

  /**
   * Extract tags (data-* attributes) from an element
   * @param {Element} element - SVG element
   * @returns {Array} Array of { key, value, fullKey } objects
   */
  static extractTags(element) {
    const tags = []
    const excludedAttrs = ['data-index', 'data-label-for']

    Array.from(element.attributes).forEach((attr) => {
      if (
        attr.name.startsWith('data-') &&
        !excludedAttrs.includes(attr.name) &&
        attr.value &&
        attr.value.trim()
      ) {
        tags.push({
          key: attr.name.substring(5), // Remove 'data-' prefix
          fullKey: attr.name,
          value: attr.value.trim(),
        })
      }
    })

    return tags
  }

  /**
   * Serialize SVG document back to string
   * @param {Document|Element} svgDocOrElement - SVG document or element
   * @returns {string} SVG string
   */
  static serialize(svgDocOrElement) {
    const serializer = new XMLSerializer()
    return serializer.serializeToString(svgDocOrElement)
  }

  /**
   * Add region labels to SVG
   * @param {Element} svgElement - SVG element
   * @param {Array} regions - Array of regions with names
   */
  static addRegionLabels(svgElement, regions) {
    // Remove existing labels
    svgElement
      .querySelectorAll('text[data-label-for]')
      .forEach((el) => el.remove())

    regions.forEach((region) => {
      if (!region.name || !region.element) return

      const bbox = region.element.getBBox()
      const centerX = bbox.x + bbox.width / 2
      const centerY = bbox.y + bbox.height / 2

      const textEl = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      )
      textEl.setAttribute('x', centerX)
      textEl.setAttribute('y', centerY)
      textEl.setAttribute('text-anchor', 'middle')
      textEl.setAttribute('dominant-baseline', 'middle')
      textEl.setAttribute('font-size', '14')
      textEl.setAttribute('font-weight', 'bold')
      textEl.setAttribute('fill', '#333')
      textEl.setAttribute('pointer-events', 'none')
      textEl.setAttribute('data-label-for', region.id)
      textEl.setAttribute('paint-order', 'stroke')
      textEl.setAttribute('stroke', 'white')
      textEl.setAttribute('stroke-width', '3')
      textEl.setAttribute('stroke-linejoin', 'round')
      textEl.textContent = region.name

      // Insert after the region element
      region.element.parentNode.insertBefore(textEl, region.element.nextSibling)
    })
  }

  /**
   * Apply visual styling to a region element
   * @param {Element} element - SVG path element
   * @param {Object} options - Styling options
   */
  static styleRegionElement(element, options = {}) {
    const defaults = {
      stroke: '#333',
      strokeWidth: '0.5',
      cursor: 'pointer',
      pointerEvents: 'auto',
      fill: null,
      fillOpacity: null,
    }

    const config = { ...defaults, ...options }

    if (config.stroke) element.style.stroke = config.stroke
    if (config.strokeWidth) element.style.strokeWidth = config.strokeWidth
    if (config.cursor) element.style.cursor = config.cursor
    if (config.pointerEvents) element.style.pointerEvents = config.pointerEvents

    if (config.fill !== null) {
      element.style.fill = config.fill
    }

    if (config.fillOpacity !== null) {
      element.style.fillOpacity = config.fillOpacity
    }

    // Ensure clickable area
    if (
      !element.getAttribute('fill') ||
      element.getAttribute('fill') === 'none'
    ) {
      if (!element.style.fill) {
        element.style.fill = 'rgba(200, 200, 200, 0.1)'
      }
    }
  }

  /**
   * Calculate bounding box for multiple elements
   * @param {Array<Element>} elements - Array of SVG elements
   * @returns {Object} Combined bounding box
   */
  static getCombinedBBox(elements) {
    if (elements.length === 0) return null

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    elements.forEach((el) => {
      const bbox = el.getBBox()
      minX = Math.min(minX, bbox.x)
      minY = Math.min(minY, bbox.y)
      maxX = Math.max(maxX, bbox.x + bbox.width)
      maxY = Math.max(maxY, bbox.y + bbox.height)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SVGParser
} else {
  window.SVGParser = SVGParser
}
