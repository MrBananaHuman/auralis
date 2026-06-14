// js/musicTheory.js

export const NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map of key to integer
export const NOTE_TO_INT = Object.fromEntries(NOTES.map((note, index) => [note, index]));

// Major scale intervals (W, W, H, W, W, W, H) -> cumulative semitones
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Minor scale intervals
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export const CHORD_FORMULAS = {
    'Major': [0, 4, 7],
    'Minor': [0, 3, 7],
    'Diminished': [0, 3, 6],
    'Augmented': [0, 4, 8],
    'Sus4': [0, 5, 7],
    'Sus2': [0, 2, 7],
    'Maj7': [0, 4, 7, 11],
    'Min7': [0, 3, 7, 10],
    'Dom7': [0, 4, 7, 10],
    'Dim7': [0, 3, 6, 9],
    'HalfDim7': [0, 3, 6, 10],
    'm7b5': [0, 3, 6, 10],
    '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9],
    'add9': [0, 4, 7, 14],
    '9': [0, 4, 7, 10, 14],
    'Maj9': [0, 4, 7, 11, 14],
    'Min9': [0, 3, 7, 10, 14],
    'Dom9': [0, 4, 7, 10, 14]
};

export const INTERVAL_NAMES = {
    1: 'Minor 2nd',
    2: 'Major 2nd',
    3: 'Minor 3rd',
    4: 'Major 3rd',
    5: 'Perfect 4th',
    6: 'Tritone',
    7: 'Perfect 5th',
    8: 'Minor 6th',
    9: 'Major 6th',
    10: 'Minor 7th',
    11: 'Major 7th',
    12: 'Octave'
};

// Diatonic Chords for a Major Key (triads)
// I, ii, iii, IV, V, vi, vii°
export const MAJOR_DIATONIC_CHORDS = [
    { degree: 1, type: 'Major', suffix: '' },
    { degree: 2, type: 'Minor', suffix: 'm' },
    { degree: 3, type: 'Minor', suffix: 'm' },
    { degree: 4, type: 'Major', suffix: '' },
    { degree: 5, type: 'Major', suffix: '' },
    { degree: 6, type: 'Minor', suffix: 'm' },
    { degree: 7, type: 'Diminished', suffix: 'dim' }
];

export const ADVANCED_CHORDS_POOL = [
    { degree: 1, type: 'Maj7', suffix: 'maj7' },
    { degree: 2, type: 'Min7', suffix: 'm7' },
    { degree: 3, type: 'Min7', suffix: 'm7' },
    { degree: 4, type: 'Maj7', suffix: 'maj7' },
    { degree: 5, type: 'Dom7', suffix: '7' },
    { degree: 6, type: 'Min7', suffix: 'm7' },
    { degree: 7, type: 'HalfDim7', suffix: 'm7b5' },
    { degree: 5, type: 'Dom9', suffix: '9' },
    { degree: 1, type: 'Maj9', suffix: 'maj9' },
    { degree: 2, type: 'Min9', suffix: 'm9' },
    { degree: 3, type: 'Augmented', suffix: 'aug' },
    { degree: 7, type: 'Dim7', suffix: 'dim7' }
];

/**
 * Gets the absolute note name for a given semitone offset from C.
 */
export function getNoteName(semitoneOffset) {
    let normalized = ((semitoneOffset % 12) + 12) % 12; // Handle negatives
    return NOTES[normalized];
}

/**
 * Converts a note string (e.g. 'C4', 'Eb3') to MIDI note number
 */
