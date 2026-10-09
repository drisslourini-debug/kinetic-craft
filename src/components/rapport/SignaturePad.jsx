import { useState, useRef, useEffect, useCallback } from 'react'
import { IconClose, IconDigitalSignature } from '../icons/BrandIcons'

export default function SignaturePad({
  onSignatureChange,
  initialName = '',
  initialSignature = null,
  disabled = false
}) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const isDrawingRef = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(!!initialSignature)
  const hasDrawnRef = useRef(!!initialSignature)
  const [signerName, setSignerName] = useState(initialName)
  const lastPointRef = useRef(null)

  // Initialize Canvas with proper High-DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#0f172a'

    // If an initial signature exists, draw it
    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = initialSignature
    }
  }, [initialSignature])

  useEffect(() => {
    setupCanvas()
    const handleResize = () => setupCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setupCanvas])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    if (disabled) return
    e.preventDefault()
    try {
      e.target?.setPointerCapture?.(e.pointerId)
    } catch {
      // ignore
    }
    isDrawingRef.current = true
    setIsDrawing(true)
    const coords = getCoordinates(e)
    lastPointRef.current = coords

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, 1, 0, Math.PI * 2)
      ctx.fill()
      hasDrawnRef.current = true
      if (!hasDrawn) {
        setHasDrawn(true)
      }
    }
  }

  const draw = (e) => {
    if (!isDrawingRef.current || disabled) return
    e.preventDefault()
    const coords = getCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && lastPointRef.current) {
      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      lastPointRef.current = coords
      hasDrawnRef.current = true
      if (!hasDrawn) {
        setHasDrawn(true)
      }
    }
  }

  const stopDrawing = (e) => {
    if (!isDrawingRef.current) return
    try {
      if (e?.pointerId && e?.target?.releasePointerCapture) {
        e.target.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignore
    }
    isDrawingRef.current = false
    setIsDrawing(false)
    lastPointRef.current = null
    emitSignature(hasDrawnRef.current)
  }

  const emitSignature = (forceHasDrawn) => {
    const isSigned = forceHasDrawn !== undefined ? forceHasDrawn : hasDrawnRef.current
    if (!canvasRef.current || !isSigned) return
    const signatureData = canvasRef.current.toDataURL('image/png')
    if (onSignatureChange) {
      onSignatureChange({
        signatureData,
        signerName,
        hasSignature: true
      })
    }
  }

  const handleClear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      hasDrawnRef.current = false
      setHasDrawn(false)
      if (onSignatureChange) {
        onSignatureChange({
          signatureData: null,
          signerName,
          hasSignature: false
        })
      }
    }
  }

  const handleNameChange = (e) => {
    const val = e.target.value
    setSignerName(val)
    if (onSignatureChange && canvasRef.current && hasDrawnRef.current) {
      onSignatureChange({
        signatureData: canvasRef.current.toDataURL('image/png'),
        signerName: val,
        hasSignature: true
      })
    }
  }

  return (
    <div className="space-y-3">
      {/* Signer Name Input */}
      <div>
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
          Name des Kunden / Bauherrn (Druckbuchstaben)
        </label>
        <input
          type="text"
          disabled={disabled}
          value={signerName}
          onChange={handleNameChange}
          placeholder="z. B. Beat Meier"
          className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-hidden focus:border-sky-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Signature Canvas Box */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Unterschrift (mit Finger oder Stift)
          </label>
          {!disabled && hasDrawn && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer flex items-center gap-1"
            >
              <IconClose className="w-3.5 h-3.5" />
              <span>Unterschrift löschen</span>
            </button>
          )}
        </div>

        <div className="relative border-2 border-dashed border-border rounded-2xl bg-white overflow-hidden touch-none select-none overscroll-contain h-44 flex flex-col justify-end">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
            className={`w-full h-full cursor-crosshair select-none touch-none ${disabled ? 'pointer-events-none' : ''}`}
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          />

          {/* Guidelines and footer inside the canvas box */}
          <div className="absolute inset-x-4 bottom-3 border-t border-neutral-200 flex items-center justify-between pt-1 pointer-events-none text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <IconDigitalSignature className="w-3.5 h-3.5 text-neutral-300" />
              <span>Hier unterschreiben</span>
            </span>
            <span>{new Date().toLocaleDateString('de-CH')}</span>
          </div>

          {!hasDrawn && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-neutral-300 font-medium text-sm flex items-center gap-1.5">
                <IconDigitalSignature className="w-4 h-4 text-neutral-300" />
                <span>Bitte hier mit Finger oder Stift signieren</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
