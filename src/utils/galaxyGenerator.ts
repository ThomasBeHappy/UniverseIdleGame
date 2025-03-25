import { v4 as uuidv4 } from 'uuid';
import {
  Star,
  StarSystem,
  StarType,
  Planet,
  PlanetType,
  Resource,
  ResourceType,
  Vector2D,
  HyperspaceLane,
  StarTypeInfo,
  PlanetTypeInfo,
  ResourceTypeInfo
} from '../types/galaxy';
import { generateStarName, generatePlanetName } from './nameGenerator';

const GALAXY_RADIUS = 3000; // Using radius instead of size for circular galaxy
const BASE_MIN_STAR_DISTANCE = 100; // Increased base minimum distance
const MIN_CORE_STAR_DISTANCE = 80; // Minimum distance specifically for core stars
const MAX_STARS = 500;
const MAX_PLANETS_PER_SYSTEM = 5;
const MAX_HYPERLANE_DISTANCE = 200;
const EXTRA_CONNECTIONS_FACTOR = 0.3;
const SPIRAL_ARMS = 3; // Number of spiral arms in the galaxy
const SPIRAL_TIGHTNESS = 0.5; // How tightly wound the spiral arms are
const ARM_OFFSET = (2 * Math.PI) / SPIRAL_ARMS; // Angle between spiral arms
const DENSITY_DROPOFF = 0.7; // Controls how quickly density drops with distance (higher = steeper dropoff)
const CENTER_DENSITY_BOOST = 2; // Multiplier for density near the center

const STAR_TYPES: StarTypeInfo[] = [
  { type: StarType.RED_DWARF, color: '#ff6b6b', size: 1, probability: 0.35 },
  { type: StarType.YELLOW_DWARF, color: '#ffd93d', size: 1.2, probability: 0.25 },
  { type: StarType.BLUE_GIANT, color: '#4dabf7', size: 1.5, probability: 0.15 },
  { type: StarType.RED_GIANT, color: '#ff8787', size: 1.8, probability: 0.1 },
  { type: StarType.NEUTRON, color: '#ffffff', size: 0.8, probability: 0.03 },
  { type: StarType.PULSAR, color: '#ffd700', size: 0.9, probability: 0.02 },
  { type: StarType.BLACK_HOLE, color: '#000000', size: 2, probability: 0.1 } // Black holes with event horizon glow
];

const PLANET_TYPES: PlanetTypeInfo[] = [
  { type: PlanetType.ROCKY, probability: 0.4 },
  { type: PlanetType.GAS_GIANT, probability: 0.2 },
  { type: PlanetType.ICE, probability: 0.2 },
  { type: PlanetType.DESERT, probability: 0.1 },
  { type: PlanetType.OCEAN, probability: 0.1 }
];

const RESOURCE_TYPES: ResourceTypeInfo[] = [
  { type: ResourceType.IRON, probability: 0.3 },
  { type: ResourceType.COPPER, probability: 0.2 },
  { type: ResourceType.GOLD, probability: 0.1 },
  { type: ResourceType.PLATINUM, probability: 0.1 },
  { type: ResourceType.RARE_EARTH, probability: 0.1 },
  { type: ResourceType.WATER, probability: 0.1 },
  { type: ResourceType.FUEL, probability: 0.1 }
];

