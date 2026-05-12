// js/fretboard.js
import { noteToMidi, getNoteName } from './musicTheory.js';

// Standard E tuning (low to high): E2, A2, D3, G3, B3, E4
// MIDI values: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const TUNING = [64, 59, 55, 50, 45, 40]; 
const NUM_FRETS = 15;

export function initFretboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div class="fretboard-neck">';
    
    // Create strings
    TUNING.forEach((stringBaseMidi, stringIdx) => {
        html += `<div class="string string-${stringIdx}">`;
        
        // Create frets
        for (let fret = 0; fret <= NUM_FRETS; fret++) {
            const midiNote = stringBaseMidi + fret;
            const noteName = getNoteName(midiNote);
            const isNut = fret === 0;
            
            // Inlay dots logic (usually on strings 2 and 3 or middle)
            // We'll put them on stringIdx 2 (3rd string)
            let inlayHtml = '';
            if (stringIdx === 2 && !isNut) {
                if ([3, 5, 7, 9, 15].includes(fret)) {
                    inlayHtml = '<div class="inlay-dot"></div>';
                }
            } else if (stringIdx === 1 && fret === 12) {
                 inlayHtml = '<div class="inlay-dot"></div>';
            } else if (stringIdx === 3 && fret === 12) {
                 inlayHtml = '<div class="inlay-dot"></div>';
            }

            html += `
                <div class="fret ${isNut ? 'nut' : ''}" data-midi="${midiNote}" data-note="${noteName}" data-fret="${fret}">
                    ${inlayHtml}
                    <div class="note-marker hidden"></div>
                </div>
            `;
        }
        
        html += `</div>`;
    });

    // Fret markers (3, 5, 7, 9, 12, 15)
    html += '<div class="fret-markers-row">';
    for (let fret = 0; fret <= NUM_FRETS; fret++) {
        let marker = '';
        if ([3, 5, 7, 9, 15].includes(fret)) marker = '•';
        if (fret === 12) marker = '••';
        html += `<div class="fret-marker-label">${marker}</div>`;
    }
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

export function clearFretboard() {
    const markers = document.querySelectorAll('.fretboard-neck .note-marker');
    markers.forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('active');
        m.textContent = '';
    });
}

export function highlightNotesOnFretboard(notesArray, labelsMap = null, stringFilter = null) {
    clearFretboard();
    
    notesArray.forEach(noteStr => {
        const noteName = noteStr.match(/^[A-Ga-g][b#]?/)[0];
        const displayLabel = (labelsMap && labelsMap[noteName]) ? labelsMap[noteName] : noteName;

        // Find all fret cells that match this note name
        const fretCells = document.querySelectorAll(`.fret[data-note="${noteName}"]`);
        fretCells.forEach(cell => {
            // Check string filter if provided
            if (stringFilter) {
                const parentString = cell.closest('.string');
                if (parentString) {
                    const stringIdx = parseInt(parentString.className.match(/string-(\d+)/)[1]);
                    if (!stringFilter.includes(stringIdx)) return;
                }
            }

            const marker = cell.querySelector('.note-marker');
            if (marker) {
                marker.textContent = displayLabel;
                marker.classList.remove('hidden');
                marker.classList.add('active');
            }
        });
    });
}

export function showMidiNoteOn(midiNumber, stringIdx = null) {
    let selector = `.fret[data-midi="${midiNumber}"]`;
    if (stringIdx !== null) {
        selector = `.string-${stringIdx} .fret[data-midi="${midiNumber}"]`;
    }
    
    const fretCells = document.querySelectorAll(selector);
    fretCells.forEach(cell => {
        const marker = cell.querySelector('.note-marker');
        if (marker) {
            // Store current label if it's an active correct answer
            if (marker.classList.contains('active')) {
                marker.dataset.originalLabel = marker.textContent;
            }
            marker.classList.remove('hidden');
            marker.classList.add('midi-user');
            marker.textContent = cell.dataset.note;
        }
    });
}

export function showMidiNoteOff(midiNumber, stringIdx = null) {
    let selector = `.fret[data-midi="${midiNumber}"]`;
    if (stringIdx !== null) {
        selector = `.string-${stringIdx} .fret[data-midi="${midiNumber}"]`;
    }

    const fretCells = document.querySelectorAll(selector);
    fretCells.forEach(cell => {
        const marker = cell.querySelector('.note-marker');
        if (marker && marker.classList.contains('midi-user')) {
            marker.classList.remove('midi-user');
            
            // If it was a correct answer, restore its degree label
            if (marker.classList.contains('active')) {
                if (marker.dataset.originalLabel) {
                    marker.textContent = marker.dataset.originalLabel;
                    delete marker.dataset.originalLabel;
                }
            } else {
                marker.classList.add('hidden');
                marker.textContent = '';
            }
        }
    });
}
export function highlightRoot(midiNumber) {
    const cells = document.querySelectorAll(`.fret[data-midi="${midiNumber}"]`);
    cells.forEach(cell => {
        const marker = cell.querySelector('.note-marker');
        if (marker) {
            marker.classList.remove('hidden', 'midi-user', 'target-root');
            marker.classList.add('active', 'root-marker');
            marker.textContent = 'R';
        }
    });
}

export function highlightTargetRoot(midiNumber, stringIdx = null) {
    // If stringIdx is provided, only highlight that specific one. 
    // Otherwise, it's safer to just pick one if not specified.
    let selector = `.fret[data-midi="${midiNumber}"]`;
    if (stringIdx !== null) {
        selector = `.string-${stringIdx} .fret[data-midi="${midiNumber}"]`;
    }
    
    const cells = document.querySelectorAll(selector);
    cells.forEach(cell => {
        const marker = cell.querySelector('.note-marker');
        if (marker) {
            marker.classList.add('target-root');
        }
    });
}

export function onFretClick(callback) {
    const neck = document.querySelector('.fretboard-neck');
    if (!neck) return;
    
    // Remove old listener if any (simplified)
    const newNeck = neck.cloneNode(true);
    neck.parentNode.replaceChild(newNeck, neck);

    newNeck.addEventListener('click', (e) => {
        const fret = e.target.closest('.fret');
        if (fret) {
            const midi = parseInt(fret.dataset.midi);
            const note = fret.dataset.note;
            callback({ midi, note, element: fret });
        }
    });
}
