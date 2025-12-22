/**
 * FileService
 * Service for handling file operations (load, save, download)
 */

class FileService {
  /**
   * Read file as text
   * @param {File} file - File object
   * @returns {Promise<string>} File content
   */
  static readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        resolve(event.target.result)
      }

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`))
      }

      reader.readAsText(file)
    })
  }

  /**
   * Download content as a file
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  static download(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType })
    FileService.downloadBlob(blob, filename)
  }

  /**
   * Download a blob as a file
   * @param {Blob} blob - Blob object
   * @param {string} filename - Filename
   */
  static downloadBlob(blob, filename) {
    // Try modern File System Access API first
    if (window.showSaveFilePicker) {
      FileService._downloadWithPicker(blob, filename)
    } else {
      FileService._downloadFallback(blob, filename)
    }
  }

  /**
   * Download using File System Access API
   * @param {Blob} blob - Blob object
   * @param {string} filename - Filename
   */
  static async _downloadWithPicker(blob, filename) {
    try {
      const extension = filename.split('.').pop()
      const mimeTypes = {
        svg: { 'image/svg+xml': ['.svg'] },
        json: { 'application/json': ['.json'] },
        txt: { 'text/plain': ['.txt'] },
      }

      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: `${extension.toUpperCase()} Files`,
            accept: mimeTypes[extension] || {
              'application/octet-stream': [`.${extension}`],
            },
          },
        ],
      })

      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()

      return true
    } catch (err) {
      if (err.name !== 'AbortError') {
        // User didn't cancel, fall back to standard download
        FileService._downloadFallback(blob, filename)
      }
      return false
    }
  }

  /**
   * Fallback download using anchor element
   * @param {Blob} blob - Blob object
   * @param {string} filename - Filename
   */
  static _downloadFallback(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the URL
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  /**
   * Download SVG content
   * @param {string} svgContent - SVG string
   * @param {string} filename - Filename (without extension)
   */
  static downloadSVG(svgContent, filename) {
    const finalFilename = filename.endsWith('.svg')
      ? filename
      : `${filename}.svg`
    FileService.download(svgContent, finalFilename, 'image/svg+xml')
  }

  /**
   * Prompt user to select a file
   * @param {string} accept - Accepted file types
   * @returns {Promise<File>} Selected file
   */
  static selectFile(accept = '*') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept

      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          resolve(file)
        } else {
          reject(new Error('No file selected'))
        }
      }

      input.click()
    })
  }

  /**
   * Load SVG file from URL
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} SVG content
   */
  static async loadFromURL(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      return await response.text()
    } catch (error) {
      throw new Error(`Failed to load SVG from URL: ${error.message}`)
    }
  }

  /**
   * Check if File System Access API is supported
   * @returns {boolean} Is supported
   */
  static isFileSystemAccessSupported() {
    return 'showSaveFilePicker' in window
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} Extension without dot
   */
  static getExtension(filename) {
    const parts = filename.split('.')
    return parts.length > 1 ? parts.pop().toLowerCase() : ''
  }

  /**
   * Get filename without extension
   * @param {string} filename - Filename
   * @returns {string} Filename without extension
   */
  static getBasename(filename) {
    const parts = filename.split('.')
    if (parts.length > 1) {
      parts.pop()
    }
    return parts.join('.')
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileService
} else {
  window.FileService = FileService
}
