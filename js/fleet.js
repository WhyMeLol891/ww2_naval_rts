/**
 * PACIFIC ARMED - Warship Logic, Harbor Base Operations & 6-Player Combat Mechanics
 */

class HarborBase {
    constructor(config) {
        this.id = config.id || ('harbor_' + config.faction);
        this.faction = config.faction || 'usn';
        this.playerIndex = config.playerIndex || 1;
        this.name = config.name || `${ShipModelBuilder.getFactionColors(this.faction).name} Base`;
        this.scene = config.scene;
        this.ocean = config.ocean;
        this.particles = config.particles;
        this.sound = window.soundEngine;

        this.pos = new THREE.Vector2(config.x || 0, config.z || 0);
        this.heading = config.facingAngle || 0;
        this.shipSpawnPoint = new THREE.Vector2(config.shipSpawnX || 0, config.shipSpawnZ || 0);

        this.maxHp = 5000;
        this.hp = this.maxHp;
        this.isDestroyed = false;

        // Resource & Production
        this.steel = config.initialSteel || 800;
        this.steelRate = 18.0; // Steel per second
        this.productionQueue = [];
        this.currentProduction = null;
        this.productionTimer = 0;

        // Construct 3D Harbor Model
        this.mesh = ShipModelBuilder.buildHarborBase(this.faction);
        this.mesh.position.set(this.pos.x, 0, this.pos.y);
        this.mesh.rotation.y = -this.heading;
        this.mesh.userData.baseInstance = this;
        this.scene.add(this.mesh);

        this.turrets = this.mesh.userData.turrets || [];
        this.radar = this.mesh.userData.radar || null;

        this.targetShip = null;
        this.targetScanTimer = 0;
    }

    // Ship costs and build times
    static get SHIP_COSTS() {
        return {
            'DD': { name: 'Destroyer', steel: 300, time: 8.0, desc: 'Agile torpedo flanker & smoke' },
            'SS': { name: 'Submarine', steel: 350, time: 9.0, desc: 'Stealth underwater predator' },
            'CA': { name: 'Cruiser', steel: 550, time: 14.0, desc: 'Rapid 8" guns & heavy AA' },
            'BB': { name: 'Battleship', steel: 950, time: 22.0, desc: '16" broadsides & heavy armor' },
            'CV': { name: 'Carrier', steel: 1100, time: 25.0, desc: 'Dauntless dive & torpedo strikes' }
        };
    }

    queueShip(shipClass) {
        if (this.isDestroyed) return false;
        const info = HarborBase.SHIP_COSTS[shipClass];
        if (!info || this.steel < info.steel) return false;

        this.steel -= info.steel;
        this.productionQueue.push({
            shipClass: shipClass,
            totalTime: info.time,
            timeLeft: info.time
        });

        if (this.sound) this.sound.playTacticalChirp();
        return true;
    }

    takeDamage(damage, type = 'ap', hitPos = null) {
        if (this.isDestroyed || this.hp <= 0) return;
        this.hp = Math.max(0, this.hp - damage);

        const impactPoint = hitPos || new THREE.Vector3(this.pos.x, 6, this.pos.y);
        this.particles.createExplosion(impactPoint, 2.0);

        if (this.hp <= 0) {
            this.isDestroyed = true;
            this.hp = 0;
            this.targetShip = null;
            for (const t of this.turrets) {
                t.reloadTimer = Infinity;
            }
            this.particles.createExplosion(new THREE.Vector3(this.pos.x, 15, this.pos.y), 4.5);
            if (this.sound) this.sound.playTorpedoExplosion();
        }
    }

    update(delta, allShips) {
        if (this.isDestroyed || this.hp <= 0) return;

        // Passive Steel Generation
        this.steel += this.steelRate * delta;

        // Radar rotation
        if (this.radar) this.radar.rotation.y += delta * 1.5;

        // Production Queue Progress
        if (!this.currentProduction && this.productionQueue.length > 0) {
            this.currentProduction = this.productionQueue.shift();
        }

        if (this.currentProduction) {
            this.currentProduction.timeLeft -= delta;
            if (this.currentProduction.timeLeft <= 0) {
                // Ship finished! Spawn into water
                this.spawnProducedShip(this.currentProduction.shipClass);
                this.currentProduction = null;
            }
        }

        // Dock Repair Aura: repair friendly ships within 120 units
        for (const ship of allShips) {
            if (ship.isSinking || ship.faction !== this.faction) continue;
            const dx = ship.pos.x - this.pos.x;
            const dz = ship.pos.y - this.pos.y;
            if (dx * dx + dz * dz < 120 * 120) {
                if (ship.hp < ship.maxHp) {
                    ship.hp = Math.min(ship.maxHp, ship.hp + 28 * delta);
                }
                ship.fires = 0;
                ship.flooding = 0;
            }
        }

        // Coastal Defense Batteries update
        this.updateCoastalGuns(delta, allShips);
    }

