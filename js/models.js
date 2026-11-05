/**
 * PACIFIC ARMED - Optimized 3D Warship, Harbor Base & Aircraft Model Builder
 * Designed for high-performance 6-Player Battles with shared geometries and material caching.
 */

class ShipModelBuilder {
    // Shared Geometry Cache to prevent memory leaks and garbage collection lag
    static getGeo(type, ...params) {
        if (!this.geoCache) this.geoCache = new Map();
        const key = `${type}_${params.join('_')}`;
        if (!this.geoCache.has(key)) {
            let geo;
            switch (type) {
                case 'box': geo = new THREE.BoxGeometry(...params); break;
                case 'cylinder': geo = new THREE.CylinderGeometry(...params); break;
                case 'cone': geo = new THREE.ConeGeometry(...params); break;
                case 'sphere': geo = new THREE.SphereGeometry(...params); break;
                case 'ring': geo = new THREE.RingGeometry(...params); break;
                case 'circle': geo = new THREE.CircleGeometry(...params); break;
                default: geo = new THREE.BoxGeometry(...params);
            }
            this.geoCache.set(key, geo);
        }
        return this.geoCache.get(key);
    }

    // Material cache for optimal WebGL draw-call batching
    static getMaterial(color, roughness = 0.7, metalness = 0.25) {
        if (!this.matCache) this.matCache = new Map();
        const key = `${color}_${roughness}_${metalness}`;
        if (!this.matCache.has(key)) {
            this.matCache.set(key, new THREE.MeshStandardMaterial({
                color: color,
                roughness: roughness,
                metalness: metalness
            }));
        }
        return this.matCache.get(key);
    }

    // 6 Faction Colors & Insignia Accents
    static getFactionColors(faction) {
        const FACTION_MAP = {
            'usn': {
                name: 'US Navy',
                hull: 0x475363, deck: 0x82725c, boottopping: 0x1a1a1a,
                superstructure: 0x586475, turret: 0x475363, barrels: 0x22252a,
                accent: 0x2196f3, hex: '#2196f3', flag: '🇺🇸'
            },
            'ijn': {
                name: 'Imperial Japanese Navy',
                hull: 0x3d4540, deck: 0x6e6355, boottopping: 0x1a1a1a,
                superstructure: 0x48524c, turret: 0x3d4540, barrels: 0x1e211f,
                accent: 0xf44336, hex: '#f44336', flag: '🇯🇵'
            },
            'rn': {
                name: 'Royal Navy',
                hull: 0x4f5d6b, deck: 0x7c7365, boottopping: 0x1a1a1a,
                superstructure: 0x5d6f80, turret: 0x4f5d6b, barrels: 0x24282c,
                accent: 0x00bcd4, hex: '#00bcd4', flag: '🇬🇧'
            },
            'km': {
                name: 'Kriegsmarine',
                hull: 0x3c3f42, deck: 0x5c574e, boottopping: 0x1a1a1a,
                superstructure: 0x4a4d52, turret: 0x3c3f42, barrels: 0x1c1d1f,
                accent: 0x9e9e9e, hex: '#9e9e9e', flag: '🇩🇪'
            },
            'rm': {
                name: 'Regia Marina',
                hull: 0x4e5850, deck: 0x7a6c58, boottopping: 0x1a1a1a,
                superstructure: 0x5d6b60, turret: 0x4e5850, barrels: 0x202422,
                accent: 0x4caf50, hex: '#4caf50', flag: '🇮🇹'
            },
            'vvs': {
                name: 'Red Fleet',
                hull: 0x524b45, deck: 0x6e5f52, boottopping: 0x1a1a1a,
                superstructure: 0x635b54, turret: 0x524b45, barrels: 0x22201d,
                accent: 0xff9800, hex: '#ff9800', flag: '⭐'
            }
        };

        // Fallback for legacy faction names
        if (faction === 'allied') return FACTION_MAP['usn'];
        if (faction === 'axis') return FACTION_MAP['ijn'];
        return FACTION_MAP[faction] || FACTION_MAP['usn'];
    }

