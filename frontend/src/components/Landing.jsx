import { useEffect, useRef, useState, useMemo } from 'react';
import './Landing.css';

export default function Landing() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  
  const frameCount = 192;
  const currentFrame = (index) => (
    `/scroll-frames/_MConverter.eu_Whisk_ygo4ugmlrdmhjwnl1sz0qwytgjn0qtlzqmmh1yn-${index}.png`
  );

// JIT Frame loading system to prevent 6 Gigabytes of VRAM consumption
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const container = containerRef.current;

    const render = (img) => {
      const hRatio = canvas.width / img.naturalWidth;
      const vRatio = canvas.height / img.naturalHeight;
      const ratio = Math.max(hRatio, vRatio);
      const centerShift_x = (canvas.width - img.naturalWidth * ratio) / 2;
      const centerShift_y = (canvas.height - img.naturalHeight * ratio) / 2;  
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        img, 
        0, 0, img.naturalWidth, img.naturalHeight,
        centerShift_x, centerShift_y, img.naturalWidth * ratio, img.naturalHeight * ratio
      );
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Paint first frame immediately
      const firstImg = new Image();
      firstImg.src = currentFrame(1);
      firstImg.onload = () => render(firstImg);
      setImagesPreloaded(true);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let currentDrawIndex = -1;

    const handleScroll = () => {
      if (!container) return;
      const { top, height } = container.getBoundingClientRect();
      const scrollPosition = -top;
      const maxScroll = height - window.innerHeight;
      
      let scrollFraction = scrollPosition / maxScroll;
      if (scrollFraction < 0) scrollFraction = 0;
      if (scrollFraction > 1) scrollFraction = 1;
      
      const targetIndex = Math.max(1, Math.floor(scrollFraction * frameCount));
      
      // Prevent redundant fetches
      if (targetIndex !== currentDrawIndex) {
        currentDrawIndex = targetIndex;
        // JIT (Just in Time) Canvas Hydration. Browser Disk-Cache handles speed natively.
        const jitImg = new Image();
        jitImg.src = currentFrame(targetIndex);
        jitImg.onload = () => requestAnimationFrame(() => render(jitImg));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="landing-container" ref={containerRef}>
      <div className="sticky-wrapper">
        <canvas ref={canvasRef} className="scroll-canvas" />
        <div className="overlay-gradient" />
      </div>
    </div>
  );
}