// Add new resource type mappings
const PLANET_RESOURCES: Record<PlanetType, ResourceTypeInfo[]> = {
  [PlanetType.ROCKY]: [
    { type: ResourceType.IRON, probability: 0.4 },
    { type: ResourceType.COPPER, probability: 0.3 },
    { type: ResourceType.GOLD, probability: 0.2 },
    { type: ResourceType.PLATINUM, probability: 0.2 },
    { type: ResourceType.RARE_EARTH, probability: 0.3 },
    { type: ResourceType.TITANIUM, probability: 0.2 },
    { type: ResourceType.URANIUM, probability: 0.1 },
    { type: ResourceType.WATER, probability: 0.3 },
    { type: ResourceType.SILICON, probability: 0.4 },
    { type: ResourceType.CARBON, probability: 0.3 }
  ],
  [PlanetType.GAS_GIANT]: [
    { type: ResourceType.METHANE, probability: 0.8 },
    { type: ResourceType.AMMONIA, probability: 0.6 },
    { type: ResourceType.HELIUM_3, probability: 0.4 },
    { type: ResourceType.DEUTERIUM, probability: 0.5 },
    { type: ResourceType.FUEL, probability: 0.7 },
    { type: ResourceType.PLASMA, probability: 0.3 },
    { type: ResourceType.HYDROGEN, probability: 0.9 }
  ],
  [PlanetType.ICE]: [
    { type: ResourceType.WATER, probability: 0.8 },
    { type: ResourceType.ICE, probability: 0.9 },
    { type: ResourceType.METHANE, probability: 0.4 },
    { type: ResourceType.AMMONIA, probability: 0.3 },
    { type: ResourceType.DEUTERIUM, probability: 0.2 },
    { type: ResourceType.HELIUM_3, probability: 0.1 }
  ],
  [PlanetType.DESERT]: [
    { type: ResourceType.IRON, probability: 0.3 },
    { type: ResourceType.COPPER, probability: 0.2 },
    { type: ResourceType.GOLD, probability: 0.2 },
    { type: ResourceType.SILICON, probability: 0.4 },
    { type: ResourceType.WATER, probability: 0.1 },
    { type: ResourceType.RARE_EARTH, probability: 0.2 }
  ],
  [PlanetType.OCEAN]: [
    { type: ResourceType.WATER, probability: 0.9 },
    { type: ResourceType.DEUTERIUM, probability: 0.4 },
    { type: ResourceType.ORGANICS, probability: 0.6 },
    { type: ResourceType.FOOD, probability: 0.7 },
    { type: ResourceType.RARE_EARTH, probability: 0.2 }
  ]
};

interface Edge {
  fromStarId: string;
  toStarId: string;
  distance: number;
}

class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  makeSet(x: string) {
    this.parent.set(x, x);
    this.rank.set(x, 0);
  }

  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX !== rootY) {
      const rankX = this.rank.get(rootX)!;
      const rankY = this.rank.get(rootY)!;

      if (rankX < rankY) {
        this.parent.set(rootX, rootY);
      } else if (rankX > rankY) {
        this.parent.set(rootY, rootX);
      } else {
        this.parent.set(rootY, rootX);
        this.rank.set(rootX, rankX + 1);
      }
    }
  }
}

function generateSpiralPosition(): Vector2D {
  // Use rejection sampling to create density distribution
  while (true) {
    // Random angle and distance from center with exponential density falloff
    const angle = Math.random() * 2 * Math.PI;
    const raw_distance = Math.random() * GALAXY_RADIUS;
    
    // Calculate probability of keeping this point based on distance
    // Exponential decay from center (1 at center, approaching 0 at edges)
    const density = Math.exp(-DENSITY_DROPOFF * (raw_distance / GALAXY_RADIUS)) * CENTER_DENSITY_BOOST;
    
    // Reject point based on density
    if (Math.random() > density) {
      continue;
    }
    
    // If point is accepted, apply spiral arm pattern
    const armIndex = Math.floor(Math.random() * SPIRAL_ARMS);
    const armOffset = armIndex * ARM_OFFSET;
    
    // Add some randomness to the position, scaled by distance from center
    // Further out = more randomness allowed
    const randomOffset = (Math.random() - 0.5) * 0.3 * (raw_distance / GALAXY_RADIUS);
    const spiralAngle = angle + armOffset + (raw_distance * SPIRAL_TIGHTNESS / GALAXY_RADIUS) + randomOffset;
    
    // Convert to Cartesian coordinates
    return {
      x: GALAXY_RADIUS + (raw_distance * Math.cos(spiralAngle)),
      y: GALAXY_RADIUS + (raw_distance * Math.sin(spiralAngle))
    };
  }
}

function generateCenterBlackHole(): Star {
  return {
    id: uuidv4(),
    position: { x: GALAXY_RADIUS, y: GALAXY_RADIUS },
    name: 'Sagittarius A*', // Name of the black hole at the center of our galaxy
    type: StarType.BLACK_HOLE,
    size: 3, // Larger than regular black holes
    color: '#000000'
  };
}

