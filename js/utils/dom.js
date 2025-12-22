/**
 * DOM Utilities
 * Helper functions for DOM manipulation
 */

const DOM = {
  /**
   * Query a single element
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (default: document)
   * @returns {Element|null} Found element or null
   */
  $(selector, parent = document) {
    return parent.querySelector(selector)
  },

  /**
   * Query multiple elements
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (default: document)
   * @returns {Array<Element>} Array of found elements
   */
  $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector))
  },

  /**
   * Create an element with attributes and children
   * @param {string} tag - Tag name
   * @param {Object} attrs - Attributes object
   * @param {Array|string} children - Child elements or text content
   * @returns {Element} Created element
   */
  createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag)

    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value)
      } else if (key.startsWith('data')) {
        element.setAttribute(
          key.replace(/([A-Z])/g, '-$1').toLowerCase(),
          value
        )
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase()
        element.addEventListener(event, value)
      } else {
        element.setAttribute(key, value)
      }
    })

    // Add children
    if (typeof children === 'string') {
      element.textContent = children
    } else if (Array.isArray(children)) {
      children.forEach((child) => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child))
        } else if (child instanceof Element) {
          element.appendChild(child)
        }
      })
    }

    return element
  },

  /**
   * Create an SVG element
   * @param {string} tag - SVG tag name
   * @param {Object} attrs - Attributes
   * @returns {SVGElement} Created SVG element
   */
  createSVGElement(tag, attrs = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag)
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, value)
    })
    return element
  },

  /**
   * Add event listener with automatic cleanup
   * @param {Element} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {Function} Cleanup function
   */
  on(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options)
    return () => element.removeEventListener(event, handler, options)
  },

  /**
   * Add delegated event listener
   * @param {Element} parent - Parent element
   * @param {string} event - Event type
   * @param {string} selector - Child selector
   * @param {Function} handler - Event handler
   * @returns {Function} Cleanup function
   */
  delegate(parent, event, selector, handler) {
    const delegatedHandler = (e) => {
      const target = e.target.closest(selector)
      if (target && parent.contains(target)) {
        handler.call(target, e, target)
      }
    }
    parent.addEventListener(event, delegatedHandler)
    return () => parent.removeEventListener(event, delegatedHandler)
  },

  /**
   * Toggle a class on an element
   * @param {Element} element - Target element
   * @param {string} className - Class to toggle
   * @param {boolean} force - Force add or remove
   */
  toggleClass(element, className, force) {
    if (force !== undefined) {
      element.classList.toggle(className, force)
    } else {
      element.classList.toggle(className)
    }
  },

  /**
   * Check if an element has a class
   * @param {Element} element - Target element
   * @param {string} className - Class to check
   * @returns {boolean} Has class
   */
  hasClass(element, className) {
    return element.classList.contains(className)
  },

  /**
   * Set multiple styles on an element
   * @param {Element} element - Target element
   * @param {Object} styles - Styles object
   */
  setStyles(element, styles) {
    Object.assign(element.style, styles)
  },

  /**
   * Get element's bounding box center
   * @param {Element} element - Target element
   * @returns {Object} Center coordinates { x, y }
   */
  getCenter(element) {
    const bbox = element.getBBox
      ? element.getBBox()
      : element.getBoundingClientRect()
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    }
  },

  /**
   * Empty an element
   * @param {Element} element - Target element
   */
  empty(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
  },

  /**
   * Show an element
   * @param {Element} element - Target element
   * @param {string} display - Display value (default: 'block')
   */
  show(element, display = 'block') {
    element.style.display = display
  },

  /**
   * Hide an element
   * @param {Element} element - Target element
   */
  hide(element) {
    element.style.display = 'none'
  },

  /**
   * Check if element is visible
   * @param {Element} element - Target element
   * @returns {boolean} Is visible
   */
  isVisible(element) {
    return element.offsetParent !== null
  },

  /**
   * Scroll element into view smoothly
   * @param {Element} element - Target element
   * @param {Object} options - Scroll options
   */
  scrollIntoView(element, options = { behavior: 'smooth', block: 'nearest' }) {
    element.scrollIntoView(options)
  },

  /**
   * Get all data attributes from an element
   * @param {Element} element - Target element
   * @returns {Object} Data attributes object
   */
  getDataAttributes(element) {
    const data = {}
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.slice(5) // Remove 'data-' prefix
        data[key] = attr.value
      }
    })
    return data
  },

  /**
   * Set multiple data attributes on an element
   * @param {Element} element - Target element
   * @param {Object} data - Data object
   */
  setDataAttributes(element, data) {
    Object.entries(data).forEach(([key, value]) => {
      element.setAttribute(`data-${key}`, value)
    })
  },
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOM
} else {
  window.DOM = DOM
}
