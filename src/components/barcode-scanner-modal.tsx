'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Camera, Upload, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface BarcodeScannerModalProps {
    isOpen: boolean
    onClose: () => void
    onScan: (barcode: string) => void
    variantIndex: number
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan, variantIndex }: BarcodeScannerModalProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const processingRef = useRef(false)
    const lastDetectionRef = useRef<string | null>(null)
    const captureIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const autoCaptureRAFRef = useRef<number | null>(null)
    const lastFrameTimeRef = useRef<number>(0)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera')
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [manualInput, setManualInput] = useState('')
    const [uploadPreview, setUploadPreview] = useState<string | null>(null)

    // Effect to start camera when isCameraActive becomes true
    useEffect(() => {
        if (isCameraActive && videoRef.current) {
            const startCameraStream = async () => {
                try {
                    console.log('Starting camera stream...')
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    })
                    
                    console.log('Camera stream acquired:', stream)
                    
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream
                        streamRef.current = stream
                        toast.success('Camera ready - auto-scanning...')
                        
                        // Start auto-scanning after camera is ready
                        startAutoCapture()
                    }
                } catch (error: any) {
                    console.error('Camera error:', error)
                    setIsCameraActive(false)
                    toast.error('Camera access denied. Check permissions.')
                }
            }
            
            startCameraStream()
        }
    }, [isCameraActive])

    // Auto-capture frames from camera using requestAnimationFrame for speed
    const startAutoCapture = () => {
        const FRAME_INTERVAL = 120 // ms between processing attempts (~8 FPS)

        const loop = async (now: number) => {
            if (!isCameraActive || !videoRef.current || !canvasRef.current) {
                autoCaptureRAFRef.current = null
                return
            }

            // Check if video is ready
            if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
                autoCaptureRAFRef.current = requestAnimationFrame(loop)
                return
            }

            // Throttle processing to FRAME_INTERVAL
            if (now - lastFrameTimeRef.current >= FRAME_INTERVAL && !processingRef.current) {
                lastFrameTimeRef.current = now
                try {
                    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })
                    if (ctx) {
                        // Set canvas to video dimensions
                        const targetWidth = 800
                        const targetHeight = Math.round((videoRef.current.videoHeight / videoRef.current.videoWidth) * targetWidth)
                        canvasRef.current.width = targetWidth
                        canvasRef.current.height = targetHeight
                        
                        // Draw video frame to canvas
                        ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight)

                        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.7)
                        await processBarcode(imageData)
                    }
                } catch (err) {
                    console.error('Auto-capture (RAF) error:', err)
                }
            }

            autoCaptureRAFRef.current = requestAnimationFrame(loop)
        }

        if (!autoCaptureRAFRef.current) {
            autoCaptureRAFRef.current = requestAnimationFrame(loop)
        }
    }

    // Manual capture from camera
    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) {
            toast.error('Camera not ready')
            return
        }

        const context = canvasRef.current.getContext('2d')
        if (!context) return

        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)

        toast.loading('Scanning barcode...')
        const imageData = canvasRef.current.toDataURL('image/png')
        await processBarcode(imageData)
    }

    // Start camera - just toggle the state, useEffect will handle the stream
    const startCamera = async () => {
        try {
            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
            
            console.log('Start camera clicked')
            setIsCameraActive(true)
        } catch (error: any) {
            console.error('Error starting camera:', error)
            toast.error('Error starting camera')
        }
    }

    // Stop camera
    const stopCamera = () => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current)
            captureIntervalRef.current = null
        }
        if (autoCaptureRAFRef.current) {
            cancelAnimationFrame(autoCaptureRAFRef.current)
            autoCaptureRAFRef.current = null
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            setIsCameraActive(false)
        }
    }

    // Process image for barcode using ZXing - ULTRA FAST & RELIABLE
    const processBarcode = async (imageSource: string) => {
        // Prevent concurrent processing
        if (processingRef.current) return
        processingRef.current = true

        try {
            const { BrowserMultiFormatReader, DecodeHintType } = await import('@zxing/library')
            
            const codeReader = new BrowserMultiFormatReader()
            const hints = new Map()
            hints.set(DecodeHintType.TRY_HARDER, true)
            hints.set(DecodeHintType.PURE_BARCODE, false)
            
            // Create image element from data URL
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = async () => {
                try {
                    const result = await codeReader.decodeFromImageElement(img)
                    processingRef.current = false
                    
                    if (result && result.getText()) {
                        const scannedCode = result.getText()
                        
                        // Prevent duplicate detections
                        if (scannedCode === lastDetectionRef.current) return
                        lastDetectionRef.current = scannedCode
                        
                        console.log('⚡ ZXing detected:', scannedCode, 'Format:', result.getBarcodeFormat())
                        onScan(scannedCode)
                        toast.success(`✅ ${scannedCode}`)
                        stopCamera()
                        onClose()
                    } else {
                        toast.error('No barcode detected. Try with clearer image.')
                    }
                } catch (error) {
                    processingRef.current = false
                    console.log('ZXing detection failed, trying preprocessing...')
                    quickPreprocess(imageSource)
                }
            }
            
            img.onerror = () => {
                processingRef.current = false
                toast.error('Failed to load image')
            }
            
            img.src = imageSource
        } catch (error) {
            processingRef.current = false
            console.error('ZXing setup error:', error)
            toast.error('Barcode processing failed')
        }
    }

    // Ultra-fast preprocessing for difficult barcodes
    const quickPreprocess = async (imageSource: string) => {
        try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = async () => {
                const canvas = document.createElement('canvas')
                canvas.width = 1200
                canvas.height = (1200 * img.height) / img.width
                const ctx = canvas.getContext('2d')
                
                if (!ctx) {
                    processingRef.current = false
                    return
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                
                // Apply contrast enhancement
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const data = imageData.data

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i]
                    const g = data[i + 1]
                    const b = data[i + 2]
                    
                    const gray = r * 0.299 + g * 0.587 + b * 0.114
                    const bw = gray > 128 ? 255 : 0
                    
                    data[i] = bw
                    data[i + 1] = bw
                    data[i + 2] = bw
                }

                ctx.putImageData(imageData, 0, 0)
                const preprocessedImg = new Image()
                preprocessedImg.crossOrigin = 'anonymous'
                
                preprocessedImg.onload = async () => {
                    try {
                        const { BrowserMultiFormatReader } = await import('@zxing/library')
                        const codeReader = new BrowserMultiFormatReader()
                        const result = await codeReader.decodeFromImageElement(preprocessedImg)
                        processingRef.current = false
                        
                        if (result && result.getText()) {
                            const scannedCode = result.getText()
                            if (scannedCode !== lastDetectionRef.current) {
                                lastDetectionRef.current = scannedCode
                                console.log('⚡ Preprocessed barcode detected:', scannedCode)
                                onScan(scannedCode)
                                toast.success(`✅ ${scannedCode}`)
                                stopCamera()
                                onClose()
                            }
                        }
                    } catch {
                        processingRef.current = false
                        toast.error('No barcode found. Try with clearer image.')
                    }
                }
                
                preprocessedImg.src = canvas.toDataURL('image/jpeg', 0.9)
            }
            
            img.onerror = () => {
                processingRef.current = false
                toast.error('Failed to load image')
            }
            
            img.src = imageSource
        } catch {
            processingRef.current = false
        }
    }

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file is an image
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        const reader = new FileReader()
        reader.onerror = () => {
            toast.error('Error reading file')
        }
        reader.onload = async (event) => {
            const imageData = event.target?.result as string
            setUploadPreview(imageData)
            
            // Process immediately - ZXing is instant!
            await processBarcode(imageData)
        }
        reader.readAsDataURL(file)
    }

    // Handle manual entry
    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            onScan(manualInput)
            toast.success(`Barcode entered: ${manualInput}`)
            setManualInput('')
            onClose()
        }
    }

    // Cleanup on close
    useEffect(() => {
        if (!isOpen) {
            stopCamera()
            setUploadPreview(null)
            setManualInput('')
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">Scan Barcode</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex gap-2 p-4 border-b dark:border-gray-700">
                    <Button
                        variant={mode === 'camera' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setMode('camera')
                            stopCamera()
                        }}
                        className="flex-1"
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Camera
                    </Button>
                    <Button
                        variant={mode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setMode('upload')
                            stopCamera()
                        }}
                        className="flex-1"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                    </Button>
                    <Button
                        variant={mode === 'manual' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setMode('manual')
                            stopCamera()
                        }}
                        className="flex-1"
                    >
                        <Type className="h-4 w-4 mr-2" />
                        Manual
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Camera Mode */}
                    {mode === 'camera' && (
                        <div className="space-y-4">
                            {!isCameraActive ? (
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Click to start camera
                                    </p>
                                    <Button onClick={startCamera} className="w-full">
                                        Start Camera
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Video Container - FIXED HEIGHT */}
                                    <div style={{ 
                                        position: 'relative',
                                        width: '100%',
                                        height: '300px',
                                        backgroundColor: '#000',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '2px solid #333'
                                    }}>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                        {/* Focus Guide */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '200px',
                                            height: '120px',
                                            border: '2px solid lime',
                                            borderRadius: '4px',
                                            pointerEvents: 'none'
                                        }} />
                                    </div>

                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        Position barcode in frame - auto-scanning...
                                    </p>

                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={stopCamera}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Stop
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>
                    )}

                    {/* Upload Mode */}
                    {mode === 'upload' && (
                        <div className="space-y-4">
                            <label className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Click to upload image
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    or drag and drop
                                </p>
                            </label>

                            {uploadPreview && (
                                <div className="mt-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                                    <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <img
                                            src={uploadPreview}
                                            alt="Barcode preview"
                                            className="w-full h-auto max-h-64 object-contain"
                                            style={{ maxHeight: '200px' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Mode */}
                    {mode === 'manual' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                                    Enter Barcode
                                </label>
                                <Input
                                    type="text"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                                    placeholder="e.g., 3614270053124"
                                    autoFocus
                                    className="text-lg font-mono"
                                />
                            </div>
                            <Button onClick={handleManualSubmit} className="w-full">
                                Confirm Barcode
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Button onClick={onClose} variant="outline" className="w-full">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    )
}
