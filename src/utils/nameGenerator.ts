import { PlanetType, StarType } from '../types/galaxy';

// Star name components
const starPrefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
const starRoots = ['Centauri', 'Draconis', 'Cygni', 'Eridani', 'Lyrae', 'Orionis', 'Persei', 'Tauri', 'Ursae', 'Vega'];
const starSuffixes = ['Prime', 'Major', 'Minor', 'Superior', 'Inferior', 'Maxima', 'Minima', 'Nova', 'Prima', 'Ultima'];

// Planet designation letters (following astronomical naming conventions)
const planetLetters = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Planet name components based on type
const planetNameComponents = {
    [PlanetType.ROCKY]: {
        prefixes: ['Terra', 'Petra', 'Lithos', 'Geo', 'Stone'],
        roots: ['rock', 'crag', 'peak', 'mount', 'cliff'],
        suffixes: ['or', 'us', 'ax', 'ix', 'ar']
    },
    [PlanetType.GAS_GIANT]: {
        prefixes: ['Aero', 'Nebul', 'Atmo', 'Vortex', 'Storm'],
        roots: ['gas', 'cloud', 'wind', 'tempest', 'cyclone'],
        suffixes: ['on', 'us', 'ex', 'or', 'is']
    },
    [PlanetType.ICE]: {
        prefixes: ['Cryo', 'Glacia', 'Frost', 'Arctic', 'Polar'],
        roots: ['ice', 'snow', 'frost', 'glacier', 'freeze'],
        suffixes: ['a', 'us', 'ix', 'or', 'is']
    },
    [PlanetType.DESERT]: {
        prefixes: ['Arida', 'Sahara', 'Dune', 'Solar', 'Arid'],
        roots: ['sand', 'dust', 'waste', 'dune', 'mesa'],
        suffixes: ['is', 'us', 'ar', 'ox', 'ex']
    },
    [PlanetType.OCEAN]: {
        prefixes: ['Hydro', 'Aqua', 'Mare', 'Oceanus', 'Thalasso'],
        roots: ['sea', 'wave', 'tide', 'deep', 'blue'],
        suffixes: ['is', 'us', 'a', 'um', 'or']
    }
};

// Special name components for specific star types
const starTypeSpecificNames = {
    [StarType.NEUTRON]: {
        prefixes: ['PSR', 'NS', 'J'],
        roots: ['1234', '5678', '2000', '1900', '0120'],
        suffixes: ['+6789', '-3456', '+2345', '-7890', '+1234']
    },
    [StarType.PULSAR]: {
        prefixes: ['PSR', 'MSP', 'B'],
        roots: ['1919', '0531', '0833', '1937', '0329'],
        suffixes: ['+21', '-65', '+45', '-23', '+10']
    },
    [StarType.BLACK_HOLE]: {
        prefixes: ['NGC', 'M', 'TON', 'PKS', 'Cygnus'],
        roots: ['3783', '87', '618', '1461', 'X'],
        suffixes: ['-1', '*', '-A', '-B', '']
    }
};

function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateStarName(starType: StarType): string {
    // Special naming for neutron stars and pulsars (using realistic designations)
    if (starType === StarType.NEUTRON || starType === StarType.PULSAR) {
        const components = starTypeSpecificNames[starType];
        const prefix = getRandomElement(components.prefixes);
        const root = getRandomElement(components.roots);
        const suffix = getRandomElement(components.suffixes);
        return `${prefix} ${root}${suffix}`;
    }

    // Regular star naming
    const usePrefix = Math.random() > 0.5;
    const useSuffix = Math.random() > 0.7;

    let name = '';
    if (usePrefix) {
        name += getRandomElement(starPrefixes) + ' ';
    }
    name += getRandomElement(starRoots);
    if (useSuffix) {
        name += ' ' + getRandomElement(starSuffixes);
    }

    return name;
}

export function generatePlanetName(planetType: PlanetType, starName: string, planetIndex: number): string {
    // For neutron stars and pulsars, use their specific naming convention
    if (starName.startsWith('PSR') || starName.startsWith('NS') || starName.startsWith('MSP') || starName.startsWith('B')) {
        return `${starName} ${String.fromCharCode(97 + planetIndex)}`; // a, b, c, etc.
    }

    // For regular stars, use standard exoplanet naming convention
    // If the star name has multiple parts (e.g., "Alpha Centauri"), we keep it as is
    // If it's a single word, we add a hyphen before the letter
    const hasSpace = starName.includes(' ');
    const letter = planetLetters[planetIndex] || planetLetters[planetLetters.length - 1];

    return hasSpace ? `${starName} ${letter}` : `${starName}-${letter}`;
} 