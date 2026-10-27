import { useEffect, useRef } from "react";

export function HexagonGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const hexSize = 30;
    const hexHeight = hexSize * Math.sqrt(3);
    const hexagons: Array<{
      x: number;
      y: number;
      opacity: number;
      pulseSpeed: number;
      color: string;
    }> = [];

    // Create hexagon grid
    for (let y = 0; y < canvas.height + hexHeight; y += hexHeight * 0.75) {
      for (let x = 0; x < canvas.width + hexSize * 2; x += hexSize * 1.5) {
        const offsetX = (Math.floor(y / (hexHeight * 0.75)) % 2) * hexSize * 0.75;
        hexagons.push({
          x: x + offsetX,
          y: y,
          opacity: Math.random() * 0.1,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          color: Math.random() > 0.5 ? '#10b981' : '#22d3ee',
        });
      }
    }

    const drawHexagon = (x: number, y: number, size: number, opacity: number, color: string) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Occasional fill
      if (opacity > 0.08) {
        ctx.fillStyle = `${color}${Math.floor(opacity * 40).toString(16).padStart(2, '0')}`;
        ctx.fill();
      }
    };

    let time = 0;

    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      hexagons.forEach((hex, index) => {
        // Pulse effect
        hex.opacity = Math.abs(Math.sin(time + index * 0.1) * 0.15);

        // Random flicker
        if (Math.random() > 0.995) {
          hex.opacity = Math.random() * 0.3;
        }

        drawHexagon(hex.x, hex.y, hexSize, hex.opacity, hex.color);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.3 }}
    />
  );
}
