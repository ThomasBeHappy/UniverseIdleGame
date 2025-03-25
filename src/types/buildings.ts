import { Euler, Vector3 } from "three";
import { ResourceType } from "./galaxy";

export interface Building {
    id: number;
    type: BuildingType;
    resourceType: string;
    planetId: string;
    starId: string;
    position: Vector3;
    normal: Vector3;
    rotation: Euler;
    placeableOn: PlaceableOn;
}

export enum PlaceableOn {
    RESOURCE_PATCH = 'RESOURCE_PATCH',
    LAND = 'LAND',
    WATER = 'WATER',
}

export enum BuildingType {
    RESOURCE_EXTRACTOR = 'RESOURCE_EXTRACTOR',
    RESEARCH_LAB = 'RESEARCH_LAB',
    MANUFACTURING_FACILITY = 'MANUFACTURING_FACILITY',
    AGRICULTURAL_COMPLEX = 'AGRICULTURAL_COMPLEX',
    POWER_PLANT = 'POWER_PLANT',
}

export const buildingDefinitions: Record<BuildingType, {
    name: string;
    description: string;
    cost: Map<ResourceType, number>;
    placeableOn: PlaceableOn;
}> = {
    [BuildingType.RESOURCE_EXTRACTOR]: {
        name: 'Resource Extractor',
        description: 'Extracts resources from the planet',
        cost: new Map([[ResourceType.IRON, 100], [ResourceType.COPPER, 50]]),
        placeableOn: PlaceableOn.RESOURCE_PATCH,
    },
    [BuildingType.RESEARCH_LAB]: {
        name: 'Research Lab',
        description: 'Conducts research on the planet',
        cost: new Map([[ResourceType.IRON, 100], [ResourceType.COPPER, 50]]),
        placeableOn: PlaceableOn.LAND,
    },
    [BuildingType.MANUFACTURING_FACILITY]: {
        name: 'Manufacturing Facility',
        description: 'Manufactures goods from resources',
        cost: new Map([[ResourceType.IRON, 100], [ResourceType.COPPER, 50]]),
        placeableOn: PlaceableOn.LAND,
    },
    [BuildingType.AGRICULTURAL_COMPLEX]: {
        name: 'Agricultural Complex',
        description: 'Produces food from the planet',
        cost: new Map([[ResourceType.IRON, 100], [ResourceType.COPPER, 50]]),
        placeableOn: PlaceableOn.LAND,
    },
    [BuildingType.POWER_PLANT]: {
        name: 'Power Plant',
        description: 'Produces power from the planet',
        cost: new Map([[ResourceType.IRON, 100], [ResourceType.COPPER, 50]]),
        placeableOn: PlaceableOn.LAND,
    },
}

