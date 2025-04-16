import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './style.css';

declare global {
    interface Window {
        Ammo: typeof Ammo & {
            (): Promise<typeof Ammo>;
            destroy(obj: any): void;
        };
    }
}

// Variables globales
let physicsWorld: any;
let tmpTrans: any;
let score = 0;

// Añadir variables para el modo debug
let debugMode = false;
const debugObjects: THREE.Mesh[] = [];

// Variables para el timer
let timeLeft = 180; // 3 minutos en segundos
let timerInterval: number | null = null;

// Función para actualizar la puntuación
function updateScore() {
    const scoreElement = document.getElementById('score');
    if (!scoreElement) {
        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'score';
        scoreDiv.style.position = 'absolute';
        scoreDiv.style.top = '20px';
        scoreDiv.style.left = '20px';
        scoreDiv.style.color = 'white';
        scoreDiv.style.fontSize = '24px';
        scoreDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        scoreDiv.style.padding = '10px 20px';
        scoreDiv.style.borderRadius = '10px';
        scoreDiv.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(scoreDiv);
    }
    const element = document.getElementById('score');
    if (element) {
        element.textContent = `Puntuación: ${score}`;
    }
}

// Función para formatear el tiempo
function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Función para actualizar el timer
function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement && timeLeft >= 0) {
        timerElement.textContent = formatTime(timeLeft);

        // Cambiar el color cuando quede poco tiempo
        if (timeLeft <= 30) {
            timerElement.style.color = '#ff4444';
            const timerContainer = document.getElementById('timer-container');
            if (timerContainer) {
                timerContainer.classList.add('shake');
            }
        }

        timeLeft--;

        if (timeLeft < 0) {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            // Aquí puedes añadir la lógica para cuando se acabe el tiempo
        }
    }
}

// Iniciar el timer cuando empiece el juego
function startTimer() {
    const timerContainer = document.getElementById('timer-container');

    // Añadir clase shake cuando quede poco tiempo
    if (timerContainer) {
        timerContainer.style.animation = timeLeft <= 30 ? 'shake 0.5s infinite' : 'none';
    }

    if (!timerInterval) {
        timerInterval = window.setInterval(updateTimer, 1000);
    }
}

// Añadir animación de shake al CSS en memoria
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0% { transform: translate(0, 0); }
    25% { transform: translate(-2px, 0); }
    50% { transform: translate(2px, 0); }
    75% { transform: translate(-2px, 0); }
    100% { transform: translate(0, 0); }
}

