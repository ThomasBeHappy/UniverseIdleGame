import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Building, BuildingType, Planet, Resource } from '../types/galaxy';

interface PlanetViewProps {
  planet: Planet;
  width: number;
  height: number;
  onBack: () => void;
  onBuildingCreated: (building: Building) => void;
}

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

const BackgroundCanvas = styled.canvas`
  background-color: #000;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const BuildModeButton = styled(BackButton)<{ active: boolean }>`
  left: 160px;
  background: ${props => props.active ? 'rgba(77, 171, 247, 0.4)' : 'rgba(0, 0, 0, 0.6)'};
  border-color: ${props => props.active ? 'rgba(77, 171, 247, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
`;

const PlanetInfo = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  max-width: 300px;

  h2 {
    margin: 0 0 10px 0;
    font-size: 24px;
  }

  h3 {
    margin: 15px 0 5px 0;
    font-size: 18px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin-bottom: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
`;

const ResourceMarker = styled.div`
  position: absolute;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: white;
    transform: translate(-50%, -50%) scale(1.2);
  }
`;

const PlacementIndicator = styled.div<{ valid: boolean }>`
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${props => props.valid ? 'rgba(77, 171, 247, 0.8)' : 'rgba(255, 0, 0, 0.8)'};
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
`;

class PlanetRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private planet: Planet;
  private planetMesh: THREE.Mesh;
  private resourcePatches: THREE.Mesh[];
  private buildings: THREE.Mesh[];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private width: number;
  private height: number;
  private onResourcePatchClick: (resource: Resource) => void;
  private onBuildingCreated: (building: Building) => void;
  private isBuildMode: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    planet: Planet,
    width: number,
    height: number,
    onResourcePatchClick: (resource: Resource) => void,
    onBuildingCreated: (building: Building) => void
  ) {
    this.planet = planet;
    this.width = width;
    this.height = height;
    this.onResourcePatchClick = onResourcePatchClick;
    this.onBuildingCreated = onBuildingCreated;
    this.isBuildMode = false;
    this.buildings = [];

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI;

    // Setup raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Create planet
    this.planetMesh = this.createPlanet();
    this.scene.add(this.planetMesh);

    // Create resource patches
    this.resourcePatches = this.createResourcePatches();
    this.resourcePatches.forEach(patch => this.planetMesh.add(patch));

    // Get all buildings from the planet
    this.buildings = this.planet.buildings.map(building => this.createBuilding(building.position, building.normal, building.type));
    this.buildings.forEach(building => this.planetMesh.add(building));

    console.log(this.buildings);
    

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);

    // Add event listeners
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('click', this.onClick);
  }

  private createPlanet(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: this.getPlanetColor(),
      shininess: 30,
      specular: 0x333333
    });
    return new THREE.Mesh(geometry, material);
  }

  private createResourcePatches(): THREE.Mesh[] {
    const patches: THREE.Mesh[] = [];
    const patchGeometry = new THREE.CircleGeometry(0.1, 32);
    
    // If planet has saved resource patches, use those positions
    if (this.planet.resourcePatches && this.planet.resourcePatches.length > 0) {
      this.planet.resourcePatches.forEach(patch => {
        const patchMaterial = new THREE.MeshPhongMaterial({
          color: this.getResourceColor(patch.resourceType),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(patchGeometry, patchMaterial);
        mesh.position.copy(patch.position);
        mesh.lookAt(0, 0, 0);
        mesh.userData.resource = patch.resource;
        patches.push(mesh);
      });
    } else {
      // Generate new resource patches if none exist
      this.planet.resourcePatches = [];
      this.planet.resources.forEach(resource => {
        // Generate random position on sphere surface
        const phi = Math.acos(-1 + Math.random() * 2);
        const theta = Math.random() * Math.PI * 2;
        
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);

        const position = new THREE.Vector3(x, y, z);
        const normal = position.clone().normalize();

        const patchMaterial = new THREE.MeshPhongMaterial({
          color: this.getResourceColor(resource.type),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });

        const patch = new THREE.Mesh(patchGeometry, patchMaterial);
        patch.position.copy(position);
        patch.lookAt(0, 0, 0);
        patch.userData.resource = resource;
        patches.push(patch);

        // Save the resource patch data
        this.planet.resourcePatches.push({
          id: patch.id.toString(),
          resourceType: resource.type,
          position: position,
          normal: normal,
          resource: resource
        });
      });
    }

    return patches;
  }

  private getPlanetColor(): string {
    switch (this.planet.type) {
      case 'ROCKY':
        return '#a88c7d';
      case 'GAS_GIANT':
        return '#e4a672';
      case 'ICE':
        return '#a8d8e8';
      case 'DESERT':
        return '#e8c07a';
      case 'OCEAN':
        return '#4dabf7';
      default:
        return '#ffffff';
    }
  }

  private getResourceColor(resourceType: string): string {
    switch (resourceType) {
      case 'IRON':
        return '#8b4513';
      case 'COPPER':
        return '#b87333';
      case 'GOLD':
        return '#ffd700';
      case 'SILVER':
        return '#c0c0c0';
      case 'PLATINUM':
        return '#e5e4e2';
      case 'URANIUM':
        return '#00ff00';
      case 'THORIUM':
        return '#ff00ff';
      case 'TITANIUM':
        return '#808080';
      case 'CRYSTAL':
        return '#00ffff';
      case 'GAS':
        return '#ff69b4';
      default:
        return '#ffffff';
    }
  }

  private onMouseMove = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isBuildMode) {
      this.updatePlacementIndicator();
    }
  };

  private createBuilding(position: THREE.Vector3, normal: THREE.Vector3, type: BuildingType): THREE.Mesh {
    // Create a simple square building
    const size = 0.05; // Size relative to planet
    const height = 0.1;
    const geometry = new THREE.BoxGeometry(size, height, size);
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x4dabf7,
      shininess: 30,
      specular: 0x333333
    });

    const building = new THREE.Mesh(geometry, material);
    building.position.copy(position);
    
    // Scale the building slightly above the surface
    const offset = 0.001;
    building.position.add(normal.multiplyScalar(offset));
    
    // Make the building face outward from the planet
    building.lookAt(0, 0, 0);
    
    // Add a slight random rotation around the normal
    building.rotateZ(Math.random() * Math.PI * 2);

    building.userData.building = type;
    
    return building;
  }

  private onClick = (event: MouseEvent) => {
    if (!this.isBuildMode) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // check if the raycaster hits a resource patch but also check if it hits a building
    const intersects = this.raycaster.intersectObjects([...this.resourcePatches, ...this.buildings]);

    if (intersects.length > 0) {
      // check if the any of the intersects are a building
      const buildingIntersect = intersects.find(intersect => intersect.object.userData.building);
      if (buildingIntersect) {
        return;
      }

      const intersect = intersects[0];

      if (intersect.object.userData.resource) {
        const resource = intersect.object.userData.resource;
        
        // Create building at intersection point
      const building = this.createBuilding(
        intersect.point,
        intersect.face!.normal,
        BuildingType.RESOURCE_EXTRACTOR
      );
      
      // Add building to scene
      this.scene.add(building);
      this.buildings.push(building);
      
      // Notify about placement
      this.onResourcePatchClick(resource);
      this.onBuildingCreated({
        id: building.id,
        type: BuildingType.RESOURCE_EXTRACTOR,
        resourceType: resource.type,
        planetId: this.planet.id,
        starId: this.planet.starId,
        position: intersect.point,
          normal: intersect.face!.normal,
          rotation: building.rotation
        });
      }
    }
  };

  private updatePlacementIndicator() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects([...this.resourcePatches, ...this.buildings]);
    
    // Update placement indicator position and validity
    const indicator = document.getElementById('placement-indicator');
    if (indicator) {
      if (intersects.length > 0) {
        // check if the any of the intersects are a building
        const buildingIntersect = intersects.find(intersect => intersect.object.userData.building);
        if (buildingIntersect) {
          indicator.style.background = 'rgba(255, 0, 0, 0.8)';
        } else {
          indicator.style.background = 'rgba(77, 171, 247, 0.8)';
        }
        const point = intersects[0].point;
        const screenPoint = point.clone().project(this.camera);
        const x = (screenPoint.x + 1) * this.width / 2;
        const y = (-screenPoint.y + 1) * this.height / 2;
        
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;
        indicator.style.display = 'block';
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  setBuildMode(enabled: boolean) {
    this.isBuildMode = enabled;
    
    // Update resource patch opacity
    this.resourcePatches.forEach(patch => {
      const material = patch.material as THREE.MeshPhongMaterial;
      material.opacity = enabled ? 0.8 : 0.5;
    });

    // Hide placement indicator when exiting build mode
    if (!enabled) {
      const indicator = document.getElementById('placement-indicator');
      if (indicator) {
        indicator.style.display = 'none';
      }
    }

    // when exiting build mode set the button text to "Build Resource Extractor"
    if (!enabled) {
      const buildButton = document.getElementById('build-button');
      if (buildButton) {
        buildButton.textContent = 'Build Resource Extractor';
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.dispose();
    this.planetMesh.geometry.dispose();
    (this.planetMesh.material as THREE.Material).dispose();
    this.resourcePatches.forEach(patch => {
      patch.geometry.dispose();
      (patch.material as THREE.Material).dispose();
    });
    this.buildings.forEach(building => {
      building.geometry.dispose();
      (building.material as THREE.Material).dispose();
    });
  }
}

export function PlanetView({ planet, width, height, onBack, onBuildingCreated }: PlanetViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PlanetRenderer | null>(null);
  const [isBuildMode, setIsBuildMode] = useState(false);
  const [hoveredResource, setHoveredResource] = useState<Resource | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    rendererRef.current = new PlanetRenderer(
      canvas,
      planet,
      width,
      height,
      (resource) => {
        if (isBuildMode) {
          // TODO: Implement building placement
          console.log('Place building on resource:', resource);
        }
      },
      (building) => {
        console.log(`Building created on planet ${planet.name}:`, building);
        onBuildingCreated(building);
      }
    );

    rendererRef.current.animate();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      container.removeChild(canvas);
    };
  }, [planet, width, height]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setBuildMode(isBuildMode);
    }
  }, [isBuildMode]);

  return (
    <Container ref={containerRef}>
      <BackButton onClick={onBack}>← Back to System</BackButton>
      <BuildModeButton 
        active={isBuildMode}
        onClick={() => setIsBuildMode(!isBuildMode)}
      >
        {isBuildMode ? 'Cancel Building' : 'Build Resource Extractor'}
      </BuildModeButton>
      <PlacementIndicator id="placement-indicator" valid={!!hoveredResource} />
      <PlanetInfo>
        <h2>{planet.name}</h2>
        <p>Type: {planet.type}</p>
        <h3>Resources</h3>
        <ul>
          {planet.resources.map((resource: Resource) => (
            <li key={resource.type}>
              {resource.type}: {Math.round(resource.amount)} units
              <br />
              Regeneration: {resource.regenerationRate.toFixed(2)}/s
            </li>
          ))}
        </ul>
      </PlanetInfo>
    </Container>
  );
}

function getPlanetColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'rocky':
      return '#8B4513';
    case 'gas giant':
      return '#FFA500';
    case 'ice':
      return '#87CEEB';
    case 'desert':
      return '#DEB887';
    case 'ocean':
      return '#1E90FF';
    default:
      return '#808080';
  }
}

function getResourceColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'water':
      return '#1E90FF';
    case 'fuel':
      return '#FF4500';
    case 'iron':
      return '#A9A9A9';
    case 'copper':
      return '#CD7F32';
    case 'gold':
      return '#FFD700';
    case 'platinum':
      return '#E5E4E2';
    case 'rare earth elements':
      return '#32CD32';
    case 'titanium':
      return '#C0C0C0';
    case 'uranium':
      return '#00FF00';
    case 'silicon':
      return '#DDA0DD';
    case 'carbon':
      return '#000000';
    case 'methane':
      return '#98FB98';
    case 'ammonia':
      return '#F0F8FF';
    case 'helium-3':
      return '#00FFFF';
    case 'deuterium':
      return '#FF69B4';
    case 'plasma':
      return '#FF1493';
    case 'hydrogen':
      return '#FFB6C1';
    case 'ice':
      return '#F0FFFF';
    case 'organics':
      return '#228B22';
    case 'food':
      return '#90EE90';
    case 'minerals':
      return '#DAA520';
    default:
      return '#FFFFFF';
  }
} 