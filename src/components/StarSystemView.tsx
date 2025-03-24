import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { StarSystem, Planet } from '../types/galaxy';

interface StarSystemViewProps {
  system: StarSystem;
  width: number;
  height: number;
  onBack: () => void;
}

const Canvas = styled.canvas`
  background-color: #000;
  border: 1px solid #333;
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const SystemInfo = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 16px;
  color: white;
  max-width: 300px;
`;

class SystemRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private system: StarSystem;
  private width: number;
  private height: number;
  private startTime: number;
  private animationFrame: number | null;

  constructor(canvas: HTMLCanvasElement, system: StarSystem, width: number, height: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.system = system;
    this.width = width;
    this.height = height;
    this.startTime = Date.now();
    this.animationFrame = null;
  }

  start() {
    this.startTime = Date.now();
    this.animate();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private animate = () => {
    const timeOffset = Date.now() - this.startTime;
    this.render(timeOffset);
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private render(timeOffset: number) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw star
    const starSize = this.system.star.size * 20;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, starSize, 0, Math.PI * 2);
    this.ctx.fillStyle = this.system.star.color;
    this.ctx.fill();

    // Add star glow
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, starSize,
      centerX, centerY, starSize * 2
    );
    gradient.addColorStop(0, `${this.system.star.color}80`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw planet orbits and planets
    this.system.planets.forEach((planet, index) => {
      const orbitRadius = (index + 1) * 60 + starSize;
      
      // Draw orbit
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.stroke();

      // Calculate planet position
      const angle = (timeOffset * planet.orbitSpeed * 0.001) % (Math.PI * 2);
      const planetX = centerX + Math.cos(angle) * orbitRadius;
      const planetY = centerY + Math.sin(angle) * orbitRadius;

      // Draw planet
      this.ctx.beginPath();
      this.ctx.arc(planetX, planetY, planet.size * 10, 0, Math.PI * 2);
      this.ctx.fillStyle = getPlanetColor(planet);
      this.ctx.fill();
    });
  }
}

export function StarSystemView({ system, width, height, onBack }: StarSystemViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SystemRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create and start renderer
    rendererRef.current = new SystemRenderer(canvas, system, width, height);
    rendererRef.current.start();

    // Cleanup
    return () => {
      rendererRef.current?.stop();
      rendererRef.current = null;
    };
  }, [system, width, height]);

  return (
    <>
      <Canvas
        ref={canvasRef}
        width={width}
        height={height}
      />
      <BackButton onClick={onBack}>
        ← Back to Galaxy
      </BackButton>
      <SystemInfo>
        <h2>{system.star.name}</h2>
        <p>Type: {system.star.type}</p>
        <h3>Planets: {system.planets.length}</h3>
        <ul>
          {system.planets.map(planet => (
            <li key={planet.id}>
              {planet.name} ({planet.type})
            </li>
          ))}
        </ul>
        <h3>Resources:</h3>
        <ul>
          {system.resources.map(resource => (
            <li key={resource.type}>
              {resource.type}: {Math.floor(resource.amount)} (+{resource.regenerationRate.toFixed(1)}/s)
            </li>
          ))}
        </ul>
      </SystemInfo>
    </>
  );
}

function getPlanetColor(planet: Planet): string {
  switch (planet.type) {
    case 'ROCKY':
      return '#a88c7d';
    case 'GAS_GIANT':
      return '#e4a672';
    case 'ICE':
      return '#a8d8e8';
    case 'DESERT':
      return '#e8c07a';
    case 'OCEAN':
      return '#4dabf7';
    default:
      return '#ffffff';
  }
}