    /**
     * HARBOR BASE - Fortified Naval Headquarters, Docks & Coastal Batteries
     */
    static buildHarborBase(faction = 'usn') {
        const colors = this.getFactionColors(faction);
        const baseGroup = new THREE.Group();
        baseGroup.userData.isHarbor = true;
        baseGroup.userData.turrets = [];

        // 1. Concrete Pier & Quay Wall
        const pierMesh = new THREE.Mesh(this.getGeo('box', 42, 5, 65), this.getMaterial(0x555e66, 0.9, 0.1));
        pierMesh.position.set(0, 2.5, 0);
        pierMesh.receiveShadow = true;
        baseGroup.add(pierMesh);

        // Secondary Pier Arm (L-shape dock)
        const pierArm = new THREE.Mesh(this.getGeo('box', 60, 5, 20), this.getMaterial(0x555e66, 0.9, 0.1));
        pierArm.position.set(20, 2.5, 22);
        pierArm.receiveShadow = true;
        baseGroup.add(pierArm);

        // 2. Drydock Slipway
        const slipway = new THREE.Mesh(this.getGeo('box', 24, 2, 80), this.getMaterial(0x383e44, 0.8, 0.2));
        slipway.position.set(-28, 1.0, 10);
        baseGroup.add(slipway);

        // Shipyard Gantry Cranes
        [-20, 30].forEach(zPos => {
            const cranePillar = new THREE.Mesh(this.getGeo('box', 3, 24, 3), this.getMaterial(0xd4af37, 0.5, 0.5));
            cranePillar.position.set(-36, 12, zPos);
            baseGroup.add(cranePillar);

            const craneArm = new THREE.Mesh(this.getGeo('box', 22, 2.5, 3), this.getMaterial(0xd4af37, 0.5, 0.5));
            craneArm.position.set(-26, 23, zPos);
            baseGroup.add(craneArm);
        });

        // 3. Naval Headquarters Command Tower
        const hqBase = new THREE.Mesh(this.getGeo('box', 20, 16, 22), this.getMaterial(0x404952, 0.8, 0.2));
        hqBase.position.set(8, 10, -15);
        hqBase.castShadow = true;
        baseGroup.add(hqBase);

        const hqTower = new THREE.Mesh(this.getGeo('box', 12, 14, 12), this.getMaterial(0x4f5b66, 0.8, 0.2));
        hqTower.position.set(8, 23, -15);
        hqTower.castShadow = true;
        baseGroup.add(hqTower);

        // Radar on HQ Tower
        const hqRadar = new THREE.Mesh(this.getGeo('box', 8, 4, 0.8), this.getMaterial(0x22262a, 0.3, 0.8));
        hqRadar.position.set(8, 32, -15);
        baseGroup.add(hqRadar);
        baseGroup.userData.radar = hqRadar;

        // Faction Banner on Headquarters
        const banner = new THREE.Mesh(this.getGeo('box', 8, 5, 0.5), this.getMaterial(colors.accent));
        banner.position.set(8, 20, -3.8);
        baseGroup.add(banner);

        // 4. Fuel Storage Oil Tanks (Heavy cylinders)
        [ { x: 12, z: 12 }, { x: -8, z: -18 }, { x: -18, z: -18 } ].forEach(pos => {
            const tank = new THREE.Mesh(this.getGeo('cylinder', 5.5, 5.5, 10, 10), this.getMaterial(0x727d87, 0.7, 0.3));
            tank.position.set(pos.x, 7.5, pos.z);
            tank.castShadow = true;
            baseGroup.add(tank);
        });

        // 5. 2x Heavy Coastal Defense Batteries (Automatic Harbor Protection)
        [ { x: -12, z: 25 }, { x: 18, z: -2 } ].forEach((pos, idx) => {
            const turret = this.buildCoastalBattery(colors);
            turret.position.set(pos.x, 5.0, pos.z);
            baseGroup.add(turret);

            baseGroup.userData.turrets.push({
                group: turret,
                base: turret.userData.base,
                barrels: turret.userData.barrels,
                barrelPoints: turret.userData.barrelPoints,
                arcMin: -Math.PI,
                arcMax: Math.PI,
                currentAngle: 0,
                type: 'heavy',
                damage: 320,
                range: 450,
                reloadTime: 6.0,
                reloadTimer: idx * 2.0
            });
        });

        // Mooring buoys in water in front of harbor
        [-20, 20].forEach(x => {
            const buoy = new THREE.Mesh(this.getGeo('cylinder', 1.8, 1.8, 2.5, 8), this.getMaterial(colors.accent));
            buoy.position.set(x, 1.2, 45);
            baseGroup.add(buoy);
        });

        return baseGroup;
    }

