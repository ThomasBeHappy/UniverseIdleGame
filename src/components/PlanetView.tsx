import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Planet, Resource, ResourceType } from '../types/galaxy';
import { Building, BuildingType, buildingDefinitions, PlaceableOn } from '../types/buildings';
import waterTexture from '../assets/water.png';
import sandTexture from '../assets/sand.png';
import rockTexture from '../assets/rock.png';
import iceTexture from '../assets/ice.png';
import gasTexture from '../assets/gas.png';
import resourcePatchTexture from '../assets/ore.png';
import { UnitController } from './UnitController';
import { Unit, UnitType, UnitStatus } from '../types/units';

interface PlanetViewProps {
    planet: Planet;
    width: number;
    height: number;
    onBack: () => void;
    onBuildingCreated: (building: Building) => void;
    onBuyBuilding: (cost: Map<ResourceType, number>) => void;
    onCanBuyBuilding: (cost: Map<ResourceType, number>) => boolean;
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
  z-index: 1000;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const BuildModeButton = styled(BackButton) <{ active: boolean }>`
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

const Tooltip = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const BuildingPanel = styled.div`
  position: absolute;
  top: 70px;
  left: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  width: 250px;
  backdrop-filter: blur(4px);

  h2 {
    margin: 0 0 15px 0;
    font-size: 18px;
  }
`;

const BuildingOption = styled.div<{ selected: boolean }>`
  padding: 10px;
  margin-bottom: 8px;
  background: ${props => props.selected ? 'rgba(77, 171, 247, 0.4)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.selected ? 'rgba(77, 171, 247, 0.8)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.selected ? 'rgba(77, 171, 247, 0.6)' : 'rgba(255, 255, 255, 0.1)'};
  }

  h3 {
    margin: 0 0 5px 0;
    font-size: 14px;
  }

  p {
    margin: 0;
    font-size: 12px;
    opacity: 0.8;
  }
`;

const CostList = styled.div`
  margin-top: 5px;
  font-size: 12px;
  opacity: 0.8;
`;

const DebugMenu = styled.div`
    position: absolute;
    bottom: 20px;
    left: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    backdrop-filter: blur(4px);
