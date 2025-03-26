import * as THREE from 'three';
import { Planet } from './galaxy';

export enum UnitType {
    SHIP = 'SHIP',
    SATELLITE = 'SATELLITE',
    PROBE = 'PROBE',
    INFANTRY = 'INFANTRY',
    TANK = 'TANK',
    ARTILLERY = 'ARTILLERY'
}

export enum UnitStatus {
    IDLE = 'IDLE',
    MOVING = 'MOVING',
    ORBITING = 'ORBITING',
    DOCKING = 'DOCKING'
}

export enum UnitCategory {
    AIR = 'AIR',
    SPACE = 'SPACE',
    GROUND = 'GROUND'
}

export interface UnitStats {
    speed: number;
    altitude: number;
    turnRate: number;
    health: number;
}

export const UnitDefinitions: Record<UnitType, {
    category: UnitCategory;
    stats: UnitStats;
    displayName: string;
    description: string;
}> = {
    [UnitType.SHIP]: {
        category: UnitCategory.SPACE,
        stats: { speed: 1.0, altitude: 1.2, turnRate: 1.0, health: 100 },
        displayName: 'Space Ship',
        description: 'Versatile space vessel for exploration and combat'
    },
    [UnitType.SATELLITE]: {
        category: UnitCategory.SPACE,
        stats: { speed: 0.5, altitude: 1.5, turnRate: 0.5, health: 50 },
        displayName: 'Satellite',
        description: 'Orbital platform for surveillance and communication'
    },
    [UnitType.PROBE]: {
        category: UnitCategory.SPACE,
        stats: { speed: 1.2, altitude: 1.3, turnRate: 1.2, health: 30 },
        displayName: 'Probe',
        description: 'Fast reconnaissance unit'
    },
    [UnitType.INFANTRY]: {
        category: UnitCategory.GROUND,
        stats: { speed: 0.3, altitude: 0.01, turnRate: 2.0, health: 50 },
        displayName: 'Infantry',
        description: 'Basic ground combat unit'
    },
    [UnitType.TANK]: {
        category: UnitCategory.GROUND,
        stats: { speed: 0.4, altitude: 0.02, turnRate: 0.8, health: 200 },
        displayName: 'Tank',
        description: 'Heavy ground combat unit'
    },
    [UnitType.ARTILLERY]: {
        category: UnitCategory.GROUND,
        stats: { speed: 0.2, altitude: 0.02, turnRate: 0.5, health: 100 },
        displayName: 'Artillery',
        description: 'Long-range ground support unit'
    }
};

export interface Unit {
    id: string;
    type: UnitType;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    velocity: THREE.Vector3;
    status: UnitStatus;
    targetPosition?: THREE.Vector3;
    orbitTarget?: {
        object: Planet;
        radius: number;
        speed: number;
    };
    path?: THREE.Vector3[];
    pathIndex?: number;
    health: number;
} 