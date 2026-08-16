import { useRef, useState, useCallback } from 'react';

// Lets the user pan a cover-fit image within its display frame by dragging, storing the
// result as an object-position percentage pair ({x, y}, 0-100 each) rather than cropping
// the file itself — non-destructive, and the original upload is untouched. The same
// stored position is applied everywhere this image renders by passing it through to a
// plain `style={{ objectPosition: ... }}` on that <img>, not just here.
export default function ImagePositioner({ src, value, onChange, aspectClassName = 'aspect-video' }) {
  const containerRef = useRef(null);
  const dragState = useRef(null);
  const [dragging, setDragging] = useState(false);
  const pos = value && typeof value.x === 'number' ? value : { x: 50, y: 50 };

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
    // Dragging right/down should reveal more of the image's left/top side — i.e. move
    // the visible window the opposite way the pointer moves, like dragging a photo
    // around under a fixed mask — so the position delta is subtracted, not added.
    const dxPercent = ((e.clientX - startX) / width) * 100;
    const dyPercent = ((e.clientY - startY) / height) * 100;
    onChange({ x: clamp(startPosX - dxPercent), y: clamp(startPosY - dyPercent) });
  }, [onChange]);

  const endDrag = useCallback((e) => {
    dragState.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative w-full rounded-xl overflow-hidden border border-border touch-none select-none ${aspectClassName} ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">Drag the image to adjust which part shows in the frame.</p>
    </div>
  );
}
