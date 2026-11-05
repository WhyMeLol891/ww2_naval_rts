/**
 * PACIFIC ARMED - Main Game Coordinator (6-Player Battle Edition)
 */

class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.ships = [];
        this.harbors = [];
        this.squadrons = [];
        this.selectedShips = [];
        this.gameSpeed = 1.0;
        this.isPaused = false;
        this.gameOver = false;
        this.currentScenarioId = 'six_player';

        this.initThree();
        this.initSystems();
        this.initUI();

        // Default to Grand 6-Player Naval War
        this.loadScenario('six_player');

        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 1.5x pixel ratio for optimal performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1.0, 4500);
        this.camera.position.set(0, 340, 420);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initSystems() {
        this.ocean = new OceanSystem(this.scene, { weather: 'day' });
        this.particles = new ParticleSystem(this.scene);
        this.ai = new NavalAI();
        this.controls = new RTSControls(this.camera, this.renderer.domElement, this);

        const startAudio = () => {
            if (window.soundEngine) window.soundEngine.init();
            window.removeEventListener('click', startAudio);
            window.removeEventListener('keydown', startAudio);
        };
        window.addEventListener('click', startAudio);
        window.addEventListener('keydown', startAudio);
    }

    loadScenario(scenarioId) {
        const scenario = SCENARIOS[scenarioId] || SCENARIOS.six_player;
        this.currentScenarioId = scenarioId;
        this.gameOver = false;

        document.getElementById('game-over-modal').style.display = 'none';

        if (this.particles) this.particles.clearAll();

        // Clear existing ships
        for (const ship of this.ships) {
            this.scene.remove(ship.mesh);
            if (ship.selectionRing) this.scene.remove(ship.selectionRing);
        }
        // Clear existing harbors
        for (const h of this.harbors) {
            this.scene.remove(h.mesh);
        }
        // Clear squadrons
        for (const sq of this.squadrons) {
            for (const p of sq.planes) this.scene.remove(p);
        }

        this.ships = [];
        this.harbors = [];
        this.squadrons = [];
        this.selectedShips = [];

        this.ocean.setWeather(scenario.weather || 'day');

        if (scenario.isSixPlayer) {
            this.spawnSixPlayerBasesAndFleets(scenario);
        } else {
            this.spawnLegacyScenario(scenario);
        }

        // Focus camera on Player's Base or flagship
        const playerHarbor = this.harbors.find(h => h.faction === 'usn');
        if (playerHarbor) {
            this.controls.target.set(playerHarbor.shipSpawnPoint.x, 0, playerHarbor.shipSpawnPoint.y);
            this.controls.distance = 320;
            this.controls.updateCamera();
        } else {
            const leadShip = this.ships.find(s => s.faction === 'usn');
            if (leadShip) {
                this.controls.target.set(leadShip.pos.x, 0, leadShip.pos.y);
                this.controls.updateCamera();
                this.selectShips([leadShip]);
            }
        }

        // Auto-select starting flagship
        const myBB = this.ships.find(s => s.faction === 'usn' && s.shipClass === 'BB');
        if (myBB) this.selectShips([myBB]);

        this.showBriefing(scenario);
        this.showCombatMessage(`Battle Commenced: ${scenario.name}`);
    }

    spawnSixPlayerBasesAndFleets(scenario) {
        const spawns = this.ocean.harborSpawns;

        spawns.forEach((spawn, idx) => {
            const faction = spawn.faction;
            const colorCfg = ShipModelBuilder.getFactionColors(faction);

            // 1. Build Harbor Base
            const harbor = new HarborBase({
                id: `harbor_${faction}`,
                faction: faction,
                playerIndex: idx + 1,
                name: `${colorCfg.name} Naval Base`,
                x: spawn.x,
                z: spawn.z,
                facingAngle: spawn.facingAngle,
                shipSpawnX: spawn.shipSpawnX,
                shipSpawnZ: spawn.shipSpawnZ,
                initialSteel: 900,
                scene: this.scene,
                ocean: this.ocean,
                particles: this.particles
            });
            this.harbors.push(harbor);

            // 2. Initial Battlegroup at Base (staggered in open water ahead of harbor)
            scenario.initialFleetPerPlayer.forEach((shipCfg, sIdx) => {
                const angle = spawn.facingAngle;
                const fwdX = Math.sin(angle);
                const fwdZ = -Math.cos(angle);
                const rightX = Math.cos(angle);
                const rightZ = Math.sin(angle);

                const fx = spawn.shipSpawnX + fwdX * (sIdx * 32) + rightX * (shipCfg.offset.x || 0);
                const fz = spawn.shipSpawnZ + fwdZ * (sIdx * 32) + rightZ * (shipCfg.offset.x || 0);

                const ship = new Ship({
                    id: `${faction}_init_${sIdx}`,
                    name: `${colorCfg.name} ${shipCfg.name} No.${sIdx + 1}`,
                    faction: faction,
                    shipClass: shipCfg.class,
                    x: fx,
                    z: fz,
                    heading: spawn.facingAngle,
                    scene: this.scene,
                    ocean: this.ocean,
                    particles: this.particles
                });
                this.ships.push(ship);
            });
        });
    }

    spawnLegacyScenario(scenario) {
        scenario.playerShips.forEach((cfg, idx) => {
            const ship = new Ship({
                id: `player_${idx}`,
                name: cfg.name,
                faction: 'usn',
                shipClass: cfg.class,
                x: cfg.x,
                z: cfg.z,
                heading: cfg.heading,
                scene: this.scene,
                ocean: this.ocean,
                particles: this.particles
            });
            this.ships.push(ship);
        });

        scenario.enemyShips.forEach((cfg, idx) => {
            const ship = new Ship({
                id: `enemy_${idx}`,
                name: cfg.name,
                faction: 'ijn',
                shipClass: cfg.class,
                x: cfg.x,
                z: cfg.z,
                heading: cfg.heading,
                scene: this.scene,
                ocean: this.ocean,
                particles: this.particles
            });
            this.ships.push(ship);
        });
    }

    showBriefing(scenario) {
        const titleEl = document.getElementById('scenario-title');
        const briefEl = document.getElementById('scenario-brief');
        if (titleEl) titleEl.innerText = scenario.name;
        if (briefEl) briefEl.innerText = scenario.briefing;
    }

    selectShips(shipList) {
        this.deselectAll();
        this.selectedShips = shipList.filter(s => s.faction === 'usn' && !s.isSinking);
        this.selectedShips.forEach(s => s.setSelected(true));
        this.updateHUD();
    }

    deselectAll() {
        this.selectedShips.forEach(s => s.setSelected(false));
        this.selectedShips = [];
        this.updateHUD();
    }

    getSelectedShips() {
        return this.selectedShips.filter(s => !s.isSinking);
    }

    orderBuildShip(shipClass) {
        const myHarbor = this.harbors.find(h => h.faction === 'usn');
        if (!myHarbor) {
            this.showCombatMessage("Dockyard unavailable in this scenario!");
            return;
        }

        if (myHarbor.isDestroyed) {
            this.showCombatMessage("Cannot build: Home Naval Harbor has been destroyed!");
            return;
        }

        const info = HarborBase.SHIP_COSTS[shipClass];
        if (myHarbor.steel < info.steel) {
            this.showCombatMessage(`Insufficient Steel! Need ${info.steel} (Have ${Math.floor(myHarbor.steel)})`);
            return;
        }

        const success = myHarbor.queueShip(shipClass);
        if (success) {
            this.showCombatMessage(`Dockyard: Queued ${info.name} (${info.steel} Steel, ${info.time}s)!`);
        }
    }

    launchPlayerAirstrike(type = 'dive') {
        const selectedCV = this.getSelectedShips().find(s => s.shipClass === 'CV');
        if (!selectedCV) {
            this.showCombatMessage("Launch Failed: Select an Aircraft Carrier first!");
            return;
        }

        if (type === 'dive' && !selectedCV.diveBomberReady) {
            this.showCombatMessage(`Dive bombers rearming (${Math.ceil(selectedCV.diveBomberCooldown)}s)...`);
            return;
        }
        if (type === 'torpedo' && !selectedCV.torpedoBomberReady) {
            this.showCombatMessage(`Torpedo bombers rearming (${Math.ceil(selectedCV.torpedoBomberCooldown)}s)...`);
            return;
        }

        let target = selectedCV.targetShip;
        if (!target || target.isSinking) {
            target = this.ships.find(s => s.faction !== 'usn' && !s.isSinking);
        }

        if (!target) {
            this.showCombatMessage("No target available for airstrike!");
            return;
        }

        if (type === 'dive') {
            selectedCV.diveBomberReady = false;
            selectedCV.diveBomberCooldown = 32.0;
        } else {
            selectedCV.torpedoBomberReady = false;
            selectedCV.torpedoBomberCooldown = 38.0;
        }

        this.squadrons.push(new AircraftSquadron({
            carrier: selectedCV,
            faction: 'usn',
            type: type,
            targetShip: target,
            scene: this.scene,
            particles: this.particles
        }));

        this.showCombatMessage(`Air Strike: ${type.toUpperCase()} squadron airborne towards ${target.name}!`);
        if (window.soundEngine) window.soundEngine.playTacticalChirp();
    }

    showCombatMessage(text) {
        const logBox = document.getElementById('combat-log');
        if (!logBox) return;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${text}`;
        logBox.appendChild(entry);

        while (logBox.children.length > 6) {
            logBox.removeChild(logBox.firstChild);
        }

        setTimeout(() => {
            entry.style.opacity = '0';
            setTimeout(() => {
                if (entry.parentNode) entry.parentNode.removeChild(entry);
            }, 1000);
        }, 7000);
    }

    initUI() {
        const bindBtn = (id, callback) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', callback);
        };

        bindBtn('btn-salvo', () => { this.getSelectedShips().forEach(s => s.orderSalvo()); });
        bindBtn('btn-torpedo', () => { this.getSelectedShips().forEach(s => s.orderTorpedoSpread()); });
        bindBtn('btn-dive-bomb', () => { this.launchPlayerAirstrike('dive'); });
        bindBtn('btn-torp-bomb', () => { this.launchPlayerAirstrike('torpedo'); });
        bindBtn('btn-smoke', () => { this.getSelectedShips().forEach(s => s.orderSmokeScreen()); });
        bindBtn('btn-dc', () => { this.getSelectedShips().forEach(s => s.orderDamageControl()); });
        bindBtn('btn-sub-dive', () => { this.getSelectedShips().forEach(s => s.toggleSubmarineDive()); });
        bindBtn('btn-cam-toggle', () => { this.controls.toggleCameraMode(); });

        // Dockyard Ship Commissioning Buttons
        ['DD', 'SS', 'CA', 'BB', 'CV'].forEach(cls => {
            bindBtn(`btn-build-${cls.toLowerCase()}`, () => { this.orderBuildShip(cls); });
        });

        // Scenario selector
        const scenarioSelect = document.getElementById('scenario-select');
        if (scenarioSelect) {
            scenarioSelect.addEventListener('change', (e) => {
                this.loadScenario(e.target.value);
            });
        }

        bindBtn('btn-pause', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('btn-pause').innerText = this.isPaused ? '▶ RESUME' : '❚❚ PAUSE';
        });

        bindBtn('btn-speed-1x', () => { this.gameSpeed = 1.0; this.updateSpeedUI('1x'); });
        bindBtn('btn-speed-2x', () => { this.gameSpeed = 2.0; this.updateSpeedUI('2x'); });
        bindBtn('btn-speed-4x', () => { this.gameSpeed = 4.0; this.updateSpeedUI('4x'); });

        bindBtn('btn-restart', () => { this.loadScenario(this.currentScenarioId); });

        bindBtn('btn-audio', () => {
            const muted = !window.soundEngine.muted;
            window.soundEngine.setMute(muted);
            document.getElementById('btn-audio').innerText = muted ? '🔇 MUTED' : '🔊 AUDIO';
        });
    }

    updateSpeedUI(activeKey) {
        ['1x', '2x', '4x'].forEach(k => {
            const btn = document.getElementById(`btn-speed-${k}`);
            if (btn) {
                if (k === activeKey) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    }

    updateHUD() {
        // 1. Update 6-Player Scoreboard
        this.updateScoreboard();

        // 2. Update Dockyard Resource Header
        const myHarbor = this.harbors.find(h => h.faction === 'usn');
        const steelEl = document.getElementById('steel-count');
        const queueEl = document.getElementById('harbor-queue-info');
        if (myHarbor && steelEl) {
            steelEl.innerText = `${Math.floor(myHarbor.steel)} Steel (+${Math.round(myHarbor.steelRate)}/s)`;
            if (myHarbor.currentProduction) {
                const p = myHarbor.currentProduction;
                queueEl.innerText = `Building ${p.shipClass} (${Math.ceil(p.timeLeft)}s)`;
            } else if (myHarbor.productionQueue.length > 0) {
                queueEl.innerText = `Queued: ${myHarbor.productionQueue.length} ships`;
            } else {
                queueEl.innerText = `Drydock Idle`;
            }
        }

        // 3. Selected Ship Card
        const flagship = this.selectedShips[0];
        const card = document.getElementById('ship-card');
        if (!flagship || flagship.isSinking) {
            if (card) card.style.display = 'none';
            return;
        }

        if (card) card.style.display = 'flex';

        document.getElementById('ship-name').innerText = flagship.name;
        document.getElementById('ship-class').innerText = `${flagship.shipClass} - ${this.getClassName(flagship.shipClass)}`;

        const hpPercent = Math.max(0, (flagship.hp / flagship.maxHp) * 100);
        const hpBar = document.getElementById('ship-hp-bar');
        if (hpBar) {
            hpBar.style.width = `${hpPercent}%`;
            hpBar.style.background = hpPercent > 50 ? '#00e575' : (hpPercent > 25 ? '#ffbb00' : '#ff3344');
        }
        document.getElementById('ship-hp-text').innerText = `${Math.ceil(flagship.hp)} / ${flagship.maxHp}`;
        document.getElementById('ship-speed-text').innerText = `${(flagship.currentSpeed * 0.8).toFixed(1)} KTS`;
        document.getElementById('ship-heading-text').innerText = `${Math.round(((flagship.heading * 180 / Math.PI) + 360) % 360)}°`;

        const statusEl = document.getElementById('ship-status-alerts');
        if (statusEl) {
            let alerts = '';
            if (flagship.fires > 0) alerts += `<span class="badge-fire">🔥 FIRE (${flagship.fires})</span> `;
            if (flagship.flooding > 0) alerts += `<span class="badge-flood">🌊 FLOOD (${flagship.flooding})</span> `;
            if (flagship.smokeScreenActive) alerts += `<span class="badge-smoke">💨 SMOKE</span> `;
            if (flagship.damageControlActive) alerts += `<span class="badge-dc">🛠 REPAIRS</span> `;
            statusEl.innerHTML = alerts || '<span class="badge-ok">SYSTEMS NOMINAL</span>';
        }

        const isCV = flagship.shipClass === 'CV';
        const isDD = flagship.shipClass === 'DD';
        const isSS = flagship.shipClass === 'SS';

        const setBtnState = (id, enabled, text = null) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.disabled = !enabled;
            if (text) btn.innerText = text;
        };

        setBtnState('btn-dive-bomb', isCV && flagship.diveBomberReady);
        setBtnState('btn-torp-bomb', isCV && flagship.torpedoBomberReady);
        setBtnState('btn-torpedo', flagship.torpedoCooldown <= 0 && (isDD || isSS || flagship.shipClass === 'CA'));
        setBtnState('btn-smoke', isDD && !flagship.smokeScreenActive);
        setBtnState('btn-dc', !flagship.damageControlActive);

        const subBtn = document.getElementById('btn-sub-dive');
        if (subBtn) {
            subBtn.style.display = isSS ? 'inline-block' : 'none';
            subBtn.innerText = flagship.targetDepth === 0 ? '⚓ DIVE SUB' : '⬆ SURFACE';
        }
    }

    updateScoreboard() {
        const factions = ['usn', 'ijn', 'rn', 'km', 'rm', 'vvs'];
        const scoreboardContainer = document.getElementById('six-player-scoreboard');
        if (!scoreboardContainer) return;

        let html = '';
        let activeEnemyFactions = 0;
        let isPlayerAlive = true;

        factions.forEach(f => {
            const colorCfg = ShipModelBuilder.getFactionColors(f);
            const aliveShips = this.ships.filter(s => s.faction === f && !s.isSinking).length;
            const harbor = this.harbors.find(h => h.faction === f);
            const isHarborAlive = harbor ? !harbor.isDestroyed : true;

            const isDead = aliveShips === 0 && !isHarborAlive;
            if (!isDead && f !== 'usn') activeEnemyFactions++;
            if (f === 'usn' && isDead) isPlayerAlive = false;

            html += `
                <div class="player-tag ${f === 'usn' ? 'active-player' : ''} ${isDead ? 'eliminated' : ''}" style="border-left: 3px solid ${colorCfg.hex}">
                    <span class="p-flag">${colorCfg.flag}</span>
                    <span class="p-name">${colorCfg.name}</span>
                    <span class="p-ships">${aliveShips} 🚢</span>
                    <span class="p-harbor ${isHarborAlive ? 'harbor-ok' : 'harbor-dead'}">⚓</span>
                </div>
            `;
        });

        scoreboardContainer.innerHTML = html;

        // Victory / Defeat check
        if (!this.gameOver && this.currentScenarioId === 'six_player') {
            if (activeEnemyFactions === 0) {
                this.gameOver = true;
                this.showGameOver(true);
                if (window.soundEngine) window.soundEngine.playVictory();
            } else if (!isPlayerAlive) {
                this.gameOver = true;
                this.showGameOver(false);
                if (window.soundEngine) window.soundEngine.playDefeat();
            }
        }
    }

    getClassName(code) {
        switch (code) {
            case 'BB': return 'Battleship';
            case 'CV': return 'Aircraft Carrier';
            case 'CA': return 'Heavy Cruiser';
            case 'DD': return 'Destroyer';
            case 'SS': return 'Fleet Submarine';
            default: return 'Warship';
        }
    }

    showGameOver(isVictory) {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('modal-title');
        const desc = document.getElementById('modal-desc');

        modal.style.display = 'flex';
        if (isVictory) {
            title.innerText = "6-PLAYER PACIFIC SUPREMACY!";
            title.style.color = '#33ff66';
            desc.innerText = "All 5 hostile fleets and enemy naval harbors have been crushed! The global ocean belongs to the US Navy, Admiral!";
        } else {
            title.innerText = "FLEET & HARBOR DESTROYED";
            title.style.color = '#ff3344';
            desc.innerText = "Our naval base has fallen and all warships were sunk by hostile armadas. Defeat!";
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        const rawDelta = this.clock.getDelta();
        const delta = Math.min(rawDelta, 0.1) * (this.isPaused ? 0 : this.gameSpeed);

        if (!this.isPaused) {
            this.ocean.update(delta);

            // Update Harbors
            for (const h of this.harbors) {
                h.update(delta, this.ships);
            }

            // Update Ships
            for (const ship of this.ships) {
                ship.updatePhysics(delta);
                ship.updateTurrets(delta);
                ship.updateAABatteries(delta, this.squadrons);
            }

            // Update Squadrons
            for (let i = this.squadrons.length - 1; i >= 0; i--) {
                const sq = this.squadrons[i];
                sq.update(delta);
                if (sq.state === 'landed' || sq.state === 'destroyed') {
                    this.squadrons.splice(i, 1);
                }
            }

            this.particles.update(delta);

            // AI Decision Making (Optimized staggered frames)
            this.ai.update(delta, this.ships, this.harbors, this.squadrons, this.particles, this.scene);
        }

        this.controls.update(rawDelta);
        this.updateHUD();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
