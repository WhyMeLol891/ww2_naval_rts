# PACIFIC ARMED: WW2 Naval RTS Command 1942 (6-Player Battle Edition)

A 3D Real-Time Strategy (RTS) WW2 Naval Battle Simulator built with WebGL and Three.js. Command carrier battle groups, dreadnought battle lines, and destroyer flotillas in a high-octane 6-player global naval war featuring home naval harbors, dockyard warship commissioning, and rock-solid 60 FPS performance.

---

## 🎮 How to Play

### Running the Game
- **Via XAMPP**: Start Apache in the XAMPP Control Panel and navigate to:
  `http://localhost/3D_RTS_WW2_NAVAL/`
- **Direct File**: Simply double-click `index.html` in your web browser (Chrome, Edge, Firefox, or Safari).

---

## 🚩 6-Player Hexagonal Battle & Factions

| Player | Faction | Color | Insignia | Naval Station | Starting Battlegroup |
|---|---|---|---|---|---|
| **P1** | **US Navy (Commander)** | Blue `#2196f3` | 🇺🇸 | Pearl Harbor Station | 1x BB, 1x CA, 2x DD |
| **P2** | **Imperial Japanese Navy** | Crimson `#f44336` | 🇯🇵 | Kure Naval Base | 1x BB, 1x CA, 2x DD |
| **P3** | **Royal Navy** | Cyan `#00bcd4` | 🇬🇧 | Scapa Flow / Singapore | 1x BB, 1x CA, 2x DD |
| **P4** | **Kriegsmarine** | Slate `#9e9e9e` | 🇩🇪 | Wilhelmshaven Station | 1x BB, 1x CA, 2x DD |
| **P5** | **Regia Marina** | Emerald `#4caf50` | 🇮🇹 | Taranto Naval Base | 1x BB, 1x CA, 2x DD |
| **P6** | **Soviet Red Fleet** | Gold `#ff9800` | ⭐ | Vladivostok Harbor | 1x BB, 1x CA, 2x DD |

---

## ⚓ Harbor Bases & Dockyard Production

Each player commands a fortified **Harbor Base** on the perimeter:
1. **Dockyard Construction**: Accumulate Steel over time (+18 Steel/s) and build reinforcements:
   - <kbd>1</kbd> **Destroyer (DD)**: 300 Steel (8s) - Rapid 5" guns, torpedo spreads, smoke screen.
   - <kbd>2</kbd> **Fleet Submarine (SS)**: 350 Steel (9s) - Stealth diving, torpedo ambushes.
   - <kbd>3</kbd> **Heavy Cruiser (CA)**: 550 Steel (14s) - 8" guns, escort screen, heavy anti-aircraft.
   - <kbd>4</kbd> **Battleship (BB)**: 950 Steel (22s) - 16" broadside salvos, heavy armor.
   - <kbd>5</kbd> **Aircraft Carrier (CV)**: 1100 Steel (25s) - SBD Dive Bombers & TBF Torpedo Bombers.
2. **Coastal Defense Batteries**: Twin 12" coastal artillery guns automatically bombard enemy warships trespassing within 450 units.
3. **Repair Drydock**: Friendly warships within 120 units regenerate HP (+28 HP/s) and extinguish fires/flooding.
4. **Base Elimination**: Sinking a player's harbor prevents them from building new ships. Sinking all their remaining warships eliminates them from the war!

---

## ⚡ Zero-Lag Optimization Engine
- **Pre-Allocated Object Pooling**: Shell projectiles, torpedoes, water geysers, explosions, and wakes are pooled; zero runtime garbage collection pauses.
- **Shared Geometry Singletons**: Warship geometries and materials are shared across all 6 fleets instead of being duplicated.
- **Staggered AI & Target Evaluation**: AI tactical thinking and targeting scans are distributed across alternating frames, maintaining smooth 60 FPS even with hundreds of guns firing simultaneously.
- **Optimized Gerstner Ocean Shader**: Smooth mathematical ocean surface running at 80x80 segments with 75% fewer vertex calculations.

---

## 🎯 Controls & Hotkeys

### Mouse Controls
- **Left Click**: Select individual warship.
- **Drag Box (Marquee)**: Select multiple warships within tactical marquee.
- **Right Click**:
  - Click on open water: Issue move order.
  - Click on enemy warship / harbor: Order fleet bombardment.
- **Middle Mouse / Right Drag**: Orbit and tilt tactical camera angle.
- **Mouse Wheel**: Zoom in and out.
- **Minimap Click / Drag**: Jump camera to any position on the radar.

### Keyboard Hotkeys
- <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>Arrow Keys</kbd>: Pan camera.
- <kbd>H</kbd>: Instantly center camera on your **Home Naval Harbor**.
- <kbd>1</kbd> - <kbd>5</kbd>: Commission warships at your dockyard (DD, SS, CA, BB, CV).
- <kbd>Space</kbd>: Fire broadside salvo from all ready aligned main turrets.
- <kbd>Q</kbd>: Launch fan spread of high-explosive torpedoes.
- <kbd>W</kbd>: Launch SBD Dauntless Dive Bomber strike (Carrier required).
- <kbd>E</kbd>: Launch TBF Avenger Torpedo Bomber strike (Carrier required).
- <kbd>R</kbd>: Deploy thick smoke screen (Destroyer required).
- <kbd>T</kbd>: Dispatch Damage Control party.
- <kbd>C</kbd>: Action / Follow Cam toggle.