    /**
     * COASTAL DEFENSE BATTERY (Heavy Dual 12-inch Casemate Gun)
     */
    static buildCoastalBattery(colors) {
        const group = new THREE.Group();

        // Concrete Emplacement Barbette
        const barbette = new THREE.Mesh(this.getGeo('cylinder', 7.5, 8.5, 3.5, 12), this.getMaterial(0x3d444a));
        barbette.position.y = 1.75;
        barbette.receiveShadow = true;
        group.add(barbette);

        // Rotating Turret Housing
        const base = new THREE.Group();
        base.position.y = 3.5;
        group.add(base);

        const house = new THREE.Mesh(this.getGeo('box', 9, 3.8, 11), this.getMaterial(colors.turret));
        house.position.y = 1.9;
        house.castShadow = true;
        base.add(house);

        // Dual Heavy Barrels
        const barrels = new THREE.Group();
        barrels.position.set(0, 1.9, -4.5);
        base.add(barrels);

        const barrelPoints = [];
        [-2.0, 2.0].forEach(x => {
            const barrel = new THREE.Mesh(this.getGeo('cylinder', 0.45, 0.65, 16, 7), this.getMaterial(colors.barrels));
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(x, 0, -8);
            barrels.add(barrel);
            barrelPoints.push(new THREE.Vector3(x, 1.9, -16.5));
        });

        group.userData.base = base;
        group.userData.barrels = barrels;
        group.userData.barrelPoints = barrelPoints;

        return group;
    }

