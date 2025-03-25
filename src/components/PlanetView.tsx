import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Planet, Resource } from '../types/galaxy';

interface PlanetViewProps {
  planet: Planet;
  width: number;
  height: number;
  onBack: () => void;
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

export function PlanetView({ planet, width, height, onBack }: PlanetViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create planet mesh with custom material
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    
    // Create base material for the planet
    const planetMaterial = new THREE.MeshPhongMaterial({
      color: getPlanetColor(planet.type),
      shininess: 30,
    });

    // Create resource patches
    const patches: THREE.Mesh[] = [];
    planet.resources.forEach((resource, index) => {
      const patchGeometry = new THREE.CircleGeometry(0.5, 32);
      const patchMaterial = new THREE.MeshPhongMaterial({
        color: getResourceColor(resource.type),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      
      const patch = new THREE.Mesh(patchGeometry, patchMaterial);

      // Calculate position on sphere
      const phi = Math.acos(-1 + (2 * index) / planet.resources.length);
      const theta = Math.sqrt(planet.resources.length * Math.PI) * phi;

      // Convert spherical coordinates to Cartesian
      const x = 2 * Math.sin(phi) * Math.cos(theta);
      const y = 2 * Math.sin(phi) * Math.sin(theta);
      const z = 2 * Math.cos(phi);

      // Position and orient patch
      patch.position.set(x, y, z);
      patch.lookAt(0, 0, 0);

      // Add some random rotation
      patch.rotateZ(Math.random() * Math.PI * 2);

      patches.push(patch);
    });

    // Create planet mesh
    const planetMesh = new THREE.Mesh(geometry, planetMaterial);
    scene.add(planetMesh);
    planetMeshRef.current = planetMesh;

    // Add patches as children of the planet
    patches.forEach(patch => planetMesh.add(patch));

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      planetMesh.rotation.y += 0.001;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      planetMaterial.dispose();
      patches.forEach(patch => {
        patch.geometry.dispose();
        (patch.material as THREE.Material).dispose();
      });
    };
  }, [planet, width, height]);

  return (
    <Container ref={containerRef}>
      <BackButton onClick={onBack}>← Back to System</BackButton>
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