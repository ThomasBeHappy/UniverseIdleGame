export interface Vector2D {
  x: number;
  y: number;
}

export interface StarTypeInfo {
  type: StarType;
  color: string;
  size: number;
  probability: number;
}

export interface Star {
  id: string;
  position: Vector2D;
  name: string;
  type: StarType;
  size: number;
  color: string;
}

export interface PlanetTypeInfo {
  type: PlanetType;
  probability: number;
}

export interface ResourceTypeInfo {
  type: ResourceType;
  probability: number;
}

export interface HyperspaceLane {
  id: string;
  fromStarId: string;
  toStarId: string;
  distance: number;
}

export interface StarSystem {
  id: string;
  star: Star;
  planets: Planet[];
  resources: Resource[];
}

export interface Planet {
  id: string;
  name: string;
  type: PlanetType;
  size: number;
  orbitDistance: number;
  orbitSpeed: number;
}

export interface Resource {
  type: ResourceType;
  amount: number;
  regenerationRate: number;
}

export enum StarType {
  RED_DWARF = 'RED_DWARF',
  YELLOW_DWARF = 'YELLOW_DWARF',
  BLUE_GIANT = 'BLUE_GIANT',
  RED_GIANT = 'RED_GIANT',
  NEUTRON = 'NEUTRON',
  PULSAR = 'PULSAR',
  BLACK_HOLE = 'BLACK_HOLE'
}

export enum PlanetType {
  ROCKY = 'ROCKY',
  GAS_GIANT = 'GAS_GIANT',
  ICE = 'ICE',
  DESERT = 'DESERT',
  OCEAN = 'OCEAN'
}

export enum ResourceType {
  IRON = 'IRON',
  COPPER = 'COPPER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  RARE_EARTH = 'RARE_EARTH',
  WATER = 'WATER',
  FUEL = 'FUEL'
}

export enum FactionType {
  CORPORATE = 'CORPORATE',      // Profit-driven megacorporations
  SCIENTIFIC = 'SCIENTIFIC',    // Research-focused societies
  MILITARISTIC = 'MILITARISTIC', // War-focused empires
  PEACEFUL = 'PEACEFUL',        // Diplomatic traders
  XENOPHOBIC = 'XENOPHOBIC',    // Isolationist societies
  RELIGIOUS = 'RELIGIOUS',      // Faith-driven civilizations
  HIVE_MIND = 'HIVE_MIND',     // Collective consciousness species
}

export interface FactionTraits {
  expansionist: number;     // 0-1: Tendency to expand territory
  diplomatic: number;       // 0-1: Willingness to form alliances
  aggressive: number;       // 0-1: Likelihood to engage in conflict
  technological: number;    // 0-1: Focus on research and development
  economic: number;        // 0-1: Trading and resource management capability
}

export interface Faction {
  id: string;
  name: string;
  type: FactionType;
  traits: FactionTraits;
  color: string;           // Hex color code for territory visualization
  homeSystemId: string;    // The faction's starting system
  controlledSystems: Set<string>; // IDs of systems under faction control
  relations: Map<string, number>; // Relationship scores with other factions (-100 to 100)
} 