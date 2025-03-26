import * as THREE from 'three';
import { Unit, UnitType, UnitStatus } from '../types/units';
import { Planet } from '../types/galaxy';

export class UnitController {
    private units: Map<string, Unit> = new Map();
    private scene: THREE.Scene;
    private unitMeshes: Map<string, THREE.Mesh> = new Map();
    private selectedUnit: string | null = null;
    private selectionRing: THREE.Mesh | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createSelectionRing();
    }

    private createSelectionRing(): void {
        const geometry = new THREE.RingGeometry(0.15, 0.17, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.selectionRing = new THREE.Mesh(geometry, material);
        this.selectionRing.visible = false;
        this.scene.add(this.selectionRing);
    }

    addUnit(unit: Unit): void {
        console.log('Adding unit:', unit);
        this.units.set(unit.id, unit);
        const mesh = this.createUnitMesh(unit);
        this.unitMeshes.set(unit.id, mesh);
        this.scene.add(mesh);
        console.log('Unit mesh added to scene. Total units:', this.unitMeshes.size);
        console.log('Scene children:', this.scene.children);
    }

    private createUnitMesh(unit: Unit): THREE.Mesh {
        let geometry: THREE.BufferGeometry;
        
        switch(unit.type) {
            case UnitType.SHIP:
                geometry = new THREE.ConeGeometry(0.15, 0.4, 16);
                break;
            case UnitType.SATELLITE:
                geometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
                break;
            case UnitType.PROBE:
                geometry = new THREE.SphereGeometry(0.1, 16, 16);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        }

        const material = new THREE.MeshPhongMaterial({
            color: 0x4dabf7,
            shininess: 50,
            emissive: 0x2b5a7f,
            emissiveIntensity: 0.5,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(unit.position);
        mesh.rotation.copy(unit.rotation);
        mesh.userData.unitId = unit.id;
        mesh.userData.isUnit = true; // Add this flag to help identify unit meshes

        // Add a small offset from the planet surface
        const direction = mesh.position.clone().normalize();
        mesh.position.add(direction.multiplyScalar(0.1));

        console.log('Created unit mesh:', mesh);
        return mesh;
    }

    update(deltaTime: number): void {
        this.units.forEach((unit, id) => {
            const mesh = this.unitMeshes.get(id);
            if (!mesh) return;

            switch(unit.status) {
                case UnitStatus.ORBITING:
                    this.updateOrbit(unit, mesh, deltaTime);
                    break;
                case UnitStatus.MOVING:
                    this.updateMovement(unit, mesh, deltaTime);
                    break;
                case UnitStatus.DOCKING:
                    this.updateDocking(unit, mesh, deltaTime);
                    break;
            }

            // Update selection ring position if this unit is selected
            if (id === this.selectedUnit && this.selectionRing) {
                this.selectionRing.position.copy(mesh.position);
                this.selectionRing.lookAt(new THREE.Vector3(0, 0, 0));
            }
        });
    }

    private updateOrbit(unit: Unit, mesh: THREE.Mesh, deltaTime: number): void {
        if (!unit.orbitTarget) return;

        const { object, radius, speed } = unit.orbitTarget;
        
        // Calculate new position in orbit
        const currentAngle = Math.atan2(unit.position.z, unit.position.x);
        const newAngle = currentAngle + speed * deltaTime;

        const newPosition = new THREE.Vector3(
            Math.cos(newAngle) * radius,
            unit.position.y,
            Math.sin(newAngle) * radius
        );

        // Update position
        unit.position.copy(newPosition);
        mesh.position.copy(newPosition);

        // Make unit face direction of movement
        const tangent = new THREE.Vector3(-Math.sin(newAngle), 0, Math.cos(newAngle));
        mesh.lookAt(mesh.position.clone().add(tangent));
    }

    private calculatePathPoints(start: THREE.Vector3, end: THREE.Vector3, numPoints: number = 20): THREE.Vector3[] {
        // Normalize both vectors to get points on unit sphere
        const startDir = start.clone().normalize();
        const endDir = end.clone().normalize();

        // Calculate the angle between start and end points
        const angle = startDir.angleTo(endDir);

        // Create interpolated points along the great circle
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const point = new THREE.Vector3().copy(startDir);
            point.lerp(endDir, t).normalize();
            // Maintain constant altitude
            point.multiplyScalar(1.5);
            points.push(point);
        }

        return points;
    }

    handleClick(raycaster: THREE.Raycaster, planetMesh: THREE.Mesh): void {
        const unitMeshes = Array.from(this.unitMeshes.values());
        
        // Include both unit meshes and planet mesh in the intersection test
        const intersects = raycaster.intersectObjects([...unitMeshes, planetMesh], false);

        if (intersects.length > 0) {
            const firstIntersect = intersects[0].object;

            // Check if we hit a unit
            if (firstIntersect.userData.isUnit) {
                this.selectUnit(firstIntersect.userData.unitId);
                return;
            }

            // If we hit the planet and have a selected unit, create a path to the target
            if (firstIntersect === planetMesh && this.selectedUnit) {
                const clickPoint = intersects[0].point;
                const selectedMesh = this.unitMeshes.get(this.selectedUnit);
                
                if (selectedMesh) {
                    const unit = this.units.get(this.selectedUnit);
                    if (!unit) return;

                    // Calculate path points around the planet surface
                    const path = this.calculatePathPoints(selectedMesh.position, clickPoint);
                    unit.path = path;
                    unit.pathIndex = 0;
                    unit.targetPosition = path[1]; // Set next point as immediate target
                    unit.status = UnitStatus.MOVING;
                }
            }
        } else {
            this.selectUnit(null);
        }
    }

    selectUnit(unitId: string | null): void {
        this.selectedUnit = unitId;
        if (this.selectionRing) {
            if (unitId && this.unitMeshes.has(unitId)) {
                const mesh = this.unitMeshes.get(unitId)!;
                this.selectionRing.position.copy(mesh.position);
                this.selectionRing.lookAt(new THREE.Vector3(0, 0, 0));
                this.selectionRing.visible = true;
            } else {
                this.selectionRing.visible = false;
            }
        }
    }

    private updateMovement(unit: Unit, mesh: THREE.Mesh, deltaTime: number): void {
        if (!unit.targetPosition || !unit.path || unit.pathIndex === undefined) return;

        const direction = unit.targetPosition.clone().sub(unit.position);
        const distance = direction.length();

        // If we've reached the current target point
        if (distance < 0.05) {
            // Move to next point in path
            unit.pathIndex++;
            
            // If we've reached the end of the path
            if (unit.pathIndex >= unit.path.length - 1) {
                unit.status = UnitStatus.IDLE;
                unit.path = undefined;
                unit.pathIndex = undefined;
                return;
            }

            // Set next target point
            unit.targetPosition = unit.path[unit.pathIndex + 1];
            return;
        }

        // Calculate movement this frame
        direction.normalize();
        const speed = 1.0; // Base speed
        const movement = direction.multiplyScalar(deltaTime * speed);
        
        // Update position
        unit.position.add(movement);
        
        // Maintain constant altitude from planet surface
        const surfaceNormal = unit.position.clone().normalize();
        const targetAltitude = 1.5; // Same as spawn height
        unit.position.copy(surfaceNormal.multiplyScalar(targetAltitude));
        
        mesh.position.copy(unit.position);
        
        // Make unit face movement direction while maintaining upright orientation
        if (unit.pathIndex < unit.path.length - 1) {
            const nextPoint = unit.path[unit.pathIndex + 1];
            mesh.lookAt(nextPoint);
            const up = mesh.position.clone().normalize();
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        }
    }

    private updateDocking(unit: Unit, mesh: THREE.Mesh, deltaTime: number): void {
        // Similar to movement but with additional constraints and animations
        // Add docking-specific logic here
    }

    setUnitOrbit(unitId: string, planet: Planet, radius: number, speed: number): void {
        const unit = this.units.get(unitId);
        if (!unit) return;

        unit.orbitTarget = { object: planet, radius, speed };
        unit.status = UnitStatus.ORBITING;

        // Position unit at start of orbit
        unit.position.set(radius, 0, 0);
        const mesh = this.unitMeshes.get(unitId);
        if (mesh) {
            mesh.position.copy(unit.position);
        }
    }

    removeUnit(unitId: string): void {
        const mesh = this.unitMeshes.get(unitId);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        }
        this.unitMeshes.delete(unitId);
        this.units.delete(unitId);

        if (this.selectedUnit === unitId) {
            this.selectUnit(null);
        }
    }

    dispose(): void {
        this.units.clear();
        this.unitMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });
        this.unitMeshes.clear();
        if (this.selectionRing) {
            this.scene.remove(this.selectionRing);
            this.selectionRing.geometry.dispose();
            (this.selectionRing.material as THREE.Material).dispose();
        }
    }
} 