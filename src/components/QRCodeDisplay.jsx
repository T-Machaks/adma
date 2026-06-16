import { QRCodeSVG } from 'qrcode.react';
import { Share2, Download } from 'lucide-react';
import { useRef } from 'react';

export default function QRCodeDisplay({ value, label, sublabel, size = 200, logo_url = null }) {
  const wrapRef = useRef(null);

  const handleDownload = () => {
    const svg = wrapRef.current?.querySelector('svg');
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(label || 'qr').replace(/\s+/g, '-').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: label || 'QR Code', text: value }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={wrapRef}
        className="bg-white p-4 rounded-2xl shadow-sm border border-border relative"
      >
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          imageSettings={
            logo_url
              ? { src: logo_url, width: size * 0.2, height: size * 0.2, excavate: true }
              : undefined
          }
        />
      </div>

      {label && (
        <p className="font-heading font-bold text-sm text-center tracking-wide">{label}</p>
      )}
      {sublabel && (
        <p className="text-xs text-muted-foreground text-center leading-snug">{sublabel}</p>
      )}

      <div className="flex gap-2">
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors active:scale-95"
          >
            <Share2 className="w-3 h-3" /> Share
          </button>
        )}
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors active:scale-95"
        >
          <Download className="w-3 h-3" /> Save
        </button>
      </div>
    </div>
  );
}
