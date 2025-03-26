import * as THREE from 'three';
import { Planet } from './galaxy';

export enum UnitType {
    SHIP = 'SHIP',
    SATELLITE = 'SATELLITE',
    PROBE = 'PROBE'
}

export enum UnitStatus {
    IDLE = 'IDLE',
    MOVING = 'MOVING',
    ORBITING = 'ORBITING',
    DOCKING = 'DOCKING'
}

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
} 