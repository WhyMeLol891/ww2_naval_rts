/**
 * PACIFIC ARMED - 6-Player RTS Controls, Minimap & Dockyard Interaction
 */

class RTSControls {
    constructor(camera, domElement, game) {
        this.camera = camera;
        this.domElement = domElement;
        this.game = game;

        this.target = new THREE.Vector3(0, 0, 0);
        this.distance = 360;
        this.minDistance = 35;
        this.maxDistance = 1400;
        this.phi = Math.PI * 0.32;
        this.theta = 0;

        this.cameraMode = 'rts';
        this.followShip = null;

        this.isSelecting = false;
        this.selectStart = { x: 0, y: 0 };
        this.selectBox = document.getElementById('selection-box');

        this.isOrbiting = false;
        this.lastMouse = { x: 0, y: 0 };
        this.keys = {};

        this.raycaster = new THREE.Raycaster();
        this.mousePos = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.initEvents();
        this.initMinimap();
        this.updateCamera();
    }

    initEvents() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.domElement.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onKeyDown(e) {
        this.keys[e.code] = true;

        if (e.code === 'Space') {
            e.preventDefault();
            const selected = this.game.getSelectedShips();
            selected.forEach(s => s.orderSalvo());
        }

        if (e.code === 'KeyC') {
            this.toggleCameraMode();
        }

        // Abilities
        if (e.code === 'KeyQ') {
            const selected = this.game.getSelectedShips();
            selected.forEach(s => s.orderTorpedoSpread());
        }
        if (e.code === 'KeyW') {
            this.game.launchPlayerAirstrike('dive');
        }
        if (e.code === 'KeyE') {
            this.game.launchPlayerAirstrike('torpedo');
        }
        if (e.code === 'KeyR') {
            const selected = this.game.getSelectedShips();
            selected.forEach(s => s.orderSmokeScreen());
        }
        if (e.code === 'KeyT') {
            const selected = this.game.getSelectedShips();
            selected.forEach(s => s.orderDamageControl());
        }
        if (e.code === 'KeyF') {
            const selected = this.game.getSelectedShips();
            selected.forEach(s => { s.throttle = s.throttle > 1.0 ? 1.0 : 1.25; });
        }

        // Production Hotkeys (B1, B2, B3, B4, B5 or Digits 1-5 when harbor active)
        if (e.code === 'Digit1') this.game.orderBuildShip('DD');
        if (e.code === 'Digit2') this.game.orderBuildShip('SS');
        if (e.code === 'Digit3') this.game.orderBuildShip('CA');
        if (e.code === 'Digit4') this.game.orderBuildShip('BB');
        if (e.code === 'Digit5') this.game.orderBuildShip('CV');

        // Center on Home Harbor: Key H
        if (e.code === 'KeyH') {
            const myHarbor = this.game.harbors.find(h => h.faction === 'usn');
            if (myHarbor) {
                this.target.set(myHarbor.pos.x, 0, myHarbor.pos.y);
                this.updateCamera();
            }
        }
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseDown(e) {
        if (e.button === 0) {
            this.isSelecting = true;
            this.selectStart.x = e.clientX;
            this.selectStart.y = e.clientY;

            if (this.selectBox) {
                this.selectBox.style.left = `${e.clientX}px`;
                this.selectBox.style.top = `${e.clientY}px`;
                this.selectBox.style.width = '0px';
                this.selectBox.style.height = '0px';
                this.selectBox.style.display = 'block';
            }
        } else if (e.button === 2) {
            e.preventDefault();
            this.handleRightClick(e);
        } else if (e.button === 1) {
            this.isOrbiting = true;
            this.lastMouse.x = e.clientX;
            this.lastMouse.y = e.clientY;
        }
    }

    onMouseMove(e) {
        if (this.isSelecting && this.selectBox) {
            const currentX = e.clientX;
            const currentY = e.clientY;
            const minX = Math.min(this.selectStart.x, currentX);
            const minY = Math.min(this.selectStart.y, currentY);
            const width = Math.abs(currentX - this.selectStart.x);
            const height = Math.abs(currentY - this.selectStart.y);

            this.selectBox.style.left = `${minX}px`;
            this.selectBox.style.top = `${minY}px`;
            this.selectBox.style.width = `${width}px`;
            this.selectBox.style.height = `${height}px`;
        }

        if (this.isOrbiting) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.lastMouse.x = e.clientX;
            this.lastMouse.y = e.clientY;

            this.theta -= dx * 0.005;
            this.phi = Math.max(0.15, Math.min(Math.PI * 0.46, this.phi + dy * 0.005));
            this.updateCamera();
        }
    }

