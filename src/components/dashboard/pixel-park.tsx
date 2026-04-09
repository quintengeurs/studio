"use client";

import { useEffect, useRef } from "react";

export function PixelPark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let time = 0;
    let gardenerX = 14;
    let gardenerPhase = 0;
    let apples: any[] = [];
    let leaves: any[] = [];
    let birds: any[] = [];
    let flowerGrowth = [0, 0, 0];

    // Apple positions — locked to the RIGHT tree only
    const applePositions = [
      {x: 59, y: 21}, {x: 63, y: 18}, {x: 67, y: 22},
      {x: 56, y: 25}, {x: 70, y: 24}, {x: 64, y: 29}
    ];

    for (let i = 0; i < 2; i++) {
      birds.push({ x: 10 + i * 32, y: 9 + i * 4, speed: 0.22 + Math.random() * 0.12, bob: 0 });
    }

    function resizeCanvas() {
      if (!canvas || !containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      canvas.width = Math.floor(containerWidth / 3);
      canvas.height = 60;
    }

    function drawBackground() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;

      // Lawn
      ctx.fillStyle = '#c8e0c0';
      ctx.fillRect(0, 52, w, 8);

      // Left tree
      ctx.fillStyle = '#8ab88a';
      ctx.fillRect(4, 15, 7, 33);
      ctx.fillStyle = '#a8d0a8';
      ctx.fillRect(1, 10, 13, 12);
      ctx.fillRect(0, 16, 16, 10);

      // Right apple tree
      const rightX = w - 20;
      ctx.fillStyle = '#8ab88a';
      ctx.fillRect(rightX, 18, 7, 30);
      ctx.fillStyle = '#a8d0a8';
      ctx.fillRect(rightX - 6, 11, 16, 13);
      ctx.fillRect(rightX - 8, 17, 19, 11);

      // Shrubs
      ctx.fillStyle = '#9ac89a';
      ctx.fillRect(18, 41, 12, 13);
      if (w > 240) ctx.fillRect(w - 33, 40, 13, 14);

      // Bench - positioned under the right apple tree
      const benchX = w - 29;
      ctx.fillStyle = '#d4b88a';
      ctx.fillRect(benchX, 44, 14, 3);           // seat
      ctx.fillRect(benchX + 1, 41, 2, 9);        // legs
      ctx.fillRect(benchX + 11, 41, 2, 9);
      ctx.fillStyle = '#b89a6a';
      ctx.fillRect(benchX - 1, 43, 16, 2);
    }

    function drawGardener() {
      if (!ctx) return;
      const phase = Math.floor(gardenerPhase);
      let gx = gardenerX;
      let gy = (phase === 3) ? 41 : 46;   // on lawn

      // Hat
      ctx.fillStyle = '#f0d8a0';
      ctx.fillRect(gx + 1, gy, 5, 2);
      ctx.fillStyle = '#e0c080';
      ctx.fillRect(gx, gy + 1, 7, 1);

      // Head
      ctx.fillStyle = '#ffe8d0';
      ctx.fillRect(gx + 2, gy + 2, 3, 3);

      // Body
      ctx.fillStyle = '#7aa87a';
      ctx.fillRect(gx + 1, gy + 5, 4, 6);

      // Legs
      ctx.fillStyle = '#4a3a28';
      ctx.fillRect(gx + 2, gy + 10, 1, 2);
      ctx.fillRect(gx + 4, gy + 10, 1, 2);

      if (phase === 1 || phase === 4 || phase === 6) { // Watering
        ctx.fillStyle = '#b0d8f0';
        ctx.fillRect(gx + 6, gy + 6, 4, 2);
      } 
      else if (phase === 5) { // Raking
        const rakeMove = Math.sin(time / 5) * 1.5;
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(gx + 6 + rakeMove, gy + 5, 1, 7);
        ctx.fillStyle = '#a87848';
        ctx.fillRect(gx + 4 + rakeMove, gy + 11, 5, 1);
      }
    }

    function drawFlowers() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const g = flowerGrowth;

      // Left flower
      ctx.fillStyle = '#9ac89a';
      ctx.fillRect(18, 49 - g[0]*2, 1, 5 + g[0]*2);
      ctx.fillStyle = '#f8b0c8';
      ctx.fillRect(17, 47 - g[0]*3, 3, 3);

      // Middle flower
      if (w > 40) {
        ctx.fillStyle = '#9ac89a';
        ctx.fillRect(56, 49 - g[1]*2, 1, 5 + g[1]*2);
        ctx.fillStyle = '#f0e0a0';
        ctx.fillRect(55, 47 - g[1]*3, 3, 3);
      }
      
      // Secondary middle flower
      if (w > 40) {
        ctx.fillStyle = '#9ac89a';
        ctx.fillRect(66, 49 - g[1]*2, 1, 5 + g[1]*2);
        ctx.fillStyle = '#f0e0a0';
        ctx.fillRect(65, 47 - g[1]*3, 3, 3);
      }

      // Right flower (near bench)
      if (w > 40) {
        ctx.fillStyle = '#9ac89a';
        ctx.fillRect(w - 36, 49 - g[2]*2, 1, 5 + g[2]*2);
        ctx.fillStyle = '#e8c0d8';
        ctx.fillRect(w - 37, 47 - g[2]*3, 3, 3);
      }
    }

    function updateFlowers() {
      for (let i = 0; i < flowerGrowth.length; i++) {
        flowerGrowth[i] = Math.min(1, flowerGrowth[i] + 0.0014);
      }
    }

    function updateApples() {
      if (apples.length < 3 && Math.random() < 0.005) {
        const pos = applePositions[Math.floor(Math.random() * applePositions.length)];
        apples.push({ x: pos.x, y: pos.y, onTree: true, timer: 240 + Math.random() * 160 });
      }

      for (let i = apples.length - 1; i >= 0; i--) {
        const a = apples[i];
        if (a.onTree) {
          a.timer--;
          if (a.timer <= 0) a.onTree = false;
        } else {
          a.y += 1.6;
          if (a.y > 52) {
            leaves.push({ x: a.x, y: 52, life: 65 });
            apples.splice(i, 1);
          }
        }
      }
    }

    function drawApples() {
      if (!ctx) return;
      for (let a of apples) {
        if (a.onTree) {
          ctx.fillStyle = '#f08070';
          ctx.fillRect(Math.floor(a.x), Math.floor(a.y), 3, 3);
        } else {
          const fade = Math.max(0.4, (52 - a.y) / 18);
          ctx.globalAlpha = fade;
          ctx.fillStyle = '#f08070';
          ctx.fillRect(Math.floor(a.x), Math.floor(a.y), 3, 3);
          ctx.globalAlpha = 1;
        }
      }
    }

    function updateLeaves() {
      for (let i = leaves.length - 1; i >= 0; i--) {
        leaves[i].life--;
        if (leaves[i].life <= 0) leaves.splice(i, 1);
      }
    }

    function drawLeaves() {
      if (!ctx) return;
      ctx.fillStyle = '#e8b070';
      for (let l of leaves) {
        ctx.globalAlpha = l.life / 65;
        ctx.fillRect(Math.floor(l.x), Math.floor(l.y), 2, 1);
      }
      ctx.globalAlpha = 1;
    }

    function updateBirds() {
      if (!canvas) return;
      for (let bird of birds) {
        bird.x += bird.speed;
        bird.bob = Math.sin(time / 8) * 0.8;
        if (bird.x > canvas.width + 5) bird.x = -8;
      }
    }

    function drawBirds() {
      if (!ctx) return;
      ctx.fillStyle = '#a8b0a0';
      for (let bird of birds) {
        const bx = Math.floor(bird.x);
        const by = Math.floor(bird.y + bird.bob);
        ctx.fillRect(bx, by, 4, 1);
        ctx.fillRect(bx + 3, by - 1, 2, 1);
      }
    }

    function updateGardener() {
      if (!canvas) return;
      time++;
      gardenerPhase += 0.0015;

      if (gardenerPhase > 8.5) gardenerPhase = 0;

      const w = canvas.width;

      if (gardenerPhase < 1) gardenerX += 0.17;
      else if (gardenerPhase < 2) gardenerX = 18;           // water left
      else if (gardenerPhase < 3) gardenerX += 0.18;
      else if (gardenerPhase < 4) gardenerX = Math.floor(w * 0.45); // water middle
      else if (gardenerPhase < 5) gardenerX += 0.17;
      else if (gardenerPhase < 6.5) gardenerX = w - 18;     // rest on bench (right)
      else if (gardenerPhase < 7) gardenerX -= 0.16;
      else if (gardenerPhase < 7.8) gardenerX = 39;         // rake
      else gardenerX -= 0.19;

      gardenerX = Math.max(12, Math.min(w - 16, gardenerX));
    }

    let animationFrameId: number;

    function animate() {
      drawBackground();
      drawFlowers();
      drawApples();
      drawLeaves();
      drawBirds();
      drawGardener();

      updateGardener();
      updateFlowers();
      updateApples();
      updateLeaves();
      updateBirds();

      animationFrameId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className="pointer-events-auto p-3 bg-transparent overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div ref={containerRef} className="w-[300px] h-[150px] relative overflow-hidden bg-transparent">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="text-[10px] font-mono text-[#6a8a6a] mt-2 opacity-75 text-center uppercase tracking-widest font-bold">
          Peaceful Corner
        </div>
      </div>
    </div>
  );
}
