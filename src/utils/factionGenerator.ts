import { Faction, FactionType, FactionTraits, Star } from '../types/galaxy';
import { v4 as uuidv4 } from 'uuid';

// Predefined color palette for factions (avoiding similar colors)
const FACTION_COLORS = [
    '#FF4D4D', // Red
    '#4D4DFF', // Blue
    '#4DFF4D', // Green
    '#FFD700', // Gold
    '#FF4DFF', // Magenta
    '#4DFFFF', // Cyan
    '#FF8C1A', // Orange
    '#8C1AFF', // Purple
    '#1AFF8C', // Mint
    '#FFB366', // Peach
];

// Name generation components
const CORPORATE_PREFIXES = ['Stellar', 'Galactic', 'Nova', 'Quantum', 'Cosmic'];
const CORPORATE_SUFFIXES = ['Corp', 'Industries', 'Enterprises', 'Holdings', 'Incorporated'];
const SCIENTIFIC_PREFIXES = ['Advanced', 'Progressive', 'Innovative', 'Enlightened', 'Evolved'];
const SCIENTIFIC_SUFFIXES = ['Research', 'Academy', 'Institute', 'Foundation', 'Collective'];
const MILITARISTIC_PREFIXES = ['Iron', 'Steel', 'War', 'Battle', 'Storm'];
const MILITARISTIC_SUFFIXES = ['Legion', 'Armada', 'Empire', 'Command', 'Force'];
const PEACEFUL_PREFIXES = ['Harmonious', 'United', 'Peaceful', 'Prosperous', 'Balanced'];
const PEACEFUL_SUFFIXES = ['Alliance', 'Federation', 'Union', 'Coalition', 'Concordat'];
const XENOPHOBIC_PREFIXES = ['Pure', 'Isolated', 'Sovereign', 'Independent', 'Autonomous'];
const XENOPHOBIC_SUFFIXES = ['Domain', 'Territory', 'State', 'Realm', 'Nation'];
const RELIGIOUS_PREFIXES = ['Divine', 'Sacred', 'Holy', 'Blessed', 'Celestial'];
const RELIGIOUS_SUFFIXES = ['Order', 'Church', 'Temple', 'Faith', 'Covenant'];
const HIVE_MIND_PREFIXES = ['Unity', 'Collective', 'Swarm', 'Hive', 'Nexus'];
const HIVE_MIND_SUFFIXES = ['Mind', 'Consciousness', 'Entity', 'Being', 'Overmind'];

