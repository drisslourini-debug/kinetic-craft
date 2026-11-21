import { describe, it, expect, vi } from 'vitest'
import handler, { LEGAL_FORMS } from '../zefix.js'

describe('Vercel Serverless Zefix Endpoint (api/zefix.js)', () => {
  it('exports valid Swiss commercial register legal forms', () => {
    expect(LEGAL_FORMS[3]).toBe('Aktiengesellschaft (AG)')
    expect(LEGAL_FORMS[4]).toBe('Gesellschaft mit beschränkter Haftung (GmbH)')
    expect(LEGAL_FORMS[1]).toBe('Einzelunternehmen')
  })

  it('handles OPTIONS request with CORS headers', async () => {
    let statusCode = null
    const headers = {}
    let responseBody = null

    const req = { method: 'OPTIONS', url: '/api/zefix' }
    const res = {
      statusCode: 200,
      setHeader: (k, v) => { headers[k] = v },
      end: (data) => { responseBody = JSON.parse(data) }
    }

    await handler(req, res)

    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(responseBody).toEqual({ ok: true })
  })

  it('returns empty list if search query is shorter than 2 characters', async () => {
    let responseBody = null
    const req = { method: 'GET', url: '/api/zefix?search=a' }
    const res = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => { responseBody = JSON.parse(data) }
    }

    await handler(req, res)
    expect(responseBody).toEqual({ list: [] })
  })

  it('formats company items and handles 404 from upstream as empty list', async () => {
    const origFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({})
    })

    let responseBody = null
    const req = { method: 'GET', url: '/api/zefix?search=nonexistentxyz' }
    const res = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => { responseBody = JSON.parse(data) }
    }

    await handler(req, res)
    expect(responseBody).toEqual({ list: [], total: 0 })

    global.fetch = origFetch
  })
})
