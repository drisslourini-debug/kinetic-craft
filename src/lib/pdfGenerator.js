import html2pdf from 'html2pdf.js'

/**
 * Converts modern CSS colors (oklab, oklch, color(srgb...)) into standard rgb/rgba
 * to ensure 100% compatibility with html2canvas and other legacy canvas tools.
 */
export function sanitizeColorString(val, ctx) {
  if (typeof val !== 'string') return val
  if (!val.includes('oklab') && !val.includes('oklch') && !val.includes('color(')) {
    return val
  }

  return val.replace(/(?:oklab|oklch|color)\([^)]+\)/gi, (match) => {
    try {
      if (ctx) {
        ctx.fillStyle = 'rgba(1, 2, 3, 0.5)'
        ctx.fillStyle = match
        if (ctx.fillStyle !== 'rgba(1, 2, 3, 0.5)') {
          return ctx.fillStyle
        }
      }
    } catch {
      // ignore
    }
    return 'rgba(0, 0, 0, 0.15)'
  })
}

/**
 * Runs html2pdf with an intercepted getComputedStyle proxy so any computed style
 * returning oklab/oklch is transparently converted to rgb/rgba before html2canvas sees it.
 * 
 * @param {HTMLElement} element The root container to print/save
 * @param {object} options Options passed to html2pdf.set()
 * @param {'save' | 'blob'} mode 'save' triggers download, 'blob' returns PDF Blob
 */
export async function generatePdf(element, options, mode = 'save') {
  if (!element) throw new Error('Element for PDF generation not found.')

  let canvas = null
  let ctx = null
  try {
    canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    ctx = canvas.getContext('2d')
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
    const worker = html2pdf().set(options).from(element)
    if (mode === 'blob') {
      return await worker.output('blob')
    } else {
      return await worker.save()
    }
  } finally {
    window.getComputedStyle = originalGetComputedStyle
  }
}