    /**
     * BATTLESHIP (BB) - Optimized with geometry cache
     */
    static buildBattleship(faction = 'usn') {
        const colors = this.getFactionColors(faction);
        const group = new THREE.Group();
        group.userData.shipClass = 'BB';
        group.userData.turrets = [];
        group.userData.aaMounts = [];
        group.userData.funnels = [];

        // Hull
        const hullGeo = this.getGeo('box', 16, 9, 110);
        const hullMesh = new THREE.Mesh(hullGeo, this.getMaterial(colors.hull));
        hullMesh.position.y = 2.5;
        hullMesh.castShadow = true;
        hullMesh.receiveShadow = true;
        group.add(hullMesh);

        // Teak Deck
        const deckMesh = new THREE.Mesh(this.getGeo('box', 15.2, 0.5, 108), this.getMaterial(colors.deck, 0.9, 0.05));
        deckMesh.position.y = 7.1;
        deckMesh.receiveShadow = true;
        group.add(deckMesh);

        // Waterline Belt
        const beltMesh = new THREE.Mesh(this.getGeo('box', 16.4, 2.2, 70), this.getMaterial(colors.boottopping));
        beltMesh.position.y = 0.5;
        group.add(beltMesh);

        // Faction Accent Trim
        const accentTrim = new THREE.Mesh(this.getGeo('box', 15.6, 0.4, 14), this.getMaterial(colors.accent));
        accentTrim.position.set(0, 7.3, -42);
        group.add(accentTrim);

        // Superstructure
        const bridgeMesh = new THREE.Mesh(this.getGeo('box', 11, 7, 36), this.getMaterial(colors.superstructure));
        bridgeMesh.position.set(0, 10.5, 2);
        bridgeMesh.castShadow = true;
        group.add(bridgeMesh);

        const conningMesh = new THREE.Mesh(this.getGeo('box', 7, 6, 16), this.getMaterial(colors.superstructure));
        conningMesh.position.set(0, 16.5, -4);
        conningMesh.castShadow = true;
        group.add(conningMesh);

        // Mast & Radar
        const mast = new THREE.Mesh(this.getGeo('cylinder', 0.5, 0.8, 18, 6), this.getMaterial(colors.barrels));
        mast.position.set(0, 26, -3);
        group.add(mast);

        const radar = new THREE.Mesh(this.getGeo('box', 6, 3, 0.6), this.getMaterial(colors.barrels, 0.4, 0.8));
        radar.position.set(0, 32, -3);
        group.add(radar);
        group.userData.radar = radar;

        // Funnels
        [-5, 9].forEach(offsetZ => {
            const funnel = new THREE.Mesh(this.getGeo('cylinder', 2.2, 2.6, 9.5, 7), this.getMaterial(colors.superstructure));
            funnel.position.set(0, 15, offsetZ + 5);
            funnel.rotation.x = 0.12;
            group.add(funnel);
            group.userData.funnels.push(funnel);
        });

        // 3x Heavy Triple Turrets (2 Forward, 1 Aft)
        const turretPositions = [
            { id: 1, x: 0, y: 7.2, z: -32, angle: 0, arcMin: -Math.PI * 0.8, arcMax: Math.PI * 0.8, superfiring: false },
            { id: 2, x: 0, y: 9.8, z: -20, angle: 0, arcMin: -Math.PI * 0.8, arcMax: Math.PI * 0.8, superfiring: true },
            { id: 3, x: 0, y: 7.2, z: 32, angle: Math.PI, arcMin: Math.PI * 0.2, arcMax: Math.PI * 1.8, superfiring: false }
        ];

        turretPositions.forEach(cfg => {
            const turret = this.buildHeavyTurret(colors, cfg.superfiring);
            turret.position.set(cfg.x, cfg.y, cfg.z);
            turret.rotation.y = cfg.angle;
            group.add(turret);

            group.userData.turrets.push({
                group: turret,
                base: turret.userData.base,
                barrels: turret.userData.barrels,
                barrelPoints: turret.userData.barrelPoints,
                arcMin: cfg.arcMin,
                arcMax: cfg.arcMax,
                currentAngle: cfg.angle,
                type: 'heavy',
                damage: 280,
                range: 480,
                reloadTime: 7.5,
                reloadTimer: 0
            });
        });

        // Secondary 5-inch Twin Turrets
        [-1, 1].forEach(side => {
            [-8, 8].forEach(zPos => {
                const secTurret = this.buildSecondaryTurret(colors);
                secTurret.position.set(side * 8.2, 8.8, zPos);
                secTurret.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
                group.add(secTurret);

                group.userData.turrets.push({
                    group: secTurret,
                    base: secTurret.userData.base,
                    barrels: secTurret.userData.barrels,
                    barrelPoints: secTurret.userData.barrelPoints,
                    arcMin: side > 0 ? 0 : -Math.PI,
                    arcMax: side > 0 ? Math.PI : 0,
                    currentAngle: secTurret.rotation.y,
                    type: 'secondary',
                    damage: 65,
                    range: 300,
                    reloadTime: 3.2,
                    reloadTimer: 0
                });
            });
        });

        // AA Mounts
        [-6, 6].forEach(side => {
            [-28, 22].forEach(zPos => {
                const aa = this.buildAAMount(colors);
                aa.position.set(side * 6.5, 8.2, zPos);
                group.add(aa);
                group.userData.aaMounts.push(aa);
            });
        });

        return group;
    }

