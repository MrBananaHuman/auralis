// js/app.js
import { initAudio, stopAll } from './audioEngine.js';
import { initMidi } from './midiHandler.js';
import { mode1_render } from './modes/mode1.js';
import { mode2_render } from './modes/mode2.js';
import { mode3_render } from './modes/mode3.js';
import { mode4_render } from './modes/mode4.js';
import { mode5_render } from './modes/mode5.js';
import { mode6_render } from './modes/mode6.js';
import { mode7_render } from './modes/mode7.js';
import { mode8_render } from './modes/mode8.js';

let currentKey = 'C';
let currentMode = 'mode1';
let midiInitialized = false;

const modes = {
    'mode1': { title: 'Note Mastery', description: 'Identify the note or chord being played.', render: mode1_render },
    'mode2': { title: 'Chord Progressions', description: 'Listen to the progression and identify the chords.', render: mode2_render },
    'mode3': { title: 'Relative Melody', description: 'Identify the melody using relative scale degrees (1, 2, 3...).', render: mode3_render },
    'mode4': { title: 'Melody & Chords', description: 'Listen to a melody and match the chord progression that fits.', render: mode4_render },
    'mode5': { title: 'Chord Explorer', description: 'Visualize triads across different string sets to learn their shapes.', render: mode5_render },
    'mode6': { title: 'Fretboard Geometry', description: 'Master the spatial relationships between notes on the neck.', render: mode6_render },
    'mode7': { title: 'Harmony Builder', description: 'Build chord progressions', render: mode7_render },
    'mode8': { title: 'CAGED System Master', description: 'Visualize the 5 CAGED shapes across the fretboard.', render: mode8_render }
};

function initApp() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const keySelector = document.getElementById('key-selector');
    const viewContainer = document.getElementById('view-container');
    const viewTitle = document.getElementById('view-title');
    const viewDescription = document.getElementById('view-description');

    if (!viewContainer) {
        console.error("Critical error: view-container not found.");
        return;
    }

    // Handle Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            // 1. UI Feedback Immediate (No await)
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentMode = btn.dataset.mode;
            if (viewTitle) viewTitle.textContent = modes[currentMode].title;
            if (viewDescription) viewDescription.textContent = modes[currentMode].description;
            
            renderCurrentMode();

            // 2. Audio/MIDI Initialization in background
            try {
                initAudio(); // Don't await here to prevent blocking UI
                
                if (!midiInitialized) {
                    initMidi((status) => {
                        const pill = document.getElementById('midi-status');
                        const text = document.getElementById('midi-status-text');
                        if (pill && text) {
                            text.textContent = `MIDI: ${status}`;
                            if (status === 'Connected') pill.classList.add('connected');
                            else pill.classList.remove('connected');
                            lucide.createIcons({ root: pill });
                        }
                    });
                    midiInitialized = true;
                }
            } catch (err) {
                console.warn("Async init failed", err);
            }
        });
    });

    // Handle Global Key Change
    if (keySelector) {
        keySelector.addEventListener('change', (e) => {
            currentKey = e.target.value;
            renderCurrentMode(); 
        });
    }

    function renderCurrentMode() {
        try {
            stopAll();
            viewContainer.innerHTML = '';
            
            // Hide global fretboard for modes that render their own custom fretboards
            const globalFretboard = document.querySelector('main > #fretboard-container');
            if (globalFretboard) {
                if (currentMode === 'mode7' || currentMode === 'mode8') {
                    globalFretboard.style.display = 'none';
                } else {
                    globalFretboard.style.display = 'block';
                }
            }

            modes[currentMode].render(viewContainer, currentKey);
            lucide.createIcons();
        } catch (err) {
            console.error("Render failed", err);
            viewContainer.innerHTML = `<p style="color:red; padding: 2rem;">Render Error: ${err.message}</p>`;
        }
    }

    // Initial Render
    renderCurrentMode();
}

// Support both early and late script loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
