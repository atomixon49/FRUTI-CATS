import * as THREE from 'three';
import { CollectionSlot, GameItem } from './types';

export const COLLECTION_SIZE = 5;

export function createCollection(): CollectionSlot[] {
    const collection: CollectionSlot[] = [];
    const container = document.getElementById('collection-container') || createCollectionContainer();
    
    for (let i = 0; i < COLLECTION_SIZE; i++) {
        const slot = document.createElement('div');
        slot.className = 'collection-slot';
        container.appendChild(slot);
        
        collection.push({
            type: null,
            model: null,
            element: slot
        });
    }
    
    return collection;
}

function createCollectionContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'collection-container';
    document.body.appendChild(container);
    return container;
}

export function moveToCollection(
    item: GameItem,
    collection: CollectionSlot[],
    camera: THREE.Camera,
    scene: THREE.Scene,
    onMatch: () => void
): void {
    const type = item.mesh.userData.type;
    const emptySlot = collection.find(slot => !slot.type);
    
    if (emptySlot) {
        // Animate the item moving to the collection
        const screenPosition = getScreenPosition(item.mesh, camera);
        const slotRect = emptySlot.element.getBoundingClientRect();
        
        // Create a clone for the collection UI
        const clonedModel = item.mesh.clone();
        scene.add(clonedModel);
        
        // Animation
        const startPos = item.mesh.position.clone();
        const endPos = new THREE.Vector3(
            (slotRect.left + slotRect.width / 2) / window.innerWidth * 2 - 1,
            -(slotRect.top + slotRect.height / 2) / window.innerHeight * 2 + 1,
            0.5
        );
        
        animateMove(clonedModel, startPos, endPos, () => {
            scene.remove(clonedModel);
            emptySlot.type = type;
            emptySlot.model = item.mesh;
            emptySlot.element.classList.add('filled');
            emptySlot.element.style.backgroundImage = `url(assets/${type}.png)`;
            
            checkMatches(collection, onMatch);
        });
    }
}

function getScreenPosition(object: THREE.Object3D, camera: THREE.Camera): THREE.Vector3 {
    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.project(camera);
    return vector;
}

function animateMove(
    model: THREE.Object3D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    onComplete: () => void
): void {
    const duration = 500; // ms
    const startTime = Date.now();
    
    function update() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        model.position.lerpVectors(start, end, progress);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            onComplete();
        }
    }
    
    update();
}

function checkMatches(collection: CollectionSlot[], onMatch: () => void): void {
    // Verificar matches horizontales
    for (let i = 0; i < collection.length - 2; i++) {
        if (collection[i].type &&
            collection[i].type === collection[i + 1].type &&
            collection[i].type === collection[i + 2].type) {
            // Match encontrado
            clearMatch(collection, i, i + 2);
            onMatch();
            return;
        }
    }
}

function clearMatch(collection: CollectionSlot[], start: number, end: number): void {
    for (let i = start; i <= end; i++) {
        const slot = collection[i];
        slot.type = null;
        slot.model = null;
        slot.element.classList.remove('filled');
        slot.element.style.backgroundImage = '';
    }
}