function generateFactionName(type: FactionType): string {
    let prefixes: string[] = [];
    let suffixes: string[] = [];

    switch (type) {
        case FactionType.CORPORATE:
            prefixes = CORPORATE_PREFIXES;
            suffixes = CORPORATE_SUFFIXES;
            break;
        case FactionType.SCIENTIFIC:
            prefixes = SCIENTIFIC_PREFIXES;
            suffixes = SCIENTIFIC_SUFFIXES;
            break;
        case FactionType.MILITARISTIC:
            prefixes = MILITARISTIC_PREFIXES;
            suffixes = MILITARISTIC_SUFFIXES;
            break;
        case FactionType.PEACEFUL:
            prefixes = PEACEFUL_PREFIXES;
            suffixes = PEACEFUL_SUFFIXES;
            break;
        case FactionType.XENOPHOBIC:
            prefixes = XENOPHOBIC_PREFIXES;
            suffixes = XENOPHOBIC_SUFFIXES;
            break;
        case FactionType.RELIGIOUS:
            prefixes = RELIGIOUS_PREFIXES;
            suffixes = RELIGIOUS_SUFFIXES;
            break;
        case FactionType.HIVE_MIND:
            prefixes = HIVE_MIND_PREFIXES;
            suffixes = HIVE_MIND_SUFFIXES;
            break;
    }

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix}`;
}

function generateTraits(type: FactionType): FactionTraits {
    // Base traits with some randomization
    const traits: FactionTraits = {
        expansionist: 0.3 + Math.random() * 0.4,  // 0.3-0.7 base
        diplomatic: 0.3 + Math.random() * 0.4,    // 0.3-0.7 base
        aggressive: 0.3 + Math.random() * 0.4,    // 0.3-0.7 base
        technological: 0.3 + Math.random() * 0.4, // 0.3-0.7 base
        economic: 0.3 + Math.random() * 0.4,      // 0.3-0.7 base
    };

    // Modify traits based on faction type
    switch (type) {
        case FactionType.CORPORATE:
            traits.economic += 0.3;
            traits.diplomatic += 0.2;
            break;
        case FactionType.SCIENTIFIC:
            traits.technological += 0.3;
            traits.aggressive -= 0.2;
            break;
        case FactionType.MILITARISTIC:
            traits.aggressive += 0.3;
            traits.expansionist += 0.2;
            break;
        case FactionType.PEACEFUL:
            traits.diplomatic += 0.3;
            traits.aggressive -= 0.3;
            break;
        case FactionType.XENOPHOBIC:
            traits.diplomatic -= 0.3;
            traits.aggressive += 0.2;
            break;
        case FactionType.RELIGIOUS:
            traits.diplomatic += 0.2;
            traits.expansionist += 0.2;
            break;
        case FactionType.HIVE_MIND:
            traits.expansionist += 0.3;
            traits.diplomatic -= 0.2;
            break;
    }

    // Clamp all values between 0 and 1
    Object.keys(traits).forEach(key => {
        traits[key as keyof FactionTraits] = Math.max(0, Math.min(1, traits[key as keyof FactionTraits]));
    });

    return traits;
}

export function generateFaction(type: FactionType, homeSystem: Star, usedColors: Set<string>): Faction {
    // Find an unused color
    let color = FACTION_COLORS[Math.floor(Math.random() * FACTION_COLORS.length)];
    while (usedColors.has(color) && usedColors.size < FACTION_COLORS.length) {
        color = FACTION_COLORS[Math.floor(Math.random() * FACTION_COLORS.length)];
    }

    return {
        id: uuidv4(),
        name: generateFactionName(type),
        type,
        traits: generateTraits(type),
        color,
        homeSystemId: homeSystem.id,
        controlledSystems: new Set([homeSystem.id]),
        relations: new Map()
    };
}

function expandFactionTerritory(faction: Faction, stars: Star[], allFactions: Faction[], targetSize: number): void {
    const unclaimedStars = new Set(stars.filter(star =>
        !allFactions.some(f => f.controlledSystems.has(star.id))
    ));

    // Reduced maximum expansion distance to create tighter clusters
    const MAX_EXPANSION_DISTANCE = 150;
    // Minimum distance to consider a star "adjacent"
    const ADJACENT_DISTANCE = 100;

    while (faction.controlledSystems.size < targetSize && unclaimedStars.size > 0) {
        let bestStar: Star | null = null;
        let bestScore = -Infinity;

        // Find the star that's most suitable for expansion
        for (const unclaimedStar of unclaimedStars) {
            let adjacentCount = 0;
            let nearbyCount = 0;
            let minDistance = Infinity;
            let totalDistance = 0;
            let validStar = false;

            // Check distance to all controlled stars
            for (const controlledId of faction.controlledSystems) {
                const controlledStar = stars.find(s => s.id === controlledId);
                if (controlledStar) {
                    const distance = Math.sqrt(
                        Math.pow(unclaimedStar.position.x - controlledStar.position.x, 2) +
                        Math.pow(unclaimedStar.position.y - controlledStar.position.y, 2)
                    );

                    if (distance < MAX_EXPANSION_DISTANCE) {
                        validStar = true;
                        nearbyCount++;
                        totalDistance += distance;
                        minDistance = Math.min(minDistance, distance);

                        // Count truly adjacent stars separately
                        if (distance < ADJACENT_DISTANCE) {
                            adjacentCount++;
                        }
                    }
                }
            }

            // Only consider stars that are close to our territory
            if (validStar) {
                // Calculate score based on:
                // 1. Number of adjacent systems (heavily weighted)
                // 2. Number of nearby systems (moderately weighted)
                // 3. Minimum distance to any controlled system (closer is better)
                // 4. Average distance to controlled systems (closer is better)
                const avgDistance = totalDistance / nearbyCount;
                const score = (adjacentCount * 2000) + // Major bonus for adjacent stars
                    (nearbyCount * 500) -     // Moderate bonus for nearby stars
                    (avgDistance * 2) -       // Penalty for being far from center
                    (minDistance * 3);        // Penalty for being far from closest star

                if (score > bestScore) {
                    bestScore = score;
                    bestStar = unclaimedStar;
                }
            }
        }

        if (bestStar) {
            faction.controlledSystems.add(bestStar.id);
            unclaimedStars.delete(bestStar);
        } else {
            // If we can't find any valid stars within MAX_EXPANSION_DISTANCE,
            // try to find the closest star to our territory center
            let fallbackStar: Star | null = null;
            let shortestDistance = Infinity;

            // Calculate territory center
            let centerX = 0;
            let centerY = 0;
            let count = 0;
            for (const controlledId of faction.controlledSystems) {
                const controlledStar = stars.find(s => s.id === controlledId);
                if (controlledStar) {
                    centerX += controlledStar.position.x;
                    centerY += controlledStar.position.y;
                    count++;
                }
            }
            centerX /= count;
            centerY /= count;

            // Find closest unclaimed star to territory center
            for (const unclaimedStar of unclaimedStars) {
                const distance = Math.sqrt(
                    Math.pow(unclaimedStar.position.x - centerX, 2) +
                    Math.pow(unclaimedStar.position.y - centerY, 2)
                );

                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    fallbackStar = unclaimedStar;
                }
            }

            if (fallbackStar) {
                faction.controlledSystems.add(fallbackStar.id);
                unclaimedStars.delete(fallbackStar);
            } else {
                break; // No more reachable stars
            }
        }
    }
}

export function generateInitialFactions(stars: Star[]): Faction[] {
    const factions: Faction[] = [];
    const usedColors = new Set<string>();
    const usedStars = new Set<string>();
    const factionTypes = Object.values(FactionType);

    // Calculate target territory size (10% of available stars)
    const targetSize = Math.floor((stars.length - 1) / 10); // -1 to exclude central black hole

    // Create exactly 10 factions
    for (let i = 0; i < 3; i++) {
        // Try to find a starting star that's not too close to other factions
        let bestStar: Star | null = null;
        let maxMinDistance = -Infinity;

        // Try several random stars and pick the one most distant from other factions
        for (let attempt = 0; attempt < 10; attempt++) {
            const candidate = stars[Math.floor(Math.random() * (stars.length - 1)) + 1];
            if (!usedStars.has(candidate.id)) {
                let minDistanceToUsed = Infinity;

                // Find minimum distance to any used star
                for (const usedId of usedStars) {
                    const usedStar = stars.find(s => s.id === usedId);
                    if (usedStar) {
                        const distance = Math.sqrt(
                            Math.pow(candidate.position.x - usedStar.position.x, 2) +
                            Math.pow(candidate.position.y - usedStar.position.y, 2)
                        );
                        minDistanceToUsed = Math.min(minDistanceToUsed, distance);
                    }
                }

                if (minDistanceToUsed > maxMinDistance) {
                    maxMinDistance = minDistanceToUsed;
                    bestStar = candidate;
                }
            }
        }

        if (!bestStar) {
            // Fallback to any unused star if we couldn't find an optimal one
            do {
                bestStar = stars[Math.floor(Math.random() * (stars.length - 1)) + 1];
            } while (usedStars.has(bestStar.id));
        }

        usedStars.add(bestStar.id);

        // Select a random faction type
        const type = factionTypes[Math.floor(Math.random() * factionTypes.length)];

        const faction = generateFaction(type, bestStar, usedColors);
        usedColors.add(faction.color);
        factions.push(faction);
    }

    // Expand each faction's territory
    factions.forEach(faction => {
        expandFactionTerritory(faction, stars, factions, targetSize);
    });

    // Initialize relationships between factions
    factions.forEach(faction => {
        factions.forEach(otherFaction => {
            if (faction.id !== otherFaction.id) {
                // Base relationship score modified by traits
                let relationScore = 0;

                // More diplomatic factions start with better relations
                relationScore += (faction.traits.diplomatic + otherFaction.traits.diplomatic) * 20;

                // Aggressive factions start with worse relations
                relationScore -= (faction.traits.aggressive + otherFaction.traits.aggressive) * 15;

                // Similar faction types tend to get along better
                if (faction.type === otherFaction.type) {
                    relationScore += 20;
                }

                // Closer territories tend to have more tension
                const sharedBorders = Array.from(faction.controlledSystems).some(systemId =>
                    Array.from(otherFaction.controlledSystems).some(otherSystemId => {
                        const system1 = stars.find(s => s.id === systemId);
                        const system2 = stars.find(s => s.id === otherSystemId);
                        if (system1 && system2) {
                            const distance = Math.sqrt(
                                Math.pow(system1.position.x - system2.position.x, 2) +
                                Math.pow(system1.position.y - system2.position.y, 2)
                            );
                            return distance < 300; // Arbitrary distance threshold for "neighboring"
                        }
                        return false;
                    })
                );

                if (sharedBorders) {
                    relationScore -= 15; // Neighboring factions have more tension
                }

                // Clamp relationship score between -100 and 100
                relationScore = Math.max(-100, Math.min(100, relationScore));

                faction.relations.set(otherFaction.id, relationScore);
            }
        });
    });

    return factions;
} 