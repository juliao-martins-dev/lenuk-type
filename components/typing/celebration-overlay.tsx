"use client";

import { type CSSProperties } from "react";

export function CelebrationOverlay({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,hsl(var(--primary)/0.14),transparent_46%),radial-gradient(circle_at_20%_80%,hsl(var(--primary)/0.08),transparent_44%),radial-gradient(circle_at_80%_70%,hsl(var(--primary)/0.08),transparent_42%)]"
      />

      <div role="status" aria-live="polite" className="absolute left-1/2 top-[28%] z-10 -translate-x-1/2 text-center">
        <p className="text-3xl font-bold">Amazing, {name}!</p>
        <p className="mt-2 text-sm text-muted-foreground">You finished the run!</p>
      </div>

      <div aria-hidden className="fireworks-stage">
        {FIREWORK_BURSTS.map((burst, burstIndex) => (
          <div
            key={`${burstIndex}-${burst.x}-${burst.y}`}
            className="firework-burst"
            style={
              {
                left: burst.x,
                top: burst.y,
                "--burst-delay": `${burst.delayMs}ms`,
                "--burst-hue": String(burst.hue)
              } as CSSProperties
            }
          >
            <span className="firework-trail" />
            <span className="firework-core" />
            <span className="firework-ring" />

            {FIREWORK_PARTICLES.map((particle, particleIndex) => (
              <span
                key={particleIndex}
                className="firework-particle"
                style={
                  {
                    "--particle-angle": `${particle.angleDeg}deg`,
                    "--particle-distance": `${particle.distancePx}px`,
                    "--particle-size": `${particle.sizePx}px`,
                    "--particle-delay": `${particle.delayMs}ms`,
                    "--particle-hue-shift": String(particle.hueShift)
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const FIREWORK_BURSTS = [
  { x: "10%", y: "70%", hue: 204, delayMs: 0 },
  { x: "24%", y: "56%", hue: 38, delayMs: 120 },
  { x: "38%", y: "66%", hue: 324, delayMs: 240 },
  { x: "52%", y: "48%", hue: 188, delayMs: 340 },
  { x: "66%", y: "63%", hue: 132, delayMs: 180 },
  { x: "80%", y: "52%", hue: 18, delayMs: 420 },
  { x: "88%", y: "68%", hue: 52, delayMs: 520 }
] as const;

const FIREWORK_PARTICLES = Array.from({ length: 14 }, (_, index) => ({
  angleDeg: Math.round((360 / 14) * index),
  distancePx: 38 + (index % 4) * 9 + (index % 2 === 0 ? 3 : 0),
  sizePx: 2 + (index % 3),
  delayMs: (index % 4) * 18,
  hueShift: ((index * 17) % 36) - 18
}));
