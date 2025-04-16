import * as THREE from 'three';
import Ammo from 'ammojs-typed';

let physicsWorld: Ammo.btDiscreteDynamicsWorld;
let tmpTrans: Ammo.btTransform;

export function initPhysics(): void {
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration
    );

    physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));

    tmpTrans = new Ammo.btTransform();
}

export function createRigidBody(object: THREE.Object3D, mass: number): Ammo.btRigidBody | null {
    const shape = new Ammo.btSphereShape(0.5);
    shape.setMargin(0.05);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(object.position.x, object.position.y, object.position.z));

    const motionState = new Ammo.btDefaultMotionState(transform);
    const localInertia = new Ammo.btVector3(0, 0, 0);

    if (mass > 0) {
        shape.calculateLocalInertia(mass, localInertia);
    }

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    return body;
}

export function updatePhysics(deltaTime: number): void {
    physicsWorld.stepSimulation(deltaTime, 10);
}

export function cleanupPhysics(): void {
    // Limpieza de objetos de Ammo.js
    // Esto es importante para evitar memory leaks
    Ammo.destroy(tmpTrans);
    Ammo.destroy(physicsWorld);
}