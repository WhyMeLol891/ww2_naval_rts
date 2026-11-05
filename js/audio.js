/**
 * PACIFIC ARMED - Web Audio API Procedural Sound Engine
 * Fully procedural naval sound effects without external audio files.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.ambientGain = null;
        this.initialized = false;
        this.muted = false;
        this.volume = 0.8;
        this.engineNodes = new Map();
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            this.ambientGain.connect(this.masterGain);

            this.initialized = true;
            this.startAmbientSea();
        } catch (e) {
            console.warn("AudioContext init failed:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(mute) {
        this.muted = mute;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    // Helper: Create a buffer filled with white/pink noise
    createNoiseBuffer(duration = 1.0) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            // Brown/pink colored noise for deeper, natural naval sounds
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5;
        }
        return buffer;
    }

    // Heavy Naval Cannon (16-inch / 18-inch Battleship Guns)
    playHeavyCannon(distRatio = 1.0) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const atten = Math.max(0.15, Math.min(1.0, 1.0 / (distRatio * 0.8 + 0.2)));

        // 1. Initial High-pressure Crack
        const crackOsc = this.ctx.createOscillator();
        const crackGain = this.ctx.createGain();
        crackOsc.type = 'sawtooth';
        crackOsc.frequency.setValueAtTime(260, t);
        crackOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        crackGain.gain.setValueAtTime(1.0 * atten, t);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        crackOsc.connect(crackGain);
        crackGain.connect(this.sfxGain);
        crackOsc.start(t);
        crackOsc.stop(t + 0.15);

        // 2. Heavy Sub-Bass Boom
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(110, t);
        subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.8);
        subGain.gain.setValueAtTime(1.5 * atten, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        subOsc.connect(subGain);
        subGain.connect(this.sfxGain);
        subOsc.start(t);
        subOsc.stop(t + 1.25);

        // 3. Billowing blast wave (lowpass noise rumble)
        const noiseBuf = this.createNoiseBuffer(2.0);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, t);
            filter.frequency.exponentialRampToValueAtTime(60, t + 1.8);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.2 * atten, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.9);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(t);
            noise.stop(t + 2.0);
        }
    }

    // Medium Gun (8-inch Cruiser Batteries)
    playMediumCannon(distRatio = 1.0) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const atten = Math.max(0.15, Math.min(1.0, 1.0 / (distRatio * 0.8 + 0.2)));

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.4);
        gain.gain.setValueAtTime(0.8 * atten, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.65);

        // Noise crack
        const noiseBuf = this.createNoiseBuffer(0.7);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.7 * atten, t);
            nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this.sfxGain);
            noise.start(t);
            noise.stop(t + 0.7);
        }
    }

    // Light Destroyer Gun (5-inch / 38 cal)
    playLightGun(distRatio = 1.0) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const atten = Math.max(0.15, Math.min(1.0, 1.0 / (distRatio * 0.8 + 0.2)));

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.25);
        gain.gain.setValueAtTime(0.6 * atten, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
    }

    // Anti-Aircraft Flak Burst / Machine Cannon (20mm / 40mm Bofors)
    playAABurst() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(0.15);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200 + Math.random() * 400, t);
            filter.Q.setValueAtTime(3.0, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(t);
            noise.stop(t + 0.15);
        }
    }

    // Torpedo Launch Piston Whoosh
    playTorpedoLaunch() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(0.6);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(500, t);
            filter.frequency.exponentialRampToValueAtTime(180, t + 0.55);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.7, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(t);
            noise.stop(t + 0.6);
        }
    }

    // Torpedo Underwater Explosion
    playTorpedoExplosion() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        // Deep muffled shockwave
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80, t);
        sub.frequency.exponentialRampToValueAtTime(18, t + 1.6);
        subGain.gain.setValueAtTime(1.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(t);
        sub.stop(t + 2.1);

        // Water boil and blast
        const noiseBuf = this.createNoiseBuffer(2.2);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, t);
            filter.frequency.linearRampToValueAtTime(90, t + 1.8);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(1.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(t);
            noise.stop(t + 2.3);
        }
    }

    // Shell Impact on Steel Hull
    playShellHit(isArmorDeflect = false) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        // Steel clang
        const clang = this.ctx.createOscillator();
        const clangGain = this.ctx.createGain();
        clang.type = isArmorDeflect ? 'sine' : 'square';
        clang.frequency.setValueAtTime(isArmorDeflect ? 780 : 340, t);
        clang.frequency.exponentialRampToValueAtTime(120, t + 0.25);
        clangGain.gain.setValueAtTime(0.6, t);
        clangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        clang.connect(clangGain);
        clangGain.connect(this.sfxGain);
        clang.start(t);
        clang.stop(t + 0.35);

        // Detonation if penetrated
        if (!isArmorDeflect) {
            const noiseBuf = this.createNoiseBuffer(0.8);
            if (noiseBuf) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = noiseBuf;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, t);
                const nGain = this.ctx.createGain();
                nGain.gain.setValueAtTime(0.8, t);
                nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
                noise.connect(filter);
                filter.connect(nGain);
                nGain.connect(this.sfxGain);
                noise.start(t);
                noise.stop(t + 0.85);
            }
        }
    }

    // High Water Geyser / Splash
    playWaterSplash() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer(1.4);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(250, t);
            filter.frequency.linearRampToValueAtTime(600, t + 0.3);
            filter.frequency.exponentialRampToValueAtTime(180, t + 1.3);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.7, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(t);
            noise.stop(t + 1.45);
        }
    }

    // Dive Bomber Screaming Dive Siren
    playDiveBomberScream() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.linearRampToValueAtTime(1100, t + 2.2);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.3);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(1400, t + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 2.35);
    }

    // Classic Sonar Ping
    playSonarPing() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1750, t);
        osc.frequency.exponentialRampToValueAtTime(1700, t + 1.2);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 1.5);
    }

    // General Quarters Alarm Siren
    playGeneralQuarters() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';

        // Undulating siren frequency
        for (let i = 0; i < 4; i++) {
            const step = t + i * 0.7;
            osc.frequency.setValueAtTime(500, step);
            osc.frequency.linearRampToValueAtTime(850, step + 0.35);
            osc.frequency.linearRampToValueAtTime(500, step + 0.7);
        }

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.setValueAtTime(0.35, t + 2.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.9);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 3.0);
    }

    // Radio Morse / Tactical Chirp feedback
    playTacticalChirp() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    // Ambient Ocean Surf & Engine Throb
    startAmbientSea() {
        if (!this.ctx || !this.ambientGain) return;
        const t = this.ctx.currentTime;

        // Ocean wave wash
        const noiseBuf = this.createNoiseBuffer(5.0);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            noise.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(260, t);

            // Modulate filter for wave surge effect
            const lfo = this.ctx.createOscillator();
            lfo.frequency.setValueAtTime(0.15, t); // 6.6 sec wave swell cycle
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(140, t);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            noise.connect(filter);
            filter.connect(this.ambientGain);
            noise.start(t);
            lfo.start(t);
        }
    }

    // Victory Fanfare
    playVictory() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.22;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.9);
        });
    }

    // Defeat Tone
    playDefeat() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
        notes.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.35;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 1.0);
        });
    }
}

// Global Sound Instance
window.soundEngine = new SoundEngine();