`;

const DebugButton = styled.button`
    padding: 8px 16px;
    margin: 4px;
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
    private textureLoader: THREE.TextureLoader;
    private onResourcePatchClick: (resource: Resource) => void;
    private onBuildingCreated: (building: Building) => void;
    private onBuyBuilding: (cost: Map<ResourceType, number>) => void;
    private onCanBuyBuilding: (cost: Map<ResourceType, number>) => boolean;
    private isBuildMode: boolean;
    private tooltip: HTMLDivElement;
    private selectedBuildingType: BuildingType | null = null;
    private unitController: UnitController | null = null;

    constructor(
        canvas: HTMLCanvasElement,
        planet: Planet,
        width: number,
        height: number,
        onResourcePatchClick: (resource: Resource) => void,
        onBuildingCreated: (building: Building) => void,
        onBuyBuilding: (cost: Map<ResourceType, number>) => void,
        onCanBuyBuilding: (cost: Map<ResourceType, number>) => boolean
    ) {
        this.planet = planet;
        this.width = width;
        this.height = height;
        this.onResourcePatchClick = onResourcePatchClick;
        this.onBuildingCreated = onBuildingCreated;
        this.onBuyBuilding = onBuyBuilding;
        this.onCanBuyBuilding = onCanBuyBuilding;
        this.isBuildMode = false;
        this.buildings = [];
        this.textureLoader = new THREE.TextureLoader();

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
        
        // Use right mouse button for camera controls
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.LEFT,
            MIDDLE: THREE.MOUSE.MIDDLE,
            RIGHT: THREE.MOUSE.ROTATE
        };
        
        // Disable left-click and middle-click camera controls
        this.controls.enablePan = false;  // Disable camera panning
        this.controls.enableZoom = true;  // Keep zoom enabled (mouse wheel)

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

        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.display = 'none';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.zIndex = '1000';
        this.tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
        this.tooltip.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        this.tooltip.style.borderRadius = '4px';
        this.tooltip.style.padding = '4px 8px';
        this.tooltip.style.color = 'white';
        this.tooltip.style.fontSize = '12px';
        this.tooltip.style.backdropFilter = 'blur(4px)';
        document.body.appendChild(this.tooltip);
    }

    private loadTexture(path: string, isPatch: boolean = false): THREE.Texture {
        // Create a default texture in case loading fails
        const defaultTexture = new THREE.Texture();
        defaultTexture.needsUpdate = true;

        try {
            const texture = this.textureLoader.load(
                path,
                // Success callback
                (loadedTexture) => {
                    if (!isPatch) {
                        loadedTexture.wrapS = THREE.RepeatWrapping;
                        loadedTexture.wrapT = THREE.RepeatWrapping;
                        loadedTexture.repeat.set(4, 2);
                    }
                    else {
                        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
                        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
                        loadedTexture.repeat.set(1, 1);
                    }
                    // Force material update when texture loads
                    if (this.planetMesh) {
                        (this.planetMesh.material as THREE.MeshPhongMaterial).needsUpdate = true;
                    }
                },
                // Progress callback
                undefined,
                // Error callback
                (error) => {
                    console.error(`Failed to load texture ${path}:`, error);
                }
            );
            return texture;
        } catch (error) {
            console.error(`Error setting up texture ${path}:`, error);
            return defaultTexture;
        }
    }

    private getPlanetTexture(): THREE.Texture {
        switch (this.planet.type) {
            case 'OCEAN':
                return this.loadTexture(waterTexture);
            case 'DESERT':
                return this.loadTexture(sandTexture);
            case 'ROCKY':
                return this.loadTexture(rockTexture);
            case 'ICE':
                return this.loadTexture(iceTexture);
            case 'GAS_GIANT':
                // For gas giants, use a procedural texture or fallback to rock
                const texture = this.loadTexture(gasTexture);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(2, 1); // Less tiling for gas giants
                return texture;
            default:
                return this.loadTexture(rockTexture);
        }
    }

    private createPlanet(): THREE.Mesh {
        const geometry = new THREE.IcosahedronGeometry(1, 4); // Radius 1, detail level 4 for smooth appearance
        const texture = this.getPlanetTexture();
        
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            bumpMap: texture,
            bumpScale: 0.05,
            shininess: 30,
            specular: 0x333333,
            color: this.getPlanetColor()
        });

        // For gas giants, add atmosphere effects
        if (this.planet.type === 'GAS_GIANT') {
            material.transparent = true;
            material.opacity = 0.9;
            material.emissive = new THREE.Color(this.getPlanetColor());
            material.emissiveIntensity = 0.2;
        }

        return new THREE.Mesh(geometry, material);
    }

    private createResourcePatches(): THREE.Mesh[] {
        const patches: THREE.Mesh[] = [];
        const patchGeometry = new THREE.CircleGeometry(0.1, 32);
        const patchTexture = this.loadTexture(resourcePatchTexture, true);


        // If planet has saved resource patches, use those positions
        if (this.planet.resourcePatches && this.planet.resourcePatches.length > 0) {
            this.planet.resourcePatches.forEach(patch => {
                const patchMaterial = new THREE.MeshPhongMaterial({
                    map: patchTexture,
                    color: this.getResourceColor(patch.resourceType),
                    transparent: true,
                    side: THREE.DoubleSide,
                    bumpMap: patchTexture,
                    bumpScale: 0.3,
                });

                const mesh = new THREE.Mesh(patchGeometry, patchMaterial);
                mesh.position.copy(patch.position);
                mesh.lookAt(0, 0, 0);
                // Ensure texture is properly oriented
                mesh.rotateZ(Math.PI);
                mesh.userData.resource = patch.resource;
                patches.push(mesh);
            });
        } else {
            // Generate new resource patches if none exist
            this.planet.resourcePatches = [];
            this.planet.resources.forEach(resource => {
                const phi = Math.acos(-1 + Math.random() * 2);
                const theta = Math.random() * Math.PI * 2;

                const x = Math.sin(phi) * Math.cos(theta);
                const y = Math.sin(phi) * Math.sin(theta);
                const z = Math.cos(phi);

                const position = new THREE.Vector3(x, y, z);
                const normal = position.clone().normalize();

                const patchMaterial = new THREE.MeshPhongMaterial({
                    map: patchTexture,
                    color: this.getResourceColor(resource.type),
                    transparent: true,
                    side: THREE.DoubleSide,
                    bumpMap: patchTexture,
                    bumpScale: 0.3,
                });

                const patch = new THREE.Mesh(patchGeometry, patchMaterial);
                patch.position.copy(position);
                patch.lookAt(0, 0, 0);
                // Ensure texture is properly oriented
                patch.rotateZ(Math.PI);
                patch.userData.resource = resource;
                patches.push(patch);

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
            this.updateTooltip(event);
        } else {
            this.tooltip.style.display = 'none';
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
        if (this.isBuildMode && this.selectedBuildingType) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObjects([this.planetMesh, ...this.buildings]);

            if (intersects.length > 0) {
                const buildingIntersect = intersects.find(intersect => intersect.object.userData.building);
                if (buildingIntersect) {
                    return;
                }

                const intersect = intersects[0];
                const buildingDef = buildingDefinitions[this.selectedBuildingType];

                if (!this.onCanBuyBuilding(buildingDef.cost)) {
                    return;
                }

                // Check if we're clicking on a resource patch
                const resourcePatch = this.resourcePatches.find(patch => patch === intersect.object);

                if (resourcePatch) {
                    // Handle resource patch placement
                    if (buildingDef.placeableOn === PlaceableOn.RESOURCE_PATCH) {
                        const resource = resourcePatch.userData.resource;
                        const building = this.createBuilding(
                            intersect.point,
                            intersect.face!.normal,
                            this.selectedBuildingType
                        );

                        // update player resources
                        this.onBuyBuilding(buildingDef.cost);

                        this.scene.add(building);
                        this.buildings.push(building);

                        this.onResourcePatchClick(resource);
                        this.onBuildingCreated({
                            id: building.id,
                            type: this.selectedBuildingType,
                            resourceType: resource.type,
                            planetId: this.planet.id,
                            starId: this.planet.starId,
                            position: intersect.point,
                            normal: intersect.face!.normal,
                            rotation: building.rotation,
                            placeableOn: buildingDef.placeableOn
                        });

                        this.setSelectedBuilding(null);
                    }
                } else if (buildingDef.placeableOn === PlaceableOn.LAND) {
                    // Handle land placement
                    const building = this.createBuilding(
                        intersect.point,
                        intersect.face!.normal,
                        this.selectedBuildingType
                    );

                    this.scene.add(building);
                    this.buildings.push(building);

                    this.onBuildingCreated({
                        id: building.id,
                        type: this.selectedBuildingType,
                        resourceType: '', // Empty string for land buildings
                        planetId: this.planet.id,
                        starId: this.planet.starId,
                        position: intersect.point,
                        normal: intersect.face!.normal,
                        rotation: building.rotation,
                        placeableOn: buildingDef.placeableOn
                    });

                    this.setSelectedBuilding(null);
                }
            }
        } else {
            // Handle unit selection and movement
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            this.unitController?.handleClick(this.raycaster, this.planetMesh);
        }
    };

    private updatePlacementIndicator() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([this.planetMesh, ...this.buildings]);

        const indicator = document.getElementById('placement-indicator');
        if (indicator) {
            if (intersects.length > 0) {
                const buildingIntersect = intersects.find(intersect => intersect.object.userData.building);
                if (buildingIntersect) {
                    indicator.style.background = 'rgba(255, 0, 0, 0.8)';
                } else {
                    const intersect = intersects[0];
                    const buildingDef = this.selectedBuildingType ? buildingDefinitions[this.selectedBuildingType] : null;


                    if (!buildingDef) {
                        indicator.style.background = 'rgba(255, 0, 0, 0.8)';
                    } else {
                        if (!this.onCanBuyBuilding(buildingDef.cost)) {
                            indicator.style.background = 'rgba(255, 0, 0, 0.8)';
                        } else {
                            // Check if we're hovering over a resource patch
                            // Check if we're hovering over a resource patch
                            const resourcePatch = this.resourcePatches.find(patch => patch === intersect.object);

                            if (resourcePatch) {
                                // Resource patch placement
                                indicator.style.background = buildingDef.placeableOn === PlaceableOn.RESOURCE_PATCH
                                    ? 'rgba(77, 171, 247, 0.8)'
                                    : 'rgba(255, 0, 0, 0.8)';
                            } else {
                                // Land placement
                                indicator.style.background = buildingDef.placeableOn === PlaceableOn.LAND
                                    ? 'rgba(77, 171, 247, 0.8)'
                                    : 'rgba(255, 0, 0, 0.8)';
                            }
                        }
                    }
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

    private updateTooltip(event: MouseEvent) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([this.planetMesh, ...this.resourcePatches]);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const buildingDef = this.selectedBuildingType ? buildingDefinitions[this.selectedBuildingType] : null;

            if (buildingDef) {
                let tooltipText = '';

                // Check if we're hovering over a resource patch
                const resourcePatch = this.resourcePatches.find(patch => patch === intersect.object);

                if (resourcePatch) {
                    const resource = resourcePatch.userData.resource;
                    tooltipText = `Resource: ${resource.type}\n`;
                    tooltipText += `Can place ${buildingDef.name}: ${buildingDef.placeableOn === PlaceableOn.RESOURCE_PATCH ? 'Yes' : 'No'}`;
                } else {
                    tooltipText = `Surface: Land\n`;
                    tooltipText += `Can place ${buildingDef.name}: ${buildingDef.placeableOn === PlaceableOn.LAND ? 'Yes' : 'No'}`;
                }

                this.tooltip.textContent = tooltipText;
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = `${event.clientX + 10}px`;
                this.tooltip.style.top = `${event.clientY + 10}px`;
            }
        } else {
            this.tooltip.style.display = 'none';
        }
    }

    setSelectedBuilding(type: BuildingType | null) {
        this.selectedBuildingType = type;
        this.isBuildMode = type !== null;

        // Update resource patch opacity
        this.resourcePatches.forEach(patch => {
            const material = patch.material as THREE.MeshPhongMaterial;
            material.opacity = this.isBuildMode ? 0.8 : 0.5;
        });

        // Hide placement indicator when exiting build mode
        if (!this.isBuildMode) {
            const indicator = document.getElementById('placement-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }

    getScene(): THREE.Scene {
        return this.scene;
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
        document.body.removeChild(this.tooltip);
    }

    setUnitController(unitController: UnitController) {
        this.unitController = unitController;
    }
}

export function PlanetView({ planet, width, height, onBack, onBuildingCreated, onBuyBuilding, onCanBuyBuilding }: PlanetViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<PlanetRenderer | null>(null);
    const unitControllerRef = useRef<UnitController | null>(null);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [unitCount, setUnitCount] = useState(0);

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
                if (selectedBuilding) {
                    console.log('Place building on resource:', resource);
                }
            },
            (building) => {
                console.log(`Building created on planet ${planet.name}:`, building);
                onBuildingCreated(building);
            },
            (cost) => {
                onBuyBuilding(cost);
            },
            (cost) => {
                return onCanBuyBuilding(cost);
            }
        );

        // Initialize UnitController and store in both refs
        const unitController = new UnitController(rendererRef.current.getScene());
        unitControllerRef.current = unitController;
        rendererRef.current.setUnitController(unitController);

        // Add update call to animation loop
        const originalAnimate = rendererRef.current.animate;
        rendererRef.current.animate = () => {
            originalAnimate.call(rendererRef.current);
            unitController.update(0.016); // Assuming 60fps for now
        };

        rendererRef.current.animate();

        return () => {
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            if (unitControllerRef.current) {
                unitControllerRef.current.dispose();
                unitControllerRef.current = null;
            }
            container.removeChild(canvas);
        };
    }, [planet, width, height]);

    const spawnUnit = (type: UnitType) => {
        if (!unitControllerRef.current) {
            console.error('UnitController not initialized');
            return;
        }

        // Create random position on or near planet surface
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(2 * Math.random() - 1);
        const radius = 1.5; // Slightly above planet surface

        const position = new THREE.Vector3(
            radius * Math.sin(theta) * Math.cos(phi),
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(theta)
        );

        console.log('Spawning unit at position:', position);

        const unit: Unit = {
            id: `unit-${unitCount}`,
            type,
            position,
            rotation: new THREE.Euler(),
            velocity: new THREE.Vector3(),
            status: UnitStatus.IDLE
        };

        unitControllerRef.current.addUnit(unit);
        console.log('Unit added:', unit.id);
        setUnitCount(prev => prev + 1);
    };

    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setSelectedBuilding(selectedBuilding);
        }
    }, [selectedBuilding]);

    return (
        <Container ref={containerRef}>
            <BackButton onClick={onBack}>← Back to System</BackButton>
            <BuildingPanel>
                <h2>Buildings</h2>
                {Object.entries(buildingDefinitions).map(([type, def]) => (
                    <BuildingOption
                        key={type}
                        selected={selectedBuilding === type}
                        onClick={() => setSelectedBuilding(selectedBuilding === type ? null : type as BuildingType)}
                    >
                        <h3>{def.name}</h3>
                        <p>{def.description}</p>
                        <CostList>
                            {Array.from(def.cost.entries()).map(([resource, amount]) => (
                                <div key={resource}>
                                    {resource}: {amount}
                                </div>
                            ))}
                        </CostList>
                    </BuildingOption>
                ))}
            </BuildingPanel>
            <PlacementIndicator id="placement-indicator" valid={!!selectedBuilding} />
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
            <DebugMenu>
                <h3>Debug Controls</h3>
                <DebugButton onClick={() => spawnUnit(UnitType.SHIP)}>
                    Spawn Ship
                </DebugButton>
                <DebugButton onClick={() => spawnUnit(UnitType.SATELLITE)}>
                    Spawn Satellite
                </DebugButton>
                <DebugButton onClick={() => spawnUnit(UnitType.PROBE)}>
                    Spawn Probe
                </DebugButton>
            </DebugMenu>
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