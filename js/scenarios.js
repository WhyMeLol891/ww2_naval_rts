/**
 * PACIFIC ARMED - 6-Player Battles & Historical Scenarios
 */

const SCENARIOS = {
    six_player: {
        id: 'six_player',
        name: 'Grand 6-Player Naval War (Hexagonal Harbors)',
        subtitle: '6-Faction Free-For-All with Naval Bases & Dockyard Production',
        weather: 'day',
        isSixPlayer: true,
        briefing: 'Admiral: Command the US Navy in a 6-player global naval battle! Each player controls a fortified Harbor Base equipped with heavy coastal artillery, dockyard shipyards, and repair drydocks. Collect steel over time, commission new warships, bombard enemy harbors, and conquer the Pacific!',
        factions: ['usn', 'ijn', 'rn', 'km', 'rm', 'vvs'],
        initialFleetPerPlayer: [
            { class: 'BB', name: 'Battleship', offset: { x: 0, z: 0 } },
            { class: 'CA', name: 'Cruiser', offset: { x: -35, z: 20 } },
            { class: 'DD', name: 'Destroyer', offset: { x: 35, z: 20 } },
            { class: 'DD', name: 'Destroyer Escort', offset: { x: 0, z: 45 } }
        ]
    },

    midway: {
        id: 'midway',
        name: 'Battle of Midway (June 1942)',
        subtitle: 'Carrier Task Force Clash in the Central Pacific',
        weather: 'day',
        isSixPlayer: false,
        briefing: 'Admiral: Imperial Japanese Navy carrier forces have been spotted northeast of Midway Atoll! Launch your Dauntless dive bombers and Avenger torpedo bombers to strike the carriers Akagi and Kaga while protecting USS Enterprise.',
        factions: ['usn', 'ijn'],
        playerShips: [
            { name: 'USS Enterprise', class: 'CV', faction: 'usn', x: -350, z: 200, heading: 0 },
            { name: 'USS Astoria', class: 'CA', faction: 'usn', x: -280, z: 220, heading: 0 },
            { name: 'USS Minneapolis', class: 'CA', faction: 'usn', x: -420, z: 220, heading: 0 },
            { name: 'USS Fletcher', class: 'DD', faction: 'usn', x: -310, z: 120, heading: 0 },
            { name: 'USS Anderson', class: 'DD', faction: 'usn', x: -390, z: 120, heading: 0 }
        ],
        enemyShips: [
            { name: 'IJN Akagi', class: 'CV', faction: 'ijn', x: 260, z: -320, heading: Math.PI },
            { name: 'IJN Kaga', class: 'CV', faction: 'ijn', x: 380, z: -300, heading: Math.PI },
            { name: 'IJN Tone', class: 'CA', faction: 'ijn', x: 200, z: -250, heading: Math.PI },
            { name: 'IJN Kagero', class: 'DD', faction: 'ijn', x: 280, z: -180, heading: Math.PI },
            { name: 'IJN Yukikaze', class: 'DD', faction: 'ijn', x: 360, z: -180, heading: Math.PI }
        ]
    },

    ironbottom: {
        id: 'ironbottom',
        name: 'Ironbottom Sound (November 1942)',
        subtitle: 'Night Torpedo Ambush off Guadalcanal',
        weather: 'night',
        isSixPlayer: false,
        briefing: 'Midnight in the Solomon Islands. An Imperial Navy bombardment group led by battleship Hiei is advancing through Savo Sound. Ambush with close-range torpedo spreads under cover of darkness!',
        factions: ['usn', 'ijn'],
        playerShips: [
            { name: 'USS San Francisco', class: 'CA', faction: 'usn', x: -180, z: 160, heading: 0 },
            { name: 'USS Atlanta', class: 'CA', faction: 'usn', x: -100, z: 180, heading: 0 },
            { name: 'USS Laffey', class: 'DD', faction: 'usn', x: -150, z: 80, heading: 0 },
            { name: 'USS Cushing', class: 'DD', faction: 'usn', x: -220, z: 90, heading: 0 }
        ],
        enemyShips: [
            { name: 'IJN Hiei', class: 'BB', faction: 'ijn', x: 120, z: -180, heading: Math.PI },
            { name: 'IJN Nagara', class: 'CA', faction: 'ijn', x: 220, z: -160, heading: Math.PI },
            { name: 'IJN Akatsuki', class: 'DD', faction: 'ijn', x: 60, z: -90, heading: Math.PI },
            { name: 'IJN Ikazuchi', class: 'DD', faction: 'ijn', x: 160, z: -80, heading: Math.PI }
        ]
    },

    leyte: {
        id: 'leyte',
        name: 'Clash of Titans: Leyte Gulf (1944)',
        subtitle: 'The Last Battleship Line of History',
        weather: 'sunset',
        isSixPlayer: false,
        briefing: 'The Japanese Center Force led by the monstrous super-battleship Yamato is steaming into the strait. Form a battle line to Cross the T and bring all 16-inch broadside salvos to bear!',
        factions: ['usn', 'ijn'],
        playerShips: [
            { name: 'USS West Virginia', class: 'BB', faction: 'usn', x: -280, z: 150, heading: 0 },
            { name: 'USS California', class: 'BB', faction: 'usn', x: -160, z: 170, heading: 0 },
            { name: 'USS Portland', class: 'CA', faction: 'usn', x: -360, z: 160, heading: 0 },
            { name: 'USS Melvin', class: 'DD', faction: 'usn', x: -220, z: 60, heading: 0 }
        ],
        enemyShips: [
            { name: 'IJN Yamato', class: 'BB', faction: 'ijn', x: 180, z: -200, heading: Math.PI },
            { name: 'IJN Musashi', class: 'BB', faction: 'ijn', x: 300, z: -220, heading: Math.PI },
            { name: 'IJN Takao', class: 'CA', faction: 'ijn', x: 80, z: -140, heading: Math.PI },
            { name: 'IJN Shimakaze', class: 'DD', faction: 'ijn', x: 220, z: -90, heading: Math.PI }
        ]
    }
};
