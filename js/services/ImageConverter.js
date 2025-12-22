/**
 * ImageConverter - Image to SVG Map Converter Service
 * Handles image processing, edge detection, and SVG path generation
 */

class ImageConverter {
  constructor() {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    this.settings = {
      // Edge Detection
      edgeThreshold: 50,
      edgeRadius: 2,

      // Preprocessing
      grayscale: true,
      invert: true,
      blur: 1,
      posterize: 0,

      // Contour Settings
      minRegionArea: 100,
      simplifyTolerance: 2,
      smoothing: 0.5,

      // Output
      strokeWidth: 1,
      fillOpacity: 0.1,
    }
  }

  /**
   * Process an image file and return SVG path data
   */
  async processImage(imageFile, settings = {}) {
    // Merge settings
    this.settings = { ...this.settings, ...settings }

    // Load image
    const img = await this.loadImage(imageFile)

    // Set canvas size
    this.canvas.width = img.width
    this.canvas.height = img.height

    // Draw original image
    this.ctx.drawImage(img, 0, 0)

    // Get image data
    let imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    )

    // Processing pipeline
    const steps = []

    // Step 1: Grayscale
    if (this.settings.grayscale) {
      imageData = this.toGrayscale(imageData)
      steps.push({ name: 'Grayscale', data: this.cloneImageData(imageData) })
    }

    // Step 2: Optional blur
    if (this.settings.blur > 0) {
      imageData = this.applyBlur(imageData, this.settings.blur)
      steps.push({ name: 'Blur', data: this.cloneImageData(imageData) })
    }

    // Step 3: Optional posterize
    if (this.settings.posterize > 0) {
      imageData = this.posterize(imageData, this.settings.posterize)
      steps.push({ name: 'Posterize', data: this.cloneImageData(imageData) })
    }

    // Step 4: Edge detection
    imageData = this.detectEdges(imageData, this.settings.edgeRadius)
    steps.push({ name: 'Edges', data: this.cloneImageData(imageData) })

    // Step 5: Invert (if needed for black edges on white)
    if (this.settings.invert) {
      imageData = this.invertImage(imageData)
      steps.push({ name: 'Invert', data: this.cloneImageData(imageData) })
    }

    // Step 6: Threshold
    imageData = this.threshold(imageData, this.settings.edgeThreshold)
    steps.push({ name: 'Threshold', data: this.cloneImageData(imageData) })

    // Step 7: Find contours
    const contours = this.findContours(imageData)
    steps.push({ name: 'Contours', count: contours.length })

    // Step 8: Filter and simplify contours
    const regions = this.processContours(contours)

    // Step 9: Generate SVG
    const svg = this.generateSVG(regions, img.width, img.height)

