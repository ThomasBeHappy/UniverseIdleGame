import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { GalaxyView } from './components/GalaxyView';
import { StarSystemView } from './components/StarSystemView';
import { TopBar } from './components/TopBar';
import { generateGalaxy } from './utils/galaxyGenerator';
import { generateInitialFactions } from './utils/factionGenerator';
import { StarSystem, Star, Planet, Resource, ResourceType, Faction, FactionType, StarType } from './types/galaxy';
import { Building } from './types/buildings';
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
  flex: 1;
  width: 100%;
  overflow: hidden;
  margin-top: 60px;
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: #000;
  color: white;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

const ResourcePanel = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 60px;
  right: ${props => props.isVisible ? '0' : '-400px'};
  width: 400px;
  height: calc(100vh - 60px);
  background: rgba(0, 0, 0, 0.8);
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding: 20px;
  transition: right 0.3s ease;
  backdrop-filter: blur(10px);
  overflow-y: auto;
  z-index: 1000;

  h2 {
    color: #4dabf7;
    margin: 0 0 20px 0;
    font-size: 24px;
  }
`;

const ResourceGroup = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    color: #74c0fc;
    margin: 0 0 12px 0;
    font-size: 18px;
  }
`;

const ResourceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;

  .resource-info {
    flex-grow: 1;
  }

  .resource-name {
    color: #ced4da;
    font-size: 14px;
  }

  .resource-amount {
    color: #74c0fc;
    font-family: monospace;
    font-size: 14px;
  }

  .resource-rate {
    color: #63e6be;
    font-family: monospace;
    font-size: 12px;
    margin-left: 8px;
  }

  .resource-location {
    color: #868e96;
    font-size: 12px;
    margin-top: 2px;
  }
`;

const ToggleResourcesButton = styled(Button)`
  margin-left: 16px;
  padding: 6px 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
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

interface ResourceLocation {
    system: string;
    planet: string;
}

interface ResourceTotal {
    amount: number;
    rate: number;
    locations: ResourceLocation[];
}

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
    const [currentDate, setCurrentDate] = useState(2500);
    const [showResources, setShowResources] = useState(false);
    const [playerResources, setPlayerResources] = useState<Map<ResourceType, { amount: number; rate: number }>>(new Map());

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

    // Initialize player resources with all resource types at 0
    useEffect(() => {
        if (gameStarted) {
            const initialResources = new Map<ResourceType, { amount: number; rate: number }>();
            Object.values(ResourceType).forEach(type => {
                initialResources.set(type, { amount: 0, rate: 0 });
            });
            setPlayerResources(initialResources);
        }
    }, [gameStarted]);

    // Add resource update interval
    useEffect(() => {
        if (!gameStarted || !galaxy || !playerFaction) return;

        const updateInterval = setInterval(() => {
            setPlayerResources(prevResources => {
                const newResources = new Map(prevResources);

                // set rates to 0
                newResources.forEach((value, key) => {
                    value.rate = 0;
                });

                // Update resources based on buildings and resource patches
                galaxy.starSystems
                    .filter(system => playerFaction.controlledSystems.has(system.star.id))
                    .forEach(system => {
                        system.planets.forEach(planet => {
                            // Update from buildings (if we have any building types that produce resources)
                            planet.buildings.forEach(building => {
                                if (building.type === 'RESOURCE_EXTRACTOR') {
                                    const resourceType = building.resourceType as ResourceType;
                                    const current = newResources.get(resourceType) || { amount: 0, rate: 0 };
                                    current.amount += 0.1; // 0.1 units per second
                                    current.rate += 1; // 1 unit per second
                                    newResources.set(resourceType, current);
                                }
                            });
                        });
                    });

                return newResources;
            });
        }, 100); // Update every 100ms

        return () => clearInterval(updateInterval);
    }, [gameStarted, galaxy, playerFaction]);

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

    const handleBuildingCreated = (building: Building) => {
        // find the planet in the galaxy and update the buildings array using planet id
        console.log(building);
        const planet = galaxy?.starSystems.find(s => s.star.id === building.starId)?.planets.find(p => p.id === building.planetId);
        console.log(planet);
        if (planet) {
            planet.buildings.push(building);
            console.log(planet.buildings);
        }
    };

    const handleBuyBuilding = (cost: Map<ResourceType, number>) => {
        // update player resources
        cost.forEach((amount, type) => {
            const current = playerResources.get(type) || { amount: 0, rate: 0 };
            current.amount -= amount;
            playerResources.set(type, current);
        });
    };

    const handleCanBuyBuilding = (cost: Map<ResourceType, number>) => {
        // check if player has enough resources
        return Array.from(cost.entries()).every(([type, amount]) => {
            const current = playerResources.get(type) || { amount: 0, rate: 0 };
            return current.amount >= amount;
        });
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

    // Replace calculateTotalResources with getPlayerResources
    const getPlayerResources = () => {
        return playerResources;
    };

    if (!galaxy) {
        return <div>Loading galaxy...</div>;
    }

    return (
        <Container>
            {gameStarted && playerFaction && (
                <>
                    <TopBar
                        currentDate={currentDate}
                        playerFaction={playerFaction}
                        ownedSystemCount={playerFaction.controlledSystems.size}
                        extraContent={
                            <ToggleResourcesButton onClick={() => setShowResources(!showResources)}>
                                {showResources ? '← Hide' : 'Resources →'}
                            </ToggleResourcesButton>
                        }
                    />

                    <ResourcePanel isVisible={showResources}>
                        <h2>Player Resources</h2>
                        {Array.from(getPlayerResources()).map(([type, data]) => (
                            <ResourceGroup key={type}>
                                <h3>{type}</h3>
                                <ResourceItem>
                                    <div className="resource-info">
                                        <div className="resource-name">
                                            <span className="resource-amount">{Math.floor(data.amount)}</span> units
                                            <span className="resource-rate">(+{data.rate.toFixed(1)}/s)</span>
                                        </div>
                                    </div>
                                </ResourceItem>
                            </ResourceGroup>
                        ))}
                    </ResourcePanel>
                </>
            )}

            <ViewContainer ref={setContainerRef}>
                {dimensions.width > 0 && dimensions.height > 0 && (
                    isGalaxyView ? (
                        <>
                            <GalaxyView
                                stars={galaxy.stars}
                                starSystems={galaxy.starSystems}
                                hyperspaceLanes={galaxy.hyperspaceLanes}
                                width={dimensions.width}
                                height={dimensions.height}
                                onSelectStar={handleSelectStar}
                                homeSystem={gameStarted ? (homeSystem || galaxy.starSystems[0]) : getPreviewCenter()}
                                factions={factions}
                                playerFaction={playerFaction}
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
                            onBuildingCreated={handleBuildingCreated}
                            onBuyBuilding={handleBuyBuilding}
                            onCanBuyBuilding={handleCanBuyBuilding}
                        />
                    )
                )}
            </ViewContainer>
        </Container>
    );
}
