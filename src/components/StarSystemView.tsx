import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { Building, StarSystem, Planet } from '../types/galaxy';
import { PlanetView } from './PlanetView';

interface StarSystemViewProps {
  system: StarSystem;
  width: number;
  height: number;
  onBack: () => void;
  onBuildingCreated: (building: Building) => void;
}

const Canvas = styled.canvas`
  background-color: #000;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const BackgroundCanvas = styled.canvas`
  background-color: #000;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  backdrop-filter: blur(5px);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }
`;

const SystemInfo = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  color: white;
  max-width: 300px;
  backdrop-filter: blur(5px);

  h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #4dabf7;
  }

  h3 {
    margin: 16px 0 8px 0;
    font-size: 18px;
    color: #74c0fc;
  }

  p {
    margin: 4px 0;
    color: #ced4da;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin-bottom: 8px;
  }
`;

const PlanetListItem = styled.li<{ color: string }>`
  cursor: pointer;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.color};
    opacity: 0.8;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(-4px);
  }
`;

const ResourceListItem = styled.li`
  padding: 8px 12px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  font-size: 14px;
  color: #ced4da;

  span.amount {
    color: #74c0fc;
    font-family: monospace;
  }

  span.rate {
    color: #63e6be;
    font-family: monospace;
  }
`;

class SystemRenderer {
  private canvas: HTMLCanvasElement;
  private bgCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCtx: CanvasRenderingContext2D;
  private system: StarSystem;
  private width: number;
  private height: number;
  private startTime: number;
  private animationFrame: number | null;
  private onPlanetClick: (planet: Planet) => void;

  constructor(canvas: HTMLCanvasElement, bgCanvas: HTMLCanvasElement, system: StarSystem, width: number, height: number, onPlanetClick: (planet: Planet) => void) {
    this.canvas = canvas;
    this.bgCanvas = bgCanvas;
    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.bgCtx = bgCtx;
    this.system = system;
    this.width = width;
    this.height = height;
    this.startTime = Date.now();
    this.animationFrame = null;
    this.onPlanetClick = onPlanetClick;

    // Draw the static background once
    this.drawStarfield();

    // Add click handler
    this.canvas.addEventListener('click', this.handleClick);
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
    this.canvas.removeEventListener('click', this.handleClick);
  }

