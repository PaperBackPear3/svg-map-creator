/**
 * Helper Utilities
 * Common utility functions used across the application
 */

const Helpers = {
  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  /**
   * Generate a unique ID
   * @param {string} prefix - Optional prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
  },

  /**
   * Check if a value is empty (null, undefined, empty string, empty array/object)
   * @param {*} value - Value to check
   * @returns {boolean} True if empty
   */
  isEmpty(value) {
    if (value == null) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  },

  /**
   * Capitalize first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  },

  /**
   * Convert string to kebab-case
   * @param {string} str - String to convert
   * @returns {string} Kebab-case string
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
  },

  /**
   * Escape HTML entities
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  },

  /**
   * Format a number with thousands separator
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  /**
   * Try to parse a value as a number
   * @param {*} value - Value to parse
   * @returns {number|string} Parsed number or original value
   */
  tryParseNumber(value) {
    const num = parseFloat(value)
    return isNaN(num) ? value : num
  },

  /**
   * Sort an array of items by a key
   * Supports numeric and alphabetic sorting
   * @param {Array} items - Array to sort
   * @param {string|Function} key - Key to sort by or comparison function
   * @returns {Array} Sorted array
   */
  sortBy(items, key) {
    return [...items].sort((a, b) => {
      const valA = typeof key === 'function' ? key(a) : a[key]
      const valB = typeof key === 'function' ? key(b) : b[key]

      const numA = parseFloat(valA)
      const numB = parseFloat(valB)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      return String(valA).localeCompare(String(valB))
    })
  },

  /**
   * Group an array by a key
   * @param {Array} items - Array to group
   * @param {string|Function} key - Key to group by
   * @returns {Object} Grouped object
   */
  groupBy(items, key) {
    return items.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key]
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    }, {})
  },
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Helpers
} else {
  window.Helpers = Helpers
}
