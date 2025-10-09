import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageViewerModalProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  isOpen: boolean;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  currentIndex,
  onClose,
  isOpen
}) => {
  const [index, setIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const startPosRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset transformations when image changes
  useEffect(() => {
    setIndex(currentIndex);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [currentIndex]);

  // Handle image preloading
  useEffect(() => {
    if (isOpen && images[index]) {
      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => setIsLoading(false);
      img.src = images[index];
    }
  }, [isOpen, images, index]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft': handlePrevious(); break;
        case 'ArrowRight': handleNext(); break;
        case 'Escape': onClose(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePrevious = useCallback(() => {
    setIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  }, [images.length]);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (scale === 1) return;
    setIsDragging(true);
    
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    
    startPosRef.current = {
      x: pos.x - position.x,
      y: pos.y - position.y
    };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    
    setPosition({
      x: pos.x - startPosRef.current.x,
      y: pos.y - startPosRef.current.y
    });
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[index];
    link.download = `image-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="image-viewer-modal" 
      onClick={onClose}
      ref={modalRef}
    >
      <div 
        className="image-viewer-content"
        onClick={e => e.stopPropagation()}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <div className="modal-header1">
          <span className="image-counter">
            {images.length > 1 ? `${index + 1} / ${images.length}` : ''}
          </span>
          <div className="controls-group">
            <button className="control-button" onClick={handleDownload}>
              <Download size={20} />
            </button>
            <button 
              className="control-button" 
              onClick={() => handleZoom(-0.1)}
              disabled={scale <= 0.5}
            >
              <ZoomOut size={20} />
            </button>
            <button 
              className="control-button" 
              onClick={() => handleZoom(0.1)}
              disabled={scale >= 3}
            >
              <ZoomIn size={20} />
            </button>
            <button className="control-button close-button" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button 
              className="nav-button prev" 
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button 
              className="nav-button next" 
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}

        <div className="image-container">
          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Cargando imagen...</span>
            </div>
          )}
          <img
            ref={imageRef}
            src={images[index]}
            alt={`Image ${index + 1}`}
            className={`modal-image ${isLoading ? 'loading' : ''} ${isDragging ? 'dragging' : ''}`}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              opacity: isLoading ? 0 : 1
            }}
            onLoad={() => setIsLoading(false)}
            draggable={false}
          />
        </div>

        <div className="zoom-controls">
          <span className="zoom-percentage">{Math.round(scale * 100)}%</span>
          <button 
            className="zoom-reset"
            onClick={() => {
              setScale(1);
              setRotation(0);
              setPosition({ x: 0, y: 0 });
            }}
            disabled={scale === 1 && rotation === 0 && position.x === 0 && position.y === 0}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
