// js/modes/mode4.js
import { playMelody, playChord, stopAll } from '../audioEngine.js';
import { getScale, getChordNotes, MAJOR_DIATONIC_CHORDS, pickRandom, getDegreeLabelMap } from '../musicTheory.js';
import { initFretboard, highlightNotesOnFretboard, clearFretboard } from '../fretboard.js';

export function mode4_render(container, currentKey) {
    let currentProgression = [];
    let currentMelody = [];
    let isAnswerRevealed = false;

    const html = `
        <div class="glass-panel">
            <div style="text-align: center; margin-bottom: 2rem;">
                <p>Listen to the generated melody and identify the underlying 4-chord progression.</p>
            </div>

            <div style="display: flex; justify-content: center; gap: 1rem;">
                <button class="play-action-btn" id="play-btn" style="margin: 0;">
                    <i data-lucide="play"></i>
                </button>
            </div>

            <div id="status-message" style="margin-top: 1rem;">Press Play to start</div>
            
            <div class="progression-container" id="progression-slots">
                <!-- Slots injected dynamically -->
            </div>

            <div class="answers-grid hidden" id="answers-container">
                <!-- Chord options injected here -->
            </div>
            
            <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 2rem;">
                <button class="btn-primary hidden" id="check-btn">Check Answer</button>
                <button class="btn-primary hidden" id="next-btn" style="background-color: var(--success);">Next Question <i data-lucide="arrow-right"></i></button>
            </div>
        </div>
    `;
    container.innerHTML = html;

    const playBtn = container.querySelector('#play-btn');
    const answersContainer = container.querySelector('#answers-container');
    const statusMessage = container.querySelector('#status-message');
    const slotsContainer = container.querySelector('#progression-slots');
    const checkBtn = container.querySelector('#check-btn');
    const nextBtn = container.querySelector('#next-btn');

    // Setup Fretboard
    initFretboard('fretboard-container');
    const fretboardWrapper = document.getElementById('fretboard-wrapper');

    let slots = [];
    let userAnswers = [];
    let currentSlotFocus = 0;
    const degreeToSolfege = { 1: '도', 2: '레', 3: '미', 4: '파', 5: '솔', 6: '라', 7: '시' };

    playBtn.addEventListener('click', () => {
        stopAll();
        if (currentProgression.length === 0) {
            generateRound();
        } else {
            playAndHighlight();
        }
    });

    checkBtn.addEventListener('click', checkAnswer);
    nextBtn.addEventListener('click', () => {
        stopAll();
        generateRound();
    });

    function resetRound() {
        currentProgression = [];
        currentMelody = [];
        userAnswers = [];
        currentSlotFocus = 0;
        isAnswerRevealed = false;
        slotsContainer.innerHTML = '';
        slots = [];
        answersContainer.classList.add('hidden');
        checkBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        statusMessage.textContent = 'Press Play to start';
        statusMessage.className = '';
        clearFretboard();
    }

    function generateRound() {
        resetRound();
        const scaleNotes = getScale(currentKey);
        const pool = MAJOR_DIATONIC_CHORDS; // Use all diatonic chords

        const sequenceLength = Math.floor(Math.random() * 5) + 4; // 4 to 8
        userAnswers = Array(sequenceLength).fill(null);

        for (let i = 0; i < sequenceLength; i++) {
            const slot = document.createElement('div');
            slot.className = 'progression-slot';
            slot.dataset.idx = i;
            slot.textContent = '?';
            slot.addEventListener('click', () => {
                currentSlotFocus = i;
                updateSlotFocus();
            });
            slotsContainer.appendChild(slot);
            slots.push(slot);
        }

        let previousChordDef = null;

        // 1. Generate chords
        currentProgression = Array.from({length: sequenceLength}).map((_, i) => {
            let chordDef;
            if (i === 0) {
                // Always start with I chord
                chordDef = pool.find(c => c.degree === 1);
            } else {
                do {
                    chordDef = pickRandom(pool);
                } while (previousChordDef && chordDef.degree === previousChordDef.degree && pool.length > 1);
            }
            previousChordDef = chordDef;

            const rootNoteWithoutOctave = scaleNotes[chordDef.degree - 1].slice(0, -1);
            const notes = getChordNotes(rootNoteWithoutOctave, chordDef.type, 4);
            const typeName = chordDef.type === 'Major' ? 'maj' : chordDef.type === 'Minor' ? 'min' : 'dim';
            
            return {
                label: `${chordDef.degree} ${typeName}`,
                notes: notes
            };
        });

        // 2. Generate melody from those chords
        // For each chord, pick 4 random notes (arpeggiated melody)
        currentMelody = [];
        currentProgression.forEach(chord => {
            for(let i=0; i<4; i++) {
                currentMelody.push(pickRandom(chord.notes));
            }
        });

        playAndHighlight();

        renderOptions(pool);
        answersContainer.classList.remove('hidden');
        checkBtn.classList.remove('hidden');
        statusMessage.textContent = 'Select the underlying chords for each slot.';
        
        updateSlotFocus();
    }

    function playAndHighlight() {
        const bpm = 160;
        playMelody(currentMelody, bpm);
        
        const beatDuration = 60 / bpm;
        const msPerChord = beatDuration * 4 * 1000;

        if (window.highlightTimeouts) {
            window.highlightTimeouts.forEach(clearTimeout);
        }
        window.highlightTimeouts = [];

        slots.forEach((slot, idx) => {
            const t = setTimeout(() => {
                // Highlight active playing chord
                slots.forEach(s => s.style.transform = 'scale(1)');
                slot.style.transform = 'scale(1.15)';
                slot.style.transition = 'transform 0.1s';
                
                if (idx === slots.length - 1) {
                    // Revert last slot after it finishes
                    const t2 = setTimeout(() => {
                        slot.style.transform = 'scale(1)';
                    }, msPerChord);
                    window.highlightTimeouts.push(t2);
                }
            }, idx * msPerChord);
            window.highlightTimeouts.push(t);
        });
        
        // Re-apply focus styles safely
        const t3 = setTimeout(() => {
            updateSlotFocus();
        }, slots.length * msPerChord);
        window.highlightTimeouts.push(t3);
    }

    function updateSlotFocus() {
        slots.forEach((slot, idx) => {
            if (idx === currentSlotFocus) {
                slot.style.borderColor = 'var(--primary)';
                slot.style.boxShadow = '0 0 10px var(--primary-glow)';
            } else {
                slot.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                slot.style.boxShadow = 'none';
            }
        });

        // Update fretboard if answer is revealed
        if (isAnswerRevealed) {
            const allNotes = [...new Set(currentProgression.flatMap(c => c.notes))];
            const labelsMap = getDegreeLabelMap(currentKey);
            highlightNotesOnFretboard(allNotes, labelsMap);
        }
    }

    function renderOptions(pool) {
        answersContainer.innerHTML = '';
        pool.forEach(chordDef => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '0.25rem';
            
            const scaleNotes = getScale(currentKey);
            const rootNoteWithoutOctave = scaleNotes[chordDef.degree - 1].slice(0, -1);
            const playNotes = getChordNotes(rootNoteWithoutOctave, chordDef.type, 4);

            const previewBtn = document.createElement('button');
            previewBtn.className = 'preview-btn';
            previewBtn.innerHTML = '<i data-lucide="volume-2" style="width:20px;height:20px;"></i>';
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopAll();
                playChord(playNotes, '2n');
            });

            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            const typeName = chordDef.type === 'Major' ? 'maj' : chordDef.type === 'Minor' ? 'min' : 'dim';
            const label = `${chordDef.degree} ${typeName}`;
            btn.textContent = label;
            btn.addEventListener('click', () => {
                userAnswers[currentSlotFocus] = label;
                slots[currentSlotFocus].innerHTML = label;
                // Move to next empty slot
                const nextEmpty = userAnswers.findIndex(a => a === null);
                if (nextEmpty !== -1) {
                    currentSlotFocus = nextEmpty;
                    updateSlotFocus();
                }
            });
            wrapper.appendChild(previewBtn);
            wrapper.appendChild(btn);
            answersContainer.appendChild(wrapper);
        });
        lucide.createIcons({ root: answersContainer });
    }

    function checkAnswer() {
        if (userAnswers.includes(null)) {
            statusMessage.textContent = `Please fill all ${userAnswers.length} slots before checking.`;
            statusMessage.className = 'status-wrong';
            return;
        }

        let isCorrect = true;
        userAnswers.forEach((ans, idx) => {
            const correctAns = currentProgression[idx].label;
            if (ans === correctAns) {
                slots[idx].style.borderColor = 'var(--success)';
                slots[idx].style.color = 'var(--success)';
            } else {
                slots[idx].style.borderColor = 'var(--danger)';
                slots[idx].style.color = 'var(--danger)';
                slots[idx].innerHTML = `<span style="text-decoration:line-through;font-size:0.8em;">${ans}</span><br><span style="color:var(--success);font-size:0.9em;">${correctAns}</span>`;
                isCorrect = false;
            }
        });

        checkBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
        isAnswerRevealed = true;
        
        const allNotes = [...new Set(currentProgression.flatMap(c => c.notes))];
        const labelsMap = getDegreeLabelMap(currentKey);
        highlightNotesOnFretboard(allNotes, labelsMap);

        if (isCorrect) {
            statusMessage.textContent = 'Perfect! You reverse-engineered the progression.';
            statusMessage.className = 'status-correct';
        } else {
            statusMessage.textContent = 'Not quite. The correct chords are shown below your answers.';
            statusMessage.className = 'status-wrong';
        }
    }
}
