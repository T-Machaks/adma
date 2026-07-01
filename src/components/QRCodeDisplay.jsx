import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Share2, Download, Copy, Check } from 'lucide-react';
import { useRef, useState } from 'react';

export default function QRCodeDisplay({ value, label, sublabel, size = 200, logo_url = null, compact = false }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const [copied, setCopied]   = useState(false);
  const [sharing, setSharing] = useState(false);

  const filename = (label || 'qr').replace(/\s+/g, '-').toLowerCase();

  // Render QR to PNG blob via hidden canvas
  const getPngBlob = () => new Promise((resolve) => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return resolve(null);
    canvas.toBlob(resolve, 'image/png');
  });

  const handleDownload = async () => {
    const blob = await getPngBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.png`; a.click();
      URL.revokeObjectURL(url);
    } else {
      // fallback: download SVG
      const svg = wrapRef.current?.querySelector('svg');
      if (!svg) return;
      const sblob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(sblob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.svg`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    setSharing(true);
    try {
      const shareData = { title: label || 'QR Code', url: value };

      // Try to attach the PNG image so recipients can download it directly
      const blob = await getPngBlob();
      if (blob) {
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          shareData.files = [file];
        }
      }

      await navigator.share(shareData);
    } catch {
      // user cancelled or not supported
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Visible QR (SVG for display) */}
      <div ref={wrapRef} className="bg-white p-4 rounded-2xl shadow-sm border border-border relative">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          imageSettings={logo_url ? { src: logo_url, width: size * 0.2, height: size * 0.2, excavate: true } : undefined}
        />
      </div>

      {/* Hidden canvas for PNG export */}
      <div ref={canvasRef} className="hidden">
        <QRCodeCanvas
          value={value}
          size={size * 2}
          level="M"
          imageSettings={logo_url ? { src: logo_url, width: size * 0.4, height: size * 0.4, excavate: true } : undefined}
        />
      </div>

      {!compact && label && (
        <p className="font-heading font-bold text-sm text-center tracking-wide">{label}</p>
      )}
      {!compact && sublabel && (
        <p className="text-xs text-muted-foreground text-center leading-snug">{sublabel}</p>
      )}

      {!compact && (
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors active:scale-95"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors active:scale-95"
          >
            <Download className="w-3 h-3" /> Download
          </button>
        </div>
      )}
    </div>
  );
}
