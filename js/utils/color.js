/**
 * Color Utilities
 * Functions for generating and manipulating colors
 */

const ColorUtils = {
  /**
   * Generate a deterministic color from a string
   * @param {string} str - Input string
   * @param {number} saturation - Saturation percentage (0-100)
   * @param {number} lightness - Lightness percentage (0-100)
   * @returns {string} HSL color string
   */
  stringToColor(str, saturation = 70, lightness = 65) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  },

  /**
   * Generate a color palette for a set of values
   * @param {Array<string>} values - Array of values to generate colors for
   * @param {number} baseSaturation - Base saturation
   * @param {number} baseLightness - Base lightness
   * @returns {Map<string, string>} Map of values to colors
   */
  generatePalette(values, baseSaturation = 70, baseLightness = 55) {
    const colors = new Map()
    const hueStep = 360 / Math.max(values.length, 1)

    values.forEach((value, index) => {
      const hue = (index * hueStep) % 360
      colors.set(value, `hsl(${hue}, ${baseSaturation}%, ${baseLightness}%)`)
    })

    return colors
  },

  /**
   * Generate colors for tag values within a tag group
   * @param {Map<string, any>} tagValues - Map of tag values
   * @param {number} baseHue - Base hue for the group
   * @returns {Map<string, string>} Map of values to colors
   */
  generateTagValueColors(tagValues, baseHue) {
    const colors = new Map()
    const valueCount = tagValues.size
    let valueIndex = 0

    tagValues.forEach((_, value) => {
      const lightness = 40 + (valueIndex / Math.max(valueCount, 1)) * 30
      const saturation = 65 + Math.random() * 15
      colors.set(value, `hsl(${baseHue}, ${saturation}%, ${lightness}%)`)
      valueIndex++
    })

    return colors
  },

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color string
   * @returns {Object} RGB object with r, g, b properties
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  },

  /**
   * Convert RGB to hex color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} Hex color string
   */
  rgbToHex(r, g, b) {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    )
  },

  /**
   * Convert HSL to RGB
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {Object} RGB object
   */
  hslToRgb(h, s, l) {
    s /= 100
    l /= 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r = 0,
      g = 0,
      b = 0

    if (0 <= h && h < 60) {
      r = c
      g = x
      b = 0
    } else if (60 <= h && h < 120) {
      r = x
      g = c
      b = 0
    } else if (120 <= h && h < 180) {
      r = 0
      g = c
      b = x
    } else if (180 <= h && h < 240) {
      r = 0
      g = x
      b = c
    } else if (240 <= h && h < 300) {
      r = x
      g = 0
      b = c
    } else if (300 <= h && h < 360) {
      r = c
      g = 0
      b = x
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    }
  },

  /**
   * Get a contrasting text color (black or white) for a background
   * @param {string} bgColor - Background color (hex or rgb)
   * @returns {string} '#000000' or '#ffffff'
   */
  getContrastColor(bgColor) {
    let rgb = null

    if (bgColor.startsWith('#')) {
      rgb = this.hexToRgb(bgColor)
    } else if (bgColor.startsWith('rgb')) {
      const match = bgColor.match(/\d+/g)
      if (match && match.length >= 3) {
        rgb = {
          r: parseInt(match[0]),
          g: parseInt(match[1]),
          b: parseInt(match[2]),
        }
      }
    } else if (bgColor.startsWith('hsl')) {
      const match = bgColor.match(/[\d.]+/g)
      if (match && match.length >= 3) {
        rgb = this.hslToRgb(
          parseFloat(match[0]),
          parseFloat(match[1]),
          parseFloat(match[2])
        )
      }
    }

    if (!rgb) return '#000000'

    // Calculate relative luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  },

  /**
   * Adjust color brightness
   * @param {string} color - HSL color string
   * @param {number} amount - Amount to adjust (-100 to 100)
   * @returns {string} Adjusted HSL color
   */
  adjustBrightness(color, amount) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!match) return color

    const h = parseInt(match[1])
    const s = parseInt(match[2])
    let l = parseInt(match[3])

    l = Math.max(0, Math.min(100, l + amount))

    return `hsl(${h}, ${s}%, ${l}%)`
  },
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorUtils
} else {
  window.ColorUtils = ColorUtils
}
