import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { GalaxyView } from './components/GalaxyView';
import { StarSystemView } from './components/StarSystemView';
import { TopBar } from './components/TopBar';
import { generateGalaxy } from './utils/galaxyGenerator';
import { generateInitialFactions } from './utils/factionGenerator';
import { Star, StarSystem, StarType, Faction, FactionType } from './types/galaxy';
import { selectStartingSystem } from './utils/startingSystem';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #000;
  color: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled.h1`
  color: #4dabf7;
  margin-bottom: 20px;
  text-align: center;
  font-size: 2.5rem;
  text-shadow: 0 0 10px rgba(77, 171, 247, 0.5);
`;

const ViewContainer = styled.div`
  position: relative;
  margin: 20px 0;
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: #000;
  color: white;
  position: relative;
  overflow: hidden;
`;

const PreviewControls = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  backdrop-filter: blur(8px);
`;

const Button = styled.button`
  background: rgba(77, 171, 247, 0.2);
  border: 1px solid rgba(77, 171, 247, 0.4);
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(77, 171, 247, 0.3);
    border-color: rgba(77, 171, 247, 0.6);
  }

  &.primary {
    background: rgba(77, 171, 247, 0.4);
    border-color: rgba(77, 171, 247, 0.8);
    
    &:hover {
      background: rgba(77, 171, 247, 0.5);
    }
  }
`;

export default function App() {
  const [galaxy, setGalaxy] = useState<ReturnType<typeof generateGalaxy> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<StarSystem | null>(null);
  const [homeSystem, setHomeSystem] = useState<StarSystem | null>(null);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [playerFaction, setPlayerFaction] = useState<Faction | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGalaxyView, setIsGalaxyView] = useState(true);
  const [currentDate, setCurrentDate] = useState(2500); // Start in year 2500

  useEffect(() => {
    generateNewGalaxy();
  }, []);

  // Update dimensions when container size changes
  useEffect(() => {
    if (!containerRef) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef]);

  const generateNewGalaxy = () => {
    const newGalaxy = generateGalaxy();
    setGalaxy(newGalaxy);
    setHomeSystem(null);
    setFactions([]);
    setPlayerFaction(null);
    setGameStarted(false);
    setIsGalaxyView(true);
    setSelectedSystem(null);
    setCurrentDate(2500);
  };

  const startGame = () => {
    if (!galaxy) return;

    // Generate factions first
    const generatedFactions = generateInitialFactions(galaxy.stars);
    
    // Then select starting system, ensuring it's away from factions
    const startingSystem = selectStartingSystem(galaxy.starSystems, generatedFactions);
    
    // Create player faction
    const player: Faction = {
      id: 'player',
      name: 'Terran Alliance', // TODO: Let player choose name
      type: FactionType.PEACEFUL,
      color: '#4dabf7',
      homeSystemId: startingSystem.star.id,
      controlledSystems: new Set([startingSystem.star.id]),
      relations: new Map(),
      traits: {
        expansionist: 0.5,
        diplomatic: 0.7,
        aggressive: 0.3,
        technological: 0.6,
        economic: 0.5
      }
    };

    setHomeSystem(startingSystem);
    setSelectedSystem(startingSystem);
    setFactions(generatedFactions);
    setPlayerFaction(player);
    setGameStarted(true);
  };

  const handleSelectStar = (star: Star) => {
    if (!galaxy || !gameStarted) return;
    const system = galaxy.starSystems.find(s => s.star.id === star.id);
    if (system) {
      setSelectedSystem(system);
      setIsGalaxyView(false);
    }
  };

  const handleBackToGalaxy = () => {
    setIsGalaxyView(true);
  };

  // Calculate galaxy center for preview phase
  const getPreviewCenter = (): StarSystem => {
    if (!galaxy) {
      // Provide a default center if galaxy doesn't exist yet
      return {
        id: 'preview-system',
        star: {
          id: 'preview-center',
          position: { x: 0, y: 0 },
          type: StarType.BLACK_HOLE,
          name: 'Galaxy Center',
          size: 1,
          color: '#000000'
        },
        planets: [],
        resources: []
      };
    }
    
    // Calculate average position of all stars
    const center = galaxy.stars.reduce((acc, star) => ({
      x: acc.x + star.position.x,
      y: acc.y + star.position.y
    }), { x: 0, y: 0 });

    // Create a dummy system at the center for camera positioning
    return {
      id: 'preview-system',
      star: {
        id: 'preview-center',
        position: {
          x: center.x / galaxy.stars.length,
          y: center.y / galaxy.stars.length
        },
        type: StarType.BLACK_HOLE,
        name: 'Galaxy Center',
        size: 1,
        color: '#000000'
      },
      planets: [],
      resources: []
    };
  };

  if (!galaxy) {
    return <div>Loading galaxy...</div>;
  }

  return (
    <Container>
      {gameStarted && playerFaction && (
        <TopBar
          currentDate={currentDate}
          playerFaction={playerFaction}
          ownedSystemCount={playerFaction.controlledSystems.size}
        />
      )}

      <ViewContainer ref={setContainerRef}>
        {dimensions.width > 0 && dimensions.height > 0 && (
          isGalaxyView ? (
            <>
              <GalaxyView
                stars={galaxy.stars}
                hyperspaceLanes={galaxy.hyperspaceLanes}
                width={dimensions.width}
                height={dimensions.height}
                onSelectStar={handleSelectStar}
                homeSystem={gameStarted ? (homeSystem || galaxy.starSystems[0]) : getPreviewCenter()}
                factions={factions}
              />
              {!gameStarted && (
                <PreviewControls>
                  <Title>Welcome to Galactic Conquest</Title>
                  <Button className="primary" onClick={startGame}>
                    Start Game
                  </Button>
                  <Button onClick={generateNewGalaxy}>
                    Generate New Galaxy
                  </Button>
                </PreviewControls>
              )}
            </>
          ) : (
            <StarSystemView
              system={selectedSystem!}
              onBack={handleBackToGalaxy}
              width={dimensions.width}
              height={dimensions.height}
            />
          )
        )}
      </ViewContainer>
    </Container>
  );
}
