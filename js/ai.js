/**
 * PACIFIC ARMED - 6-Player Naval Combat & Harbor Management AI
 * Handles multi-faction battles, dockyard production queues, harbor defense,
 * and staggered low-overhead tactical decision making.
 */

class NavalAI {
    constructor() {
        this.aiFactions = ['ijn', 'rn', 'km', 'rm', 'vvs'];
        this.frameCounter = 0;
        this.airStrikeTimer = 14.0;
        this.productionTimer = 5.0;
    }

    update(delta, allShips, harbors, squadrons, particles, scene) {
        this.frameCounter++;

        // Staggered tactical evaluation: each frame updates a single faction to eliminate lag!
        const activeFactionIdx = this.frameCounter % this.aiFactions.length;
        const faction = this.aiFactions[activeFactionIdx];

        const myShips = allShips.filter(s => s.faction === faction && !s.isSinking);
        const myHarbor = harbors.find(h => h.faction === faction && !h.isDestroyed);
        const hostileShips = allShips.filter(s => s.faction !== faction && !s.isSinking);
        const hostileHarbors = harbors.filter(h => h.faction !== faction && !h.isDestroyed);

        if (myShips.length === 0 && !myHarbor) return;

        // 1. Tactical Fleet Positioning & Target Acquisition
        this.evaluateFactionTactics(faction, myShips, hostileShips, hostileHarbors, myHarbor);

        // 2. Dockyard Production (Checked periodically)
        this.productionTimer -= delta;
        if (this.productionTimer <= 0) {
            this.productionTimer = 4.0;
            this.evaluateDockyardProduction(harbors);
        }

        // 3. Air Strike Orders
        this.airStrikeTimer -= delta;
        if (this.airStrikeTimer <= 0) {
            this.airStrikeTimer = 16.0;
            this.evaluateCarrierStrikes(allShips, squadrons, particles, scene);
        }
    }