  private animate = () => {
    const timeOffset = Date.now() - this.startTime;
    this.render(timeOffset);
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private render(timeOffset: number) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Clear main canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw star
    const starSize = this.system.star.size * 20;
    
    // Draw star glow
    let gradient = this.ctx.createRadialGradient(
      centerX, centerY, starSize * 0.5,
      centerX, centerY, starSize * 4
    );
    gradient.addColorStop(0, `${this.system.star.color}40`);
    gradient.addColorStop(0.4, `${this.system.star.color}10`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw star core
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, starSize, 0, Math.PI * 2);
    this.ctx.fillStyle = this.system.star.color;
    this.ctx.fill();

    // Add star corona effect
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, starSize * 1.2, 0, Math.PI * 2);
    gradient = this.ctx.createRadialGradient(
      centerX, centerY, starSize,
      centerX, centerY, starSize * 1.2
    );
    gradient.addColorStop(0, `${this.system.star.color}80`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw planet orbits and planets
    this.system.planets.forEach((planet, index) => {
      const orbitRadius = (index + 1) * 60 + starSize;
      
      // Draw orbit trail
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Add orbit glow
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // Calculate planet position
      const angle = (timeOffset * planet.orbitSpeed * 0.001) % (Math.PI * 2);
      const planetX = centerX + Math.cos(angle) * orbitRadius;
      const planetY = centerY + Math.sin(angle) * orbitRadius;

      // Draw planet glow
      const planetColor = getPlanetColor(planet);
      gradient = this.ctx.createRadialGradient(
        planetX, planetY, planet.size * 8,
        planetX, planetY, planet.size * 12
      );
      gradient.addColorStop(0, `${planetColor}40`);
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(planetX, planetY, planet.size * 12, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw planet
      this.ctx.beginPath();
      this.ctx.arc(planetX, planetY, planet.size * 10, 0, Math.PI * 2);
      this.ctx.fillStyle = planetColor;
      this.ctx.fill();

      // Add planet highlight
      gradient = this.ctx.createRadialGradient(
        planetX - planet.size * 5, planetY - planet.size * 5, 0,
        planetX, planetY, planet.size * 10
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    });
  }

  private drawStarfield() {
    // Create a subtle starfield effect
    const starCount = 200; // Increased star count for better effect
    const starLayers = 3; // Multiple layers for depth effect
    
    for (let layer = 0; layer < starLayers; layer++) {
      const layerStars = Math.floor(starCount / starLayers);
      const baseSize = (layer + 1) * 0.5; // Larger stars in front layers
      
      for (let i = 0; i < layerStars; i++) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        const size = (Math.random() * 0.5 + 0.5) * baseSize;
        const opacity = Math.random() * 0.3 + 0.2 + (layer * 0.1);

        // Draw the main star point
        this.bgCtx.beginPath();
        this.bgCtx.arc(x, y, size, 0, Math.PI * 2);
        this.bgCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        this.bgCtx.fill();

        // Add a subtle glow for some stars
        if (Math.random() < 0.3) {
          const glowSize = size * 3;
          const glow = this.bgCtx.createRadialGradient(x, y, 0, x, y, glowSize);
          glow.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.5})`);
          glow.addColorStop(1, 'transparent');
          this.bgCtx.fillStyle = glow;
          this.bgCtx.beginPath();
          this.bgCtx.arc(x, y, glowSize, 0, Math.PI * 2);
          this.bgCtx.fill();
        }
      }
    }
  }

  private handleClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const starSize = this.system.star.size * 20;

    // Check if click is on any planet
    this.system.planets.forEach((planet, index) => {
      const orbitRadius = (index + 1) * 60 + starSize;
      const angle = (Date.now() - this.startTime) * planet.orbitSpeed * 0.001 % (Math.PI * 2);
      const planetX = centerX + Math.cos(angle) * orbitRadius;
      const planetY = centerY + Math.sin(angle) * orbitRadius;

      // Calculate distance from click to planet center
      const dx = x - planetX;
      const dy = y - planetY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If click is within planet radius, trigger callback
      if (distance < planet.size * 10) {
        this.onPlanetClick(planet);
      }
    });
  };
}

export function StarSystemView({ system, width, height, onBack, onBuildingCreated }: StarSystemViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SystemRenderer | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  // Initialize or reinitialize the renderer
  const initRenderer = () => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!canvas || !bgCanvas) return;

    // Cleanup existing renderer if any
    if (rendererRef.current) {
      rendererRef.current.stop();
      rendererRef.current = null;
    }

    // Create and start new renderer
    rendererRef.current = new SystemRenderer(canvas, bgCanvas, system, width, height, setSelectedPlanet);
    rendererRef.current.start();
  };

  // Handle cleanup
  const cleanup = () => {
    if (rendererRef.current) {
      rendererRef.current.stop();
      rendererRef.current = null;
    }
  };

  // Initialize on mount and when system/dimensions change
  useEffect(() => {
    initRenderer();
    return cleanup;
  }, [system, width, height]);

  // Handle planet selection state changes
  useEffect(() => {
    if (!selectedPlanet) {
      // When returning from planet view, reinitialize the renderer
      initRenderer();
    } else {
      // When entering planet view, cleanup the renderer
      cleanup();
    }
  }, [selectedPlanet]);

  if (selectedPlanet) {
    return (
      <PlanetView
        planet={selectedPlanet}
        width={width}
        height={height}
        onBack={() => setSelectedPlanet(null)}
        onBuildingCreated={onBuildingCreated}
      />
    );
  }

  return (
    <>
      <BackgroundCanvas
        ref={bgCanvasRef}
        width={width}
        height={height}
      />
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
        <h3>Planets</h3>
        <ul>
          {system.planets.map(planet => (
            <PlanetListItem 
              key={planet.id}
              onClick={() => setSelectedPlanet(planet)}
              color={getPlanetColor(planet)}
            >
              {planet.name} ({planet.type})
            </PlanetListItem>
          ))}
        </ul>
        <h3>Resources</h3>
        <ul>
          {system.planets.flatMap(planet => 
            planet.resources.map(resource => (
              <ResourceListItem key={`${planet.id}-${resource.type}`}>
                {planet.name} - {resource.type}
                <br />
                <span className="amount">{Math.floor(resource.amount)}</span> units
                (<span className="rate">+{resource.regenerationRate.toFixed(1)}</span>/s)
              </ResourceListItem>
            ))
          )}
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