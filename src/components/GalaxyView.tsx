import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { Star, HyperspaceLane, Vector2D, StarSystem, Faction, StarType } from '../types/galaxy';
import { calculateDistance } from '../utils/galaxyGenerator';

interface GalaxyViewProps {
  stars: Star[];
  hyperspaceLanes: HyperspaceLane[];
  width: number;
  height: number;
  onSelectStar?: (star: Star) => void;
  homeSystem: StarSystem;
  factions: Faction[];
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const Canvas = styled.canvas`
  background-color: #000;
  border: 1px solid #333;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`;

const Controls = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
`;

const ControlButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const RandomButton = styled(ControlButton)`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// Add new helper function at the top level
function findBorderPoints(star: Star, allStars: Star[], maxDistance: number = 400): Vector2D[] {
  const points: Vector2D[] = [];
  const SEGMENTS = 32;
  
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    let r = maxDistance;
    
    // Find closest star in this direction
    allStars.forEach(otherStar => {
      if (otherStar.id === star.id) return;
      
      const dx = otherStar.position.x - star.position.x;
      const dy = otherStar.position.y - star.position.y;
      const starAngle = Math.atan2(dy, dx);
      const starDist = Math.sqrt(dx * dx + dy * dy);
      
      // Check if the star is in this direction (within an angle threshold)
      const angleDiff = Math.abs(((starAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (angleDiff < Math.PI / SEGMENTS) {
        r = Math.min(r, starDist / 2);
      }
    });
    
    points.push({
      x: star.position.x + Math.cos(angle) * r,
      y: star.position.y + Math.sin(angle) * r
    });
  }
  
  return points;
}

function smoothPoints(points: Vector2D[], passes: number = 3): Vector2D[] {
  let smoothedPoints = [...points];
  
  // Apply multiple passes of smoothing
  for (let pass = 0; pass < passes; pass++) {
    const newPoints: Vector2D[] = [];
    
    for (let i = 0; i < smoothedPoints.length; i++) {
      const prev2 = smoothedPoints[(i - 2 + smoothedPoints.length) % smoothedPoints.length];
      const prev1 = smoothedPoints[(i - 1 + smoothedPoints.length) % smoothedPoints.length];
      const current = smoothedPoints[i];
      const next1 = smoothedPoints[(i + 1) % smoothedPoints.length];
      const next2 = smoothedPoints[(i + 2) % smoothedPoints.length];
      
      // Weighted average of 5 points
      newPoints.push({
        x: (prev2.x + 2*prev1.x + 3*current.x + 2*next1.x + next2.x) / 9,
        y: (prev2.y + 2*prev1.y + 3*current.y + 2*next1.y + next2.y) / 9
      });
    }
    
    smoothedPoints = newPoints;
  }
  
  return smoothedPoints;
}

function calculateBorderPoints(ownedStars: Star[], allStars: Star[]): Vector2D[] {
  const STEPS = 120; // Reduced number of points for cleaner borders
  const borderPoints: Vector2D[] = [];
  
  // Calculate the center of the territory
  const center = {
    x: ownedStars.reduce((sum, star) => sum + star.position.x, 0) / ownedStars.length,
    y: ownedStars.reduce((sum, star) => sum + star.position.y, 0) / ownedStars.length
  };

  // For each angle, find the furthest owned star and create border at halfway to nearest unowned
  for (let i = 0; i < STEPS; i++) {
    const angle = (i / STEPS) * Math.PI * 2;
    
    // Find the furthest owned star in this direction
    let maxDist = 0;
    let furthestOwnedStar = ownedStars[0];
    
    ownedStars.forEach(star => {
      const dx = star.position.x - center.x;
      const dy = star.position.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const starAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(((starAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      
      if (angleDiff < Math.PI / 6 && dist > maxDist) {
        maxDist = dist;
        furthestOwnedStar = star;
      }
    });

    // Find the nearest unowned star to our furthest owned star
    let minUnownedDist = 200; // Default border distance
    
    allStars.forEach(star => {
      if (!ownedStars.includes(star)) {
        const dx = star.position.x - furthestOwnedStar.position.x;
        const dy = star.position.y - furthestOwnedStar.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const starAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(((starAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        
        if (angleDiff < Math.PI / 4 && dist < minUnownedDist) {
          minUnownedDist = dist;
        }
      }
    });

    // Place border point halfway between furthest owned and nearest unowned
    const borderDist = Math.min(minUnownedDist / 2, 200);
    borderPoints.push({
      x: furthestOwnedStar.position.x + Math.cos(angle) * borderDist,
      y: furthestOwnedStar.position.y + Math.sin(angle) * borderDist
    });
  }

  // Apply multiple passes of smoothing for extra smooth borders
  return smoothPoints(borderPoints, 2);
}

export const GalaxyView: React.FC<GalaxyViewProps> = ({ 
  stars, 
  hyperspaceLanes, 
  width, 
  height, 
  onSelectStar,
  homeSystem,
  factions
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: homeSystem.star.position.x, y: homeSystem.star.position.y, zoom: 2 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null);
  const [focusedStar, setFocusedStar] = useState<Star | null>(null);
  
  // Get connected stars to home system
  const connectedStarIds = useMemo(() => {
    const connected = new Set<string>();
    hyperspaceLanes.forEach(lane => {
      if (lane.fromStarId === homeSystem.star.id) {
        connected.add(lane.toStarId);
      } else if (lane.toStarId === homeSystem.star.id) {
        connected.add(lane.fromStarId);
      }
    });
    return connected;
  }, [hyperspaceLanes, homeSystem.star.id]);

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: (worldX - camera.x) * camera.zoom + width / 2,
      y: (worldY - camera.y) * camera.zoom + height / 2
    };
  }, [camera, width, height]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - width / 2) / camera.zoom + camera.x,
      y: (screenY - height / 2) / camera.zoom + camera.y
    };
  }, [camera, width, height]);

  const findStarAtPosition = useCallback((screenX: number, screenY: number): Star | null => {
    const worldPos = screenToWorld(screenX, screenY);
    const clickRadius = 10 / camera.zoom; // Adjust click area based on zoom

    for (const star of stars) {
      const distance = calculateDistance(worldPos, star.position);
      if (distance < clickRadius) {
        return star;
      }
    }
    return null;
  }, [screenToWorld, stars, camera.zoom]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const star = findStarAtPosition(x, y);
    if (star && onSelectStar) {
      onSelectStar(star);
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / camera.zoom;
      const dy = (e.clientY - dragStart.y) / camera.zoom;

      setCamera(prev => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      const star = findStarAtPosition(x, y);
      setHoveredStar(star);
      canvasRef.current!.style.cursor = star ? 'pointer' : 'grab';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    // We can't use preventDefault in passive wheel events
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * zoomFactor))
    }));
  }, []);

  const zoomIn = () => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.min(5, prev.zoom * 1.2)
    }));
  };

  const zoomOut = () => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, prev.zoom * 0.8)
    }));
  };

  const resetView = () => {
    setCamera({ x: homeSystem.star.position.x, y: homeSystem.star.position.y, zoom: 2 });
    setFocusedStar(null);
  };

  // Function to focus camera on a star
  const focusOnStar = useCallback((star: Star) => {
    setCamera({
      x: star.position.x,
      y: star.position.y,
      zoom: 2 // Zoom in a bit when focusing
    });
    setFocusedStar(star);
  }, []);

  // Function to select a random star
  const selectRandomStar = useCallback(() => {
    // Filter out the central black hole (first star)
    const randomIndex = Math.floor(Math.random() * (stars.length - 1)) + 1;
    const star = stars[randomIndex];
    focusOnStar(star);
  }, [stars, focusOnStar]);

  // Calculate the bounding box of a set of points
  const calculateBoundingBox = (points: Vector2D[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  };

  // Draw background
  useEffect(() => {
    const backgroundCtx = backgroundCanvasRef.current?.getContext('2d');
    if (!backgroundCtx) return;

    const canvas = backgroundCanvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear the background
    backgroundCtx.fillStyle = '#000000';
    backgroundCtx.fillRect(0, 0, width, height);

    // Draw nebula effect
    const gradient = backgroundCtx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, width / 2
    );
    gradient.addColorStop(0, 'rgba(25, 0, 51, 0.3)');
    gradient.addColorStop(0.5, 'rgba(13, 0, 26, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    backgroundCtx.fillStyle = gradient;
    backgroundCtx.fillRect(0, 0, width, height);

    // Draw background stars
    const starCount = 200;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 1.5;
      const opacity = Math.random() * 0.5 + 0.2;

      backgroundCtx.beginPath();
      backgroundCtx.arc(x, y, size, 0, Math.PI * 2);
      backgroundCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      backgroundCtx.fill();
    }
  }, []); // Only run once when component mounts

  // Draw hyperspace lanes
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw hyperspace lanes
    hyperspaceLanes.forEach(lane => {
      const startStar = stars.find(s => s.id === lane.fromStarId);
      const endStar = stars.find(s => s.id === lane.toStarId);
      if (!startStar || !endStar) return;

      const start = worldToScreen(startStar.position.x, startStar.position.y);
      const end = worldToScreen(endStar.position.x, endStar.position.y);

      // Draw lane glow
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = 'rgba(0, 100, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw lane
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw particles
      const particleCount = 2;
      for (let i = 0; i < particleCount; i++) {
        const progress = (Date.now() / 2000 + i / particleCount) % 1;
        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;

        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      }
    });
  }, [stars, hyperspaceLanes, worldToScreen]);

  // Draw stars and territories
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw faction territories
    factions.forEach(faction => {
      const ownedStars = stars.filter(star => 
        faction.controlledSystems.has(star.id)
      );

      if (ownedStars.length > 0) {
        const borderPoints = calculateBorderPoints(ownedStars, stars);
        if (borderPoints.length > 0) {
          // Transform border points to screen coordinates
          const screenPoints = borderPoints.map(point => worldToScreen(point.x, point.y));

          // Draw outer glow
          ctx.beginPath();
          ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
          for (let i = 1; i < screenPoints.length; i++) {
            ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
          }
          ctx.closePath();
          ctx.strokeStyle = `${faction.color}40`;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Draw border
          ctx.beginPath();
          ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
          for (let i = 1; i < screenPoints.length; i++) {
            ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
          }
          ctx.closePath();
          ctx.strokeStyle = `${faction.color}80`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Fill with gradient
          const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width / 2
          );
          gradient.addColorStop(0, `${faction.color}20`);
          gradient.addColorStop(1, `${faction.color}05`);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }
    });

    // Draw stars
    stars.forEach(star => {
      const pos = worldToScreen(star.position.x, star.position.y);
      const faction = factions.find(f => f.controlledSystems.has(star.id));

      // Draw star glow
      const glowSize = (star.size || 1) * 3 * camera.zoom;
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, glowSize
      );
      
      // Use predefined glow colors based on star type
      let glowColor = 'rgba(255, 255, 255, 0.8)';
      switch (star.type) {
        case StarType.BLUE_GIANT:
          glowColor = 'rgba(100, 200, 255, 0.8)';
          break;
        case StarType.RED_GIANT:
          glowColor = 'rgba(255, 100, 100, 0.8)';
          break;
        case StarType.YELLOW_DWARF:
          glowColor = 'rgba(255, 255, 200, 0.8)';
          break;
        case StarType.RED_DWARF:
          glowColor = 'rgba(255, 150, 150, 0.8)';
          break;
        case StarType.BLACK_HOLE:
          glowColor = 'rgba(50, 50, 50, 0.8)';
          break;
        case StarType.NEUTRON:
          glowColor = 'rgba(200, 200, 255, 0.8)';
          break;
        case StarType.PULSAR:
          glowColor = 'rgba(150, 150, 255, 0.8)';
          break;
      }
      
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw star
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();

      // Draw faction indicator
      if (faction) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = faction.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [stars, factions, worldToScreen, camera]);

  return (
    <div className="galaxy-view" style={{ width, height }}>
      <canvas
        ref={backgroundCanvasRef}
        className="background-canvas"
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
          height: '100%',
          width: '100%'
        }}
      />
      <canvas
        ref={canvasRef}
        className="main-canvas"
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          height: '100%',
          width: '100%'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <RandomButton onClick={selectRandomStar}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        Random Star
      </RandomButton>
      <Controls>
        <ControlButton onClick={zoomIn}>+</ControlButton>
        <ControlButton onClick={zoomOut}>-</ControlButton>
        <ControlButton onClick={resetView}>Reset</ControlButton>
      </Controls>
      {focusedStar && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ margin: '0 0 5px 0' }}>{focusedStar.name}</h3>
          <p style={{ margin: '0', fontSize: '14px' }}>Type: {focusedStar.type}</p>
          {focusedStar.id === homeSystem.star.id && (
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#4dabf7' }}>Home System</p>
          )}
          {connectedStarIds.has(focusedStar.id) && (
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#4dabf7' }}>Connected System</p>
          )}
        </div>
      )}
    </div>
  );
}; 