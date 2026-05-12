// js/midiHandler.js
import { playMidiNoteOn, playMidiNoteOff } from './audioEngine.js';
import { showMidiNoteOn, showMidiNoteOff } from './fretboard.js';

export async function initMidi(onStatusChange) {
    if (!navigator.requestMIDIAccess) {
        console.warn('Web MIDI API is not supported in this browser.');
        if (onStatusChange) onStatusChange('Unsupported');
        return;
    }

    try {
        const midiAccess = await navigator.requestMIDIAccess();
        console.log('MIDI access granted.');
        
        const updateInputs = () => {
            const inputs = midiAccess.inputs.values();
            let hasDevice = false;
            for (let input of inputs) {
                input.onmidimessage = handleMidiMessage;
                console.log(`Connected: ${input.name}`);
                hasDevice = true;
            }
            if (onStatusChange) onStatusChange(hasDevice ? 'Connected' : 'Scanning...');
        };

        midiAccess.onstatechange = (e) => {
            console.log(`MIDI state change: ${e.port.name} ${e.port.state}`);
            updateInputs();
        };

        updateInputs();

    } catch (err) {
        console.error('Failed to get MIDI access', err);
        if (onStatusChange) onStatusChange('Error');
    }
}

function handleMidiMessage(event) {
    const [status, data1, data2] = event.data;
    const type = status & 0xf0;
    const channel = status & 0x0f; // 0-15
    const midiNote = data1;
    const velocity = data2;

    // Map MIDI channel to string index
    // Diagnostic: 3rd string (index 2) was correct with 'channel-1' when channel was 3 (Ch 4).
    // 2nd string (index 1) showed on 4th string (index 3) with 'channel-1' when channel was 4 (Ch 5).
    // This confirms the mapping: Ch 1=Str 6, Ch 2=Str 5, Ch 3=Str 4, Ch 4=Str 3, Ch 5=Str 2, Ch 6=Str 1.
    // Formula: stringIdx = 5 - channel (where channel is 0-indexed 0-5)
    let stringIdx = null;
    if (channel >= 0 && channel <= 5) {
        stringIdx = 5 - channel;
    }

    // Note On
    if (type === 0x90 && velocity > 0) {
        showMidiNoteOn(midiNote, stringIdx);
        playMidiNoteOn(midiNote, velocity / 127);
    }
    // Note Off
    else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
        showMidiNoteOff(midiNote, stringIdx);
        playMidiNoteOff(midiNote);
    }
}
