import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

/**
 * Camera-based QR scanner.
 * Calls onScan(parsed, rawString) on the first successful decode then stops.
 * Call the reset() function returned by the component to scan again.
 */
export default function QRScanner({ onScan, className = '' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | requesting | scanning | denied | unsupported

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code) {
      stopStream();
      let parsed;
      try { parsed = JSON.parse(code.data); } catch { parsed = { raw: code.data }; }
      onScan(parsed, code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onScan, stopStream]);

  const startCamera = useCallback(async () => {
    stopStream();
    setState('requesting');
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setState('scanning');
          rafRef.current = requestAnimationFrame(tick);
        };
      }
    } catch {
      setState('denied');
    }
  }, [stopStream, tick]);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        className="w-full block"
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder overlay — only shown while scanning */}
      {state === 'scanning' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-56 h-56">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-amber rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-amber rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-amber rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-amber rounded-br-xl" />
            {/* Scanning line */}
            <div className="absolute left-2 right-2 h-0.5 bg-amber/70 animate-bounce" style={{ top: '50%' }} />
          </div>
          <p className="absolute bottom-4 text-white/70 text-xs font-medium tracking-wide">
            Point camera at QR code
          </p>
        </div>
      )}

      {/* Requesting */}
      {state === 'requesting' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Camera className="w-10 h-10 text-amber animate-pulse" />
          <p className="text-white text-sm">Requesting camera access…</p>
        </div>
      )}

      {/* Denied */}
      {state === 'denied' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <CameraOff className="w-10 h-10 text-red-400" />
          <p className="text-white text-sm font-medium">Camera access denied</p>
          <p className="text-white/60 text-xs">Allow camera access in your browser settings then try again.</p>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 bg-amber text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}

      {/* Unsupported */}
      {state === 'unsupported' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <CameraOff className="w-10 h-10 text-muted-foreground" />
          <p className="text-white text-sm">Camera not supported in this browser.</p>
          <p className="text-white/60 text-xs">Use Chrome or Safari on a mobile device to scan QR codes.</p>
        </div>
      )}
    </div>
  );
}
