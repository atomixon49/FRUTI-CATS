import * as THREE from 'three';
import Ammo from 'ammojs-typed';

export interface ItemType {
    name: string;
    modelPath: string;
    scale: number;
}

export interface GameItem {
    mesh: THREE.Object3D;
    body: Ammo.btRigidBody;
}

export interface CollectionSlot {
    type: string | null;
    model: THREE.Object3D | null;
    originalModel: THREE.Object3D | null; // Propiedad para el modelo original
    element: HTMLElement;
}