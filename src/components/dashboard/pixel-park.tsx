"use client";

import { useEffect, useRef } from "react";

export function PixelPark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    let gardenerX = 8;           // starting position
    let gardenerPhase = 1;        // 0: walk right → 1: water → 2: walk to bench → 3: rest → 4: walk to rake → 5: rake → 6: walk back
    let apples: any[] = [];
    let leaves: any[] = [];
    let birds: any[] = [];
    let flowerGrowth = [0, 0, 0];

    const applePositions = [
      {x: 59, y: 21}, {x: 64, y: 19}, {x: 68, y: 24},
      {x: 55, y: 26}, {x: 71, y: 27}, {x: 60, y: 30},
      {x: 66, y: 18}, {x: 70, y: 29}
    ];

    for (let i = 0; i < 2; i++) {
      birds.push({
        x: 8 + i * 30,
        y: 9 + i * 4,
        speed: 0.15 + Math.random() * 0.12,
        bob: 0
      });
    }

    function drawBackground() {
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 80, 60);

      // Soft lawn
      ctx.fillStyle = '#c8e0c0';
      ctx.fillRect(0, 52, 80, 8);

      // Left tree
      ctx.fillStyle = '#8ab88a';
      ctx.fillRect(4, 15, 7, 33);
      ctx.fillStyle = '#a8d0a8';
      ctx.fillRect(1, 10, 13, 12);
      ctx.fillRect(0, 12, 20, 15);
      ctx.fillStyle = '#b8e0b8';
      ctx.fillRect(3, 8, 12, 12);

      // Right apple tree
      ctx.fillStyle = '#8ab88a';
      ctx.fillRect(60, 18, 7, 30);
      ctx.fillStyle = '#a8d0a8';
      ctx.fillRect(54, 11, 16, 13);
      ctx.fillRect(52, 19, 21, 11);
      ctx.fillStyle = '#b8e0b8';
      ctx.fillRect(56, 13, 10, 7);

      // Shrubs
      ctx.fillStyle = '#9ac89a';
      ctx.fillRect(18, 41, 14, 13);
      ctx.fillRect(40, 40, 13, 14);

      // Bench (moved to right, under apple tree)
      ctx.fillStyle = '#d4b88a';
      ctx.fillRect(62, 44, 14, 3);           // seat
      ctx.fillRect(63, 41, 2, 9);            // legs
      ctx.fillRect(73, 41, 2, 9);
      ctx.fillStyle = '#b89a6a';
      ctx.fillRect(61, 43, 16, 2);           // seat shading

      // Ground
      ctx.fillStyle = '#44aa44';
      ctx.fillRect(0, 52, 80, 8);
    }

    function drawGardener() {
      if (!ctx) return;
      const phase = Math.floor(gardenerPhase);
      let gx = gardenerX;
      let gy = (phase === 3) ? 41 : 38;   // sit lower on bench

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

      // Tools
      if (phase === 1) { // Watering
        ctx.fillStyle = '#b0d8f0';
        ctx.fillRect(gx + 6, gy + 6, 4, 2);
      } 
      else if (phase === 5) { // Raking
        const rakeMove = Math.sin(time / 5) * 1.2;
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(gx + 6 + rakeMove, gy + 5, 1, 7);
        ctx.fillStyle = '#a87848';
        ctx.fillRect(gx + 4 + rakeMove, gy + 11, 5, 1);
      }
    }

    function drawFlowers() {
      if (!ctx) return;
      const growth = flowerGrowth[0];
      ctx.fillStyle = '#9ac89a';
      ctx.fillRect(20, 49 - growth*2, 2, 5 + growth*2);
      ctx.fillStyle = '#f8b0c8';
      ctx.fillRect(19, 47 - growth*3, 3, 3);

      ctx.fillStyle = '#9ac89a';
      ctx.fillRect(48, 49 - growth*2, 2, 5 + growth*2);
      ctx.fillStyle = '#f0e0a0';
      ctx.fillRect(47, 47 - growth*3, 3, 3);
    }

    function updateFlowers() {
      flowerGrowth[0] = Math.min(1, flowerGrowth[0] + 0.0013);
    }

    function updateApples() {
      if (apples.length < 3 && Math.random() < 0.006) {
        const pos = applePositions[Math.floor(Math.random() * applePositions.length)];
        apples.push({
          x: pos.x,
          y: pos.y,
          onTree: true,
          timer: 220 + Math.random() * 280
        });
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
      for (let i = leaves.length - 3; i >= 0; i--) {
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
      for (let bird of birds) {
        bird.x += bird.speed;
        bird.bob = Math.sin(time / 8) * 0.8;
        if (bird.x > 85) bird.x = -8;
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
      time++;
      gardenerPhase += 0.00125;   // slower cycle for longer rest

      if (gardenerPhase > 7) gardenerPhase = 0;   // extended phases for smooth loop

      // Smooth movement logic
      if (gardenerPhase < 1) {                    // walk right to watering spot
        gardenerX += 0.12;
      } 
      else if (gardenerPhase < 2) {               // watering (long)
        gardenerX = 16;
      } 
      else if (gardenerPhase < 3) {               // walk to bench
        gardenerX += 0.12;
      } 
      else if (gardenerPhase < 5) {               // rest on bench (very long)
        gardenerX = 64;
      } 
      else if (gardenerPhase < 6) {               // walk to raking spot
        gardenerX -= 0.12;
      } 
      else if (gardenerPhase < 6.8) {             // raking (long)
        gardenerX = 50;
      } 
      else {                                      // walk back to start
        gardenerX -= 0.19;
      }

      gardenerX = Math.max(12, Math.min(68, gardenerX));
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

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="hidden md:block fixed bottom-6 right-6 z-50">
      <div className="p-3 bg-white border-[6px] border-[#a8c8a8] shadow-[0_0_20px_rgba(140,180,140,0.3)] rounded-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="w-[180px] h-[135px] relative overflow-hidden bg-white">
          <canvas 
            ref={canvasRef} 
            width={80} 
            height={60} 
            className="w-full h-full"
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
