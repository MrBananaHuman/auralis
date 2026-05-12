// js/modes/mode1.js
import { playNote, playChord, stopAll } from '../audioEngine.js';
import { getScale, getChordNotes, MAJOR_DIATONIC_CHORDS, ADVANCED_CHORDS_POOL, pickRandom, getDegreeLabelMap } from '../musicTheory.js';
import { initFretboard, highlightNotesOnFretboard, clearFretboard } from '../fretboard.js';

export function mode1_render(container, currentKey) {
    let difficulty = 'single'; // 'single' or 'chord'
    let currentAnswer = null;
    let currentAnswerNotes = [];
    let isAnswerRevealed = false;
    let userAnswer = null;
    let currentOptions = [];

    const html = `
        <div class="glass-panel">
            <div class="controls-grid">
                <div class="control-card ${difficulty === 'single' ? 'selected' : ''}" data-diff="single">
                    <i data-lucide="music"></i>
                    <span>Single Note</span>
                </div>
                <div class="control-card ${difficulty === 'chord' ? 'selected' : ''}" data-diff="chord">
                    <i data-lucide="layers"></i>
                    <span>Chords (Diatonic)</span>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem;">
                <button class="play-action-btn" id="play-btn" style="margin: 0;">
                    <i data-lucide="play"></i>
                </button>
            </div>

            <div id="status-message" style="margin-top: 1rem;">Press Play to start</div>
            
            <div class="answers-grid" id="answers-container">
                <!-- Answer buttons injected here -->
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
    const checkBtn = container.querySelector('#check-btn');
    const nextBtn = container.querySelector('#next-btn');

    // Setup Fretboard
    initFretboard('fretboard-container');

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
        if (!currentAnswer) {
            generateRound();
        } else {
            replay();
        }
    });

    checkBtn.addEventListener('click', () => {
        checkAnswer();
    });

    nextBtn.addEventListener('click', () => {
        stopAll();
        generateRound();
    });

    function resetRound() {
        currentAnswer = null;
        currentAnswerNotes = [];
        userAnswer = null;
        isAnswerRevealed = false;
        answersContainer.innerHTML = '';
        statusMessage.textContent = 'Press Play to start';
        statusMessage.className = '';
        checkBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        clearFretboard();
    }

    function replay() {
        if (!currentAnswerNotes.length) return;
        if (difficulty === 'single') playNote(currentAnswerNotes[0], '2n');
        else playChord(currentAnswerNotes, '2n');
    }

    function generateRound() {
        stopAll();
        resetRound();
        const scaleNotes = getScale(currentKey);
        let options = [];
        const degreeToSolfege = { 1: '도', 2: '레', 3: '미', 4: '파', 5: '솔', 6: '라', 7: '시' };

        if (difficulty === 'single') {
            const degrees = [1, 2, 3, 4, 5, 6, 7];
            const randomDegree = pickRandom(degrees);
            const targetNoteStr = scaleNotes[randomDegree - 1];
            currentAnswer = targetNoteStr;
            currentAnswerNotes = [targetNoteStr];
            
            playNote(targetNoteStr, '2n');
            
            options = degrees.map(d => ({ 
                label: degreeToSolfege[d], 
                value: scaleNotes[d - 1],
                playNotes: scaleNotes[d - 1]
            }));
        } else {
            const randomChordDef = pickRandom(MAJOR_DIATONIC_CHORDS);
            const degree = randomChordDef.degree;
            const rootNoteWithoutOctave = scaleNotes[degree - 1].slice(0, -1);
            
            const chordNotes = getChordNotes(rootNoteWithoutOctave, randomChordDef.type, 4);
            currentAnswer = `${degree}`;
            currentAnswerNotes = chordNotes;
            
            playChord(chordNotes, '2n');

            options = MAJOR_DIATONIC_CHORDS.map(c => {
                const root = scaleNotes[c.degree - 1].slice(0, -1);
                const typeName = c.type === 'Major' ? 'maj' : c.type === 'Minor' ? 'min' : 'dim';
                return {
                    label: `${root} ${typeName}`,
                    value: `${c.degree}`,
                    playNotes: getChordNotes(root, c.type, 4)
                };
            });
        }
        
        currentOptions = options;
        renderAnswers(options);
        statusMessage.textContent = 'What did you hear?';
        statusMessage.className = '';
    }

    function renderAnswers(options) {
        answersContainer.innerHTML = '';
        options.forEach(opt => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '0.25rem';

            const previewBtn = document.createElement('button');
            previewBtn.className = 'preview-btn';
            previewBtn.innerHTML = '<i data-lucide="volume-2" style="width:20px;height:20px;"></i>';
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopAll();
                if (Array.isArray(opt.playNotes)) playChord(opt.playNotes, '2n');
                else playNote(opt.playNotes, '2n');
            });

            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = opt.label;
            btn.dataset.val = opt.value;
            btn.dataset.label = opt.label;
            btn.addEventListener('click', () => {
                if (isAnswerRevealed) return;
                userAnswer = opt.value;
                const allBtns = answersContainer.querySelectorAll('.answer-btn');
                allBtns.forEach(b => b.classList.remove('active-select'));
                btn.classList.add('active-select');
                checkBtn.classList.remove('hidden');
            });
            
            wrapper.appendChild(previewBtn);
            wrapper.appendChild(btn);
            answersContainer.appendChild(wrapper);
        });
        lucide.createIcons({ root: answersContainer });
    }

    function checkAnswer() {
        if (!currentAnswer || userAnswer === null) {
            statusMessage.textContent = 'Please select an answer first.';
            statusMessage.className = 'status-wrong';
            return;
        }

        const allBtns = answersContainer.querySelectorAll('.answer-btn');
        allBtns.forEach(b => b.disabled = true);
        isAnswerRevealed = true;
        
        const selectedBtn = Array.from(allBtns).find(b => b.dataset.val === userAnswer);
        const selectedLabel = selectedBtn ? selectedBtn.dataset.label : userAnswer;

        const labelsMap = getDegreeLabelMap(currentKey);
        highlightNotesOnFretboard(currentAnswerNotes, labelsMap);

        checkBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');

        if (userAnswer === currentAnswer) {
            if (selectedBtn) selectedBtn.classList.add('correct');
            statusMessage.textContent = 'Correct! Great job.';
            statusMessage.className = 'status-correct';
        } else {
            if (selectedBtn) selectedBtn.classList.add('wrong');
            const correctBtn = Array.from(allBtns).find(b => b.dataset.val === currentAnswer);
            const correctLabel = correctBtn ? correctBtn.dataset.label : currentAnswer;
            
            statusMessage.innerHTML = `Incorrect.<br>Your Answer: ❌ <b>${selectedLabel}</b><br>Correct Answer: ✅ <b>${correctLabel}</b>`;
            statusMessage.className = 'status-wrong';
            if (correctBtn) correctBtn.classList.add('correct');
        }
        
        replay();
    }
}
