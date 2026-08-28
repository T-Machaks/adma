import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ImagePositioner from './ImagePositioner';
import { cropImageToBlob } from '@/lib/imageUtils';

// Pre-upload crop step: lets the user pick which part of a just-selected photo to
// keep, reusing ImagePositioner's drag-to-pan interface (already familiar from the
// booth image "Adjust Position" flow) but baking the chosen position into an actual
// cropped file via cropImageToBlob before it's ever uploaded — not just a
// display-time CSS trick applied to the full original.
export default function ImageCropModal({ file, targetWidth = 1200, targetHeight = 675, aspectClassName = 'aspect-video', format = 'image/jpeg', quality = 0.85, onConfirm, onCancel }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      // A fresh Image() rather than reading ImagePositioner's own <img> — its element
      // is scaled for display, and this needs naturalWidth/naturalHeight at full
      // resolution for the crop math. Already in the browser's cache from
      // ImagePositioner loading the same objectUrl, so this resolves near-instantly.
      const img = new window.Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.src = objectUrl;
      });
      const blob = await cropImageToBlob(img, targetWidth, targetHeight, pos.x, pos.y, format, quality);
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
        {objectUrl && <ImagePositioner src={objectUrl} value={pos} onChange={setPos} aspectClassName={aspectClassName} />}
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
