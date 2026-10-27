import html2pdf from 'html2pdf.js'

export const colorCache = new Map()

/**
 * Converts modern CSS colors (oklab, oklch, color(srgb...), lab, lch) into standard rgb/rgba
 * via 2D canvas pixel read to ensure 100% compatibility with html2canvas.
 */
export function sanitizeColorString(val, ctx) {
  if (typeof val !== 'string') return val
  if (!val.includes('oklab') && !val.includes('oklch') && !val.includes('color(') && !val.includes('lab(') && !val.includes('lch(')) {
    return val
  }

  return val.replace(/(?:oklab|oklch|color|lab|lch)\([^)]+\)/gi, (match) => {
    if (colorCache.has(match)) {
      return colorCache.get(match)
    }
    try {
      if (ctx) {
        if (typeof ctx.getImageData === 'function' && typeof ctx.fillRect === 'function') {
          if (typeof ctx.clearRect === 'function') ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = match
          ctx.fillRect(0, 0, 1, 1)
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
          const alpha = +(a / 255).toFixed(3)
          const res = alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`
          colorCache.set(match, res)
          return res
        } else if (ctx.fillStyle !== undefined) {
          ctx.fillStyle = 'rgba(1, 2, 3, 0.5)'
          ctx.fillStyle = match
          if (ctx.fillStyle !== 'rgba(1, 2, 3, 0.5)' && !ctx.fillStyle.startsWith('oklch') && !ctx.fillStyle.startsWith('oklab') && !ctx.fillStyle.startsWith('color')) {
            colorCache.set(match, ctx.fillStyle)
            return ctx.fillStyle
          }
        }
      }
    } catch {
      // fallback
    }
    const fallback = 'rgba(0, 0, 0, 0.15)'
    colorCache.set(match, fallback)
    return fallback
  })
}

/**
 * Clones the A4 pages container into an isolated offscreen element with unscaled 210mm A4 dimensions.
 * Using static in-flow positioning ensures html2pdf's container correctly measures the full multi-page height.
 */
export function preparePrintClone(element) {
  const clone = element.cloneNode(true)
  clone.id = `${element.id || 'print-container'}-pdf-export-clone`
  clone.style.position = 'static'
  clone.style.display = 'block'
  clone.style.width = '210mm'
  clone.style.height = 'auto'
  clone.style.margin = '0'
  clone.style.padding = '0'
  clone.style.backgroundColor = '#ffffff'

  // Remove any CSS transforms on ALL descendant elements inside clone
  const allElements = clone.querySelectorAll('*')
  allElements.forEach(el => {
    if (el.style.transform && el.style.transform !== 'none') {
      el.style.transform = 'none'
    }
  })

  // Normalize outer page wrappers
  const outerWrappers = clone.children
  for (let i = 0; i < outerWrappers.length; i++) {
    const wrap = outerWrappers[i]
    wrap.style.width = '210mm'
    wrap.style.height = '296.5mm'
    wrap.style.maxHeight = '296.5mm'
    wrap.style.margin = '0'
    wrap.style.padding = '0'
    wrap.style.overflow = 'hidden'
    if (i > 0) wrap.classList.add('a4-page-break-before')
  }

  // Also normalize every .a4-page element
  const allPages = clone.querySelectorAll('.a4-page')
  allPages.forEach(p => {
    p.style.width = '210mm'
    p.style.minWidth = '210mm'
    p.style.height = '296.5mm'
    p.style.minHeight = '296.5mm'
    p.style.maxHeight = '296.5mm'
    p.style.transform = 'none'
    p.style.boxShadow = 'none'
    p.style.border = 'none'
    p.style.margin = '0'
    p.style.overflow = 'hidden'
  })

  // For any wrapper between outerWrapper and .a4-page, normalize its dimensions to 210mm
  allPages.forEach(pageEl => {
    let parent = pageEl.parentElement
    while (parent && parent !== clone) {
      parent.style.transform = 'none'
      parent.style.boxShadow = 'none'
      parent.style.border = 'none'
      parent.style.margin = '0'
      parent.style.padding = '0'
      parent.style.width = '210mm'
      parent.style.maxWidth = '210mm'
      parent = parent.parentElement
    }
  })

  return clone
}

/**
 * Runs html2pdf with an intercepted getComputedStyle proxy so any computed style
 * returning modern color formats (oklab, oklch) is converted to standard rgb/rgba before html2canvas sees it.
 * Uses an isolated clone to ensure the visible on-screen document stays 100% stable without layout shifts.
 * 
 * @param {HTMLElement} element The root container to print/save
 * @param {object} options Options passed to html2pdf.set()
 * @param {'save' | 'blob'} mode 'save' triggers download, 'blob' returns PDF Blob
 */
export async function generatePdf(element, options, mode = 'save') {
  if (!element) throw new Error('Element for PDF generation not found.')

  const fastOptions = {
    ...options,
    html2canvas: {
      letterRendering: false,
      ...options?.html2canvas,
    }
  }

  const clone = preparePrintClone(element)

  let canvas = null
  let ctx = null
  try {
    canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  } catch {
    // fallback if canvas cannot be created
  }

  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = function (el, pseudo) {
    const style = originalGetComputedStyle.call(window, el, pseudo)
    return new Proxy(style, {
      get(target, prop) {
        const value = target[prop]
        if (typeof value === 'string') {
          return sanitizeColorString(value, ctx)
        }
        if (typeof value === 'function') {
          return function (...args) {
            const res = value.apply(target, args)
            return typeof res === 'string' ? sanitizeColorString(res, ctx) : res
          }
        }
        return value
      }
    })
  }

  try {
    const worker = html2pdf().set(fastOptions).from(clone)
    if (mode === 'blob') {
      return await worker.output('blob')
    } else {
      return await worker.save()
    }
  } finally {
    window.getComputedStyle = originalGetComputedStyle
  }
}
