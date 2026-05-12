// js/modes/mode3.js
import { playMelody, playChord, stopAll, playNote } from '../audioEngine.js';
import { getScale, getChordNotes, MAJOR_DIATONIC_CHORDS, pickRandom, getDegreeLabelMap } from '../musicTheory.js';
import { initFretboard, highlightNotesOnFretboard, clearFretboard } from '../fretboard.js';

export function mode3_render(container, currentKey) {
    let currentMelodyDegrees = [];
    let isAnswerRevealed = false;

    const html = `
        <div class="glass-panel">
            <div style="text-align: center; margin-bottom: 2rem;">
                <p>Listen to the context chord, then identify the 4-note melody using scale degrees.</p>
            </div>

            <div style="display: flex; justify-content: center; gap: 1rem;">
                <button class="play-action-btn" id="play-btn" style="margin: 0;">
                    <i data-lucide="play"></i>
                </button>
            </div>

            <div id="status-message" style="margin-top: 1rem;">Press Play to start</div>
            
            <div class="progression-container" id="melody-slots">
                <!-- Slots injected dynamically -->
            </div>

            <div class="answers-grid hidden" id="answers-container">
                <!-- Degree options injected here -->
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
    const slotsContainer = container.querySelector('#slots-container');
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
        if (currentMelodyDegrees.length === 0) {
            generateRound();
        } else {
            replayMelody();
        }
    });

    checkBtn.addEventListener('click', checkAnswer);
    nextBtn.addEventListener('click', () => {
        stopAll();
        generateRound();
    });

    function resetRound() {
        currentMelodyDegrees = [];
        userAnswers = [];
        currentSlotFocus = 0;
        isAnswerRevealed = false;
        const slotsContainer = container.querySelector('#melody-slots');
        slotsContainer.innerHTML = '';
        slots = [];
        answersContainer.classList.add('hidden');
        checkBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        statusMessage.textContent = 'Press Play to hear the melody';
        statusMessage.className = '';
        clearFretboard();
    }

    function generateRound() {
        resetRound();
        const sequenceLength = Math.floor(Math.random() * 5) + 4; // 4 to 8
        userAnswers = Array(sequenceLength).fill(null);

        // Generate DOM slots dynamically
        const slotsContainer = container.querySelector('#melody-slots');
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

        let previousDegree = null;

        currentMelodyDegrees = Array.from({length: sequenceLength}).map((_, i) => {
            let degree;
            if (i === 0) {
                // Ensure it starts on a stable note (1, 3, or 5)
                degree = pickRandom([1, 3, 5]);
            } else {
                do {
                    degree = Math.floor(Math.random() * 7) + 1;
                } while (degree === previousDegree);
            }
            previousDegree = degree;
            return degree;
        });

        replayMelody();

        renderOptions();
        answersContainer.classList.remove('hidden');
        checkBtn.classList.remove('hidden');
        statusMessage.textContent = 'Select the relative degrees for each slot.';
        
        updateSlotFocus();
    }

    function replayMelody() {
        const scaleNotes = getScale(currentKey);
        const melodyNotes = currentMelodyDegrees.map(deg => scaleNotes[deg - 1]);
        playMelody(melodyNotes, 100);
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
            const scaleNotes = getScale(currentKey);
            const allTargetNotes = [...new Set(currentMelodyDegrees.map(deg => scaleNotes[deg - 1]))];
            const labelsMap = getDegreeLabelMap(currentKey);
            highlightNotesOnFretboard(allTargetNotes, labelsMap);
        }
    }

    function renderOptions() {
        answersContainer.innerHTML = '';
        const scaleNotes = getScale(currentKey);
        
        for (let i = 1; i <= 7; i++) {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '0.25rem';
            
            const previewBtn = document.createElement('button');
            previewBtn.className = 'preview-btn';
            previewBtn.innerHTML = '<i data-lucide="volume-2" style="width:20px;height:20px;"></i>';
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopAll();
                playNote(scaleNotes[i - 1], '2n');
            });
            
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = i.toString();
            btn.addEventListener('click', () => {
                userAnswers[currentSlotFocus] = i;
                slots[currentSlotFocus].innerHTML = i.toString();
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
        }
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
            const correctAns = currentMelodyDegrees[idx];
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
        
        const scaleNotes = getScale(currentKey);
        const allTargetNotes = [...new Set(currentMelodyDegrees.map(deg => scaleNotes[deg - 1]))];
        const labelsMap = getDegreeLabelMap(currentKey);
        highlightNotesOnFretboard(allTargetNotes, labelsMap);

        if (isCorrect) {
            statusMessage.textContent = 'Perfect! Excellent relative pitch.';
            statusMessage.className = 'status-correct';
        } else {
            statusMessage.textContent = 'Not quite. The correct degrees are shown below your answers.';
            statusMessage.className = 'status-wrong';
        }
    }
}
