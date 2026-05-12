// js/audioEngine.js

let isInitialized = false;
let polySynth;
let monoSynth;
let masterVolume;

export async function initAudio() {
    if (isInitialized) return true;

    try {
        await Tone.start();
        
        // Optimization for Low Latency (Safely applied after start)
        try {
            Tone.context.latencyHint = 'fastest';
            Tone.context.lookAhead = 0.01; // Slightly safer than 0
        } catch (optErr) {
            console.warn("Could not set low-latency optimizations:", optErr);
        }

        // Master Volume and Compressor for premium sound quality
        masterVolume = new Tone.Volume(-8).toDestination();
        const compressor = new Tone.Compressor(-30, 3);
        compressor.connect(masterVolume);

        // Reverb to make it sound natural but not muddy
        const reverb = new Tone.Reverb({
            decay: 1.0,
            preDelay: 0.05,
            wet: 0.15
        }).connect(compressor);

        // Piano Sampler - Optimized: Connect directly to destination for zero-latency path
        // (Reverb/Compressor can add small processing delays)
        polySynth = new Tone.Sampler({
            urls: {
                A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
                A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
                A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
                A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
                A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
                A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
                A7: "A7.mp3", C8: "C8.mp3"
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/"
        }).toDestination(); // Direct to output for minimum latency

        // MonoSynth for melodies (also switched to piano-like settings or keep for contrast)
        monoSynth = polySynth; // Reuse sampler for mono notes as well

        // Bass remains a bit punchier but using the piano low-end is usually better
        bassSynth = polySynth; 

        // Wait for reverb to generate impulse
        await reverb.generate();

        Tone.Transport.bpm.value = 90;
        isInitialized = true;
        return true;
    } catch (e) {
        console.error("Failed to start audio context:", e);
        return false;
    }
}

export let bassSynth;

let playbackTimeouts = [];

function clearAllTimeouts() {
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
}

/**
 * Play a single note
 */
export async function playNote(note, duration = '4n', time) {
    if (!isInitialized) await initAudio();
    if (!isInitialized) return;
    const processedNote = typeof note === 'number' ? Tone.Frequency(note, "midi").toFrequency() : note;
    monoSynth.triggerAttackRelease(processedNote, duration, time !== undefined ? time : Tone.now());
}

/**
 * Play a chord
 */
export async function playChord(notes, duration = '2n', time) {
    if (!isInitialized) await initAudio();
    if (!isInitialized) return;
    // Ensure all notes are converted to frequency if they are MIDI numbers
    const processedNotes = notes.map(n => typeof n === 'number' ? Tone.Frequency(n, "midi").toFrequency() : n);
    polySynth.triggerAttackRelease(processedNotes, duration, time !== undefined ? time : Tone.now());
}

export async function playMidiNoteOn(midiNumber, velocity = 0.7) {
    if (!isInitialized) await initAudio();
    if (!isInitialized) return;
    const freq = Tone.Frequency(midiNumber, "midi").toFrequency();
    // Use "+0" to trigger as soon as possible in the current block
    polySynth.triggerAttack(freq, "+0", velocity);
}

export function playMidiNoteOff(midiNumber) {
    if (!isInitialized) return;
    const freq = Tone.Frequency(midiNumber, "midi").toFrequency();
    polySynth.triggerRelease(freq, Tone.now());
}

/**
 * Play a sequence of chords (Progression)
 * @param {Array<Array<string>>} progression Array of chords (each chord is an array of notes)
 * @param {number} bpm
 */
export async function playProgression(progression, bpm = 90) {
    if (!isInitialized) await initAudio();
    if (!isInitialized) return;

    stopAll();

    const beatDuration = 60 / bpm;
    const msPerChord = beatDuration * 2 * 1000;

    progression.forEach((chordNotes, index) => {
        const t = setTimeout(() => {
            playChord(chordNotes, '2n');
        }, index * msPerChord);
        playbackTimeouts.push(t);
    });
}

/**
 * Play a melody sequence
 * @param {Array<string>} melody Array of note strings
 * @param {number} bpm
 */
export async function playMelody(melody, bpm = 120) {
    if (!isInitialized) await initAudio();
    if (!isInitialized) return;

    stopAll();

    const beatDuration = 60 / bpm;
    const msPerNote = beatDuration * 1000;

    melody.forEach((note, index) => {
        const t = setTimeout(() => {
            playNote(note, '8n');
        }, index * msPerNote);
        playbackTimeouts.push(t);
    });
}

/**
 * Stop all playing synths immediately
 */
export function stopAll() {
    if (!isInitialized) return;

    clearAllTimeouts();
    if (window.highlightTimeouts) {
        window.highlightTimeouts.forEach(clearTimeout);
        window.highlightTimeouts = [];
    }

    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    try {
        polySynth.releaseAll();
        monoSynth.triggerRelease();
        bassSynth.triggerRelease();
    } catch (e) {
        // safely ignore release errors
    }
}