function generateCoreStars(): Star[] {
  const coreStars: Star[] = [];
  const NUM_CORE_STARS = 20;
  const CORE_RADIUS = GALAXY_RADIUS * 0.1;
  
  let attempts = 0;
  const maxAttempts = NUM_CORE_STARS * 10;
  
  while (coreStars.length < NUM_CORE_STARS && attempts < maxAttempts) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * CORE_RADIUS;
    
    const position = {
      x: GALAXY_RADIUS + (distance * Math.cos(angle)),
      y: GALAXY_RADIUS + (distance * Math.sin(angle))
    };
    
    // Check distance from existing core stars
    let isTooClose = false;
    for (const existingStar of coreStars) {
      if (calculateDistance(position, existingStar.position) < MIN_CORE_STAR_DISTANCE) {
        isTooClose = true;
        break;
      }
    }
    
    if (!isTooClose) {
      // Bias towards larger, more massive stars in the core
      const starTypeInfo = selectRandomType(STAR_TYPES.map(type => ({
        ...type,
        probability: type.size > 1.2 ? type.probability * 2 : type.probability * 0.5
      })));
      
      coreStars.push({
        id: uuidv4(),
        position,
        name: generateStarName(starTypeInfo.type),
        type: starTypeInfo.type,
        size: starTypeInfo.size * (0.9 + Math.random() * 0.2),
        color: starTypeInfo.color
      });
    }
    
    attempts++;
  }
  
  return coreStars;
}

function generateStar(): Star {
  const position = generateSpiralPosition();
  const starTypeInfo = selectRandomType(STAR_TYPES);
  
  return {
    id: uuidv4(),
    position,
    name: generateStarName(starTypeInfo.type),
    type: starTypeInfo.type,
    size: starTypeInfo.size * (0.8 + Math.random() * 0.4), // Add some size variation
    color: starTypeInfo.color
  };
}

function generateResources(planetType: PlanetType): Resource[] {
  const resources: Resource[] = [];
  const possibleResources = PLANET_RESOURCES[planetType];
  const numResources = 1 + Math.floor(Math.random() * 3); // 1-3 resources per planet
  const availableTypes = [...possibleResources];
  
  for (let i = 0; i < numResources && availableTypes.length > 0; i++) {
    // Get random index from remaining types
    const randomIndex = Math.floor(Math.random() * availableTypes.length);
    const resourceTypeInfo = availableTypes[randomIndex];
    
    // Remove the selected type to prevent duplicates
    availableTypes.splice(randomIndex, 1);
    
    // Generate resource amount based on type
    let amount: number;
    let regenerationRate: number;
    
    switch (resourceTypeInfo.type) {
      case ResourceType.WATER:
        amount = 5000 + Math.random() * 15000;
        regenerationRate = 10 + Math.random() * 20;
        break;
      case ResourceType.FUEL:
        amount = 2000 + Math.random() * 8000;
        regenerationRate = 5 + Math.random() * 15;
        break;
      case ResourceType.FOOD:
        amount = 1000 + Math.random() * 4000;
        regenerationRate = 8 + Math.random() * 16;
        break;
      case ResourceType.IRON:
      case ResourceType.COPPER:
      case ResourceType.GOLD:
      case ResourceType.PLATINUM:
        amount = 500 + Math.random() * 2000;
        regenerationRate = 1 + Math.random() * 5;
        break;
      case ResourceType.RARE_EARTH:
        amount = 100 + Math.random() * 500;
        regenerationRate = 0.5 + Math.random() * 2;
        break;
      case ResourceType.HELIUM_3:
      case ResourceType.DEUTERIUM:
        amount = 50 + Math.random() * 200;
        regenerationRate = 0.2 + Math.random() * 1;
        break;
      default:
        amount = 1000 + Math.random() * 5000;
        regenerationRate = 2 + Math.random() * 8;
    }
    
    resources.push({
      type: resourceTypeInfo.type,
      amount,
      regenerationRate
    });
  }
  
  return resources;
}

function generatePlanet(starName: string, index: number, starId: string): Planet {
  const planetTypeInfo = selectRandomType(PLANET_TYPES);
  const planetType = planetTypeInfo.type;
  
  return {
    id: uuidv4(),
    name: generatePlanetName(planetType, starName, index),
    type: planetType,
    size: 0.5 + Math.random() * 1.5,
    orbitSpeed: 0.1 + Math.random() * 0.5,
    resources: generateResources(planetType),
    buildings: [],
    starId: starId,
    resourcePatches: []
  };
}