    return {
      svg,
      regions,
      steps,
      dimensions: { width: img.width, height: img.height },
    }
  }

  /**
   * Load image from file
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject

      if (file instanceof File) {
        img.src = URL.createObjectURL(file)
      } else if (typeof file === 'string') {
        img.src = file
      }
    })
  }

  /**
   * Clone ImageData
   */
  cloneImageData(imageData) {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
  }

  /**
   * Convert to grayscale
   */
  toGrayscale(imageData) {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = data[i + 1] = data[i + 2] = gray
    }
    return imageData
  }

  /**
   * Apply box blur
   */
  applyBlur(imageData, radius) {
    const { width, height, data } = imageData
    const result = new Uint8ClampedArray(data)
    const size = radius * 2 + 1
    const area = size * size

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let r = 0,
          g = 0,
          b = 0

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
          }
        }

        const idx = (y * width + x) * 4
        result[idx] = r / area
        result[idx + 1] = g / area
        result[idx + 2] = b / area
      }
    }

    imageData.data.set(result)
    return imageData
  }

  /**
   * Posterize image
   */
  posterize(imageData, levels) {
    const data = imageData.data
    const step = 255 / levels

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / step) * step
      data[i + 1] = Math.round(data[i + 1] / step) * step
      data[i + 2] = Math.round(data[i + 2] / step) * step
    }

    return imageData
  }

  /**
   * Sobel edge detection
   */
  detectEdges(imageData, radius = 1) {
    const { width, height, data } = imageData
    const result = new Uint8ClampedArray(data.length)

    // Sobel kernels
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ]
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0,
          gy = 0

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4
            const gray = data[idx]
            gx += gray * sobelX[dy + 1][dx + 1]
            gy += gray * sobelY[dy + 1][dx + 1]
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy)
        const idx = (y * width + x) * 4
        result[idx] =
          result[idx + 1] =
          result[idx + 2] =
            Math.min(255, magnitude)
        result[idx + 3] = 255
      }
    }

    imageData.data.set(result)
    return imageData
  }

  /**
   * Invert image
   */
  invertImage(imageData) {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
    return imageData
  }

  /**
   * Apply threshold
   */
  threshold(imageData, level) {
    const data = imageData.data
    const thresh = level * 2.55 // Convert percentage to 0-255

    for (let i = 0; i < data.length; i += 4) {
      const value = data[i] > thresh ? 255 : 0
      data[i] = data[i + 1] = data[i + 2] = value
    }

    return imageData
  }

  /**
   * Find contours using improved flood fill and border tracing
   */
  findContours(imageData) {
    const { width, height, data } = imageData
    const visited = new Uint8Array(width * height)
    const contours = []

    // Helper to get pixel value (white = 255, black = 0)
    const getPixel = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0
      return data[(y * width + x) * 4]
    }

    // Moore neighbor tracing algorithm
    const traceContour = (startX, startY) => {
      const contour = []
      const directions = [
        [0, -1], // N
        [1, -1], // NE
        [1, 0], // E
        [1, 1], // SE
        [0, 1], // S
        [-1, 1], // SW
        [-1, 0], // W
        [-1, -1], // NW
      ]

      let x = startX
      let y = startY
      let dir = 7 // Start looking west-northwest
      let startDir = dir
      let firstPoint = true

      // Limit iterations to prevent infinite loops
      const maxIter = width * height
      let iter = 0

      do {
        contour.push({ x, y })
        visited[y * width + x] = 1

        // Find next boundary pixel
        let found = false
        for (let i = 0; i < 8; i++) {
          const newDir = (dir + i + 5) % 8 // Start from dir+5 (backtrack+1)
          const nx = x + directions[newDir][0]
          const ny = y + directions[newDir][1]

          if (getPixel(nx, ny) > 127) {
            x = nx
            y = ny
            dir = newDir
            found = true
            break
          }
        }

        if (!found) break
        iter++

        // Check if we've returned to start
        if (!firstPoint && x === startX && y === startY) {
          break
        }
        firstPoint = false
      } while (iter < maxIter)

      return contour
    }

    // Scan for contour starting points
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x

        // Skip already visited pixels
        if (visited[idx]) continue

        // Check if this is a white pixel adjacent to black (edge)
        const current = getPixel(x, y)
        if (current > 127) {
          // Check if this is on the boundary (has a black neighbor)
          const hasBlackNeighbor =
            getPixel(x - 1, y) <= 127 ||
            getPixel(x + 1, y) <= 127 ||
            getPixel(x, y - 1) <= 127 ||
            getPixel(x, y + 1) <= 127

          if (hasBlackNeighbor && !visited[idx]) {
            const contour = traceContour(x, y)
            if (contour.length >= 10) {
              contours.push(contour)
            }
          }
        }
      }
    }

    return contours
  }

  /**
   * Process and filter contours
   */
  processContours(contours) {
    return contours
      .map((contour) => {
        // Calculate area using shoelace formula
        let area = 0
        for (let i = 0; i < contour.length; i++) {
          const j = (i + 1) % contour.length
          area += contour[i].x * contour[j].y
          area -= contour[j].x * contour[i].y
        }
        area = Math.abs(area / 2)

        // Simplify contour using Douglas-Peucker algorithm
        const simplified = this.simplifyContour(
          contour,
          this.settings.simplifyTolerance
        )

        // Smooth contour
        const smoothed =
          this.settings.smoothing > 0
            ? this.smoothContour(simplified, this.settings.smoothing)
            : simplified

        return {
          points: smoothed,
          area,
          originalLength: contour.length,
          simplifiedLength: smoothed.length,
        }
      })
      .filter((region) => region.area >= this.settings.minRegionArea)
      .sort((a, b) => b.area - a.area)
  }

  /**
   * Douglas-Peucker line simplification
   */
  simplifyContour(points, tolerance) {
    if (!points || points.length <= 2) return points || []

    // Filter out any invalid points
    const validPoints = points.filter(
      (p) => p && typeof p.x === 'number' && typeof p.y === 'number'
    )
    if (validPoints.length <= 2) return validPoints

    // Find the point with the maximum distance
    let maxDist = 0
    let maxIdx = 0
    const start = validPoints[0]
    const end = validPoints[validPoints.length - 1]

    for (let i = 1; i < validPoints.length - 1; i++) {
      const dist = this.pointLineDistance(validPoints[i], start, end)
      if (dist > maxDist) {
        maxDist = dist
        maxIdx = i
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.simplifyContour(
        validPoints.slice(0, maxIdx + 1),
        tolerance
      )
      const right = this.simplifyContour(validPoints.slice(maxIdx), tolerance)
      return left.slice(0, -1).concat(right)
    }

    return [start, end]
  }

  /**
   * Calculate distance from point to line
   */
  pointLineDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    const lenSq = dx * dx + dy * dy

    if (lenSq === 0) {
      return Math.sqrt(
        (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
      )
    }

    let t =
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))

    const nearestX = lineStart.x + t * dx
    const nearestY = lineStart.y + t * dy

    return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2)
  }

  /**
   * Smooth contour using moving average
   */
  smoothContour(points, factor) {
    if (!points || points.length < 3) return points || []

    // Filter out any invalid points
    const validPoints = points.filter(
      (p) => p && typeof p.x === 'number' && typeof p.y === 'number'
    )
    if (validPoints.length < 3) return validPoints

    const smoothed = []
    const window = Math.max(1, Math.floor(factor * 3))

    for (let i = 0; i < validPoints.length; i++) {
      let sumX = 0,
        sumY = 0,
        count = 0

      for (let j = -window; j <= window; j++) {
        const idx = (i + j + validPoints.length) % validPoints.length
        sumX += validPoints[idx].x
        sumY += validPoints[idx].y
        count++
      }

      smoothed.push({
        x: Math.round(sumX / count),
        y: Math.round(sumY / count),
      })
    }

    return smoothed
  }

  /**
   * Generate SVG from regions
   */
  generateSVG(regions, width, height) {
    const paths = regions.map((region, index) => {
      const d = this.pointsToPath(region.points)
      return `    <path id="${index}" class="region" d="${d}" fill="none" stroke="#000" stroke-width="${this.settings.strokeWidth}" data-index="${index}" style="stroke: rgb(51, 51, 51); stroke-width: ${this.settings.strokeWidth}; cursor: pointer; pointer-events: auto; fill: rgba(200, 200, 200, ${this.settings.fillOpacity}); fill-opacity: ${this.settings.fillOpacity};"/>`
    })

    return `<svg id="mapSvg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <g id="map">
${paths.join('\n')}
  </g>
</svg>`
  }

  /**
   * Convert points array to SVG path data
   */
  pointsToPath(points) {
    if (points.length === 0) return ''

    let d = `M ${points[0].x},${points[0].y}`

    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x},${points[i].y}`
    }

    d += ' Z'
    return d
  }

  /**
   * Get preview image data for a processing step
   */
  getStepPreview(imageData) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)
    return tempCanvas.toDataURL()
  }
}

// Export for use
window.ImageConverter = ImageConverter
