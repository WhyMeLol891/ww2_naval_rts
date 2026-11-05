/**
 * PACIFIC ARMED - Optimized 6-Harbor Ocean & Environmental System
 * Generates 6 radial player harbors, central strategic islands, and optimized 60fps Gerstner water shader.
 */

class OceanSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.time = 0;
        this.weatherType = options.weather || 'day';

        this.waveParams = {
            scale: 0.015,
            speed: 1.1,
            height: 2.0
        };

        this.islands = [];
        this.islandColliders = [];
        this.harborSpawns = [];

        this.initEnvironment();
        this.initOcean();
        this.setWeather(this.weatherType);
        this.generate6PlayerMap();
    }

    initEnvironment() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
        this.sunLight.position.set(400, 500, 300);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024; // Optimized shadow map for performance
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 2400;
        const d = 800;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.scene.add(this.sunLight);

        this.hemiLight = new THREE.HemisphereLight(0x7ec0ee, 0x081a2f, 0.6);
        this.scene.add(this.hemiLight);

        const skyGeo = new THREE.SphereGeometry(2200, 24, 16);
        const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x6ba4d9 });
        this.skyDome = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skyDome);
    }

    setWeather(type) {
        this.weatherType = type;
        if (!this.oceanMat) return;

        if (type === 'sunset') {
            this.scene.fog = new THREE.FogExp2(0xd27d53, 0.00035);
            this.ambientLight.color.setHex(0xe88a5a);
            this.sunLight.color.setHex(0xff7b39);
            this.sunLight.position.set(700, 200, 500);
            this.skyDome.material.color.setHex(0xbe5838);
            this.oceanMat.uniforms.deepColor.value.setHex(0x132433);
            this.oceanMat.uniforms.surfaceColor.value.setHex(0x26556e);
        } else if (type === 'night') {
            this.scene.fog = new THREE.FogExp2(0x060c18, 0.0005);
            this.ambientLight.color.setHex(0x223355);
            this.ambientLight.intensity = 0.25;
            this.sunLight.color.setHex(0x7899cc);
            this.sunLight.intensity = 0.55;
            this.skyDome.material.color.setHex(0x091122);
            this.oceanMat.uniforms.deepColor.value.setHex(0x040913);
            this.oceanMat.uniforms.surfaceColor.value.setHex(0x0a1d36);
        } else {
            // Day
            this.scene.fog = new THREE.FogExp2(0x8bc3e8, 0.00028);
            this.ambientLight.color.setHex(0xffffff);
            this.ambientLight.intensity = 0.45;
            this.sunLight.color.setHex(0xfffaed);
            this.sunLight.intensity = 1.25;
            this.sunLight.position.set(400, 500, 300);
            this.skyDome.material.color.setHex(0x6ba4d9);
            this.oceanMat.uniforms.deepColor.value.setHex(0x09284d);
            this.oceanMat.uniforms.surfaceColor.value.setHex(0x1a6d9e);
        }
    }

    initOcean() {
        const size = 3600;
        const segments = 80; // 80x80 gives great visual quality with 75% less overhead than 160x160!
        this.oceanGeo = new THREE.PlaneGeometry(size, size, segments, segments);
        this.oceanGeo.rotateX(-Math.PI / 2);

        const oceanVertexShader = `
            uniform float uTime;
            uniform float uWaveHeight;
            varying vec3 vWorldPos;
            varying vec3 vNormalVec;
            varying float vWaveFactor;

            void main() {
                vec3 p = position;
                float t = uTime * 0.4;
                
                // 3 Optimized wave octaves
                float w1 = sin((p.x * 0.035 + p.z * 0.02) - t * 1.2) * 1.1;
                float w2 = sin((-p.x * 0.05 + p.z * 0.06) - t * 1.7) * 0.7;
                float w3 = sin((p.x * 0.1 + p.z * 0.08) - t * 2.4) * 0.35;
                p.y += (w1 + w2 + w3) * uWaveHeight;

                // Analytical normal estimation
                float dy_dx = (cos((p.x * 0.035 + p.z * 0.02) - t * 1.2) * 0.035 * 1.1) * uWaveHeight;
                float dy_dz = (cos((p.x * 0.035 + p.z * 0.02) - t * 1.2) * 0.02 * 1.1) * uWaveHeight;
                vNormalVec = normalize(vec3(-dy_dx, 1.0, -dy_dz));

                vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
                vWaveFactor = clamp((p.y + 1.5) / 4.0, 0.0, 1.0);
                gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
            }
        `;

        const oceanFragmentShader = `
            uniform vec3 deepColor;
            uniform vec3 surfaceColor;
            uniform vec3 foamColor;
            uniform vec3 sunDirection;
            varying vec3 vWorldPos;
            varying vec3 vNormalVec;
            varying float vWaveFactor;

            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                vec3 norm = normalize(vNormalVec);
                vec3 waterCol = mix(deepColor, surfaceColor, vWaveFactor);

                // Sun glint
                vec3 halfVec = normalize(normalize(sunDirection) + viewDir);
                float spec = pow(max(dot(norm, halfVec), 0.0), 90.0);
                waterCol += vec3(1.0, 0.95, 0.8) * spec * 1.4;

                // Foam highlights on crests
                float foam = pow(vWaveFactor, 4.0);
                waterCol = mix(waterCol, foamColor, foam * 0.6);

                // Fresnel
                float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 3.0);
                waterCol += vec3(0.1, 0.2, 0.3) * fresnel;

                gl_FragColor = vec4(waterCol, 0.95);
            }
        `;

        this.oceanMat = new THREE.ShaderMaterial({
            vertexShader: oceanVertexShader,
            fragmentShader: oceanFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uWaveHeight: { value: this.waveParams.height },
                deepColor: { value: new THREE.Color(0x09284d) },
                surfaceColor: { value: new THREE.Color(0x1a6d9e) },
                foamColor: { value: new THREE.Color(0xe8f4f8) },
                sunDirection: { value: new THREE.Vector3(400, 500, 300) }
            },
            transparent: true
        });

        this.oceanMesh = new THREE.Mesh(this.oceanGeo, this.oceanMat);
        this.oceanMesh.receiveShadow = true;
        this.scene.add(this.oceanMesh);
    }

    getWaveHeight(x, z) {
        const t = this.time * 0.4;
        const h = this.waveParams.height;
        const w1 = Math.sin((x * 0.035 + z * 0.02) - t * 1.2) * 1.1;
        const w2 = Math.sin((-x * 0.05 + z * 0.06) - t * 1.7) * 0.7;
        return (w1 + w2) * (h * 0.5);
    }

    /**
     * 6-PLAYER MAP GENERATION: 6 Radially Placed Harbors + Central Archipelago
     */
    generate6PlayerMap() {
        const ringRadius = 1050; // Distance of each base from center
        const factions = ['usn', 'ijn', 'rn', 'km', 'rm', 'vvs'];

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const hx = Math.sin(angle) * ringRadius;
            const hz = Math.cos(angle) * ringRadius;

            // Heading pointing directly from (hx, hz) toward center (0, 0)
            const facingAngle = Math.atan2(-hx, hz);

            // 1. Protective Base Island Mountain behind the harbor
            const mDist = 80;
            const mx = -Math.sin(facingAngle) * mDist;
            const mz = Math.cos(facingAngle) * mDist;

            const islandGroup = new THREE.Group();
            islandGroup.position.set(hx + mx, 0, hz + mz);

            const coneGeo = new THREE.ConeGeometry(75, 38, 8);
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x364235, roughness: 0.9, flatShading: true });
            const rockMesh = new THREE.Mesh(coneGeo, rockMat);
            rockMesh.position.y = 16;
            rockMesh.castShadow = true;
            islandGroup.add(rockMesh);

            const sandGeo = new THREE.CylinderGeometry(85, 95, 4, 12);
            const sandMat = new THREE.MeshStandardMaterial({ color: 0xdfcb9f, roughness: 0.95 });
            const sandMesh = new THREE.Mesh(sandGeo, sandMat);
            sandMesh.position.y = 0.5;
            islandGroup.add(sandMesh);

            this.scene.add(islandGroup);
            this.islands.push(islandGroup);

            // Island obstacle collider centered strictly on the mountain behind the harbor
            this.islandColliders.push({
                x: hx + mx,
                z: hz + mz,
                radius: 75
            });

            // Store harbor spawn location (ships spawn forward into open ocean toward center)
            this.harborSpawns.push({
                faction: factions[i],
                playerIndex: i + 1,
                x: hx,
                z: hz,
                facingAngle: facingAngle,
                shipSpawnX: hx + Math.sin(facingAngle) * 140,
                shipSpawnZ: hz - Math.cos(facingAngle) * 140
            });
        }

        // 2. Central Contested Strategic Islands (Capture / Resource Points)
        const centralIslands = [
            { x: 0, z: 0, r: 90, h: 28 },
            { x: -350, z: -150, r: 60, h: 22 },
            { x: 350, z: 150, r: 60, h: 22 },
            { x: -120, z: 320, r: 55, h: 20 },
            { x: 120, z: -320, r: 55, h: 20 }
        ];

        centralIslands.forEach(pos => {
            const group = new THREE.Group();
            group.position.set(pos.x, 0, pos.z);

            const rock = new THREE.Mesh(
                new THREE.ConeGeometry(pos.r, pos.h, 7),
                new THREE.MeshStandardMaterial({ color: 0x424036, roughness: 0.9, flatShading: true })
            );
            rock.position.y = pos.h / 2 - 2;
            rock.castShadow = true;
            group.add(rock);

            const sand = new THREE.Mesh(
                new THREE.CylinderGeometry(pos.r * 1.15, pos.r * 1.3, 3.5, 10),
                new THREE.MeshStandardMaterial({ color: 0xd9c698, roughness: 0.95 })
            );
            sand.position.y = 0.5;
            group.add(sand);

            this.scene.add(group);
            this.islands.push(group);
            this.islandColliders.push({ x: pos.x, z: pos.z, radius: pos.r * 1.1 });
        });
    }

    checkIslandCollision(x, z, margin = 20) {
        for (const col of this.islandColliders) {
            const dx = x - col.x;
            const dz = z - col.z;
            const limit = col.radius + margin;
            if (dx * dx + dz * dz < limit * limit) return true;
        }
        return false;
    }

    getNearestCollider(x, z) {
        let nearest = null;
        let minDistSq = Infinity;
        for (const col of this.islandColliders) {
            const dx = x - col.x;
            const dz = z - col.z;
            const dSq = dx * dx + dz * dz;
            if (dSq < minDistSq) {
                minDistSq = dSq;
                nearest = col;
            }
        }
        return nearest;
    }

    update(delta) {
        this.time += delta * this.waveParams.speed;
        if (this.oceanMat && this.oceanMat.uniforms) {
            this.oceanMat.uniforms.uTime.value = this.time;
        }
    }
}
