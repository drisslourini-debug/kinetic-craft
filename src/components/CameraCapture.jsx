import React, { useState, useRef, useEffect, useCallback } from 'react'

export default function CameraCapture({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [isFlashing, setIsFlashing] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode } 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Camera access error:', err)
      setErrorMsg('Kamera nicht verfügbar. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.')
    }
  }, [facingMode, stopCamera])

  useEffect(() => {
    if (isOpen) {
      // Check if mobile or desktop roughly
      if (!/Mobi|Android/i.test(navigator.userAgent)) {
        // Just a friendly message, but still try to open it
        // We'll show this in a small banner or just rely on the error if they don't have a webcam.
      }
      startCamera()
    } else {
      stopCamera()
      setPhotoBlob(null)
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl)
        setPhotoUrl(null)
      }
    }
    return () => stopCamera()
  }, [isOpen, startCamera, stopCamera, photoUrl])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 150)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      setPhotoBlob(blob)
      setPhotoUrl(URL.createObjectURL(blob))
    }, 'image/jpeg', 0.85)
  }

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  const handleRetake = () => {
    setPhotoBlob(null)
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl)
      setPhotoUrl(null)
    }
  }

  const handleUse = () => {
    if (photoBlob) {
      onCapture(photoBlob)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      <div className="flex-1 relative overflow-hidden flex justify-center items-center">
        {errorMsg ? (
          <div className="p-6 text-center text-white">
            <p className="mb-4">{errorMsg}</p>
            {!/Mobi|Android/i.test(navigator.userAgent) && (
              <p className="text-sm text-gray-400">Die Kamerafunktion ist für mobile Geräte optimiert.</p>
            )}
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white text-black font-semibold rounded-full mt-4"
            >
              Schliessen
            </button>
          </div>
        ) : (
          <>
            {!photoBlob ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isFlashing && (
                  <div className="absolute inset-0 bg-white opacity-75 z-10 transition-opacity duration-150 pointer-events-none" />
                )}
                
                {/* Top Controls */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
                  <button 
                    onClick={handleSwitchCamera}
                    className="p-3 bg-black/40 rounded-full text-white backdrop-blur-sm"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={onClose}
                    className="p-3 bg-black/40 rounded-full text-white backdrop-blur-sm"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Capture Button */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                  <button 
                    onClick={handleCapture}
                    className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 shadow-xl active:scale-95 transition-transform flex items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-gray-200"></div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <img src={photoUrl} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent z-20">
                  <button 
                    onClick={handleRetake}
                    className="px-6 py-3 bg-white/20 text-white font-semibold rounded-xl backdrop-blur-sm"
                  >
                    Wiederholen
                  </button>
                  <button 
                    onClick={handleUse}
                    className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl"
                  >
                    Verwenden
                  </button>
                </div>
              </>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