    /**
     * AIRCRAFT CARRIER (CV)
     */
    static buildAircraftCarrier(faction = 'usn') {
        const colors = this.getFactionColors(faction);
        const group = new THREE.Group();
        group.userData.shipClass = 'CV';
        group.userData.turrets = [];
        group.userData.aaMounts = [];
        group.userData.funnels = [];

        const hullMesh = new THREE.Mesh(this.getGeo('box', 17, 9, 115), this.getMaterial(colors.hull));
        hullMesh.position.y = 3;
        hullMesh.castShadow = true;
        group.add(hullMesh);

        // Flight Deck
        const flightDeck = new THREE.Mesh(this.getGeo('box', 24, 1.2, 124), this.getMaterial(colors.deck, 0.9, 0.05));
        flightDeck.position.y = 8.5;
        flightDeck.receiveShadow = true;
        group.add(flightDeck);

        // White Runway Stripe
        const stripe = new THREE.Mesh(this.getGeo('box', 1.2, 0.1, 100), this.getMaterial(0xdde3ea));
        stripe.position.set(0, 9.15, 0);
        group.add(stripe);

        // Faction Deck Marking
        const bowMarking = new THREE.Mesh(this.getGeo('circle', 5, 12), this.getMaterial(colors.accent));
        bowMarking.rotation.x = -Math.PI / 2;
        bowMarking.position.set(0, 9.16, -45);
        group.add(bowMarking);

        // Starboard Island
        const island = new THREE.Mesh(this.getGeo('box', 4.5, 9, 22), this.getMaterial(colors.superstructure));
        island.position.set(10.5, 13.5, -4);
        island.castShadow = true;
        group.add(island);

        // Radar
        const radar = new THREE.Mesh(this.getGeo('box', 4, 2.5, 0.4), this.getMaterial(colors.barrels, 0.3, 0.7));
        radar.position.set(10.5, 26, -6);
        group.add(radar);
        group.userData.radar = radar;

        // Funnel
        const funnel = new THREE.Mesh(this.getGeo('cylinder', 1.6, 2.0, 7.5, 7), this.getMaterial(colors.superstructure));
        funnel.position.set(10.5, 18.5, 3);
        group.add(funnel);
        group.userData.funnels.push(funnel);

        // AA Sponsons
        [-1, 1].forEach(side => {
            [-25, 25].forEach(zPos => {
                const aa = this.buildAAMount(colors);
                aa.position.set(side * 13.2, 8.8, zPos);
                group.add(aa);
                group.userData.aaMounts.push(aa);
            });
        });

        // Parked plane
        const plane = this.buildAircraft(faction, 'dive', true);
        plane.position.set(-4, 9.6, 42);
        plane.scale.set(0.65, 0.65, 0.65);
        group.add(plane);

        return group;
    }

    /**
     * HEAVY CRUISER (CA)
     */
    static buildCruiser(faction = 'usn') {
        const colors = this.getFactionColors(faction);
        const group = new THREE.Group();
        group.userData.shipClass = 'CA';
        group.userData.turrets = [];
        group.userData.aaMounts = [];
        group.userData.funnels = [];

        const hullMesh = new THREE.Mesh(this.getGeo('box', 12, 7.5, 86), this.getMaterial(colors.hull));
        hullMesh.position.y = 2.0;
        hullMesh.castShadow = true;
        group.add(hullMesh);

        const deckMesh = new THREE.Mesh(this.getGeo('box', 11.2, 0.4, 84), this.getMaterial(colors.deck));
        deckMesh.position.y = 5.9;
        group.add(deckMesh);

        const bridge = new THREE.Mesh(this.getGeo('box', 7.5, 8, 22), this.getMaterial(colors.superstructure));
        bridge.position.set(0, 9.5, -2);
        bridge.castShadow = true;
        group.add(bridge);

        const funnel = new THREE.Mesh(this.getGeo('cylinder', 1.6, 2.0, 7.0, 7), this.getMaterial(colors.superstructure));
        funnel.position.set(0, 12.5, 4);
        funnel.rotation.x = 0.15;
        group.add(funnel);
        group.userData.funnels.push(funnel);

        // 3x 8-inch Triple Turrets
        const turretConfigs = [
            { x: 0, y: 6.0, z: -25, angle: 0, superfiring: false },
            { x: 0, y: 8.2, z: -15, angle: 0, superfiring: true },
            { x: 0, y: 6.0, z: 24, angle: Math.PI, superfiring: false }
        ];

        turretConfigs.forEach(cfg => {
            const turret = this.buildMediumTurret(colors, cfg.superfiring);
            turret.position.set(cfg.x, cfg.y, cfg.z);
            turret.rotation.y = cfg.angle;
            group.add(turret);

            group.userData.turrets.push({
                group: turret,
                base: turret.userData.base,
                barrels: turret.userData.barrels,
                barrelPoints: turret.userData.barrelPoints,
                arcMin: -Math.PI * 0.8,
                arcMax: Math.PI * 0.8,
                currentAngle: cfg.angle,
                type: 'medium',
                damage: 135,
                range: 390,
                reloadTime: 5.0,
                reloadTimer: 0
            });
        });

        // AA Guns
        [-1, 1].forEach(side => {
            const aa = this.buildAAMount(colors);
            aa.position.set(side * 5.2, 7.0, 6);
            group.add(aa);
            group.userData.aaMounts.push(aa);
        });

        return group;
    }

