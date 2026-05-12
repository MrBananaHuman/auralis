// js/modes/mode2.js
import { playProgression, playChord, stopAll } from '../audioEngine.js';
import { getScale, getChordNotes, MAJOR_DIATONIC_CHORDS, ADVANCED_CHORDS_POOL, pickRandom, getDegreeLabelMap } from '../musicTheory.js';
import { initFretboard, highlightNotesOnFretboard, clearFretboard } from '../fretboard.js';

export function mode2_render(container, currentKey) {
    let difficulty = 'major_minor'; // root, major, major_minor, various
    let currentProgression = [];

    const html = `
        <div class="glass-panel">
            <div class="controls-grid" id="diff-controls">
                <div class="control-card" data-diff="major">
                    <i data-lucide="sun"></i>
                    <span>Major Only</span>
                </div>
                <div class="control-card" data-diff="major_minor">
                    <i data-lucide="cloud-sun"></i>
                    <span>Major & Minor</span>
                </div>
                <div class="control-card" data-diff="various">
                    <i data-lucide="sparkles"></i>
                    <span>Advanced Chords</span>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem;">
                <button class="play-action-btn" id="play-btn" style="margin: 0;">
                    <i data-lucide="play"></i>
                </button>
            </div>

            <div id="status-message" style="margin-top: 1rem;">Press Play to start</div>
            
            <div class="progression-container" id="slots-container">
                <!-- Slots injected here dynamically -->
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

    const diffCards = container.querySelectorAll('.control-card');
    const playBtn = container.querySelector('#play-btn');
    const answersContainer = container.querySelector('#answers-container');
    const statusMessage = container.querySelector('#status-message');
    const slotsContainer = container.querySelector('#slots-container');
    const checkBtn = container.querySelector('#check-btn');
    const nextBtn = container.querySelector('#next-btn');

    let slots = [];
    let userAnswers = [];
    let currentSlotFocus = 0;
    let isAnswerRevealed = false;
    
    // Setup Fretboard
    initFretboard('fretboard-container');
    const fretboardWrapper = document.getElementById('fretboard-wrapper');

    diffCards.forEach(card => {
        card.addEventListener('click', (e) => {
            diffCards.forEach(c => c.classList.remove('selected'));
            const target = e.currentTarget;
            target.classList.add('selected');
            difficulty = target.dataset.diff;
            stopAll();
            resetRound();
        });
    });

    playBtn.addEventListener('click', () => {
        stopAll();
        if (currentProgression.length === 0) {
            generateRound();
        } else {
            // Replay
            const chordNotesArray = currentProgression.map(c => c.notes);
            playProgression(chordNotesArray, 80);
        }
    });

    checkBtn.addEventListener('click', checkAnswer);
    
    nextBtn.addEventListener('click', () => {
        stopAll();
        generateRound();
    });

    function resetRound() {
        currentProgression = [];
        userAnswers = [];
        currentSlotFocus = 0;
        slotsContainer.innerHTML = '';
        slots = [];
        answersContainer.classList.add('hidden');
        checkBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        statusMessage.textContent = 'Press Play to start';
        statusMessage.className = '';
        isAnswerRevealed = false;
        clearFretboard();
    }

    function generateRound() {
        resetRound();
        const scaleNotes = getScale(currentKey);
        
        let pool = [];
        let displayPool = [];
        if (difficulty === 'major') {
            pool = MAJOR_DIATONIC_CHORDS.filter(c => c.type === 'Major');
            displayPool = MAJOR_DIATONIC_CHORDS;
        } else if (difficulty === 'major_minor') {
            pool = MAJOR_DIATONIC_CHORDS.filter(c => c.type === 'Major' || c.type === 'Minor');
            displayPool = MAJOR_DIATONIC_CHORDS;
        } else {
            pool = ADVANCED_CHORDS_POOL; // Uses all extended chords
            displayPool = ADVANCED_CHORDS_POOL;
        }

        const sequenceLength = Math.floor(Math.random() * 5) + 4; // 4 to 8
        userAnswers = Array(sequenceLength).fill(null);

        // Generate DOM slots dynamically
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

        // Generate sequenceLength chords
        currentProgression = Array.from({length: sequenceLength}).map((_, i) => {
            let chordDef;
            if (i === 0) {
                // Always start with the I chord for musical context
                chordDef = pool.find(c => c.degree === 1);
            } else {
                do {
                    chordDef = pickRandom(pool);
                } while (previousChordDef && chordDef.degree === previousChordDef.degree && pool.length > 1);
            }
            previousChordDef = chordDef;

            const rootNoteWithoutOctave = scaleNotes[chordDef.degree - 1].slice(0, -1);
            let notes = getChordNotes(rootNoteWithoutOctave, chordDef.type, 4);
            // add bass note
            notes.push(`${rootNoteWithoutOctave}3`);
            
            return {
                degree: chordDef.degree,
                type: chordDef.type,
                label: `${chordDef.degree} ${chordDef.suffix}`,
                notes: notes
            };
        });

        const chordNotesArray = currentProgression.map(c => c.notes);
        playProgression(chordNotesArray, 80);

        renderOptions(displayPool);
        answersContainer.classList.remove('hidden');
        checkBtn.classList.remove('hidden');
        statusMessage.textContent = 'Select the chords for each slot.';
        
        updateSlotFocus();
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
        const scaleNotes = getScale(currentKey);

        pool.forEach(chordDef => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '0.25rem';

            const rootNoteWithoutOctave = scaleNotes[chordDef.degree - 1].slice(0, -1);
            let playNotes = getChordNotes(rootNoteWithoutOctave, chordDef.type, 4);
            playNotes.push(`${rootNoteWithoutOctave}3`);

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
            const label = `${chordDef.degree} ${chordDef.suffix}`;
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
            statusMessage.textContent = 'Perfect! You nailed the progression.';
            statusMessage.className = 'status-correct';
        } else {
            statusMessage.textContent = 'Not quite. The correct progression is shown below your answers.';
            statusMessage.className = 'status-wrong';
        }
    }
}
