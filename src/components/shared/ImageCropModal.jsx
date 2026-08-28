import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { cropImageToBlob } from '@/lib/imageUtils';

// Checkered backdrop so PNG transparency (a logo zoomed below cover scale, leaving
// padding around it) is visibly transparent in the preview, not just a plain color.
const TRANSPARENCY_BG = {
  backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
};

// Pre-upload crop step: lets the user pick which part of a just-selected photo to
// keep AND how zoomed in it is, baking the result into an actual cropped file via
// cropImageToBlob before it's ever uploaded — not just a display-time CSS trick
// applied to the full original.
//
// Deliberately its own pan+zoom implementation rather than reusing ImagePositioner
// (which only supports panning a fixed cover-fit image, no zoom) — ImagePositioner
// is also used standalone for live, non-destructive booth-image display positioning
// elsewhere, and changing its behavior there wasn't the goal here. Some pointer-drag
// logic is duplicated as a result; that's the accepted tradeoff for not touching a
// component something else depends on for a different purpose.
export default function ImageCropModal({ file, targetWidth = 1200, targetHeight = 675, aspectClassName = 'aspect-video', format = 'image/jpeg', quality = 0.85, onConfirm, onCancel }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [natural, setNatural] = useState(null); // { w, h } once the image has actually loaded
  const [pos, setPos] = useState({ x: 50, y: 50 });
  // null until the image loads, then defaults to cover scale (same starting point
  // as before zoom existed at all) — the person can drag it down from there to
  // reveal the whole image instead of always having edges cropped away.
  const [zoom, setZoom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const dragState = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setNatural(null);
    setZoom(null);
    setPos({ x: 50, y: 50 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleImgLoad = (e) => {
    const w = e.target.naturalWidth;
    const h = e.target.naturalHeight;
    setNatural({ w, h });
    setZoom(Math.max(targetWidth / w, targetHeight / h));
  };

  const coverScale = natural ? Math.max(targetWidth / natural.w, targetHeight / natural.h) : 1;
  const containScale = natural ? Math.min(targetWidth / natural.w, targetHeight / natural.h) : 1;
  const minZoom = containScale;
  const maxZoom = coverScale * 3;
  const effectiveZoom = zoom ?? coverScale;

  // Same percentage-of-frame math as cropImageToBlob, just expressed relative to
  // the on-screen frame's own rendered size (whatever that is) instead of the
  // final output's fixed pixel dimensions — since both share the same aspect
  // ratio, plain CSS percentages keep the preview pixel-consistent with the
  // actual crop without needing to measure the frame's real size at all.
  const imgWidthPct = natural ? (natural.w * effectiveZoom / targetWidth) * 100 : 100;
  const imgHeightPct = natural ? (natural.h * effectiveZoom / targetHeight) * 100 : 100;
  const overflowXPct = imgWidthPct - 100;
  const overflowYPct = imgHeightPct - 100;
  const leftPct = overflowXPct >= 0 ? -(overflowXPct * pos.x / 100) : (100 - imgWidthPct) / 2;
  const topPct = overflowYPct >= 0 ? -(overflowYPct * pos.y / 100) : (100 - imgHeightPct) / 2;

  const clamp = (n) => Math.max(0, Math.min(100, n));

  const handlePointerDown = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      startPosX: pos.x, startPosY: pos.y,
      width: rect.width, height: rect.height,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const { startX, startY, startPosX, startPosY, width, height } = dragState.current;
    const dxPercent = ((e.clientX - startX) / width) * 100;
    const dyPercent = ((e.clientY - startY) / height) * 100;
    setPos({ x: clamp(startPosX - dxPercent), y: clamp(startPosY - dyPercent) });
  }, []);

  const endDrag = useCallback((e) => {
    dragState.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      // A fresh Image() rather than reading the preview <img>'s own element — that
      // one's scaled for display, this needs naturalWidth/naturalHeight at full
      // resolution for the crop math. Already in the browser's cache from the
      // preview loading the same objectUrl, so this resolves near-instantly.
      const img = new window.Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.src = objectUrl;
      });
      const blob = await cropImageToBlob(img, targetWidth, targetHeight, pos.x, pos.y, format, quality, effectiveZoom);
      onConfirm(blob);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-bold">Choose what to show</h2>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        {objectUrl && (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={TRANSPARENCY_BG}
            className={`relative w-full rounded-xl overflow-hidden border border-border touch-none select-none ${aspectClassName} ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              onLoad={handleImgLoad}
              className="absolute pointer-events-none"
              style={{
                left: `${leftPct}%`, top: `${topPct}%`,
                width: `${imgWidthPct}%`, height: `${imgHeightPct}%`,
                maxWidth: 'none', maxHeight: 'none',
              }}
            />
          </div>
        )}
        {natural && (
          <div className="flex items-center gap-2 mt-2.5">
            <ZoomOut className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={(maxZoom - minZoom) / 200 || 0.001}
              value={effectiveZoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-amber h-1.5"
              aria-label="Zoom"
            />
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-1.5">Drag to reposition, use the slider to zoom in or out.</p>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !objectUrl}
            className="flex-1 py-2.5 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {busy ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Use this crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
