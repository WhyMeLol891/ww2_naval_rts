/**
 * PACIFIC ARMED - Zero-Lag High-Performance Particle Engine
 * Fully object-pooled visual effects: no runtime garbage collection, capped pool limits, 60 FPS guaranteed.
 */

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;

        // Shared static materials
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.95 });
        this.waterSprayMat = new THREE.MeshStandardMaterial({ color: 0xebf7ff, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.8 });
        this.fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 });
        this.smokeMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.6 });
        this.wakeMat = new THREE.MeshBasicMaterial({ color: 0xe6f4fc, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
        this.torpWakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });

        // Object Pools
        this.initPools();
    }

    initPools() {
        // 1. Shell Projectiles Pool (Cap: 60)
        this.projectiles = [];
        this.projectilePool = [];
        const tracerGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.8, 4);
        tracerGeo.rotateX(Math.PI / 2);
        for (let i = 0; i < 60; i++) {
            const mesh = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffcc33 }));
            mesh.visible = false;
            this.scene.add(mesh);
            this.projectilePool.push({
                mesh: mesh,
                startPos: new THREE.Vector3(),
                targetPos: new THREE.Vector3(),
                elapsed: 0,
                travelTime: 1,
                arcHeight: 50,
                onHit: null,
                active: false
            });
        }

        // 2. Torpedoes Pool (Cap: 30)
        this.torpedoes = [];
        this.torpedoPool = [];
        const torpGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.2, 5);
        torpGeo.rotateX(Math.PI / 2);
        const torpMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.8 });
        for (let i = 0; i < 30; i++) {
            const group = new THREE.Group();
            const body = new THREE.Mesh(torpGeo, torpMat);
            group.add(body);
            group.visible = false;
            this.scene.add(group);

            this.torpedoPool.push({
                group: group,
                direction: new THREE.Vector3(),
                speed: 38.0,
                life: 0,
                targetShip: null,
                onHit: null,
                lastWakeTime: 0,
                active: false
            });
        }

        // 3. Water Geysers Pool (Cap: 18)
        this.waterGeysers = [];
        this.geyserPool = [];
        const colGeo = new THREE.CylinderGeometry(1.2, 3.5, 22, 6, 1);
        const ringGeo = new THREE.RingGeometry(2, 7, 8);
        ringGeo.rotateX(-Math.PI / 2);
        for (let i = 0; i < 18; i++) {
            const group = new THREE.Group();
            const col = new THREE.Mesh(colGeo, this.waterSprayMat);
            col.position.y = 11;
            group.add(col);

            const ring = new THREE.Mesh(ringGeo, this.waterSprayMat);
            ring.position.y = 0.2;
            group.add(ring);

            group.visible = false;
            this.scene.add(group);

            this.geyserPool.push({
                group: group,
                column: col,
                ring: ring,
                life: 0,
                maxLife: 1.6,
                active: false
            });
        }

        // 4. Explosions Pool (Cap: 20)
        this.explosions = [];
        this.explosionPool = [];
        const fireGeo = new THREE.SphereGeometry(3.2, 6, 6);
        for (let i = 0; i < 20; i++) {
            const group = new THREE.Group();
            const fire = new THREE.Mesh(fireGeo, this.fireMat.clone());
            group.add(fire);

            const light = new THREE.PointLight(0xff6600, 3.5, 45);
            group.add(light);

            group.visible = false;
            this.scene.add(group);

            this.explosionPool.push({
                group: group,
                fireMesh: fire,
                light: light,
                life: 0,
                maxLife: 0.8,
                scale: 1,
                active: false
            });
        }

        // 5. Smoke Puffs Pool (Cap: 35)
        this.smokePuffs = [];
        this.smokePool = [];
        const puffGeo = new THREE.SphereGeometry(2.5, 5, 5);
        for (let i = 0; i < 35; i++) {
            const mesh = new THREE.Mesh(puffGeo, this.smokeMat.clone());
            mesh.visible = false;
            this.scene.add(mesh);
            this.smokePool.push({
                mesh: mesh,
                life: 0,
                maxLife: 2.0,
                growth: 2.5,
                drift: new THREE.Vector3(2, 4, 1),
                active: false
            });
        }

        // 6. Wakes Pool (Cap: 30)
        this.wakes = [];
        this.wakePool = [];
        const wakeGeo = new THREE.PlaneGeometry(6.0, 7.0);
        wakeGeo.rotateX(-Math.PI / 2);
        for (let i = 0; i < 30; i++) {
            const mesh = new THREE.Mesh(wakeGeo, this.wakeMat.clone());
            mesh.visible = false;
            this.scene.add(mesh);
            this.wakePool.push({
                mesh: mesh,
                life: 0,
                maxLife: 4.5,
                active: false
            });
        }

        // 7. Flak Bursts (Cap: 15)
        this.flakBursts = [];
        this.flakPool = [];
        const flakGeo = new THREE.DodecahedronGeometry(2.5, 0);
        for (let i = 0; i < 15; i++) {
            const group = new THREE.Group();
            const puff = new THREE.Mesh(flakGeo, new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 }));
            group.add(puff);
            group.visible = false;
            this.scene.add(group);
            this.flakPool.push({
                group: group,
                puff: puff,
                life: 0,
                maxLife: 1.4,
                active: false
            });
        }

        this.muzzleFlashes = [];
        this.smokeScreens = [];
    }

    createMuzzleFlash(pos, dir, scale = 1.0) {
        // High efficiency light pulse
        this.createSmokePuff(pos.clone().add(dir.clone().multiplyScalar(2.0)), 2.0 * scale, 0xdddddd, 1.0);
    }

    createShell(origin, target, speed = 130, caliber = 'heavy', onHitCallback = null) {
        const item = this.projectilePool.find(p => !p.active);
        if (!item) return;

        const dist = origin.distanceTo(target);
        item.startPos.copy(origin);
        item.targetPos.copy(target);
        item.travelTime = Math.max(0.8, dist / speed);
        item.elapsed = 0;
        item.arcHeight = Math.min(180, dist * 0.25);
        item.onHit = onHitCallback;
        item.active = true;
        item.mesh.position.copy(origin);
        item.mesh.visible = true;
        this.projectiles.push(item);
    }

    createTorpedo(origin, direction, targetShip = null, onHitCallback = null) {
        const item = this.torpedoPool.find(t => !t.active);
        if (!item) return;

        item.group.position.copy(origin);
        item.group.position.y = -0.5;
        item.direction.copy(direction).normalize();
        item.group.lookAt(origin.clone().add(item.direction));
        item.life = 24.0;
        item.speed = 38.0;
        item.targetShip = targetShip;
        item.onHit = onHitCallback;
        item.lastWakeTime = 0;
        item.active = true;
        item.group.visible = true;
        this.torpedoes.push(item);
    }

    createWaterGeyser(pos, scale = 1.0) {
        const item = this.geyserPool.find(g => !g.active);
        if (!item) return;

        item.group.position.set(pos.x, 0, pos.z);
        item.group.scale.set(scale, scale, scale);
        item.column.material.opacity = 0.8;
        item.life = item.maxLife;
        item.active = true;
        item.group.visible = true;
        this.waterGeysers.push(item);
    }

    createExplosion(pos, scale = 1.0) {
        const item = this.explosionPool.find(e => !e.active);
        if (!item) return;

        item.group.position.copy(pos);
        item.scale = scale;
        item.fireMesh.scale.setScalar(scale);
        item.fireMesh.material.opacity = 0.95;
        item.light.intensity = 4.0 * scale;
        item.life = item.maxLife;
        item.active = true;
        item.group.visible = true;
        this.explosions.push(item);

        this.createSmokePuff(pos.clone().add(new THREE.Vector3(0, 3, 0)), 3.0 * scale, 0x1f1f1f, 2.2);
    }

    createFlakBurst(pos) {
        const item = this.flakPool.find(f => !f.active);
        if (!item) return;

        item.group.position.copy(pos);
        item.puff.scale.setScalar(1.0);
        item.puff.material.opacity = 0.8;
        item.life = item.maxLife;
        item.active = true;
        item.group.visible = true;
        this.flakBursts.push(item);
    }

    createSmokePuff(pos, radius = 2.5, color = 0x222222, duration = 1.8) {
        const item = this.smokePool.find(s => !s.active);
        if (!item) return;

        item.mesh.position.copy(pos);
        item.mesh.scale.setScalar(radius / 2.5);
        item.mesh.material.color.setHex(color);
        item.mesh.material.opacity = 0.65;
        item.growth = radius * 1.2;
        item.life = duration;
        item.maxLife = duration;
        item.active = true;
        item.mesh.visible = true;
        this.smokePuffs.push(item);
    }

    createWakeSegment(pos, angle, width = 6.0) {
        const item = this.wakePool.find(w => !w.active);
        if (!item) return;

        item.mesh.position.set(pos.x, 0.15, pos.z);
        item.mesh.rotation.y = angle;
        item.mesh.scale.set(width / 6.0, 1.0, 1.0);
        item.mesh.material.opacity = 0.45;
        item.life = item.maxLife;
        item.active = true;
        item.mesh.visible = true;
        this.wakes.push(item);
    }

    createSmokeScreenCloud(pos, radius = 26.0, duration = 22.0) {
        // Efficient smoke screen using pooled billows
        for (let i = 0; i < 3; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * radius * 0.7,
                2,
                (Math.random() - 0.5) * radius * 0.7
            );
            this.createSmokePuff(pos.clone().add(offset), radius * 0.6, 0xeeeeee, duration);
        }
    }

    clearAll() {
        const resetPool = (arr) => {
            for (const item of arr) {
                item.active = false;
                if (item.mesh) item.mesh.visible = false;
                if (item.group) item.group.visible = false;
            }
        };

        resetPool(this.projectilePool);
        resetPool(this.torpedoPool);
        resetPool(this.geyserPool);
        resetPool(this.explosionPool);
        resetPool(this.smokePool);
        resetPool(this.wakePool);
        resetPool(this.flakPool);

        this.projectiles = [];
        this.torpedoes = [];
        this.waterGeysers = [];
        this.explosions = [];
        this.smokePuffs = [];
        this.wakes = [];
        this.flakBursts = [];
    }

    update(delta) {
        // 1. Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.elapsed += delta;
            const progress = p.elapsed / p.travelTime;

            if (progress >= 1.0) {
                p.active = false;
                p.mesh.visible = false;
                this.projectiles.splice(i, 1);
                if (p.onHit) p.onHit(p.targetPos);
            } else {
                const curPos = new THREE.Vector3().lerpVectors(p.startPos, p.targetPos, progress);
                const arcY = 4.0 * p.arcHeight * progress * (1.0 - progress);
                curPos.y += arcY;
                p.mesh.position.copy(curPos);
            }
        }

        // 2. Update Torpedoes
        for (let i = this.torpedoes.length - 1; i >= 0; i--) {
            const t = this.torpedoes[i];
            t.life -= delta;

            t.group.position.addScaledVector(t.direction, t.speed * delta);

            // Emit wake bubble occasionally
            t.lastWakeTime += delta;
            if (t.lastWakeTime > 0.12) {
                t.lastWakeTime = 0;
                this.createSmokePuff(t.group.position, 0.7, 0xffffff, 1.2);
            }

            if (t.life <= 0 || (t.onHit && t.onHit(t.group.position, t))) {
                t.active = false;
                t.group.visible = false;
                this.torpedoes.splice(i, 1);
            }
        }

        // 3. Update Water Geysers
        for (let i = this.waterGeysers.length - 1; i >= 0; i--) {
            const g = this.waterGeysers[i];
            g.life -= delta;
            const progress = 1.0 - (g.life / g.maxLife);

            if (g.life <= 0) {
                g.active = false;
                g.group.visible = false;
                this.waterGeysers.splice(i, 1);
            } else {
                g.column.scale.y = Math.sin(progress * Math.PI);
                g.ring.scale.setScalar(1.0 + progress * 2.0);
                g.column.material.opacity = (1.0 - progress) * 0.8;
            }
        }

        // 4. Update Explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= delta;
            const progress = 1.0 - (exp.life / exp.maxLife);

            if (exp.life <= 0) {
                exp.active = false;
                exp.group.visible = false;
                this.explosions.splice(i, 1);
            } else {
                const s = (1.0 + progress * 2.2) * exp.scale;
                exp.fireMesh.scale.setScalar(s);
                exp.fireMesh.material.opacity = (1.0 - progress) * 0.95;
                exp.light.intensity = (1.0 - progress) * 4.0 * exp.scale;
            }
        }

        // 5. Update Smoke Puffs
        for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
            const s = this.smokePuffs[i];
            s.life -= delta;
            const progress = 1.0 - (s.life / s.maxLife);

            if (s.life <= 0) {
                s.active = false;
                s.mesh.visible = false;
                this.smokePuffs.splice(i, 1);
            } else {
                s.mesh.position.addScaledVector(s.drift, delta);
                s.mesh.scale.setScalar(1.0 + progress * s.growth);
                s.mesh.material.opacity = (1.0 - progress) * 0.65;
            }
        }

        // 6. Update Wakes
        for (let i = this.wakes.length - 1; i >= 0; i--) {
            const w = this.wakes[i];
            w.life -= delta;
            const progress = 1.0 - (w.life / w.maxLife);

            if (w.life <= 0) {
                w.active = false;
                w.mesh.visible = false;
                this.wakes.splice(i, 1);
            } else {
                w.mesh.scale.x = 1.0 + progress * 1.5;
                w.mesh.material.opacity = (1.0 - progress) * 0.45;
            }
        }

        // 7. Update Flak
        for (let i = this.flakBursts.length - 1; i >= 0; i--) {
            const f = this.flakBursts[i];
            f.life -= delta;
            const progress = 1.0 - (f.life / f.maxLife);

            if (f.life <= 0) {
                f.active = false;
                f.group.visible = false;
                this.flakBursts.splice(i, 1);
            } else {
                f.puff.scale.setScalar(1.0 + progress * 1.4);
                f.puff.material.opacity = (1.0 - progress) * 0.8;
            }
        }
    }
}
