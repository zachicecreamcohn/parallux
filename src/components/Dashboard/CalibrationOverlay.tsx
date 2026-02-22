import { useEffect, useRef } from 'react';

interface Props {
  width: number;
  height: number;
  currentPoint: { canvasX: number; canvasY: number } | null;
  progress: string;
}

const DOT_RADIUS = 10;
const PULSE_RADIUS = 18;

export default function CalibrationOverlay({ width, height, currentPoint, progress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!currentPoint) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const { canvasX: cx, canvasY: cy } = currentPoint;

      // Pulsing outer ring
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, PULSE_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 80, 80, ${0.4 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Solid dot
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Progress label
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(progress, cx + PULSE_RADIUS + 4, cy + 5);
      ctx.shadowBlur = 0;

      frame++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [currentPoint, width, height, progress]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}