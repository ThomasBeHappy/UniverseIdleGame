import { StarSystem, StarType, Faction } from '../types/galaxy';
import { calculateDistance } from './galaxyGenerator';

const MIN_DISTANCE_FROM_FACTIONS = 300; // Minimum distance from any faction's systems

export function selectStartingSystem(systems: StarSystem[], factions: Faction[]): StarSystem {
  // Filter out black holes and get systems with good starting conditions
  const potentialSystems = systems.filter(system => {
    // Skip black holes and neutron stars
    if (system.star.type === StarType.BLACK_HOLE || 
        system.star.type === StarType.NEUTRON ||
        system.star.type === StarType.PULSAR) {
      return false;
    }
    
    // Prefer systems with more planets and resources
    if (system.planets.length < 2) {
      return false;
    }

    // Check distance from all faction-controlled systems
    for (const faction of factions) {
      for (const controlledId of faction.controlledSystems) {
        const controlledSystem = systems.find(s => s.star.id === controlledId);
        if (controlledSystem) {
          const distance = calculateDistance(
            system.star.position,
            controlledSystem.star.position
          );
          if (distance < MIN_DISTANCE_FROM_FACTIONS) {
            return false;
          }
        }
      }
    }
    
    return true;
  });

  // Sort by desirability (more planets and resources = better)
  const sortedSystems = potentialSystems.sort((a, b) => {
    const scoreA = a.planets.length * 2 + a.resources.length;
    const scoreB = b.planets.length * 2 + b.resources.length;
    return scoreB - scoreA;
  });

  // If we have any valid systems, take one of the top 5
  if (sortedSystems.length > 0) {
    const topSystems = sortedSystems.slice(0, Math.min(5, sortedSystems.length));
    return topSystems[Math.floor(Math.random() * topSystems.length)];
  }

  // If no systems meet our criteria, gradually relax constraints
  console.warn('No ideal starting systems found, relaxing constraints...');
  
  // Try again without the planet requirement
  const backupSystems = systems.filter(system => {
    if (system.star.type === StarType.BLACK_HOLE || 
        system.star.type === StarType.NEUTRON ||
        system.star.type === StarType.PULSAR) {
      return false;
    }

    // Only check faction distance
    for (const faction of factions) {
      for (const controlledId of faction.controlledSystems) {
        const controlledSystem = systems.find(s => s.star.id === controlledId);
        if (controlledSystem) {
          const distance = calculateDistance(
            system.star.position,
            controlledSystem.star.position
          );
          if (distance < MIN_DISTANCE_FROM_FACTIONS * 0.75) { // Slightly reduced safe distance
            return false;
          }
        }
      }
    }
    
    return true;
  });

  if (backupSystems.length > 0) {
    return backupSystems[Math.floor(Math.random() * backupSystems.length)];
  }

  // Last resort: Just find any non-black hole system that's as far from factions as possible
  console.warn('No safe starting systems found, selecting furthest available system...');
  
  let bestSystem = systems[0];
  let maxMinDistance = -Infinity;

  for (const system of systems) {
    if (system.star.type === StarType.BLACK_HOLE || 
        system.star.type === StarType.NEUTRON ||
        system.star.type === StarType.PULSAR) {
      continue;
    }

    let minDistance = Infinity;
    for (const faction of factions) {
      for (const controlledId of faction.controlledSystems) {
        const controlledSystem = systems.find(s => s.star.id === controlledId);
        if (controlledSystem) {
          const distance = calculateDistance(
            system.star.position,
            controlledSystem.star.position
          );
          minDistance = Math.min(minDistance, distance);
        }
      }
    }

    if (minDistance > maxMinDistance) {
      maxMinDistance = minDistance;
      bestSystem = system;
    }
  }

  return bestSystem;
} 