export function noteToMidi(noteStr) {
    const match = noteStr.match(/^([A-Ga-g][b#]?)(\d)$/);
    if (!match) return null;
    const name = match[1];
    const oct = parseInt(match[2], 10);
    let intVal = NOTE_TO_INT[name];
    if (intVal === undefined) {
        // handle enharmonics if needed, but our internal notes are flat-based
        if (name === 'C#') intVal = 1;
        if (name === 'D#') intVal = 3;
        if (name === 'F#') intVal = 6;
        if (name === 'G#') intVal = 8;
        if (name === 'A#') intVal = 10;
    }
    return (oct + 1) * 12 + intVal;
}

/**
 * Generate a scale given a root note and intervals.
 */
export function getScale(rootNote, octave = 4, intervals = MAJOR_SCALE_INTERVALS) {
    const rootInt = NOTE_TO_INT[rootNote];
    return intervals.map(interval => {
        const absoluteInt = rootInt + interval;
        const noteName = getNoteName(absoluteInt);
        const oct = octave + Math.floor(absoluteInt / 12);
        return `${noteName}${oct}`;
    });
}

/**
 * Get notes for a specific chord
 * @param {string} rootNote e.g. 'C'
 * @param {string} type e.g. 'Major'
 * @param {number} octave e.g. 4
 */
export function getChordNotes(rootNote, type, octave = 4) {
    const rootInt = NOTE_TO_INT[rootNote];
    const formula = CHORD_FORMULAS[type] || CHORD_FORMULAS['Major'];
    
    return formula.map(interval => {
        const absoluteInt = rootInt + interval;
        const noteName = getNoteName(absoluteInt);
        const oct = octave + Math.floor(absoluteInt / 12);
        return `${noteName}${oct}`;
    });
}

/**
 * Pick a random element from an array
 */
export function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle an array
 */
export function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
}

/**
 * Returns a map of { noteName: degreeString } for the current key
 * e.g. { 'C': '1', 'D': '2', ... }
 */
export function getDegreeLabelMap(rootNote) {
    const scaleNotes = getScale(rootNote);
    const map = {};
    scaleNotes.forEach((fullNote, idx) => {
        const noteName = fullNote.match(/^[A-Ga-g][b#]?/)[0];
        map[noteName] = (idx + 1).toString();
    });
    return map;
}

/**
 * Returns chord formula degrees for a given type
 */
export function getChordFormula(type) {
    switch (type) {
        case 'Major': return ['1', '3', '5'];
        case 'Minor': return ['1', 'b3', '5'];
        case 'Diminished': return ['1', 'b3', 'b5'];
        case 'Augmented': return ['1', '3', '#5'];
        case 'Maj7': return ['1', '3', '5', '7'];
        case 'Min7': return ['1', 'b3', '5', 'b7'];
        case 'Dom7': return ['1', '3', '5', 'b7'];
        case 'Dim7': return ['1', 'b3', 'b5', 'bb7'];
        case 'HalfDim7':
        case 'm7b5': return ['1', 'b3', 'b5', 'b7'];
        default: return ['1', '3', '5'];
    }
}
/**
 * Identifies a chord from a set of MIDI notes.
 * @param {Array<number>} midis - Array of MIDI note numbers.
 * @returns {Object|null} - { root: string, type: string, name: string } or null
 */
export function identifyChord(midis) {
    if (!midis || midis.length === 0) return null;

    // Get unique pitch classes (0-11)
    const pitchClasses = [...new Set(midis.map(m => m % 12))].sort((a, b) => a - b);
    
    // Dictionary of patterns (sorted for comparison)
    const chordFormulas = {
        'Major': [0, 4, 7],
        'Minor': [0, 3, 7],
        'Diminished': [0, 3, 6],
        'Augmented': [0, 4, 8],
        'Sus4': [0, 5, 7],
        'Sus2': [0, 2, 7],
        'Dom7': [0, 4, 7, 10],
        'Maj7': [0, 4, 7, 11],
        'Min7': [0, 3, 7, 10],
        'Dim7': [0, 3, 6, 9],
        'm7b5': [0, 3, 6, 10],
        '6': [0, 4, 7, 9],
        'm6': [0, 3, 7, 9],
        'add9': [0, 4, 7, 14],
        '9': [0, 4, 7, 10, 14],
        'Maj9': [0, 4, 7, 11, 14],
        'Min9': [0, 3, 7, 10, 14]
    };

    // Try each pitch as a root
    for (let rootPC of pitchClasses) {
        // Calculate intervals from this root
        const intervals = pitchClasses.map(pc => (pc - rootPC + 12) % 12).sort((a, b) => a - b);
        
        for (const [type, formula] of Object.entries(chordFormulas)) {
            const normalizedFormula = formula.map(f => f % 12).sort((a, b) => a - b);
            
            // Check if intervals match formula
            if (JSON.stringify(intervals) === JSON.stringify(normalizedFormula)) {
                const rootName = getNoteName(rootPC);
                const suffix = getChordSuffix(type);
                return {
                    root: rootName,
                    type: type,
                    name: `${rootName}${suffix}`
                };
            }
        }
    }

    // Special case for Power Chords
    for (let rootPC of pitchClasses) {
        const intervals = pitchClasses.map(pc => (pc - rootPC + 12) % 12).sort((a, b) => a - b);
        if (JSON.stringify(intervals) === JSON.stringify([0, 7])) {
            const rootName = getNoteName(rootPC);
            return { root: rootName, type: 'Power', name: `${rootName}5` };
        }
    }

    return { root: '', type: 'Unknown', name: 'Cluster' };
}

function getChordSuffix(type) {
    const suffixes = {
        'Major': '',
        'Minor': 'm',
        'Diminished': 'dim',
        'Augmented': 'aug',
        'Sus4': 'sus4',
        'Sus2': 'sus2',
        'Maj7': 'maj7',
        'Min7': 'm7',
        'Dom7': '7',
        'Dim7': 'dim7',
        'm7b5': 'm7b5',
        '6': '6',
        'm6': 'm6',
        'add9': 'add9',
        'Maj9': 'maj9',
        'Min9': 'm9',
        '9': '9'
    };
    return suffixes[type] || '';
}
