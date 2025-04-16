import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ItemType } from './types';

export class Scene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private gltfLoader: GLTFLoader;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.gltfLoader = new GLTFLoader();

        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupControls();
        this.setupRenderer();
        this.setupResizeHandler();
    }

    private setupScene() {
        // Cargar la textura del fondo
        const textureLoader = new THREE.TextureLoader();
        const backgroundTexture = textureLoader.load('/images/bakground.jpg');
        this.scene.background = backgroundTexture;
    }

    private setupCamera() {
        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 0, 0);
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-5, 5, -5);
        this.scene.add(directionalLight2);
    }

    private setupControls() {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    private setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
    }

    private setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async loadModel(modelPath: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                modelPath,
                (gltf) => {
                    resolve(gltf.scene);
                },
                undefined,
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    async loadModels(itemTypes: ItemType[]): Promise<Map<string, THREE.Object3D>> {
        const models = new Map<string, THREE.Object3D>();

        // Crear un indicador de carga
        const loadingContainer = document.createElement('div');
        loadingContainer.id = 'loading-container';
        loadingContainer.style.position = 'fixed';
        loadingContainer.style.top = '0';
        loadingContainer.style.left = '0';
        loadingContainer.style.width = '100%';
        loadingContainer.style.height = '100%';
        loadingContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingContainer.style.display = 'flex';
        loadingContainer.style.flexDirection = 'column';
        loadingContainer.style.justifyContent = 'center';
        loadingContainer.style.alignItems = 'center';
        loadingContainer.style.zIndex = '1000';

        const loadingText = document.createElement('div');
        loadingText.textContent = 'Cargando modelos...';
        loadingText.style.color = 'white';
        loadingText.style.fontSize = '24px';
        loadingText.style.marginBottom = '20px';
        loadingContainer.appendChild(loadingText);

        const progressBar = document.createElement('div');
        progressBar.style.width = '300px';
        progressBar.style.height = '20px';
        progressBar.style.backgroundColor = '#333';
        progressBar.style.borderRadius = '10px';
        progressBar.style.overflow = 'hidden';
        loadingContainer.appendChild(progressBar);

        const progressFill = document.createElement('div');
        progressFill.style.width = '0%';
        progressFill.style.height = '100%';
        progressFill.style.backgroundColor = '#4CAF50';
        progressFill.style.transition = 'width 0.3s';
        progressBar.appendChild(progressFill);

        document.body.appendChild(loadingContainer);

        // Cargar modelos en paralelo para mayor eficiencia
        const totalModels = itemTypes.length;
        let loadedModels = 0;

        await Promise.all(itemTypes.map(async (type) => {
            try {
                const model = await this.loadModel(type.modelPath);
                model.scale.setScalar(type.scale);
                models.set(type.name, model);

                // Actualizar progreso
                loadedModels++;
                const progress = (loadedModels / totalModels) * 100;
                progressFill.style.width = `${progress}%`;
                loadingText.textContent = `Cargando modelos... ${Math.round(progress)}%`;
            } catch (error) {
                console.error(`Error loading model for ${type.name}:`, error);
            }
        }));

        // Eliminar el indicador de carga con una animación de desvanecimiento
        loadingContainer.style.transition = 'opacity 0.5s';
        loadingContainer.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(loadingContainer);
        }, 500);

        return models;
    }

    getScene(): THREE.Scene {
        return this.scene;
    }

    getCamera(): THREE.Camera {
        return this.camera;
    }

    getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    getControls(): OrbitControls {
        return this.controls;
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}