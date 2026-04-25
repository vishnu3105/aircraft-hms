import React, { useRef, useEffect, useState } from 'react';

const FRAME_COUNT = 79;

const CanvasSequence = ({ scrollProgress }) => {
  const canvasRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Preload images
  useEffect(() => {
    const loadedImages = [];
    let loadedCount = 0;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `/frames/jet engine.realesrgan.1_${frameNum}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          setLoaded(true);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  // Draw frame on canvas based on progress
  useEffect(() => {
    if (!loaded || !canvasRef.current || images.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // progress is 0 to 1
    const frameIndex = Math.min(
      FRAME_COUNT - 1, 
      Math.max(0, Math.floor(scrollProgress * (FRAME_COUNT - 1)))
    );

    const img = images[frameIndex];
    if (!img) return;

    let cw = canvas.width;
    let ch = canvas.height;
    
    const imgRatio = img.width / img.height;
    const canvasRatio = cw / ch;
    
    let drawWidth = cw;
    let drawHeight = ch;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      drawHeight = ch;
      drawWidth = ch * imgRatio;
      offsetX = (cw - drawWidth) / 2;
    } else {
      drawWidth = cw;
      drawHeight = cw / imgRatio;
      offsetY = (ch - drawHeight) / 2;
    }

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  }, [scrollProgress, loaded, images]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
    />
  );
};

export default CanvasSequence;