    evaluateFactionTactics(faction, myShips, hostileShips, hostileHarbors, myHarbor) {
        for (const ship of myShips) {
            // Low HP retreat to home harbor for repairs!
            if (ship.hp < ship.maxHp * 0.35 && myHarbor) {
                const dx = myHarbor.pos.x - ship.pos.x;
                const dz = myHarbor.pos.y - ship.pos.y;
                if (dx * dx + dz * dz > 90 * 90) {
                    ship.targetHeading = Math.atan2(dx, -dz);
                    ship.throttle = 1.0;
                    continue;
                }
            }

            // Find closest or highest value hostile ship
            let bestTarget = null;
            let bestScore = -Infinity;

            for (const target of hostileShips) {
                if (target.shipClass === 'SS' && target.currentDepth < -8) continue;

                const dx = target.pos.x - ship.pos.x;
                const dz = target.pos.y - ship.pos.y;
                const distSq = dx * dx + dz * dz;

                let priority = 100;
                if (target.shipClass === 'CV') priority += 80;
                else if (target.shipClass === 'BB') priority += 60;
                else if (target.hp < target.maxHp * 0.4) priority += 40;

                const score = priority - (distSq * 0.0003);
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = target;
                }
            }

            // If no ships nearby, target enemy harbor!
            if (!bestTarget && hostileHarbors.length > 0) {
                bestTarget = hostileHarbors[Math.floor(Math.random() * hostileHarbors.length)];
            }

            if (!bestTarget) continue;

            ship.targetShip = bestTarget;

            const dx = bestTarget.pos.x - ship.pos.x;
            const dz = (bestTarget.pos.y || bestTarget.pos.z) - ship.pos.y;
            const dist = Math.hypot(dx, dz);

            switch (ship.shipClass) {
                case 'BB': {
                    const optDist = 310;
                    if (dist > optDist + 50) {
                        ship.targetHeading = Math.atan2(dx, -dz);
                        ship.throttle = 1.0;
                    } else {
                        // Broadside angle
                        ship.targetHeading = Math.atan2(dx, -dz) + Math.PI * 0.45;
                        ship.throttle = 0.55;
                    }
                    if ((ship.fires >= 2 || ship.flooding >= 1) && !ship.damageControlActive) {
                        ship.orderDamageControl();
                    }
                    break;
                }

                case 'CV': {
                    const safeDist = 520;
                    if (dist < safeDist) {
                        // Turn away from threat
                        ship.targetHeading = Math.atan2(-dx, dz);
                        ship.throttle = 1.0;
                    } else {
                        ship.throttle = 0.3;
                    }
                    break;
                }

                case 'CA': {
                    const optDist = 230;
                    if (dist > optDist + 40) {
                        ship.targetHeading = Math.atan2(dx, -dz);
                        ship.throttle = 1.0;
                    } else {
                        ship.targetHeading = Math.atan2(dx, -dz) + Math.PI * 0.5;
                        ship.throttle = 0.75;
                    }
                    break;
                }

                case 'DD': {
                    if (dist > 160) {
                        ship.targetHeading = Math.atan2(dx, -dz);
                        ship.throttle = 1.25;
                    } else {
                        ship.targetHeading = Math.atan2(dx, -dz) + Math.PI / 2;
                        ship.throttle = 1.0;

                        // Torpedo spread
                        if (ship.torpedoCooldown <= 0) {
                            ship.orderTorpedoSpread(new THREE.Vector3(bestTarget.pos.x, 0, bestTarget.pos.y || bestTarget.pos.z));
                        }

                        if (ship.hp < ship.maxHp * 0.65 && !ship.smokeScreenActive) {
                            ship.orderSmokeScreen();
                        }
                    }
                    break;
                }

                case 'SS': {
                    if (dist < 180 && ship.currentDepth > -5) {
                        ship.toggleSubmarineDive();
                    }
                    ship.targetHeading = Math.atan2(dx, -dz);
                    ship.throttle = 1.0;
                    if (dist < 280 && ship.torpedoCooldown <= 0) {
                        ship.orderTorpedoSpread(new THREE.Vector3(bestTarget.pos.x, 0, bestTarget.pos.y || bestTarget.pos.z));
                    }
                    break;
                }
            }
        }
    }

    evaluateDockyardProduction(harbors) {
        const buildPriority = ['DD', 'CA', 'BB', 'SS', 'CV'];

        for (const harbor of harbors) {
            if (harbor.isDestroyed || harbor.faction === 'usn') continue; // Player manages USN

            // Check if queue has space and harbor has steel
            if (harbor.productionQueue.length < 2) {
                // Pick an affordable ship class
                for (const shipClass of buildPriority) {
                    const cost = HarborBase.SHIP_COSTS[shipClass].steel;
                    if (harbor.steel >= cost) {
                        harbor.queueShip(shipClass);
                        break;
                    }
                }
            }
        }
    }

    evaluateCarrierStrikes(allShips, squadrons, particles, scene) {
        const carriers = allShips.filter(s => s.shipClass === 'CV' && !s.isSinking);

        for (const cv of carriers) {
            if (cv.faction === 'usn') continue; // Player triggers own carrier strikes

            const enemies = allShips.filter(s => s.faction !== cv.faction && !s.isSinking);
            if (enemies.length === 0) continue;

            // Prioritize hostile BBs or CVs
            let target = enemies.find(s => s.shipClass === 'CV');
            if (!target) target = enemies.find(s => s.shipClass === 'BB');
            if (!target) target = enemies[0];

            if (cv.diveBomberReady) {
                cv.diveBomberReady = false;
                cv.diveBomberCooldown = 32.0;
                squadrons.push(new AircraftSquadron({
                    carrier: cv,
                    faction: cv.faction,
                    type: 'dive',
                    targetShip: target,
                    scene: scene,
                    particles: particles
                }));
            } else if (cv.torpedoBomberReady) {
                cv.torpedoBomberReady = false;
                cv.torpedoBomberCooldown = 38.0;
                squadrons.push(new AircraftSquadron({
                    carrier: cv,
                    faction: cv.faction,
                    type: 'torpedo',
                    targetShip: target,
                    scene: scene,
                    particles: particles
                }));
            }
        }
    }
}