function generateStarSystem(star: Star): StarSystem {
  const numPlanets = 1 + Math.floor(Math.random() * MAX_PLANETS_PER_SYSTEM);
  const planets: Planet[] = [];
  
  for (let i = 0; i < numPlanets; i++) {
    planets.push(generatePlanet(star.name, i, star.id));
  }
  
  return {
    id: uuidv4(),
    star,
    planets,
    resources: generateResources(planets[0].type)
  };
}

function generateHyperspaceLanes(stars: Star[]): HyperspaceLane[] {
  // First, generate ALL possible edges between stars to ensure connectivity
  const allEdges: Edge[] = [];
  const shortEdges: Edge[] = [];
  
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const distance = calculateDistance(stars[i].position, stars[j].position);
      const edge = {
        fromStarId: stars[i].id,
        toStarId: stars[j].id,
        distance
      };
      
      allEdges.push(edge);
      
      // Keep track of short edges separately for adding extra connections later
      if (distance <= MAX_HYPERLANE_DISTANCE) {
        shortEdges.push(edge);
      }
    }
  }

  // Sort all edges by distance
  allEdges.sort((a, b) => a.distance - b.distance);

  // Create minimum spanning tree using Kruskal's algorithm
  const uf = new UnionFind();
  stars.forEach(star => uf.makeSet(star.id));

  const mstEdges: Edge[] = [];
  const usedEdges = new Set<string>();

  // First pass: Add edges to create the minimum spanning tree
  // This ensures ALL stars are connected
  for (const edge of allEdges) {
    if (uf.find(edge.fromStarId) !== uf.find(edge.toStarId)) {
      mstEdges.push(edge);
      usedEdges.add(`${edge.fromStarId}-${edge.toStarId}`);
      uf.union(edge.fromStarId, edge.toStarId);
    }
  }

  // Second pass: Add additional short-range connections
  // Sort short edges by distance for better local connections
  shortEdges.sort((a, b) => a.distance - b.distance);
  
  const extraConnections = Math.floor(mstEdges.length * EXTRA_CONNECTIONS_FACTOR);
  let addedExtra = 0;

  for (const edge of shortEdges) {
    if (addedExtra >= extraConnections) break;
    
    const edgeKey = `${edge.fromStarId}-${edge.toStarId}`;
    if (!usedEdges.has(edgeKey)) {
      mstEdges.push(edge);
      usedEdges.add(edgeKey);
      addedExtra++;
    }
  }

  // Convert edges to hyperspace lanes
  return mstEdges.map(edge => ({
    id: uuidv4(),
    fromStarId: edge.fromStarId,
    toStarId: edge.toStarId,
    distance: edge.distance
  }));
}

export function calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
}

function selectRandomType<T extends { type: any; probability: number }>(options: T[]): T {
  const random = Math.random();
  let sum = 0;
  
  for (const option of options) {
    sum += option.probability;
    if (random <= sum) {
      return option;
    }
  }
  
  return options[0];
}

export function generateGalaxy() {
  const stars: Star[] = [];
  let attempts = 0;
  const maxAttempts = MAX_STARS * 10;
  
  // Add the central black hole first
  stars.push(generateCenterBlackHole());
  
  // Add dense core region stars
  stars.push(...generateCoreStars());
  
  while (stars.length < MAX_STARS && attempts < maxAttempts) {
    const newStar = generateStar();
    let isValid = true;
    
    // Calculate distance from center for this star
    const distanceFromCenter = calculateDistance(
      newStar.position,
      { x: GALAXY_RADIUS, y: GALAXY_RADIUS }
    );
    
    // Calculate minimum distance based on position in galaxy
    // Stars can be slightly closer in the core, but not too close
    const distanceRatio = distanceFromCenter / GALAXY_RADIUS;
    const minDistance = BASE_MIN_STAR_DISTANCE * (0.8 + distanceRatio * 0.4);
    
    // Check distance from other stars
    for (const existingStar of stars) {
      if (calculateDistance(newStar.position, existingStar.position) < minDistance) {
        isValid = false;
        break;
      }
    }
    
    // Check if the star is within the galaxy bounds
    if (distanceFromCenter > GALAXY_RADIUS) {
      isValid = false;
    }
    
    if (isValid) {
      stars.push(newStar);
    }
    
    attempts++;
  }
  
  const hyperspaceLanes = generateHyperspaceLanes(stars);
  const starSystems = stars.map(star => generateStarSystem(star));
  
  return {
    stars,
    starSystems,
    hyperspaceLanes
  };
} 