#timer-container.shake {
    animation: shake 0.5s infinite;
}`;
document.head.appendChild(style);

// Configuración básica
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Configuración de física
async function initPhysics() {
    return new Promise<void>((resolve) => {
        // Esperar a que Ammo.js esté disponible
        const checkAmmo = () => {
            if (window.Ammo) {
                const collisionConfiguration = new window.Ammo.btDefaultCollisionConfiguration();
                const dispatcher = new window.Ammo.btCollisionDispatcher(collisionConfiguration);
                const broadphase = new window.Ammo.btDbvtBroadphase();
                const solver = new window.Ammo.btSequentialImpulseConstraintSolver();
                physicsWorld = new window.Ammo.btDiscreteDynamicsWorld(
                    dispatcher,
                    broadphase,
                    solver,
                    collisionConfiguration
                );
                physicsWorld.setGravity(new window.Ammo.btVector3(0, -9.8, 0));
                tmpTrans = new window.Ammo.btTransform();
                resolve();
            } else {
                setTimeout(checkAmmo, 100);
            }
        };
        checkAmmo();
    });
}

// Añadir controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true; // Permitir movimiento lateral
controls.panSpeed = 0.5; // Velocidad de movimiento lateral
controls.enableZoom = true; // Permitir zoom
controls.zoomSpeed = 1.0; // Velocidad de zoom
controls.maxPolarAngle = Math.PI / 2; // Limitar rotación vertical para no ver debajo del bowl
controls.minDistance = 5; // Distancia mínima de zoom
controls.maxDistance = 20; // Distancia máxima de zoom

// Configurar la iluminación
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(5, 5, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
scene.add(mainLight);

// Cambiar el fondo a una imagen
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/images/bakground.jpg', (texture: THREE.Texture) => {
    scene.background = texture;
});

camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

// Variables del juego
const items: Array<{mesh: THREE.Object3D, body: any}> = [];
const loader = new GLTFLoader();
const bowlRadius = 2;

// Interfaz de colección
interface CollectionSlot {
    element: HTMLDivElement;
    type: string | null;
    model: THREE.Object3D | null;
    originalModel: THREE.Object3D | null;
}

const collection: CollectionSlot[] = [];
const COLLECTION_SIZE = 8;

// Crear la interfaz de colección
const collectionContainer = document.createElement('div');
collectionContainer.id = 'collection';
document.body.appendChild(collectionContainer);

for (let i = 0; i < COLLECTION_SIZE; i++) {
    const slot = document.createElement('div');
    slot.className = 'collection-slot';
    collectionContainer.appendChild(slot);
    collection.push({
        element: slot,
        type: null,
        model: null,
        originalModel: null
    });
}

const itemTypes = [
    { name: 'Manzana', modelPath: '/models/apple-cat-colored.glb', scale: 0.7 },
    { name: 'Piña', modelPath: '/models/pineapple-cat-colored.glb', scale: 0.7 },
    { name: 'Tomate', modelPath: '/models/tomato-cat-colored.glb', scale: 0.7 },
    { name: 'Sandía', modelPath: '/models/watermelon-cat-colored.glb', scale: 0.7 }
];

// Función para crear cuerpo físico con mejor colisión
function createRigidBody(mesh: THREE.Object3D, mass: number, isBox: boolean = false) {
    if (!physicsWorld) return null;

    const transform = new window.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new window.Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));
    transform.setRotation(new window.Ammo.btQuaternion(0, 0, 0, 1));

    const motionState = new window.Ammo.btDefaultMotionState(transform);
    let shape;

    if (isBox) {
        // Crear una forma compuesta más suave para el bowl
        const compoundShape = new window.Ammo.btCompoundShape();

        // Base del bowl más alta y más ancha
        const baseShape = new window.Ammo.btCylinderShape(
            new window.Ammo.btVector3(bowlRadius * 1.3, 0.3, bowlRadius * 1.3)
        );
        const baseTransform = new window.Ammo.btTransform();
        baseTransform.setIdentity();
        baseTransform.setOrigin(new window.Ammo.btVector3(0, 0, 0)); // Base en y=0
        compoundShape.addChildShape(baseTransform, baseShape);

        // Crear una serie de anillos concéntricos para formar las paredes
        const numRings = 6; // Número de anillos
        const ringHeight = bowlRadius * 1.5; // Altura total de las paredes

        for (let i = 0; i < numRings; i++) {
            const progress = i / (numRings - 1);
            // Ajustar el radio para que los anillos inferiores sean más pequeños
            let currentRadius;
            if (i < 2) { // Para los dos primeros anillos
                currentRadius = bowlRadius * (0.8 + progress * 0.3); // Empezar más pequeño
            } else {
                currentRadius = bowlRadius * (1 + progress * 0.3); // Mantener el tamaño original para los anillos superiores
            }
            const currentHeight = progress * ringHeight;

            // Crear un anillo usando varios cilindros pequeños
            const numSegments = 16;
            const segmentAngle = (Math.PI * 2) / numSegments;

            for (let j = 0; j < numSegments; j++) {
                const angle = j * segmentAngle;
                const nextAngle = ((j + 1) % numSegments) * segmentAngle;

                const x1 = Math.cos(angle) * currentRadius;
                const z1 = Math.sin(angle) * currentRadius;
                const x2 = Math.cos(nextAngle) * currentRadius;
                const z2 = Math.sin(nextAngle) * currentRadius;

                // Crear un cilindro entre dos puntos del anillo
                const segmentLength = Math.sqrt(
                    Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2)
                );

                const wallShape = new window.Ammo.btCylinderShape(
                    new window.Ammo.btVector3(segmentLength * 0.5, 0.15, 0.15)
                );

                const wallTransform = new window.Ammo.btTransform();
                wallTransform.setIdentity();

                // Posicionar el segmento
                const centerX = (x1 + x2) * 0.5;
                const centerZ = (z1 + z2) * 0.5;
                wallTransform.setOrigin(new window.Ammo.btVector3(centerX, currentHeight, centerZ));

                // Rotar el segmento para que conecte los puntos
                const direction = new THREE.Vector2(x2 - x1, z2 - z1).normalize();
                const angle2 = Math.atan2(direction.y, direction.x);
                const rotationQuat = new window.Ammo.btQuaternion(0, Math.sin(angle2 * 0.5), 0, Math.cos(angle2 * 0.5));
                wallTransform.setRotation(rotationQuat);

                compoundShape.addChildShape(wallTransform, wallShape);
            }
        }

        shape = compoundShape;
    } else {
        // Para las frutas, usar una esfera más pequeña
        shape = new window.Ammo.btSphereShape(0.3);
    }

    const localInertia = new window.Ammo.btVector3(0, 0, 0);
    if (mass > 0) {
        shape.calculateLocalInertia(mass, localInertia);
    }

    const rbInfo = new window.Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new window.Ammo.btRigidBody(rbInfo);

    // Ajustar propiedades físicas
    body.setRestitution(0.2); // Menos rebote
    body.setFriction(0.9); // Más fricción
    body.setRollingFriction(0.1); // Fricción al rodar

    if (mass === 0) {
        body.setCollisionFlags(body.getCollisionFlags() | 1); // FLAG_STATIC_OBJECT
    } else {
        body.setActivationState(4); // DISABLE_DEACTIVATION
    }

    physicsWorld.addRigidBody(body);
    return body;
}

// Modificar la carga del bowl
let bowl: THREE.Object3D | null = null;
loader.load('/models/bowl.glb', (gltf: any) => {
    bowl = gltf.scene;
    if (bowl) {
        bowl.position.set(0, 0, 0); // Subir el bowl a y=0 en lugar de y=-1
        bowl.scale.set(2, 2, 2);
        bowl.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(bowl);

        if (typeof window.Ammo !== 'undefined' && physicsWorld) {
            // Crear colisionador para el bowl
            createRigidBody(bowl, 0, true); // masa 0 = estático, isBox = true
        }
    }
});

async function createItem(type: typeof itemTypes[number], position?: {x: number, y: number, z: number}): Promise<{mesh: THREE.Object3D, body: any} | null> {
    try {
        const gltf = await loader.loadAsync(type.modelPath);
        const model = gltf.scene;

        // Iniciar con escala 0 para la animación de aparición
        model.scale.set(0, 0, 0);

        if (position) {
            // Usar posición predefinida si se proporciona
            model.position.set(position.x, position.y, position.z);
        } else {
            // Posición aleatoria arriba del bowl
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * bowlRadius * 0.8;
            model.position.set(
                Math.cos(angle) * radius,
                5 + Math.random() * 2, // Altura inicial
                Math.sin(angle) * radius
            );
        }

        model.userData.type = type.name;

        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        // Animación de aparición con efecto "pop"
        const targetScale = type.scale;
        const duration = 500; // ms
        const startTime = Date.now();

        // Crear partículas para el efecto de aparición
        const particleCount = 15;
        const particles: THREE.Mesh[] = [];

        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(model.position);
            scene.add(particle);
            particles.push(particle);

            // Dirección aleatoria para la partícula
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ).normalize();

            // Guardar la dirección en userData
            particle.userData.direction = direction;
            particle.userData.speed = 0.05 + Math.random() * 0.1;
        }

        // Función para animar la aparición
        function animateAppearance() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Función de ease-out elástica para el efecto rebote
            const elasticOut = (t: number) => {
                return Math.sin(-13.0 * (t + 1.0) * Math.PI / 2) * Math.pow(2.0, -10.0 * t) + 1.0;
            };

            // Aplicar escala con rebote
            const scaleValue = elasticOut(progress) * targetScale;
            model.scale.set(scaleValue, scaleValue, scaleValue);

            // Animar partículas
            particles.forEach(particle => {
                const direction = particle.userData.direction as THREE.Vector3;
                const speed = particle.userData.speed as number;

                // Mover partícula
                particle.position.add(direction.clone().multiplyScalar(speed));

                // Reducir opacidad gradualmente
                const material = particle.material as THREE.MeshBasicMaterial;
                material.opacity = 0.8 * (1 - progress);

                // Reducir tamaño gradualmente
                particle.scale.setScalar(1 - progress * 0.8);
            });

            if (progress < 1) {
                requestAnimationFrame(animateAppearance);
            } else {
                // Eliminar partículas cuando termine la animación
                particles.forEach(particle => scene.remove(particle));
            }
        }

        // Iniciar animación
        animateAppearance();

        // Crear cuerpo físico después de un pequeño retraso para que coincida con la animación
        const body = createRigidBody(model, 1); // masa = 1

        return { mesh: model, body };
    } catch (error) {
        console.error(`Error cargando modelo ${type.name}:`, error);
        return null;
    }
}

// Modificar la función moveToCollection para una animación de explosión/estrellas más rápida
function moveToCollection(item: {mesh: THREE.Object3D, body: any}) {
    const emptySlotIndex = collection.findIndex(slot => slot.type === null);
    if (emptySlotIndex === -1) return;

    const slot = collection[emptySlotIndex];

    // Desactivar física para la animación
    if (physicsWorld && item.body) {
        physicsWorld.removeRigidBody(item.body);
    }

    const itemPosition = item.mesh.position.clone();
    const itemType = item.mesh.userData.type;
    const itemScale = item.mesh.scale.clone();

    // Crear efecto de explosión/estrellas en la posición de la fruta (optimizado)
    const particleCount = 15; // Reducido a 15 para mejor rendimiento
    const particles: THREE.Mesh[] = [];
    const colors = [0xffff00, 0xffffff, 0xff9900, 0xff00ff]; // Colores variados para las estrellas

    // Crear partículas de estrellas
    for (let i = 0; i < particleCount; i++) {
        // Geometría de estrella
        const starShape = new THREE.Shape();
        const numPoints = 5;
        const outerRadius = 0.1;
        const innerRadius = 0.04;

        for (let j = 0; j < numPoints * 2; j++) {
            const radius = j % 2 === 0 ? outerRadius : innerRadius;
            const angle = (j / (numPoints * 2)) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (j === 0) {
                starShape.moveTo(x, y);
            } else {
                starShape.lineTo(x, y);
            }
        }
        starShape.closePath();

        const starGeometry = new THREE.ShapeGeometry(starShape);
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const starMaterial = new THREE.MeshBasicMaterial({
            color: randomColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.copy(itemPosition);

        // Rotación aleatoria
        star.rotation.z = Math.random() * Math.PI * 2;

        // Dirección aleatoria para la partícula
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 1.5, // Más hacia arriba
            (Math.random() - 0.5) * 2
        ).normalize();

        // Guardar propiedades en userData
        star.userData.direction = direction;
        star.userData.speed = 0.05 + Math.random() * 0.15;
        star.userData.rotationSpeed = (Math.random() - 0.5) * 0.2;
        star.userData.creationTime = Date.now();
        star.userData.lifetime = 300 + Math.random() * 200; // Duración aún más corta

        scene.add(star);
        particles.push(star);
    }

    // Crear efecto de explosión central
    const explosionGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });

    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(itemPosition);
    explosion.scale.set(0.1, 0.1, 0.1); // Empezar pequeño
    scene.add(explosion);

    // Guardar una referencia al modelo original para poder restaurarlo
    const originalModel = item.mesh.clone();
    originalModel.userData = { ...item.mesh.userData };

    // Eliminar el modelo original de la escena
    scene.remove(item.mesh);

    // Animar la explosión
    const startTime = Date.now();
    const duration = 400; // Reducido a 400ms para animación aún más rápida

    function animateExplosion() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Animar la explosión central
        if (progress < 0.3) {
            // Fase de expansión rápida
            const expansionScale = progress / 0.3 * 2;
            explosion.scale.set(expansionScale, expansionScale, expansionScale);
        } else {
            // Fase de desvanecimiento
            explosionMaterial.opacity = 0.8 * (1 - (progress - 0.3) / 0.7);
        }

        // Animar las partículas de estrellas
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const particleAge = currentTime - particle.userData.creationTime;
            const particleProgress = Math.min(particleAge / particle.userData.lifetime, 1);

            // Mover partícula
            const direction = particle.userData.direction as THREE.Vector3;
            const speed = particle.userData.speed as number;
            particle.position.add(direction.clone().multiplyScalar(speed));

            // Rotar partícula
            particle.rotation.z += particle.userData.rotationSpeed;

            // Reducir opacidad gradualmente
            const material = particle.material as THREE.MeshBasicMaterial;
            material.opacity = 0.9 * (1 - particleProgress);

            // Aplicar gravedad a la velocidad
            direction.y -= 0.003; // Efecto de gravedad suave

            // Eliminar partículas viejas
            if (particleProgress >= 1) {
                scene.remove(particle);
                particles.splice(i, 1);
            }
        }

        if (progress < 1 || particles.length > 0) {
            requestAnimationFrame(animateExplosion);
        } else {
            // Eliminar la explosión cuando termine la animación
            scene.remove(explosion);

            // Continuar con la lógica del slot
            slot.type = itemType;

            // Crear una vista en miniatura (optimizada)
            const miniContainer = document.createElement('div');
            miniContainer.style.width = '100%';
            miniContainer.style.height = '100%';
            miniContainer.style.position = 'relative';

            const miniRenderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance' // Optimización de rendimiento
            });
            // Aumentar el tamaño de las miniaturas
            miniRenderer.setSize(100, 100);
            miniRenderer.setClearColor(0x000000, 0);

            const miniScene = new THREE.Scene();
            const miniCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

            // Iluminación simplificada para la miniatura
            const miniLight = new THREE.DirectionalLight(0xffffff, 1.2);
            miniLight.position.set(1, 1, 1);
            miniScene.add(miniLight);

            // Crear un clon del modelo para la miniatura
            const modelClone = originalModel.clone();
            modelClone.position.set(0, -0.1, 0);
            // Aumentar la escala del modelo en la miniatura
            const enlargeScale = 2.2; // Factor de aumento ligeramente mayor
            modelClone.scale.copy(itemScale).multiplyScalar(enlargeScale);
            modelClone.rotation.set(0, -Math.PI/2, 0); // Rotar para mirar al frente
            miniScene.add(modelClone);

            // Ajustar la cámara para ver el modelo completo
            miniCamera.position.set(0, 0, 3);
            miniCamera.lookAt(0, -0.1, 0);

            // Función para renderizar la miniatura (optimizada)
            let frameCount = 0;
            function renderMiniature() {
                if (slot.type) { // Solo si el slot sigue ocupado
                    // Renderizar a menor velocidad de cuadros para ahorrar recursos
                    frameCount++;
                    if (frameCount % 2 === 0) { // Renderizar cada 2 frames
                        miniRenderer.render(miniScene, miniCamera);
                    }
                    requestAnimationFrame(renderMiniature);
                }
            }

            slot.element.innerHTML = '';
            slot.element.appendChild(miniRenderer.domElement);
            slot.element.classList.add('filled');
            slot.model = modelClone;
            slot.originalModel = originalModel; // Guardar referencia al modelo original

            // Ajustar el estilo del slot para acomodar el tamaño mayor
            slot.element.style.width = '100px';
            slot.element.style.height = '100px';

            // Añadir evento de clic para devolver la fruta al bowl
            slot.element.onclick = () => {
                returnToBowl(slot);
            };

            renderMiniature();

            // Verificar matches
            checkMatches();
        }
    }

    animateExplosion();
}

// Función para devolver una fruta del slot al bowl
function returnToBowl(slot: CollectionSlot) {
    if (!slot.type || !slot.originalModel) return;

    // Eliminar el tipo y modelo del slot
    const originalModel = slot.originalModel;

    // Limpiar el slot
    slot.type = null;
    slot.model = null;
    if (slot.originalModel) {
        slot.originalModel = null;
    }
    slot.element.innerHTML = '';
    slot.element.classList.remove('filled');
    slot.element.onclick = null;

    // Posición aleatoria dentro del bowl (más baja)
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * bowlRadius * 0.6;
    originalModel.position.set(
        Math.cos(angle) * radius,
        1.5 + Math.random() * 1, // Altura más baja dentro del bowl
        Math.sin(angle) * radius
    );

    // Restaurar la escala original
    originalModel.scale.setScalar(0); // Empezar con escala 0 para animación

    // Añadir el modelo a la escena
    scene.add(originalModel);

    // Crear efecto de aparición con estrellas
    const particleCount = 15;
    const particles: THREE.Mesh[] = [];
    const colors = [0xffff00, 0xffffff, 0xff9900, 0xff00ff];

    // Posición del slot para la animación
    const slotRect = slot.element.getBoundingClientRect();
    const vector = new THREE.Vector3(
        (slotRect.left + slotRect.width/2) / window.innerWidth * 2 - 1,
        -((slotRect.top + slotRect.height/2) / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);
    const slotPosition = new THREE.Vector3();
    slotPosition.copy(vector);

    // Crear partículas de estrellas desde el slot hacia el bowl
    for (let i = 0; i < particleCount; i++) {
        const starGeometry = new THREE.CircleGeometry(0.08, 5);
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const starMaterial = new THREE.MeshBasicMaterial({
            color: randomColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.copy(slotPosition);

        // Dirección hacia el bowl con trayectoria más directa
        const direction = new THREE.Vector3()
            .subVectors(originalModel.position, slotPosition)
            .normalize()
            .add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.3, // Menos dispersión horizontal
                Math.random() * 0.2,        // Menos dispersión vertical
                (Math.random() - 0.5) * 0.3  // Menos dispersión horizontal
            ));

        star.userData.direction = direction;
        star.userData.speed = 0.15 + Math.random() * 0.15; // Velocidad aumentada
        star.userData.rotationSpeed = Math.random() * 0.3;
        star.userData.creationTime = Date.now();
        star.userData.lifetime = 300 + Math.random() * 150; // Duración reducida

        scene.add(star);
        particles.push(star);
    }

    // Animar la aparición
    const startTime = Date.now();
    const duration = 350; // ms - más rápido

    function animateAppearance() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Función de ease-out elástica para el efecto rebote
        const elasticOut = (t: number) => {
            return Math.sin(-13.0 * (t + 1.0) * Math.PI / 2) * Math.pow(2.0, -10.0 * t) + 1.0;
        };

        // Aplicar escala con rebote
        const scaleValue = elasticOut(progress) * 0.7; // Escala original de la fruta
        originalModel.scale.set(scaleValue, scaleValue, scaleValue);

        // Animar partículas
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const particleAge = currentTime - particle.userData.creationTime;
            const particleProgress = Math.min(particleAge / particle.userData.lifetime, 1);

            // Mover partícula
            const direction = particle.userData.direction as THREE.Vector3;
            const speed = particle.userData.speed as number;
            particle.position.add(direction.clone().multiplyScalar(speed));

            // Rotar partícula
            particle.rotation.z += particle.userData.rotationSpeed;

            // Reducir opacidad gradualmente
            const material = particle.material as THREE.MeshBasicMaterial;
            material.opacity = 0.9 * (1 - particleProgress);

            // Eliminar partículas viejas
            if (particleProgress >= 1) {
                scene.remove(particle);
                particles.splice(i, 1);
            }
        }

        if (progress < 1 || particles.length > 0) {
            requestAnimationFrame(animateAppearance);
        } else {
            // Crear cuerpo físico para la fruta
            const body = createRigidBody(originalModel, 1);

            // Añadir a la lista de items
            items.push({ mesh: originalModel, body });
        }
    }

    animateAppearance();
}

// Función para comprobar matches
function checkMatches() {
    // Crear un mapa de tipos y sus posiciones
    const typeMap = new Map<string, number[]>();

    collection.forEach((slot, index) => {
        if (slot.type) {
            if (!typeMap.has(slot.type)) {
                typeMap.set(slot.type, []);
            }
            typeMap.get(slot.type)!.push(index);
        }
    });

    // Comprobar matches de 3 o 4
    typeMap.forEach(positions => {
        if (positions.length >= 3) {
            // Eliminar los elementos matcheados
            positions.forEach(index => {
                if (collection[index].model) {
                    scene.remove(collection[index].model!);
                }
                collection[index].type = null;
                collection[index].model = null;
                collection[index].element.textContent = '';
                collection[index].element.classList.remove('filled');
            });

            // Aumentar puntuación
            score += positions.length * 10;
            updateScore();

            // Añadir nuevos elementos al bowl
            for (let i = 0; i < 2; i++) {
                addRandomItem();
            }
        }
    });
}

// Optimizar la generación de frutas
let fruitsLoaded = 0;
const MAX_FRUITS = 8; // Reducir el máximo de frutas para mejor rendimiento
const BATCH_DELAY = 1000; // Mayor delay entre frutas para evitar colisiones

// Posiciones predefinidas para evitar colisiones
const predefinedPositions = [
    { x: 0, y: 5, z: 0 },
    { x: 1.5, y: 5.5, z: 0 },
    { x: -1.5, y: 6, z: 0 },
    { x: 0, y: 6.5, z: 1.5 },
    { x: 0, y: 7, z: -1.5 },
    { x: 1, y: 7.5, z: 1 },
    { x: -1, y: 8, z: -1 },
    { x: 0.8, y: 8.5, z: -0.8 }
];

// Función para añadir frutas gradualmente con mejor distribución
async function addFruitBatch() {
    if (fruitsLoaded >= MAX_FRUITS) return;

    // Usar posiciones predefinidas para evitar colisiones inmediatas
    const posIndex = fruitsLoaded % predefinedPositions.length;
    const position = predefinedPositions[posIndex];

    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const item = await createItem(type, position);

    if (item) {
        items.push(item);
        fruitsLoaded++;

        // Aplicar una pequeña fuerza aleatoria para que las frutas se muevan ligeramente
        if (item.body) {
            const force = new Ammo.btVector3(
                (Math.random() - 0.5) * 0.5,
                0,
                (Math.random() - 0.5) * 0.5
            );
            item.body.applyCentralImpulse(force);
        }
    }

    if (fruitsLoaded < MAX_FRUITS) {
        setTimeout(addFruitBatch, BATCH_DELAY);
    }
}

// Reemplazar createInitialFruits con la versión optimizada
async function createInitialFruits() {
    fruitsLoaded = 0;
    addFruitBatch();
}

// Modificar addRandomItem para respetar el límite
async function addRandomItem() {
    if (items.length >= MAX_FRUITS) {
        // Eliminar una fruta antigua si alcanzamos el límite
        const oldItem = items[0];
        if (oldItem && oldItem.body) {
            physicsWorld.removeRigidBody(oldItem.body);
        }
        if (oldItem && oldItem.mesh) {
            scene.remove(oldItem.mesh);
        }
        items.shift();
    }

    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const item = await createItem(type);
    if (item) {
        items.push(item);
    }
}

// Manejar clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    for (const intersect of intersects) {
        let object = intersect.object;
        while (object.parent && !items.find(item => item.mesh === object)) {
            object = object.parent;
        }

        const item = items.find(item => item.mesh === object);
        if (item) {
            moveToCollection(item);
            const index = items.indexOf(item);
            if (index > -1) {
                items.splice(index, 1);
            }
            break;
        }
    }
});

// Actualizar estado de física
const clock = new THREE.Clock();

function updatePhysics() {
    if (!physicsWorld) return;

    const delta = clock.getDelta();
    physicsWorld.stepSimulation(delta, 10);

    // Actualizar posiciones y verificar frutas caídas
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (!item.body) continue;

        const ms = item.body.getMotionState();
        if (ms) {
            ms.getWorldTransform(tmpTrans);
            const p = tmpTrans.getOrigin();
            const q = tmpTrans.getRotation();

            // Si la fruta cae demasiado, eliminarla
            if (p.y() < -5) {
                physicsWorld.removeRigidBody(item.body);
                scene.remove(item.mesh);
                items.splice(i, 1);
                addRandomItem(); // Reemplazar la fruta caída
                continue;
            }

            item.mesh.position.set(p.x(), p.y(), p.z());
            item.mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
    }
}

// Función para crear visualización de debug con mejores colores
function createDebugVisualization() {
    // Limpiar visualizaciones de debug anteriores
    debugObjects.forEach(obj => scene.remove(obj));
    debugObjects.length = 0;

    if (!debugMode) return;

    // Visualizar el collider del bowl
    const numRings = 6;
    const ringHeight = bowlRadius * 1.5;

    // Base del bowl - color azul
    const baseGeometry = new THREE.CylinderGeometry(bowlRadius * 1.3, bowlRadius * 1.3, 0.3, 32);
    const baseMaterial = new THREE.MeshBasicMaterial({
        color: 0x0044ff,
        wireframe: false,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(0, 0, 0); // Ajustar a la nueva altura
    scene.add(baseMesh);
    debugObjects.push(baseMesh);

    // Visualizar los anillos
    for (let i = 0; i < numRings; i++) {
        const progress = i / (numRings - 1);
        // Ajustar el radio para que coincida con la física
        let currentRadius;
        if (i < 2) { // Para los dos primeros anillos
            currentRadius = bowlRadius * (0.8 + progress * 0.3);
        } else {
            currentRadius = bowlRadius * (1 + progress * 0.3);
        }
        const currentHeight = progress * ringHeight;

        const ringGeometry = new THREE.TorusGeometry(currentRadius, 0.05, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.y = currentHeight;
        ringMesh.rotation.x = Math.PI / 2;
        scene.add(ringMesh);
        debugObjects.push(ringMesh);

        // Agregar una superficie semitransparente entre anillos
        if (i < numRings - 1) {
            const nextProgress = (i + 1) / (numRings - 1);
            const nextRadius = bowlRadius * (1 + nextProgress * 0.3);
            const nextHeight = progress * ringHeight;

            const surfaceGeometry = new THREE.CylinderGeometry(
                nextRadius,
                currentRadius,
                nextHeight - currentHeight,
                32,
                1,
                true
            );
            const surfaceMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6666,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });

            const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
            surfaceMesh.position.y = (currentHeight + nextHeight) / 2;
            scene.add(surfaceMesh);
            debugObjects.push(surfaceMesh);
        }
    }

    // Visualizar los colliders de las frutas
    items.forEach(item => {
        const radius = 0.3;
        const fruitGeometry = new THREE.SphereGeometry(radius, 16, 16);

        // Mesh sólido con transparencia
        const fruitMesh = new THREE.Mesh(
            fruitGeometry,
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: false,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            })
        );

        // Mesh wireframe
        const fruitWireframe = new THREE.Mesh(
            fruitGeometry,
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.8
            })
        );

        [fruitMesh, fruitWireframe].forEach(mesh => {
            mesh.position.copy(item.mesh.position);
            scene.add(mesh);
            debugObjects.push(mesh);

            // Actualizar la posición del debug mesh en cada frame
            const updatePosition = () => {
                mesh.position.copy(item.mesh.position);
                if (debugMode) {
                    requestAnimationFrame(updatePosition);
                }
            };
            updatePosition();
        });
    });
}

// Añadir toggle para el modo debug
window.addEventListener('keydown', (event) => {
    if (event.key === 'd' || event.key === 'D') {
        debugMode = !debugMode;
        createDebugVisualization();
    }
});

// Bucle de animación
function animate() {
    requestAnimationFrame(animate);

    updatePhysics();
    controls.update();
    renderer.render(scene, camera);
}

// Inicialización
async function init() {
    try {
        await initPhysics();
        createInitialFruits();
        startTimer(); // Iniciar el timer
        animate();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Manejar el redimensionamiento de la ventana
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Esperar a que el DOM esté listo antes de iniciar
document.addEventListener('DOMContentLoaded', init);
