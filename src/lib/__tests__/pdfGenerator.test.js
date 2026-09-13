import { describe, it, expect } from 'vitest'
import { sanitizeColorString } from '../pdfGenerator'

describe('pdfGenerator - sanitizeColorString', () => {
  it('leaves normal color strings untouched', () => {
    expect(sanitizeColorString('#ffffff')).toBe('#ffffff')
    expect(sanitizeColorString('rgb(255, 255, 255)')).toBe('rgb(255, 255, 255)')
    expect(sanitizeColorString('rgba(0, 0, 0, 0.5)')).toBe('rgba(0, 0, 0, 0.5)')
    expect(sanitizeColorString('transparent')).toBe('transparent')
  })

  it('handles non-string arguments safely', () => {
    expect(sanitizeColorString(null)).toBe(null)
    expect(sanitizeColorString(undefined)).toBe(undefined)
    expect(sanitizeColorString(123)).toBe(123)
  })

  it('converts oklab using mock 2D canvas context if supported', () => {
    const mockCtx = {
      _val: '',
      get fillStyle() {
        return this._val
      },
      set fillStyle(val) {
        if (val.startsWith('rgba(1, 2, 3')) {
          this._val = val
        } else if (val.startsWith('oklab')) {
          this._val = 'rgb(226, 232, 240)'
        }
      }
    }

    const input = '1px solid oklab(0.92 0 0)'
    const output = sanitizeColorString(input, mockCtx)
    expect(output).toBe('1px solid rgb(226, 232, 240)')
  })

  it('falls back to safe rgba when context fails or is not provided', () => {
    const input = 'border-color: oklab(0.8 0 0)'
    const output = sanitizeColorString(input, null)
    expect(output).toBe('border-color: rgba(0, 0, 0, 0.15)')
  })

  it('converts multiple oklab/oklch occurrences in single string', () => {
    const input = '0 0 0 1px oklab(0.9 0 0), 0 20px 25px -5px oklch(0.5 0.1 20)'
    const output = sanitizeColorString(input, null)
    expect(output).toBe('0 0 0 1px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.15)')
  })
})