    /**
     * DESTROYER (DD)
     */
    static buildDestroyer(faction = 'usn') {
        const colors = this.getFactionColors(faction);
        const group = new THREE.Group();
        group.userData.shipClass = 'DD';
        group.userData.turrets = [];
        group.userData.aaMounts = [];
        group.userData.funnels = [];

        const hullMesh = new THREE.Mesh(this.getGeo('box', 8.5, 5.5, 64), this.getMaterial(colors.hull));
        hullMesh.position.y = 1.4;
        hullMesh.castShadow = true;
        group.add(hullMesh);

        const deckMesh = new THREE.Mesh(this.getGeo('box', 7.8, 0.35, 62), this.getMaterial(colors.deck));
        deckMesh.position.y = 4.3;
        group.add(deckMesh);

        const bridge = new THREE.Mesh(this.getGeo('box', 5.2, 5.5, 12), this.getMaterial(colors.superstructure));
        bridge.position.set(0, 6.8, -5);
        bridge.castShadow = true;
        group.add(bridge);

        const funnel = new THREE.Mesh(this.getGeo('cylinder', 1.0, 1.2, 5.0, 6), this.getMaterial(colors.superstructure));
        funnel.position.set(0, 9.0, 4);
        group.add(funnel);
        group.userData.funnels.push(funnel);

        // 3x 5-inch Single Turrets
        const ddturrets = [
            { x: 0, y: 4.4, z: -18, angle: 0 },
            { x: 0, y: 5.8, z: -11, angle: 0 },
            { x: 0, y: 4.4, z: 20, angle: Math.PI }
        ];

        ddturrets.forEach(cfg => {
            const turret = this.buildLightTurret(colors);
            turret.position.set(cfg.x, cfg.y, cfg.z);
            turret.rotation.y = cfg.angle;
            group.add(turret);

            group.userData.turrets.push({
                group: turret,
                base: turret.userData.base,
                barrels: turret.userData.barrels,
                barrelPoints: turret.userData.barrelPoints,
                arcMin: -Math.PI * 0.85,
                arcMax: Math.PI * 0.85,
                currentAngle: cfg.angle,
                type: 'light',
                damage: 55,
                range: 300,
                reloadTime: 2.5,
                reloadTimer: 0
            });
        });

        // Quintuple Torpedo Launcher
        const torpMount = this.buildTorpedoMount(colors);
        torpMount.position.set(0, 4.6, 8);
        group.add(torpMount);
        group.userData.turrets.push({
            group: torpMount,
            base: torpMount,
            barrels: torpMount,
            barrelPoints: [new THREE.Vector3(0, 0.8, -2.5)],
            type: 'torpedo',
            damage: 550,
            range: 420,
            reloadTime: 22.0,
            reloadTimer: 0
        });

        return group;
    }

    /**
     * SUBMARINE (SS)
     */
    static buildSubmarine(faction = 'usn') {
        const colors = this.getFactionColors(faction);
        const group = new THREE.Group();
        group.userData.shipClass = 'SS';
        group.userData.turrets = [];
        group.userData.aaMounts = [];
        group.userData.funnels = [];

        const hullGeo = this.getGeo('cylinder', 2.6, 2.6, 52, 10);
        const hullMesh = new THREE.Mesh(hullGeo, this.getMaterial(colors.boottopping, 0.6, 0.3));
        hullMesh.rotation.x = Math.PI / 2;
        hullMesh.position.y = 0.5;
        group.add(hullMesh);

        const deck = new THREE.Mesh(this.getGeo('box', 3.6, 1.2, 44), this.getMaterial(colors.hull));
        deck.position.y = 2.4;
        group.add(deck);

        const conning = new THREE.Mesh(this.getGeo('box', 2.2, 4.5, 9), this.getMaterial(colors.superstructure));
        conning.position.set(0, 5.0, -2);
        group.add(conning);

        // Deck Gun
        const gun = this.buildLightTurret(colors, true);
        gun.position.set(0, 3.2, -12);
        group.add(gun);

        group.userData.turrets.push({
            group: gun,
            base: gun.userData.base,
            barrels: gun.userData.barrels,
            barrelPoints: gun.userData.barrelPoints,
            arcMin: -Math.PI * 0.7,
            arcMax: Math.PI * 0.7,
            currentAngle: 0,
            type: 'light',
            damage: 40,
            range: 220,
            reloadTime: 3.0,
            reloadTimer: 0
        });

        // Bow Torpedo
        group.userData.turrets.push({
            group: group,
            base: group,
            barrels: group,
            barrelPoints: [new THREE.Vector3(0, 0.5, -24)],
            type: 'torpedo',
            damage: 600,
            range: 400,
            reloadTime: 24.0,
            reloadTimer: 0
        });

        return group;
    }

