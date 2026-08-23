import { useEffect, useRef } from 'react';

const COLORS = ['#d6336c', '#ff6fa8', '#0d8f7d', '#3ddbc4', '#c98a1f', '#ffc768'];

export default function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.5,
      size: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 8
    }));

    let frame;
    let elapsed = 0;
    const DURATION = 2600;

    function tick() {
      elapsed += 16;
      ctx.clearRect(0, 0, width, height);
      for (const p of pieces) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (elapsed < DURATION) {
        frame = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }
    frame = requestAnimationFrame(tick);

    function onResize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}