    spawnProducedShip(shipClass) {
        if (!window.game) return;

        const count = window.game.ships.filter(s => s.faction === this.faction).length + 1;
        const colorCfg = ShipModelBuilder.getFactionColors(this.faction);

        const rightX = Math.cos(this.heading);
        const rightZ = Math.sin(this.heading);

        const newShip = new Ship({
            id: `${this.faction}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: `${colorCfg.name} No.${count}`,
            faction: this.faction,
            shipClass: shipClass,
            x: this.shipSpawnPoint.x + rightX * (Math.random() - 0.5) * 30,
            z: this.shipSpawnPoint.y + rightZ * (Math.random() - 0.5) * 30,
            heading: this.heading,
            scene: this.scene,
            ocean: this.ocean,
            particles: this.particles
        });

        // Set move waypoint forward into open water
        const fwdX = Math.sin(this.heading);
        const fwdZ = -Math.cos(this.heading);
        newShip.setMoveTarget(this.shipSpawnPoint.x + fwdX * 90, this.shipSpawnPoint.y + fwdZ * 90);
        window.game.ships.push(newShip);

        if (this.faction === 'usn' && window.game) {
            window.game.showCombatMessage(`Dockyard: ${colorCfg.name} commissioned a new ${shipClass}!`);
        }
    }

    updateCoastalGuns(delta, allShips) {
        if (this.isDestroyed || this.hp <= 0) return;

        this.targetScanTimer -= delta;
        if (this.targetScanTimer <= 0) {
            this.targetScanTimer = 1.0;
            // Find closest hostile ship
            let closest = null;
            let minDistSq = 450 * 450;
            for (const ship of allShips) {
                if (ship.isSinking || ship.hp <= 0 || ship.isDead || ship.faction === this.faction) continue;
                if (ship.shipClass === 'SS' && ship.currentDepth < -6) continue;
                const dx = ship.pos.x - this.pos.x;
                const dz = ship.pos.y - this.pos.y;
                const dSq = dx * dx + dz * dz;
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    closest = ship;
                }
            }
            this.targetShip = closest;
        }

        if (!this.targetShip || this.targetShip.isSinking || this.targetShip.hp <= 0 || this.targetShip.isDead) {
            this.targetShip = null;
            return;
        }

        for (const t of this.turrets) {
            if (t.reloadTimer > 0) t.reloadTimer -= delta;

            const dx = this.targetShip.pos.x - this.pos.x;
            const dz = this.targetShip.pos.y - this.pos.y;
            const worldAngle = Math.atan2(dx, -dz);
            let localAngle = worldAngle - this.heading;
            while (localAngle > Math.PI) localAngle -= Math.PI * 2;
            while (localAngle < -Math.PI) localAngle += Math.PI * 2;

            t.base.rotation.y = -localAngle;

            if (t.reloadTimer <= 0) {
                // Fire Coastal Battery
                t.reloadTimer = t.reloadTime;
                const worldPos = new THREE.Vector3();
                t.group.getWorldPosition(worldPos);

                const targetPos = new THREE.Vector3(this.targetShip.pos.x, 2, this.targetShip.pos.y);
                this.particles.createShell(worldPos, targetPos, 140, 'heavy', (hitCoord) => {
                    const hitSq = (this.targetShip.pos.x - hitCoord.x) ** 2 + (this.targetShip.pos.y - hitCoord.z) ** 2;
                    if (hitSq < 22 * 22) {
                        this.targetShip.takeDamage(t.damage, 'ap', hitCoord);
                    } else {
                        this.particles.createWaterGeyser(hitCoord, 1.5);
                    }
                });

                if (this.sound) this.sound.playHeavyCannon(1.3);
            }
        }
    }
}

class Ship {
    constructor(config) {
        this.id = config.id || ('ship_' + Math.floor(Math.random() * 100000));
        this.name = config.name || 'Warship';
        this.faction = config.faction || 'usn';
        this.shipClass = config.shipClass || 'BB';
        this.scene = config.scene;
        this.ocean = config.ocean;
        this.particles = config.particles;
        this.sound = window.soundEngine;

        this.initAttributes();
        this.buildModel();

        this.pos = new THREE.Vector2(config.x || 0, config.z || 0);
        this.heading = config.heading || 0;
        this.targetHeading = this.heading;
        this.throttle = 0.0;
        this.currentSpeed = 0.0;
        this.roll = 0.0;
        this.pitch = 0.0;

        this.isSelected = false;
        this.targetPosition = null;
        this.targetShip = null;
        this.hasExplicitAttackOrder = false;

        this.fires = 0;
        this.flooding = 0;
        this.smokeScreenActive = false;
        this.smokeTimer = 0;
        this.damageControlActive = false;
        this.damageControlTimer = 0;
        this.isSinking = false;
        this.sinkProgress = 0.0;

        this.currentDepth = 0;
        this.targetDepth = 0;

        if (this.shipClass === 'CV') {
            this.diveBomberReady = true;
            this.diveBomberCooldown = 0;
            this.torpedoBomberReady = true;
            this.torpedoBomberCooldown = 0;
        }

        this.torpedoCooldown = 0;
        this.wakeTimer = 0;
        this.targetScanTimer = Math.random() * 0.8; // Jittered target scanning to avoid lag spikes

        this.initSelectionUI();
        this.syncTransform();
    }

    initAttributes() {
        switch (this.shipClass) {
            case 'BB':
                this.maxHp = 3800; this.armor = 320; this.maxSpeed = 22.0; this.turnRate = 0.26;
                this.radarRange = 600; this.detectionRange = 520; this.aaDefense = 55;
                break;
            case 'CV':
                this.maxHp = 2900; this.armor = 130; this.maxSpeed = 26.0; this.turnRate = 0.32;
                this.radarRange = 650; this.detectionRange = 560; this.aaDefense = 45;
                break;
            case 'CA':
                this.maxHp = 2200; this.armor = 170; this.maxSpeed = 29.0; this.turnRate = 0.45;
                this.radarRange = 500; this.detectionRange = 450; this.aaDefense = 75;
                break;
            case 'DD':
                this.maxHp = 1150; this.armor = 30; this.maxSpeed = 38.0; this.turnRate = 0.85;
                this.radarRange = 420; this.detectionRange = 360; this.aaDefense = 30;
                break;
            case 'SS':
                this.maxHp = 900; this.armor = 25; this.maxSpeed = 16.0; this.turnRate = 0.55;
                this.radarRange = 300; this.detectionRange = 340; this.aaDefense = 8;
                break;
            default:
                this.maxHp = 2000; this.armor = 100; this.maxSpeed = 25.0; this.turnRate = 0.4;
                this.radarRange = 450; this.detectionRange = 400; this.aaDefense = 40;
        }
        this.hp = this.maxHp;
    }

    buildModel() {
        switch (this.shipClass) {
            case 'BB': this.mesh = ShipModelBuilder.buildBattleship(this.faction); break;
            case 'CV': this.mesh = ShipModelBuilder.buildAircraftCarrier(this.faction); break;
            case 'CA': this.mesh = ShipModelBuilder.buildCruiser(this.faction); break;
            case 'DD': this.mesh = ShipModelBuilder.buildDestroyer(this.faction); break;
            case 'SS': this.mesh = ShipModelBuilder.buildSubmarine(this.faction); break;
            default: this.mesh = ShipModelBuilder.buildCruiser(this.faction);
        }
        this.turrets = this.mesh.userData.turrets || [];
        this.aaMounts = this.mesh.userData.aaMounts || [];
        this.funnels = this.mesh.userData.funnels || [];
        this.radar = this.mesh.userData.radar || null;
        this.mesh.userData.shipInstance = this;
        this.scene.add(this.mesh);
    }

    initSelectionUI() {
        const ringGeo = new THREE.RingGeometry(18, 20, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x33ff66,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
        this.selectionRing.visible = false;
        this.scene.add(this.selectionRing);
    }

    setSelected(val) {
        this.isSelected = val;
        if (this.selectionRing) {
            this.selectionRing.visible = val && !this.isSinking;
        }
    }

    setMoveTarget(x, z) {
        this.targetPosition = new THREE.Vector2(x, z);
        this.targetShip = null;
        this.hasExplicitAttackOrder = false;
        this.throttle = 1.0;
        if (this.sound && this.faction === 'usn') this.sound.playTacticalChirp();
    }

    setAttackTarget(target) {
        if (!target || target.isSinking) return;
        this.targetShip = target;
        this.targetPosition = null;
        this.hasExplicitAttackOrder = true;
        if (this.sound && this.faction === 'usn') this.sound.playTacticalChirp();
    }

    orderSalvo() {
        if (this.isSinking) return;
        let firedAny = false;
        for (const t of this.turrets) {
            if (t.type === 'heavy' || t.type === 'medium' || t.type === 'light') {
                if (t.reloadTimer <= 0) {
                    const fired = this.fireTurret(t);
                    if (fired) firedAny = true;
                }
            }
        }
        if (firedAny && this.sound) {
            if (this.shipClass === 'BB') this.sound.playHeavyCannon(1.0);
            else if (this.shipClass === 'CA') this.sound.playMediumCannon(1.0);
            else this.sound.playLightGun(1.0);
        }
    }

    orderTorpedoSpread(targetPoint = null) {
        if (this.isSinking || this.torpedoCooldown > 0) return false;
        const torpTurret = this.turrets.find(t => t.type === 'torpedo');
        if (!torpTurret) return false;

        const count = this.shipClass === 'DD' ? 5 : 3;
        const spreadAngle = 0.08;

        if (!targetPoint && this.targetShip && !this.targetShip.isSinking) {
            targetPoint = new THREE.Vector3(this.targetShip.pos.x, 0, this.targetShip.pos.y);
        }

        const baseAngle = targetPoint
            ? Math.atan2(targetPoint.x - this.pos.x, -(targetPoint.z - this.pos.y))
            : this.heading;

        const startIdx = -Math.floor(count / 2);
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (startIdx + i) * spreadAngle;
            const dir = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle)).normalize();

            const spawnPos = new THREE.Vector3(
                this.pos.x + Math.sin(this.heading) * 12 + dir.x * 4,
                0,
                this.pos.y - Math.cos(this.heading) * 12 + dir.z * 4
            );

            this.particles.createTorpedo(spawnPos, dir, this.targetShip, (hitPos, torp) => {
                return this.handleTorpedoImpact(hitPos, torp);
            });
        }

        this.torpedoCooldown = 25.0;
        if (this.sound) this.sound.playTorpedoLaunch();
        return true;
    }

    handleTorpedoImpact(hitPos, torp) {
        if (!window.game || !window.game.ships) return false;

        // Check ship collision
        for (const ship of window.game.ships) {
            if (ship.isSinking || ship.faction === this.faction) continue;
            if (ship.shipClass === 'SS' && ship.currentDepth < -5) continue;

            const dx = ship.pos.x - hitPos.x;
            const dz = ship.pos.y - hitPos.z;
            const hitRadius = ship.shipClass === 'BB' ? 24 : 16;

            if (dx * dx + dz * dz < hitRadius * hitRadius) {
                const dmg = 750 + Math.random() * 250;
                ship.takeDamage(dmg, 'torpedo', hitPos);
                this.particles.createExplosion(hitPos, 2.4);
                this.particles.createWaterGeyser(hitPos, 2.2);
                if (this.sound) this.sound.playTorpedoExplosion();
                return true;
            }
        }

        // Check harbor collision
        if (window.game.harbors) {
            for (const harbor of window.game.harbors) {
                if (harbor.isDestroyed || harbor.faction === this.faction) continue;
                const dx = harbor.pos.x - hitPos.x;
                const dz = harbor.pos.y - hitPos.z;
                if (dx * dx + dz * dz < 45 * 45) {
                    harbor.takeDamage(850, 'torpedo', hitPos);
                    this.particles.createExplosion(hitPos, 2.5);
                    this.particles.createWaterGeyser(hitPos, 2.2);
                    if (this.sound) this.sound.playTorpedoExplosion();
                    return true;
                }
            }
        }

        return false;
    }

    orderSmokeScreen() {
        if (this.shipClass !== 'DD' || this.isSinking || this.smokeScreenActive) return false;
        this.smokeScreenActive = true;
        this.smokeTimer = 22.0;
        this.particles.createSmokeScreenCloud(new THREE.Vector3(this.pos.x, 0, this.pos.y), 28.0, 22.0);
        return true;
    }

    orderDamageControl() {
        if (this.isSinking || this.damageControlActive) return false;
        this.damageControlActive = true;
        this.damageControlTimer = 15.0;
        this.fires = 0;
        this.flooding = 0;
        return true;
    }

    toggleSubmarineDive() {
        if (this.shipClass !== 'SS' || this.isSinking) return;
        this.targetDepth = this.targetDepth === 0 ? -16 : 0;
        if (this.sound) this.sound.playSonarPing();
    }

    takeDamage(rawDamage, type = 'ap', hitPos = null) {
        if (this.isSinking) return;

        let effectiveDamage = rawDamage;

        if (type === 'ap') {
            const penetration = rawDamage * 1.8;
            if (penetration > this.armor) {
                effectiveDamage = rawDamage * 1.5;
                if (Math.random() < 0.35) this.fires = Math.min(3, this.fires + 1);
                if (this.sound) this.sound.playShellHit(false);
            } else {
                effectiveDamage = rawDamage * 0.35;
                if (this.sound) this.sound.playShellHit(true);
            }
        } else if (type === 'he') {
            effectiveDamage = rawDamage * 0.85;
            if (Math.random() < 0.5) this.fires = Math.min(3, this.fires + 1);
            if (this.sound) this.sound.playShellHit(false);
        } else if (type === 'torpedo') {
            effectiveDamage = rawDamage;
            this.flooding = Math.min(2, this.flooding + 1);
        } else if (type === 'bomb') {
            effectiveDamage = rawDamage;
            if (Math.random() < 0.6) this.fires = Math.min(3, this.fires + 1);
            if (this.sound) this.sound.playShellHit(false);
        }

        this.hp = Math.max(0, this.hp - effectiveDamage);

        const impactPoint = hitPos || new THREE.Vector3(this.pos.x, 4.0, this.pos.y);
        this.particles.createExplosion(impactPoint, type === 'torpedo' ? 2.5 : 1.2);

        if (this.hp <= 0 && !this.isSinking) {
            this.startSinking();
        }
    }

    startSinking() {
        this.isSinking = true;
        this.throttle = 0;
        this.currentSpeed = 0;
        this.setSelected(false);
        if (this.sound && this.faction === 'usn') {
            this.sound.playGeneralQuarters();
        }
        this.particles.createExplosion(new THREE.Vector3(this.pos.x, 8, this.pos.y), 3.5);
    }

    fireTurret(turret) {
        if (!this.targetShip || this.targetShip.isSinking) return false;

        const targetPos3D = new THREE.Vector3(this.targetShip.pos.x, 2.0, this.targetShip.pos.y);

        // Lead prediction
        const leadOffset = new THREE.Vector3(
            Math.sin(this.targetShip.heading) * this.targetShip.currentSpeed * 1.8,
            0,
            -Math.cos(this.targetShip.heading) * this.targetShip.currentSpeed * 1.8
        );
        targetPos3D.add(leadOffset);

        const dist = this.pos.distanceTo(this.targetShip.pos);
        const dispersion = dist * 0.045;
        targetPos3D.x += (Math.random() - 0.5) * dispersion;
        targetPos3D.z += (Math.random() - 0.5) * dispersion;

        const worldPos = new THREE.Vector3();
        turret.group.getWorldPosition(worldPos);

        const barrelDir = new THREE.Vector3();
        turret.base.getWorldDirection(barrelDir);
        barrelDir.negate();

        turret.barrelPoints.forEach(bp => {
            const tipWorld = bp.clone().applyMatrix4(turret.base.matrixWorld);
            this.particles.createMuzzleFlash(tipWorld, barrelDir, turret.type === 'heavy' ? 1.6 : 1.0);
        });

        this.particles.createShell(worldPos, targetPos3D, 140, turret.type, (hitCoord) => {
            const hitDistSq = (this.targetShip.pos.x - hitCoord.x) ** 2 + (this.targetShip.pos.y - hitCoord.z) ** 2;
            const shipRadius = this.targetShip.shipClass === 'BB' ? 22 : 14;

            if (hitDistSq < shipRadius * shipRadius) {
                this.targetShip.takeDamage(turret.damage, 'ap', hitCoord);
            } else {
                this.particles.createWaterGeyser(hitCoord, turret.type === 'heavy' ? 1.6 : 1.0);
                if (this.sound) this.sound.playWaterSplash();
            }
        });

        turret.reloadTimer = turret.reloadTime;
        return true;
    }

    updateTurrets(delta) {
        // Optimized Staggered Target Search
        this.targetScanTimer -= delta;
        if (this.targetScanTimer <= 0) {
            this.targetScanTimer = 0.8 + Math.random() * 0.4;
            if (!this.targetShip || this.targetShip.isSinking) {
                if (window.game && window.game.ships) {
                    let closest = null;
                    let minDistSq = this.detectionRange * this.detectionRange;
                    for (const e of window.game.ships) {
                        if (e.faction === this.faction || e.isSinking) continue;
                        if (e.shipClass === 'SS' && e.currentDepth < -6) continue;
                        const dx = e.pos.x - this.pos.x;
                        const dz = e.pos.y - this.pos.y;
                        const dSq = dx * dx + dz * dz;
                        if (dSq < minDistSq) {
                            minDistSq = dSq;
                            closest = e;
                        }
                    }
                    if (closest) this.targetShip = closest;
                }
            }
        }

        for (const t of this.turrets) {
            if (t.reloadTimer > 0) t.reloadTimer -= delta;
            if (t.type === 'torpedo') continue;

            let desiredAngle = 0;
            if (this.targetShip && !this.targetShip.isSinking) {
                const targetPos = this.targetShip.pos || { x: this.targetShip.pos.x, y: this.targetShip.pos.y };
                const dx = targetPos.x - this.pos.x;
                const dz = (targetPos.y !== undefined ? targetPos.y : targetPos.z) - this.pos.y;
                const worldAngle = Math.atan2(dx, -dz);
                let localAngle = worldAngle - this.heading;
                while (localAngle > Math.PI) localAngle -= Math.PI * 2;
                while (localAngle < -Math.PI) localAngle += Math.PI * 2;

                desiredAngle = -localAngle;

                if (localAngle >= t.arcMin && localAngle <= t.arcMax) {
                    if (t.reloadTimer <= 0 && Math.abs(t.base.rotation.y - desiredAngle) < 0.18) {
                        const distSq = dx * dx + dz * dz;
                        if (distSq <= t.range * t.range) {
                            this.fireTurret(t);
                            if (this.sound) {
                                if (t.type === 'heavy') this.sound.playHeavyCannon(1.2);
                                else if (t.type === 'medium') this.sound.playMediumCannon(1.2);
                                else this.sound.playLightGun(1.2);
                            }
                        }
                    }
                }
            }

            const traverseSpeed = t.type === 'heavy' ? 0.6 : 1.4;
            const diff = desiredAngle - t.base.rotation.y;
            t.base.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), traverseSpeed * delta);
        }
    }

    updateAABatteries(delta, enemySquadrons) {
        if (!enemySquadrons || enemySquadrons.length === 0 || this.isSinking) return;

        let closestSq = 220 * 220;
        let targetPlane = null;

        for (const sq of enemySquadrons) {
            if (sq.faction === this.faction || sq.planes.length === 0) continue;
            for (const plane of sq.planes) {
                const dx = plane.position.x - this.pos.x;
                const dz = plane.position.z - this.pos.y;
                const dSq = dx * dx + dz * dz;
                if (dSq < closestSq) {
                    closestSq = dSq;
                    targetPlane = plane;
                }
            }
        }

        if (targetPlane) {
            for (const aa of this.aaMounts) {
                if (aa.userData.barrels) aa.lookAt(targetPlane.position);
            }

            if (Math.random() < 0.18) {
                const burstPos = targetPlane.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 12
                ));
                this.particles.createFlakBurst(burstPos);
                if (this.sound) this.sound.playAABurst();

                if (burstPos.distanceTo(targetPlane.position) < 8.0) {
                    targetPlane.userData.hp = (targetPlane.userData.hp || 30) - 20;
                }
            }
        }
    }

    updatePhysics(delta) {
        if (this.isSinking) {
            this.sinkProgress += delta * 0.12;
            this.mesh.position.y -= delta * 3.5;
            this.mesh.rotation.z += delta * 0.08;
            this.mesh.rotation.x -= delta * 0.05;

            if (this.sinkProgress >= 1.0) {
                this.scene.remove(this.mesh);
                if (this.selectionRing) this.scene.remove(this.selectionRing);
            }
            return;
        }

        if (this.damageControlActive) {
            this.damageControlTimer -= delta;
            if (this.damageControlTimer <= 0) this.damageControlActive = false;
        }

        if (this.fires > 0) this.takeDamage(this.fires * 12 * delta, 'fire');
        if (this.flooding > 0) this.takeDamage(this.flooding * 18 * delta, 'flooding');

        if (this.smokeScreenActive) {
            this.smokeTimer -= delta;
            if (this.smokeTimer <= 0) this.smokeScreenActive = false;
        }

        if (this.torpedoCooldown > 0) this.torpedoCooldown -= delta;

        if (this.shipClass === 'CV') {
            if (!this.diveBomberReady) {
                this.diveBomberCooldown -= delta;
                if (this.diveBomberCooldown <= 0) this.diveBomberReady = true;
            }
            if (!this.torpedoBomberReady) {
                this.torpedoBomberCooldown -= delta;
                if (this.torpedoBomberCooldown <= 0) this.torpedoBomberReady = true;
            }
        }

        if (this.shipClass === 'SS') {
            this.currentDepth += Math.sign(this.targetDepth - this.currentDepth) * Math.min(Math.abs(this.targetDepth - this.currentDepth), delta * 4.0);
            if (this.mesh) this.mesh.position.y = this.currentDepth;
        }

        // Navigation & Steering
        if (this.targetPosition) {
            const dx = this.targetPosition.x - this.pos.x;
            const dz = this.targetPosition.y - this.pos.y;
            if (dx * dx + dz * dz < 20 * 20) {
                this.targetPosition = null;
                this.throttle = 0;
                this.targetHeading = this.heading;
            } else {
                this.targetHeading = Math.atan2(dx, -dz);
            }
        } else if (this.targetShip && !this.targetShip.isSinking && (this.faction !== 'usn' || this.hasExplicitAttackOrder)) {
            const targetPos = this.targetShip.pos || { x: this.targetShip.pos.x, y: this.targetShip.pos.y };
            const dx = targetPos.x - this.pos.x;
            const dz = (targetPos.y !== undefined ? targetPos.y : targetPos.z) - this.pos.y;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const optimalRange = this.shipClass === 'BB' ? 320 : (this.shipClass === 'DD' ? 120 : 220);

            if (dist > optimalRange + 50) {
                this.targetHeading = Math.atan2(dx, -dz);
                this.throttle = 1.0;
            } else if (dist < optimalRange - 40) {
                this.targetHeading = Math.atan2(-dx, dz);
                this.throttle = 0.6;
            } else {
                const directAngle = Math.atan2(dx, -dz);
                this.targetHeading = directAngle + Math.PI / 2;
                this.throttle = 0.5;
            }
        } else {
            // Idle ship without move/attack order maintains its heading
            if (!this.targetPosition) {
                this.targetHeading = this.heading;
            }
        }

        // Steer with turn inertia (only turn if actively moving or ordered)
        let angleDiff = this.targetHeading - this.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const isMoving = Math.abs(this.currentSpeed) > 0.4 || this.throttle > 0 || this.targetPosition;
        if (Math.abs(angleDiff) > 0.015 && isMoving) {
            // Rudder effectiveness depends on forward water flow
            const speedFactor = Math.min(1.2, Math.max(0.4, Math.abs(this.currentSpeed) / (this.maxSpeed * 0.7)));
            const maxTurnThisFrame = this.turnRate * speedFactor * delta;
            const turnStep = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurnThisFrame);
            this.heading += turnStep;

            while (this.heading > Math.PI) this.heading -= Math.PI * 2;
            while (this.heading < -Math.PI) this.heading += Math.PI * 2;

            // Outward hull listing (roll) during high speed turns
            const targetRoll = -turnStep * 8.0;
            this.roll += (targetRoll - this.roll) * Math.min(1.0, delta * 3.0);
        } else {
            this.roll += (0 - this.roll) * Math.min(1.0, delta * 4.0);
        }

        // Hull water resistance: hard rudder turns reduce forward speed by up to 25%
        const rudderDrag = 1.0 - Math.min(0.25, Math.abs(angleDiff) * 0.15);
        const floodPenalty = 1.0 - (this.flooding * 0.25);
        const targetSpeed = this.maxSpeed * this.throttle * floodPenalty * rudderDrag;

        // Realistic heavy naval inertia
        const accelRate = this.shipClass === 'DD' ? 7.5 : (this.shipClass === 'BB' ? 3.2 : 5.0);
        this.currentSpeed += Math.sign(targetSpeed - this.currentSpeed) * Math.min(Math.abs(targetSpeed - this.currentSpeed), accelRate * delta);

        // Move forward along the bow axis
        const moveDist = this.currentSpeed * delta;
        const nextX = this.pos.x + Math.sin(this.heading) * moveDist;
        const nextZ = this.pos.y - Math.cos(this.heading) * moveDist;

        if (this.ocean && this.ocean.checkIslandCollision(nextX, nextZ, 12)) {
            this.currentSpeed = 0;
            const col = this.ocean.getNearestCollider(nextX, nextZ);
            if (col) {
                const awayX = this.pos.x - col.x;
                const awayZ = this.pos.y - col.z;
                this.targetHeading = Math.atan2(awayX, -awayZ);
            }
        } else {
            this.pos.x = nextX;
            this.pos.y = nextZ;
        }

        // Wave pitch and buoyancy
        if (this.ocean && this.currentDepth > -5) {
            const midWave = this.ocean.getWaveHeight(this.pos.x, this.pos.y);
            this.mesh.position.y = midWave + 0.3;
        }

        if (this.radar) this.radar.rotation.y += delta * 1.5;

        // Realistic Wakes: Stern wake and Bow cutwater spray
        if (Math.abs(this.currentSpeed) > 3.5 && this.currentDepth > -4) {
            this.wakeTimer += delta;
            if (this.wakeTimer > 0.22) {
                this.wakeTimer = 0;
                // Stern churning wake
                const sternPos = new THREE.Vector3(
                    this.pos.x - Math.sin(this.heading) * 32,
                    0.2,
                    this.pos.y + Math.cos(this.heading) * 32
                );
                this.particles.createWakeSegment(sternPos, -this.heading, this.shipClass === 'BB' ? 14 : 9);

                // High speed bow cutwater foam
                if (this.currentSpeed > 14.0) {
                    const bowPos = new THREE.Vector3(
                        this.pos.x + Math.sin(this.heading) * 32,
                        0.25,
                        this.pos.y - Math.cos(this.heading) * 32
                    );
                    this.particles.createWakeSegment(bowPos, -this.heading, this.shipClass === 'BB' ? 8 : 5);
                }
            }
        }

        this.syncTransform();
    }

    syncTransform() {
        if (!this.mesh) return;
        this.mesh.position.x = this.pos.x;
        this.mesh.position.z = this.pos.y;
        this.mesh.rotation.y = -this.heading; // Bow cuts cleanly forward into travel vector!
        this.mesh.rotation.z = this.roll;
        this.mesh.rotation.x = this.pitch;

        if (this.selectionRing) {
            this.selectionRing.position.set(this.pos.x, 0.4, this.pos.y);
            this.selectionRing.rotation.y = -this.heading;
        }
    }
}

class AircraftSquadron {
    constructor(config) {
        this.id = 'squad_' + Math.floor(Math.random() * 100000);
        this.carrier = config.carrier;
        this.faction = config.faction || 'usn';
        this.type = config.type || 'dive';
        this.targetShip = config.targetShip;
        this.scene = config.scene;
        this.particles = config.particles;
        this.sound = window.soundEngine;

        this.planes = [];
        this.altitude = 90.0;
        this.speed = 85.0;
        this.state = 'cruising';
        this.diveProgress = 0.0;

        this.pos = new THREE.Vector3(
            this.carrier ? this.carrier.pos.x : 0,
            this.altitude,
            this.carrier ? this.carrier.pos.y : 0
        );

        this.buildSquadron();
    }

    buildSquadron() {
        const offsets = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-14, 2, 16),
            new THREE.Vector3(14, 2, 16)
        ];

        offsets.forEach(offset => {
            const planeMesh = ShipModelBuilder.buildAircraft(this.faction, this.type, false);
            planeMesh.position.copy(this.pos.clone().add(offset));
            planeMesh.userData.offset = offset;
            planeMesh.userData.hp = 35;
            this.scene.add(planeMesh);
            this.planes.push(planeMesh);
        });
    }

    update(delta) {
        if (this.planes.length === 0) {
            this.state = 'destroyed';
            return;
        }

        for (let i = this.planes.length - 1; i >= 0; i--) {
            const p = this.planes[i];
            if (p.userData.hp <= 0) {
                this.particles.createExplosion(p.position, 1.2);
                this.scene.remove(p);
                this.planes.splice(i, 1);
            }
        }

        if (this.planes.length === 0) {
            this.state = 'destroyed';
            return;
        }

        let dest = null;
        if (this.state === 'cruising' || this.state === 'diving' || this.state === 'torpRun') {
            if (this.targetShip && !this.targetShip.isSinking) {
                dest = new THREE.Vector3(this.targetShip.pos.x, 0, this.targetShip.pos.y);
            } else {
                this.state = 'returning';
            }
        } else if (this.state === 'returning') {
            if (this.carrier && !this.carrier.isSinking) {
                dest = new THREE.Vector3(this.carrier.pos.x, this.altitude, this.carrier.pos.y);
            }
        }

        if (!dest) {
            this.state = 'returning';
            return;
        }

        const flatDist = new THREE.Vector2(this.pos.x, this.pos.z).distanceTo(new THREE.Vector2(dest.x, dest.z));

        if (this.state === 'cruising') {
            const dir = dest.clone().sub(this.pos);
            dir.y = 0;
            dir.normalize();

            this.pos.addScaledVector(dir, this.speed * delta);
            this.heading = Math.atan2(dir.x, -dir.z);

            if (flatDist < (this.type === 'dive' ? 140 : 200)) {
                if (this.type === 'dive') {
                    this.state = 'diving';
                    if (this.sound) this.sound.playDiveBomberScream();
                } else {
                    this.state = 'torpRun';
                }
            }
        } else if (this.state === 'diving') {
            this.diveProgress += delta * 0.75;
            this.pos.y = THREE.MathUtils.lerp(this.altitude, 15, this.diveProgress);

            const dir = dest.clone().sub(this.pos);
            dir.y = 0;
            dir.normalize();
            this.pos.addScaledVector(dir, this.speed * 1.5 * delta);

            if (this.diveProgress >= 1.0) {
                if (this.targetShip && !this.targetShip.isSinking) {
                    const hit = Math.random() < 0.75;
                    const bombTarget = new THREE.Vector3(this.targetShip.pos.x, 2, this.targetShip.pos.y);
                    if (hit) {
                        this.targetShip.takeDamage(620, 'bomb', bombTarget);
                    } else {
                        this.particles.createWaterGeyser(bombTarget, 2.0);
                    }
                }
                this.state = 'returning';
            }
        } else if (this.state === 'torpRun') {
            this.pos.y = THREE.MathUtils.lerp(this.pos.y, 12, delta * 2.0);
            const dir = dest.clone().sub(this.pos);
            dir.y = 0;
            dir.normalize();
            this.pos.addScaledVector(dir, this.speed * delta);

            if (flatDist < 120) {
                const torpDir = dir.clone();
                const spawnPos = new THREE.Vector3(this.pos.x, 0, this.pos.z);
                this.particles.createTorpedo(spawnPos, torpDir, this.targetShip, (hitPos, torp) => {
                    if (this.targetShip && !this.targetShip.isSinking) {
                        const dSq = (this.targetShip.pos.x - hitPos.x) ** 2 + (this.targetShip.pos.y - hitPos.z) ** 2;
                        if (dSq < 24 * 24) {
                            this.targetShip.takeDamage(850, 'torpedo', hitPos);
                            this.particles.createExplosion(hitPos, 2.6);
                            this.particles.createWaterGeyser(hitPos, 2.4);
                            if (this.sound) this.sound.playTorpedoExplosion();
                            return true;
                        }
                    }
                    return false;
                });
                this.state = 'returning';
            }
        } else if (this.state === 'returning') {
            this.pos.y = THREE.MathUtils.lerp(this.pos.y, this.altitude, delta * 1.5);
            const dir = dest.clone().sub(this.pos);
            dir.y = 0;
            dir.normalize();
            this.pos.addScaledVector(dir, this.speed * delta);
            this.heading = Math.atan2(dir.x, -dir.z);

            if (flatDist < 40) {
                this.state = 'landed';
                for (const p of this.planes) this.scene.remove(p);
                this.planes = [];
            }
        }

        for (const p of this.planes) {
            const offset = p.userData.offset || new THREE.Vector3();
            p.position.copy(this.pos.clone().add(offset));
            if (this.state === 'diving') p.rotation.x = 1.1;
            else if (this.state === 'returning' && this.pos.y < this.altitude - 10) p.rotation.x = -0.4;
            else p.rotation.x = 0;
            if (this.heading !== undefined) p.rotation.y = -this.heading;
        }
    }
}