    /**
     * TURRET SUB-ASSEMBLIES (Re-using cached geometries)
     */
    static buildHeavyTurret(colors, isSuperfiring = false) {
        const turretGroup = new THREE.Group();

        if (isSuperfiring) {
            const barbette = new THREE.Mesh(this.getGeo('cylinder', 4.8, 5.0, 3.0, 10), this.getMaterial(colors.hull));
            barbette.position.y = -1.5;
            turretGroup.add(barbette);
        }

        const base = new THREE.Group();
        turretGroup.add(base);

        const houseMesh = new THREE.Mesh(this.getGeo('box', 9.5, 3.6, 12), this.getMaterial(colors.turret));
        houseMesh.position.y = 1.8;
        houseMesh.castShadow = true;
        base.add(houseMesh);

        const barrelsGroup = new THREE.Group();
        barrelsGroup.position.set(0, 1.8, -4.5);
        base.add(barrelsGroup);

        const barrelPoints = [];
        [-2.4, 0, 2.4].forEach(xOffset => {
            const barrel = new THREE.Mesh(this.getGeo('cylinder', 0.45, 0.65, 17, 7), this.getMaterial(colors.barrels, 0.35, 0.8));
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(xOffset, 0, -9.5);
            barrelsGroup.add(barrel);
            barrelPoints.push(new THREE.Vector3(xOffset, 1.8, -18.5));
        });

        turretGroup.userData.base = base;
        turretGroup.userData.barrels = barrelsGroup;
        turretGroup.userData.barrelPoints = barrelPoints;
        return turretGroup;
    }

    static buildMediumTurret(colors, isSuperfiring = false) {
        const turretGroup = new THREE.Group();
        if (isSuperfiring) {
            const barbette = new THREE.Mesh(this.getGeo('cylinder', 3.6, 3.8, 2.4, 8), this.getMaterial(colors.hull));
            barbette.position.y = -1.2;
            turretGroup.add(barbette);
        }

        const base = new THREE.Group();
        turretGroup.add(base);

        const houseMesh = new THREE.Mesh(this.getGeo('box', 7, 2.8, 9), this.getMaterial(colors.turret));
        houseMesh.position.y = 1.4;
        houseMesh.castShadow = true;
        base.add(houseMesh);

        const barrelsGroup = new THREE.Group();
        barrelsGroup.position.set(0, 1.4, -3.5);
        base.add(barrelsGroup);

        const barrelPoints = [];
        [-1.8, 0, 1.8].forEach(xOffset => {
            const barrel = new THREE.Mesh(this.getGeo('cylinder', 0.35, 0.45, 12, 6), this.getMaterial(colors.barrels));
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(xOffset, 0, -6.5);
            barrelsGroup.add(barrel);
            barrelPoints.push(new THREE.Vector3(xOffset, 1.4, -13));
        });

        turretGroup.userData.base = base;
        turretGroup.userData.barrels = barrelsGroup;
        turretGroup.userData.barrelPoints = barrelPoints;
        return turretGroup;
    }

    static buildLightTurret(colors) {
        const turretGroup = new THREE.Group();
        const base = new THREE.Group();
        turretGroup.add(base);

        const houseMesh = new THREE.Mesh(this.getGeo('box', 4.2, 2.2, 5.2), this.getMaterial(colors.turret));
        houseMesh.position.y = 1.1;
        base.add(houseMesh);

        const barrelsGroup = new THREE.Group();
        barrelsGroup.position.set(0, 1.1, -2.2);
        base.add(barrelsGroup);

        const barrel = new THREE.Mesh(this.getGeo('cylinder', 0.25, 0.35, 8.5, 6), this.getMaterial(colors.barrels));
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, -4.5);
        barrelsGroup.add(barrel);

