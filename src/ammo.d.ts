declare module Ammo {
    class btVector3 {
        constructor(x: number, y: number, z: number);
        x(): number;
        y(): number;
        z(): number;
    }
    class btQuaternion {
        constructor(x: number, y: number, z: number, w: number);
        x(): number;
        y(): number;
        z(): number;
        w(): number;
    }
    class btDefaultCollisionConfiguration {
        constructor();
    }
    class btCollisionDispatcher {
        constructor(configuration: btDefaultCollisionConfiguration);
    }
    class btDbvtBroadphase {
        constructor();
    }
    class btSequentialImpulseConstraintSolver {
        constructor();
    }
    class btDiscreteDynamicsWorld {
        constructor(
            dispatcher: btCollisionDispatcher,
            broadphase: btDbvtBroadphase,
            solver: btSequentialImpulseConstraintSolver,
            collisionConfiguration: btDefaultCollisionConfiguration
        );
        setGravity(vector: btVector3): void;
        addRigidBody(body: btRigidBody): void;
        removeRigidBody(body: btRigidBody): void;
        stepSimulation(timeStep: number, maxSubSteps?: number): void;
    }
    class btTransform {
        constructor();
        setIdentity(): void;
        setOrigin(vector: btVector3): void;
        setRotation(quaternion: btQuaternion): void;
        getOrigin(): btVector3;
        getRotation(): btQuaternion;
    }
    class btMotionState {
        getWorldTransform(transform: btTransform): void;
    }
    class btDefaultMotionState extends btMotionState {
        constructor(transform: btTransform);
    }
    class btCollisionShape {
        calculateLocalInertia(mass: number, inertia: btVector3): void;
    }
    class btSphereShape extends btCollisionShape {
        constructor(radius: number);
    }
    class btCylinderShape extends btCollisionShape {
        constructor(halfExtents: btVector3);
    }
    class btBoxShape extends btCollisionShape {
        constructor(halfExtents: btVector3);
    }
    class btCompoundShape extends btCollisionShape {
        constructor();
        addChildShape(transform: btTransform, shape: btCollisionShape): void;
    }
    class btRigidBodyConstructionInfo {
        constructor(
            mass: number,
            motionState: btDefaultMotionState,
            shape: btCollisionShape,
            inertia: btVector3
        );
    }
    class btRigidBody {
        constructor(info: btRigidBodyConstructionInfo);
        setRestitution(restitution: number): void;
        setFriction(friction: number): void;
        setRollingFriction(friction: number): void;
        getMotionState(): btMotionState;
        setCollisionFlags(flags: number): void;
        getCollisionFlags(): number;
        setActivationState(state: number): void;
    }
}

declare const Ammo: {
    (): Promise<typeof Ammo>;
    destroy(obj: any): void;
};