    onMouseUp(e) {
        if (e.button === 0 && this.isSelecting) {
            this.isSelecting = false;
            if (this.selectBox) this.selectBox.style.display = 'none';

            const dragDist = Math.hypot(e.clientX - this.selectStart.x, e.clientY - this.selectStart.y);
            if (dragDist < 8) {
                this.handleSingleClick(e);
            } else {
                this.handleBoxSelect(this.selectStart.x, this.selectStart.y, e.clientX, e.clientY, e.shiftKey);
            }
        } else if (e.button === 1) {
            this.isOrbiting = false;
        }
    }

    onWheel(e) {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.55;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + zoomDelta));
        this.updateCamera();
    }

    handleSingleClick(e) {
        const rect = this.domElement.getBoundingClientRect();
        this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mousePos, this.camera);

        const playerShips = this.game.ships.filter(s => s.faction === 'usn' && !s.isSinking);
        let clickedShip = null;

        for (const ship of playerShips) {
            const shipPos3D = new THREE.Vector3(ship.pos.x, 2, ship.pos.y);
            if (this.raycaster.ray.distanceToPoint(shipPos3D) < 20) {
                clickedShip = ship;
                break;
            }
        }

        if (clickedShip) {
            if (e.shiftKey) {
                const selected = this.game.getSelectedShips();
                if (selected.includes(clickedShip)) clickedShip.setSelected(false);
                else clickedShip.setSelected(true);
            } else {
                this.game.selectShips([clickedShip]);
            }
            if (window.soundEngine) window.soundEngine.playTacticalChirp();
        } else if (!e.shiftKey) {
            this.game.deselectAll();
        }
    }

    handleBoxSelect(x1, y1, x2, y2, isShift) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        const rect = this.domElement.getBoundingClientRect();
        const playerShips = this.game.ships.filter(s => s.faction === 'usn' && !s.isSinking);
        const newlySelected = [];

        playerShips.forEach(ship => {
            const shipWorld = new THREE.Vector3(ship.pos.x, 3, ship.pos.y);
            shipWorld.project(this.camera);

            const screenX = ((shipWorld.x + 1) / 2) * rect.width + rect.left;
            const screenY = ((-shipWorld.y + 1) / 2) * rect.height + rect.top;

            if (shipWorld.z < 1.0) {
                if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
                    newlySelected.push(ship);
                }
            }
        });

        if (newlySelected.length > 0) {
            if (isShift) {
                const current = this.game.getSelectedShips();
                this.game.selectShips([...new Set([...current, ...newlySelected])]);
            } else {
                this.game.selectShips(newlySelected);
            }
            if (window.soundEngine) window.soundEngine.playTacticalChirp();
        } else if (!isShift) {
            this.game.deselectAll();
        }
    }

    handleRightClick(e) {
        const selected = this.game.getSelectedShips();
        if (selected.length === 0) return;

        const rect = this.domElement.getBoundingClientRect();
        this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mousePos, this.camera);
        const hitPoint = new THREE.Vector3();
        const hasGroundHit = this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint);

        // Check if right-clicked hostile ship from any of the 5 enemy factions
        const enemyShips = this.game.ships.filter(s => s.faction !== 'usn' && !s.isSinking);
        let clickedEnemy = null;

        for (const enemy of enemyShips) {
            const pos3D = new THREE.Vector3(enemy.pos.x, 2, enemy.pos.y);
            const rayDist = this.raycaster.ray.distanceToPoint(pos3D);
            const groundDist = hasGroundHit ? Math.hypot(enemy.pos.x - hitPoint.x, enemy.pos.y - hitPoint.z) : Infinity;

            if (rayDist < 25 || groundDist < 30) {
                clickedEnemy = enemy;
                break;
            }
        }

        // Check if right-clicked enemy harbor
        let clickedHarbor = null;
        if (!clickedEnemy && this.game.harbors) {
            for (const h of this.game.harbors) {
                if (h.faction === 'usn' || h.isDestroyed) continue;
                const d = hasGroundHit ? Math.hypot(h.pos.x - hitPoint.x, h.pos.y - hitPoint.z) : Infinity;
                if (d < 55) {
                    clickedHarbor = h;
                    break;
                }
            }
        }

        if (clickedEnemy) {
            selected.forEach(s => s.setAttackTarget(clickedEnemy));
            this.game.showCombatMessage(`Order: Targeting hostile ${clickedEnemy.name} (${clickedEnemy.shipClass})!`);
        } else if (clickedHarbor) {
            selected.forEach(s => s.setAttackTarget(clickedHarbor));
            this.game.showCombatMessage(`Order: Fleet bombarding ${clickedHarbor.name}!`);
        } else if (hasGroundHit) {
            const count = selected.length;
            selected.forEach((ship, idx) => {
                const angleOffset = (idx / count) * Math.PI * 2;
                const spreadDist = count > 1 ? 25 : 0;
                const destX = hitPoint.x + Math.cos(angleOffset) * spreadDist;
                const destZ = hitPoint.z + Math.sin(angleOffset) * spreadDist;
                ship.setMoveTarget(destX, destZ);
            });
        }
    }

    toggleCameraMode() {
        const selected = this.game.getSelectedShips();
        if (this.cameraMode === 'rts') {
            if (selected.length > 0) {
                this.cameraMode = 'follow';
                this.followShip = selected[0];
                this.distance = 95;
                this.phi = Math.PI * 0.38;
                this.game.showCombatMessage(`Camera: Action Cam following ${this.followShip.name}`);
            }
        } else {
            this.cameraMode = 'rts';
            this.followShip = null;
            this.distance = 360;
            this.phi = Math.PI * 0.32;
            this.game.showCombatMessage(`Camera: Tactical RTS View`);
        }
    }

    update(delta) {
        if (this.cameraMode === 'rts') {
            const speed = (this.distance * 0.85) * delta;
            const forward = new THREE.Vector3(-Math.sin(this.theta), 0, -Math.cos(this.theta));
            const right = new THREE.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta));

            if (this.keys['KeyW'] || this.keys['ArrowUp']) this.target.addScaledVector(forward, speed);
            if (this.keys['KeyS'] || this.keys['ArrowDown']) this.target.addScaledVector(forward, -speed);
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.target.addScaledVector(right, -speed);
            if (this.keys['KeyD'] || this.keys['ArrowRight']) this.target.addScaledVector(right, speed);

            this.target.x = Math.max(-1500, Math.min(1500, this.target.x));
            this.target.z = Math.max(-1500, Math.min(1500, this.target.z));
        } else if (this.cameraMode === 'follow' && this.followShip) {
            if (this.followShip.isSinking) {
                this.cameraMode = 'rts';
                this.followShip = null;
            } else {
                this.target.lerp(new THREE.Vector3(this.followShip.pos.x, 8, this.followShip.pos.y), delta * 8.0);
                this.theta = -this.followShip.heading;
            }
        }

        this.updateCamera();
        this.renderMinimap();
    }

    updateCamera() {
        const x = this.target.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
        const y = this.target.y + this.distance * Math.cos(this.phi);
        const z = this.target.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.target);
    }

    initMinimap() {
        this.minimapCanvas = document.getElementById('minimap-canvas');
        if (!this.minimapCanvas) return;
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.minimapCanvas.addEventListener('mousedown', (e) => {
            const rect = this.minimapCanvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const worldX = ((mx / rect.width) - 0.5) * 3200;
            const worldZ = ((my / rect.height) - 0.5) * 3200;

            this.target.x = worldX;
            this.target.z = worldZ;
            this.updateCamera();
        });
    }

    renderMinimap() {
        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#06131c';
        ctx.fillRect(0, 0, w, h);

        // Concentric Rings
        ctx.strokeStyle = '#00ff8822';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2);
        ctx.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
        ctx.arc(w / 2, h / 2, w * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        const worldToMini = (wx, wz) => ({
            x: ((wx / 3200) + 0.5) * w,
            y: ((wz / 3200) + 0.5) * h
        });

        // Draw Islands
        if (this.game.ocean && this.game.ocean.islandColliders) {
            ctx.fillStyle = '#1c3022';
            this.game.ocean.islandColliders.forEach(isle => {
                const p = worldToMini(isle.x, isle.z);
                const r = (isle.radius / 3200) * w;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw 6 Harbors
        if (this.game.harbors) {
            this.game.harbors.forEach(harbor => {
                const p = worldToMini(harbor.pos.x, harbor.pos.y);
                const colorCfg = ShipModelBuilder.getFactionColors(harbor.faction);
                ctx.fillStyle = harbor.isDestroyed ? '#333333' : colorCfg.hex;
                ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
            });
        }

        // Draw Ships from all 6 Factions
        for (const ship of this.game.ships) {
            if (ship.isSinking) continue;
            const p = worldToMini(ship.pos.x, ship.pos.y);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(ship.heading);

            const colorCfg = ShipModelBuilder.getFactionColors(ship.faction);
            ctx.fillStyle = ship.isSelected ? '#33ff88' : colorCfg.hex;

            const sz = ship.shipClass === 'BB' ? 6 : (ship.shipClass === 'DD' ? 3.5 : 4.5);
            ctx.beginPath();
            ctx.moveTo(0, -sz);
            ctx.lineTo(sz * 0.6, sz);
            ctx.lineTo(-sz * 0.6, sz);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Camera Frustum
        const camP = worldToMini(this.target.x, this.target.z);
        ctx.strokeStyle = '#ffffff77';
        ctx.lineWidth = 1.2;
        const boxSize = (this.distance / 3200) * w * 1.5;
        ctx.strokeRect(camP.x - boxSize / 2, camP.y - boxSize / 2, boxSize, boxSize);

        // Radar Sweep
        const time = Date.now() * 0.0018;
        ctx.strokeStyle = '#00ff8844';
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(w / 2 + Math.cos(time) * (w * 0.45), h / 2 + Math.sin(time) * (h * 0.45));
        ctx.stroke();
    }
}
