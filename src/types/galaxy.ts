import * as THREE from 'three';
import { Euler, TypedArray, Vector3 } from "three";

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

export interface ResourcePatch {
  id: string;
  resourceType: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  resource: Resource;
}

export interface Planet {
  id: string;
  name: string;
  type: PlanetType;
  size: number;
  orbitSpeed: number;
  resources: Resource[];
  buildings: Building[];
  resourcePatches: ResourcePatch[];
  starId: string;
}

export interface Building {
  id: number;
  type: BuildingType;
  resourceType: string;
  planetId: string;
  starId: string;
  position: Vector3;
  normal: Vector3;
  rotation: Euler;
}

export enum BuildingType {
  RESOURCE_EXTRACTOR = 'RESOURCE_EXTRACTOR',
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
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  RARE_EARTH = 'RARE_EARTH',
  TITANIUM = 'TITANIUM',
  URANIUM = 'URANIUM',
  PLUTONIUM = 'PLUTONIUM',
  HELIUM_3 = 'HELIUM_3',
  DEUTERIUM = 'DEUTERIUM',
  ANTIMATTER = 'ANTIMATTER',
  EXOTIC_MATTER = 'EXOTIC_MATTER',
  DARK_MATTER = 'DARK_MATTER',
  QUANTUM_PARTICLES = 'QUANTUM_PARTICLES',
  GRAVITONIUM = 'GRAVITONIUM',
  WATER = 'WATER',
  ICE = 'ICE',
  METHANE = 'METHANE',
  AMMONIA = 'AMMONIA',
  FOOD = 'FOOD',
  ORGANICS = 'ORGANICS',
  FUEL = 'FUEL',
  PLASMA = 'PLASMA',
  CRYSTALS = 'CRYSTALS',
  SILICON = 'SILICON',
  CARBON = 'CARBON',
  LITHIUM = 'LITHIUM',
  COBALT = 'COBALT',
  IRIDIUM = 'IRIDIUM',
  HYDROGEN = 'HYDROGEN'
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