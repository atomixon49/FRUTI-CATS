import * as THREE from 'three';
import { createRigidBody } from './physics';
import { GameItem, ItemType } from './types';
import { Scene } from './scene';
import { Timer } from './timer';
import { createCollection, moveToCollection, COLLECTION_SIZE } from './collection';

export class Game {
    private scene: Scene;
    private items: GameItem[] = [];
    private collection: any[] = [];
    private models: Map<string, THREE.Object3D> = new Map();
    private score: number = 0;
    private timer: Timer;
    private itemTypes: ItemType[] = [
        { name: 'apple', modelPath: 'models/apple-cat-colored.glb', scale: 0.5 },
        { name: 'watermelon', modelPath: 'models/watermelon-cat-colored.glb', scale: 0.5 },
        { name: 'tomato', modelPath: 'models/tomato-cat-colored.glb', scale: 0.5 },
        { name: 'pineapple', modelPath: 'models/pineapple-cat-colored.glb', scale: 0.5 }
    ];
    
    constructor() {
        this.scene = new Scene();
        this.timer = new Timer(180, () => this.handleGameOver());
        this.collection = createCollection();
        this.setupClickHandler();
    }
    
    private setupClickHandler() {
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        
        window.addEventListener('click', (event) => {
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(pointer, this.scene.getCamera());
            
            const intersects = raycaster.intersectObjects(
                this.items.map(item => item.mesh),
                true
            );
            
            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                const itemIndex = this.items.findIndex(item => 
                    item.mesh === clickedMesh || item.mesh.children.includes(clickedMesh)
                );
                
                if (itemIndex !== -1) {
                    const item = this.items[itemIndex];
                    this.items.splice(itemIndex, 1);
                    moveToCollection(
                        item,
                        this.collection,
                        this.scene.getCamera(),
                        this.scene.getScene(),
                        () => this.handleMatch()
                    );
                }
            }
        });
    }
    
    private handleMatch() {
        this.score += 100;
        this.updateScoreDisplay();
        // Aquí podrías añadir efectos de partículas o sonidos
    }
    
    private updateScoreDisplay() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${this.score}`;
        }
    }
    
    private handleGameOver() {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over';
        gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h1>Game Over!</h1>
                <p>Final Score: ${this.score}</p>
                <button id="restart-button">Play Again</button>
            </div>
        `;
        
        document.body.appendChild(gameOverScreen);
        
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                document.body.removeChild(gameOverScreen);
                this.restart();
            });
        }
    }
    
    private restart() {
        // Limpiar items existentes
        this.items.forEach(item => {
            this.scene.getScene().remove(item.mesh);
        });
        this.items = [];
        
        // Limpiar colección
        this.collection.forEach(slot => {
            slot.type = null;
            slot.model = null;
            slot.element.innerHTML = '';
            slot.element.classList.remove('filled');
        });
        
        // Reiniciar score
        this.score = 0;
        this.updateScoreDisplay();
        
        // Reiniciar timer
        this.timer.reset(180);
        this.timer.start();
        
        // Crear nuevos items
        this.createInitialFruits();
    }
    
    async init() {
        try {
            this.models = await this.scene.loadModels(this.itemTypes);
            this.createInitialFruits();
            this.timer.start();
            this.animate();
        } catch (error) {
            console.error('Error during game initialization:', error);
        }
    }
    
    private createInitialFruits() {
        for (let i = 0; i < 5; i++) {
            this.addRandomItem();
        }
    }
    
    addRandomItem() {
        const randomType = this.itemTypes[Math.floor(Math.random() * this.itemTypes.length)];
        const model = this.models.get(randomType.name);
        
        if (model) {
            const newModel = model.clone();
            newModel.position.set(
                (Math.random() - 0.5) * 4,
                5 + Math.random() * 2,
                (Math.random() - 0.5) * 4
            );
            
            newModel.userData.type = randomType.name;
            
            const body = createRigidBody(newModel, 1);
            if (body) {
                this.scene.getScene().add(newModel);
                this.items.push({ mesh: newModel, body });
            }
        }
    }
    
    animate = () => {
        requestAnimationFrame(this.animate);
        this.scene.render();
    }
}