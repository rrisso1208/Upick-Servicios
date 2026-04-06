/**
 * Image Adjuster Component - Allows adjusting image position and scale
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ImageAdjusterProps {
  imageUrl: string;
  initialPosition?: string; // CSS object-position (e.g., "center", "50% 30%")
  initialScale?: number; // Scale factor (1.0 = 100%)
  onPositionChange?: (position: string) => void;
  onScaleChange?: (scale: number) => void;
  containerWidth?: number;
  containerHeight?: number;
}

export function ImageAdjuster({
  imageUrl,
  initialPosition = 'center',
  initialScale = 1.0,
  onPositionChange,
  onScaleChange,
  containerWidth = 400,
  containerHeight = 300,
}: ImageAdjusterProps) {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    posX: 50,
    posY: 50,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Parse position string to x, y percentages
  const parsePosition = (pos: string): { x: number; y: number } => {
    if (pos === 'center') return { x: 50, y: 50 };
    if (pos === 'top') return { x: 50, y: 0 };
    if (pos === 'bottom') return { x: 50, y: 100 };
    if (pos === 'left') return { x: 0, y: 50 };
    if (pos === 'right') return { x: 100, y: 50 };
    if (pos === 'top left') return { x: 0, y: 0 };
    if (pos === 'top right') return { x: 100, y: 0 };
    if (pos === 'bottom left') return { x: 0, y: 100 };
    if (pos === 'bottom right') return { x: 100, y: 100 };

    // Parse "50% 30%" format
    const parts = pos.split(' ');
    if (parts.length === 2) {
      const x = parseFloat(parts[0].replace('%', '')) || 50;
      const y = parseFloat(parts[1].replace('%', '')) || 50;
      return { x, y };
    }

    return { x: 50, y: 50 };
  };

  const [pos, setPos] = useState(parsePosition(position));

  useEffect(() => {
    setPos(parsePosition(position));
  }, [position]);

  useEffect(() => {
    setPosition(initialPosition);
    setScale(initialScale);
  }, [initialPosition, initialScale]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    const newPos = {
      x: Math.max(0, Math.min(100, dragStart.posX + deltaX)),
      y: Math.max(0, Math.min(100, dragStart.posY + deltaY)),
    };

    setPos(newPos);
    const newPosition = `${newPos.x.toFixed(1)}% ${newPos.y.toFixed(1)}%`;
    setPosition(newPosition);
    onPositionChange?.(newPosition);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(3.0, scale + 0.1);
    setScale(newScale);
    onScaleChange?.(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.5, scale - 0.1);
    setScale(newScale);
    onScaleChange?.(newScale);
  };

  const handleZoomChange = (value: number) => {
    const newScale = Math.min(3.0, Math.max(0.5, value));
    setScale(newScale);
    onScaleChange?.(newScale);
  };

  const handleReset = () => {
    setPosition('center');
    setScale(1.0);
    setPos({ x: 50, y: 50 });
    onPositionChange?.('center');
    onScaleChange?.(1.0);
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ width: containerWidth, height: containerHeight }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Preview"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            objectPosition: position,
            transform: `scale(${scale})`,
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
          draggable={false}
        />

        {/* Position indicator */}
        <div
          className="pointer-events-none absolute z-10 h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow-lg"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
            title="Alejar"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[60px] text-center text-sm text-gray-600">
            {(scale * 100).toFixed(0)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
            title="Acercar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <input
          type="range"
          min={0.5}
          max={3.0}
          step={0.01}
          value={scale}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 sm:w-48"
          aria-label="Zoom"
        />

        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Resetear
        </button>
      </div>

      <div className="text-xs text-gray-500">
        <p>Haz clic y arrastra en la imagen para ajustar la posición</p>
        <p>Usa el zoom para ver la imagen completa o acercar detalles</p>
      </div>
    </div>
  );
}
