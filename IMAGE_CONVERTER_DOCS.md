# Image to Map Converter - Technical Documentation

## Overview

The Image Converter transforms raster images (PNG, JPG, etc.) into SVG maps with selectable regions. It uses classic computer vision techniques implemented in pure JavaScript using the **Canvas API**.

---

## Processing Pipeline

```
Image → Grayscale → Blur → Posterize → Edge Detection → Invert → Threshold → Contour Tracing → Simplification → SVG
```

### Step-by-Step Breakdown

---

### 1. Grayscale Conversion

**Purpose:** Simplify the image to single-channel intensity values

**Formula (Luminosity method):**

```
Gray = 0.299 × R + 0.587 × G + 0.114 × B
```

This mimics human perception where green is most sensitive, then red, then blue.

**📚 Learn more:**

- [Grayscale - Wikipedia](https://en.wikipedia.org/wiki/Grayscale)

---

### 2. Box Blur (Noise Reduction)

**Purpose:** Reduce noise that could create false edges

**How it works:** Each pixel becomes the average of its neighbors in a square window (kernel).

```
For each pixel:
  sum all neighbor values in NxN window
  new_value = sum / (N × N)
```

**📚 Learn more:**

- [Box Blur - Wikipedia](https://en.wikipedia.org/wiki/Box_blur)
- [Image Convolution](https://setosa.io/ev/image-kernels/) (interactive demo)

---

### 3. Posterization (Optional)

**Purpose:** Reduce color gradients to distinct levels, making edges sharper

**How it works:** Quantizes intensity values to a fixed number of levels.

```
step = 255 / levels
new_value = round(value / step) × step
```

**📚 Learn more:**

- [Posterization - Wikipedia](https://en.wikipedia.org/wiki/Posterization)

---

### 4. Sobel Edge Detection ⭐

**Purpose:** Find boundaries between regions by detecting intensity gradients

**How it works:** Uses two 3×3 convolution kernels to detect horizontal and vertical edges:

```
Sobel X (horizontal):        Sobel Y (vertical):
[-1  0  +1]                  [-1 -2 -1]
[-2  0  +2]                  [ 0  0  0]
[-1  0  +1]                  [+1 +2 +1]
```

**Gradient magnitude:** `√(Gx² + Gy²)`

This is equivalent to the ImageMagick command you used:

```bash
convert image.png -edge 2 output.png
```

**📚 Learn more:**

- [Sobel Operator - Wikipedia](https://en.wikipedia.org/wiki/Sobel_operator)
- [Edge Detection - OpenCV Tutorial](https://docs.opencv.org/4.x/d2/d2c/tutorial_sobel_derivatives.html)
- [Canny Edge Detection](https://en.wikipedia.org/wiki/Canny_edge_detector) (more advanced)

---

### 5. Image Inversion

**Purpose:** Flip black/white so edges become white (needed for contour tracing)

**Formula:** `new_value = 255 - value`

Equivalent to: `convert image.png -negate output.png`

---

### 6. Thresholding (Binarization)

**Purpose:** Convert grayscale to pure black & white

**Formula:**

```
if pixel > threshold: white (255)
else: black (0)
```

Equivalent to: `convert image.png -threshold 50% output.png`

**📚 Learn more:**

- [Thresholding - Wikipedia](<https://en.wikipedia.org/wiki/Thresholding_(image_processing)>)
- [Otsu's Method](https://en.wikipedia.org/wiki/Otsu%27s_method) (automatic threshold)

---

### 7. Moore Neighbor Contour Tracing ⭐

**Purpose:** Walk along edges to extract closed shapes

**Algorithm:**

1. Scan image for a white pixel with a black neighbor (boundary point)
2. Start walking along the boundary, always keeping black on one side
3. Check 8 neighbors (Moore neighborhood) in order
4. Continue until returning to start point

```
Neighbor directions:
  NW  N  NE
   7  0  1
  W 6  ●  2 E
   5  4  3
  SW  S  SE
```

**📚 Learn more:**

- [Moore Neighborhood - Wikipedia](https://en.wikipedia.org/wiki/Moore_neighborhood)
- [Contour Tracing Algorithms](https://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_Abeer_George_Ghuneim/index.html)
- [OpenCV findContours](https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html)

---

### 8. Douglas-Peucker Simplification ⭐

**Purpose:** Reduce number of points while preserving shape

**Algorithm:**

1. Draw line from first to last point
2. Find point farthest from this line
3. If distance > tolerance, recursively simplify both halves
4. Otherwise, keep only endpoints

```
Original:    •--•--•--•--•--•
                  ↓
Simplified:  •-----------•
```

This is what **potrace** uses internally!

**📚 Learn more:**

- [Douglas-Peucker - Wikipedia](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm)
- [Interactive Demo](https://karthaus.nl/rdp/)

---

### 9. Moving Average Smoothing

**Purpose:** Remove jagged edges from contours

**How it works:** Each point becomes the average of itself and its neighbors.

```
window_size = factor × 3
new_point = average(points[i-window : i+window])
```

---

### 10. SVG Generation

**Purpose:** Convert point arrays to SVG path commands

**Output format:**

```xml
<path d="M x1,y1 L x2,y2 L x3,y3 Z" />
```

- `M` = Move to (start point)
- `L` = Line to
- `Z` = Close path

---

## Equivalent Command-Line Tools

Your terminal history shows the equivalent operations:

| JavaScript Method                      | ImageMagick        | potrace      |
| -------------------------------------- | ------------------ | ------------ |
| `toGrayscale()`                        | `-colorspace Gray` | -            |
| `detectEdges()`                        | `-edge 2`          | -            |
| `invertImage()`                        | `-negate`          | -            |
| `threshold()`                          | `-threshold 50%`   | -            |
| `findContours()` + `simplifyContour()` | -                  | `potrace -s` |

**Full equivalent pipeline:**

```bash
# ImageMagick: Preprocess image
convert input.png \
  -colorspace Gray \
  -edge 2 \
  -negate \
  -threshold 50% \
  output.pnm

# Potrace: Trace to SVG
potrace output.pnm -s -o output.svg
```

---

## Canvas API Used

| API                            | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `canvas.getContext('2d')`      | Get drawing context                       |
| `ctx.drawImage(img, 0, 0)`     | Draw image to canvas                      |
| `ctx.getImageData(x, y, w, h)` | Get pixel array                           |
| `ctx.putImageData(data, x, y)` | Write pixel array                         |
| `ImageData.data`               | Uint8ClampedArray [R,G,B,A, R,G,B,A, ...] |

**📚 Learn more:**

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Pixel Manipulation - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)

---

## Area Calculation (Shoelace Formula)

Used to filter out small regions:

```
Area = ½ |Σ(xᵢyᵢ₊₁ - xᵢ₊₁yᵢ)|
```

**📚 Learn more:**

- [Shoelace Formula - Wikipedia](https://en.wikipedia.org/wiki/Shoelace_formula)

---

## 📖 Recommended Learning Resources

### Books

- **"Digital Image Processing" by Gonzalez & Woods** - The bible of image processing
- **"Computer Vision: Algorithms and Applications" by Szeliski** - [Free online](https://szeliski.org/Book/)

### Online Courses

- [Image Processing with Python (Coursera)](https://www.coursera.org/learn/image-processing)
- [OpenCV Tutorial](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)

### Interactive Tools

- [Image Kernels Explained](https://setosa.io/ev/image-kernels/) - Visual demo
- [Canny Edge Detector Demo](https://bigwww.epfl.ch/demo/ip/demos/edgeDetector/)

### Libraries for Advanced Use

- **OpenCV.js** - Full computer vision in browser
- **Potrace** - Professional bitmap tracing (what Inkscape uses)
- **Marvin.js** - Pure JS image processing

---

## Settings Reference

| Setting             | Range      | Description                   |
| ------------------- | ---------- | ----------------------------- |
| `edgeThreshold`     | 10-90%     | Higher = fewer edges detected |
| `edgeRadius`        | 1-5        | Sobel kernel size             |
| `blur`              | 0-5px      | Noise reduction               |
| `posterize`         | 0-8        | Color level reduction         |
| `minRegionArea`     | 10-1000px² | Filter small regions          |
| `simplifyTolerance` | 0-10       | Douglas-Peucker tolerance     |
| `smoothing`         | 0-2        | Contour smoothing factor      |