        turretGroup.userData.base = base;
        turretGroup.userData.barrels = barrelsGroup;
        turretGroup.userData.barrelPoints = [new THREE.Vector3(0, 1.1, -9)];
        return turretGroup;
    }

    static buildSecondaryTurret(colors) {
        const turretGroup = new THREE.Group();
        const base = new THREE.Group();
        turretGroup.add(base);

        const house = new THREE.Mesh(this.getGeo('box', 4.2, 2.6, 5.4), this.getMaterial(colors.turret));
        house.position.y = 1.3;
        base.add(house);

        const barrelsGroup = new THREE.Group();
        barrelsGroup.position.set(0, 1.3, -2.2);
        base.add(barrelsGroup);

        const barrelPoints = [];
        [-0.8, 0.8].forEach(x => {
            const b = new THREE.Mesh(this.getGeo('cylinder', 0.25, 0.35, 7.5, 5), this.getMaterial(colors.barrels));
            b.rotation.x = Math.PI / 2;
            b.position.set(x, 0, -4);
            barrelsGroup.add(b);
            barrelPoints.push(new THREE.Vector3(x, 1.3, -8));
        });

        turretGroup.userData.base = base;
        turretGroup.userData.barrels = barrelsGroup;
        turretGroup.userData.barrelPoints = barrelPoints;
        return turretGroup;
    }

    static buildTorpedoMount(colors) {
        const group = new THREE.Group();
        const base = new THREE.Mesh(this.getGeo('cylinder', 2.5, 2.5, 0.8, 8), this.getMaterial(colors.superstructure));
        base.position.y = 0.4;
        group.add(base);

        [-1.6, -0.8, 0, 0.8, 1.6].forEach(x => {
            const tube = new THREE.Mesh(this.getGeo('cylinder', 0.38, 0.38, 6.5, 5), this.getMaterial(colors.barrels));
            tube.rotation.x = Math.PI / 2;
            tube.position.set(x, 1.2, 0);
            group.add(tube);
        });

        return group;
    }

    static buildAAMount(colors) {
        const group = new THREE.Group();
        const tub = new THREE.Mesh(this.getGeo('cylinder', 1.6, 1.6, 1.1, 7), this.getMaterial(colors.hull));
        tub.position.y = 0.55;
        group.add(tub);

        const barrels = new THREE.Group();
        barrels.position.y = 0.8;
        [-0.4, 0.4].forEach(x => {
            const b = new THREE.Mesh(this.getGeo('cylinder', 0.1, 0.12, 3.2, 4), this.getMaterial(colors.barrels));
            b.rotation.x = Math.PI / 2 - 0.4;
            b.position.set(x, 0.4, -1.2);
            barrels.add(b);
        });
        group.add(barrels);
        group.userData.barrels = barrels;
        return group;
    }

    static buildAircraft(faction = 'usn', type = 'dive', isParked = false) {
        const colors = this.getFactionColors(faction);
        const plane = new THREE.Group();
        plane.userData.planeType = type;
        plane.userData.faction = faction;

        const fuse = new THREE.Mesh(this.getGeo('cone', 1.2, 11, 7), this.getMaterial(colors.hull, 0.6, 0.2));
        fuse.rotation.x = -Math.PI / 2;
        fuse.position.z = 0.5;
        plane.add(fuse);

        const wing = new THREE.Mesh(this.getGeo('box', 16, 0.3, 3.4), this.getMaterial(colors.hull, 0.7, 0.2));
        wing.position.set(0, 0, -1.8);
        plane.add(wing);

        // Tail
        const hTail = new THREE.Mesh(this.getGeo('box', 5.5, 0.2, 1.8), this.getMaterial(colors.hull));
        hTail.position.set(0, 0.4, 5.4);
        plane.add(hTail);

        const vTail = new THREE.Mesh(this.getGeo('box', 0.25, 2.2, 2.0), this.getMaterial(colors.accent));
        vTail.position.set(0, 1.4, 5.2);
        plane.add(vTail);

        if (!isParked) {
            const propDisc = new THREE.Mesh(this.getGeo('circle', 1.8, 8), new THREE.MeshBasicMaterial({
                color: 0xcccccc, transparent: true, opacity: 0.3, side: THREE.DoubleSide
            }));
            propDisc.position.z = -6.2;
            plane.add(propDisc);
        }

        return plane;
    }
}
