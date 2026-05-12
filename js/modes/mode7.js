// js/modes/mode7.js
import { initFretboard, onFretClick, clearFretboard, highlightRoot } from '../fretboard.js';
import { identifyChord, pickRandom, getNoteName } from '../musicTheory.js';
import { playChord, stopAll } from '../audioEngine.js';

export function mode7_render(container, currentKey) {
    container.innerHTML = `
        <div class="mode-container builder-mode">
            <!-- Professional Dashboard -->
            <div class="builder-dashboard glass">
                <div class="dashboard-main">
                    <div class="chord-info-pill">
                        <div id="identified-chord-name" class="chord-name-compact">No Notes Selected</div>
                        <div id="identified-chord-details" class="chord-details-compact">Select frets...</div>
                    </div>
                    <div class="dashboard-visualizer">
                        <canvas id="lissajous-canvas" width="80" height="80"></canvas>
                    </div>
                </div>
            </div>

            <!-- Sleek Action Bar (Floating above Fretboard) -->
            <div class="action-pill-bar">
                <button id="add-chord-btn" class="pill-btn primary ripple" disabled>
                    <i data-lucide="plus"></i> <span>Add to Progression</span>
                </button>
                <button id="clear-selection-btn" class="pill-btn outline ripple" title="Clear Selection">
                    <i data-lucide="rotate-ccw"></i>
                </button>
                <div class="pill-divider"></div>
                <button id="play-all-btn" class="pill-btn secondary ripple" disabled>
                    <i data-lucide="play"></i> <span>Play</span>
                </button>
                <button id="loop-toggle-btn" class="pill-btn outline ripple" title="Toggle Loop">
                    <i data-lucide="repeat"></i>
                </button>
            </div>

            <div id="fretboard-container-mode7" class="builder-fretboard-large glass"></div>

            <!-- Compact Quick Selector Grid -->
            <div class="quick-selector-grid card glass">
                <div class="selector-section">
                    <div class="section-label">Diatonic (<span id="current-key-display"></span>)</div>
                    <div id="diatonic-btns" class="compact-grid"></div>
                </div>
                <div class="selector-section">
                    <div class="section-label">Root & Type</div>
                    <div class="combo-grid">
                        <div id="root-btns" class="compact-grid"></div>
                        <div id="type-btns" class="compact-grid type-scroll"></div>
                    </div>
                </div>
                <button id="add-selected-chord-btn" class="btn-ghost-small ripple">
                    <i data-lucide="plus-circle"></i> Add Selected
                </button>
            </div>

            <div class="progression-timeline-compact card glass">
                <div class="timeline-header-slim">
                    <h3 class="timeline-title">Timeline</h3>
                    <div id="progression-stats" class="timeline-stats">0 Chords</div>
                </div>
                <div id="progression-list" class="progression-horizontal-scroll">
                    <div class="empty-msg">Add chords to build sequence</div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons({ root: container });

    const chordNameDisplay = container.querySelector('#identified-chord-name');
    const chordDetailsDisplay = container.querySelector('#identified-chord-details');
    const addChordBtn = container.querySelector('#add-chord-btn');
    const clearBtn = container.querySelector('#clear-selection-btn');
    const playAllBtn = container.querySelector('#play-all-btn');
    const loopBtn = container.querySelector('#loop-toggle-btn');
    const progressionList = container.querySelector('#progression-list');
    const statsDisplay = container.querySelector('#progression-stats');
    const canvas = container.querySelector('#lissajous-canvas');
    const ctx = canvas.getContext('2d');

    let selectedMidis = new Set();
    let selectedCells = []; 
    let playbackMidis = null; 
    let playbackChord = null; 
    let isGuidanceActive = false; // New: track if quick selector guidance is on
    let progression = [];
    let isPlaying = false;
    let isLooping = false; // New: track loop state
    let animationId;

    initFretboard('fretboard-container-mode7');

    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const types = [
        'Major', 'Minor', 'Sus4', 'Sus2', 'Augmented', 'Diminished',
        'Dom7', 'Maj7', 'Min7', 'Dim7', 'm7b5',
        '6', 'm6', 'add9', '9', 'Maj9', 'Min9'
    ];

    let currentQuickRoot = 'C';
    let currentQuickType = 'Major';

    const rootContainer = container.querySelector('#root-btns');
    const typeContainer = container.querySelector('#type-btns');
    const diatonicContainer = container.querySelector('#diatonic-btns');
    const keyDisplay = container.querySelector('#current-key-display');
    const addSelectedBtn = container.querySelector('#add-selected-chord-btn');

    keyDisplay.textContent = `${currentKey} Major`;

    // Render Diatonic Buttons
    import('../musicTheory.js').then(mt => {
        const diatonicInfo = mt.MAJOR_DIATONIC_CHORDS;
        const scaleNotes = mt.getScale(currentKey);

        diatonicInfo.forEach((info, idx) => {
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const btn = document.createElement('button');
            btn.className = 'mini-btn degree-btn';
            btn.innerHTML = `<span class="degree-roman">${['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][idx]}</span><br>${rootName}${info.suffix}`;
            btn.onclick = () => {
                currentQuickRoot = rootName;
                currentQuickType = info.type;
                
                // Update other buttons
                container.querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Find matching root and type buttons to sync UI
                container.querySelectorAll('#root-btns .mini-btn').forEach(b => {
                    if (b.textContent === rootName) b.classList.add('active');
                });
                const targetTypeText = info.type.replace('Major', 'Maj').replace('Minor', 'Min');
                container.querySelectorAll('#type-btns .mini-btn').forEach(b => {
                    if (b.textContent === targetTypeText) b.classList.add('active');
                });

                highlightQuickChord();
            };
            diatonicContainer.appendChild(btn);
        });
    });

    // Render Quick Select Buttons
    roots.forEach(r => {
        const btn = document.createElement('button');
        btn.className = `mini-btn ${r === currentQuickRoot ? 'active' : ''}`;
        btn.textContent = r;
        btn.onclick = () => {
            currentQuickRoot = r;
            container.querySelectorAll('#root-btns .mini-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            highlightQuickChord();
        };
        rootContainer.appendChild(btn);
    });

    types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `mini-btn ${t === currentQuickType ? 'active' : ''}`;
        btn.textContent = t.replace('Major', 'Maj').replace('Minor', 'Min');
        btn.onclick = () => {
            currentQuickType = t;
            container.querySelectorAll('#type-btns .mini-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            highlightQuickChord();
        };
        typeContainer.appendChild(btn);
    });

    const highlightQuickChord = () => {
        if (isPlaying) return;
        selectedMidis.clear();
        selectedCells = [];
        isGuidanceActive = true;
        
        // Reset fret states
        document.querySelectorAll('.fret').forEach(f => {
            f.classList.remove('midi-user', 'selected', 'candidate', 'dimmed');
            const m = f.querySelector('.note-marker');
            if (m) m.classList.add('hidden');
        });

        // Get chord notes from musicTheory
        import('../musicTheory.js').then(mt => {
            const chordNotes = mt.getChordNotes(currentQuickRoot, currentQuickType);
            const noteNames = chordNotes.map(n => n.match(/^[A-Ga-g][b#]?/)[0]);
            
            document.querySelectorAll('.fret').forEach(fret => {
                const noteName = fret.dataset.note;
                if (noteNames.includes(noteName)) {
                    fret.classList.add('candidate');
                    const marker = fret.querySelector('.note-marker');
                    if (marker) marker.classList.remove('hidden');
                }
            });
            updateAnalysis();
            // Preview sound
            const previewMidis = Array.from(new Set(document.querySelectorAll('.fret.candidate')).values())
                .slice(0, 4) // Play a few representative notes
                .map(f => parseInt(f.dataset.midi));
            playChord(previewMidis);
        });
    };

    addSelectedBtn.onclick = () => {
        addChordBtn.click();
    };

    const updateAnalysis = () => {
        const midis = Array.from(selectedMidis);
        const activeChord = playbackChord || (midis.length > 0 ? identifyChord(midis) : null);

        if (!activeChord && midis.length === 0) {
            chordNameDisplay.textContent = 'No Notes Selected';
            chordDetailsDisplay.textContent = 'Select at least 2-3 notes';
            chordNameDisplay.classList.remove('playback-active');
            addChordBtn.disabled = true;
        } else if (activeChord) {
            chordNameDisplay.textContent = activeChord.name || 'Cluster';
            chordDetailsDisplay.textContent = activeChord.details || `Type: ${activeChord.type} | Root: ${activeChord.root}`;
            if (playbackChord) chordNameDisplay.classList.add('playback-active');
            else chordNameDisplay.classList.remove('playback-active');
            addChordBtn.disabled = midis.length === 0;
        }
    };

    onFretClick(({ midi, element }) => {
        if (isPlaying) return;

        const stringIdx = element.closest('.string').classList[1].split('-')[1];
        const fretIdx = element.dataset.fret;
        const cellId = `s${stringIdx}f${fretIdx}`;
        const marker = element.querySelector('.note-marker');

        if (isGuidanceActive) {
            // Guided selection mode
            if (element.classList.contains('candidate') || element.classList.contains('selected')) {
                const isAlreadySelected = element.classList.contains('selected');
                
                if (isAlreadySelected) {
                    element.classList.remove('selected');
                    element.classList.add('candidate');
                    selectedMidis.delete(midi);
                    selectedCells = selectedCells.filter(c => c.id !== cellId);
                } else {
                    element.classList.remove('candidate', 'dimmed');
                    element.classList.add('selected');
                    selectedMidis.add(midi);
                    selectedCells.push({ id: cellId, midi, string: stringIdx, fret: fretIdx });
                    playChord([midi]);
                }

                // Update dimmed state for other candidates
                const hasAnySelected = container.querySelectorAll('.fret.selected').length > 0;
                container.querySelectorAll('.fret.candidate').forEach(f => {
                    if (hasAnySelected) f.classList.add('dimmed');
                    else f.classList.remove('dimmed');
                });
                
                updateAnalysis();
                return;
            }
        }

        // Normal mode or non-candidate click
        const existingIdx = selectedCells.findIndex(c => c.id === cellId);
        if (existingIdx !== -1) {
            selectedCells.splice(existingIdx, 1);
            selectedMidis.delete(midi);
            marker.classList.add('hidden');
            element.classList.remove('midi-user');
            element.classList.remove('selected');
        } else {
            selectedCells.push({ id: cellId, midi, string: stringIdx, fret: fretIdx });
            selectedMidis.add(midi);
            marker.classList.remove('hidden');
            marker.classList.add('active', 'midi-user');
            element.classList.add('midi-user', 'selected');
            playChord([midi]);
            isGuidanceActive = false; // Disable guidance if user starts manual picking
        }
        updateAnalysis();
    });

    clearBtn.addEventListener('click', () => {
        selectedMidis.clear();
        selectedCells = [];
        isGuidanceActive = false;
        document.querySelectorAll('.fret').forEach(f => {
            f.classList.remove('midi-user', 'candidate', 'selected', 'dimmed');
            const m = f.querySelector('.note-marker');
            if (m) m.classList.add('hidden');
        });
        updateAnalysis();
    });

    addChordBtn.addEventListener('click', () => {
        if (selectedCells.length === 0) return;
        const midis = Array.from(selectedMidis);
        const result = identifyChord(midis);
        const chordObj = {
            id: Date.now(),
            name: result.name || 'Cluster',
            midis: [...midis],
            cells: [...selectedCells], // Save exact positions
            details: result.type ? `Type: ${result.type} | Root: ${result.root}` : 'Unknown combination'
        };
        
        progression.push(chordObj);
        renderProgression();
        clearBtn.click();
    });

    const renderProgression = () => {
        if (progression.length === 0) {
            progressionList.innerHTML = `
                <div class="empty-timeline-message">
                    <i data-lucide="info"></i>
                    Add chords to see them here
                </div>
            `;
            playAllBtn.disabled = true;
            statsDisplay.textContent = '0 Chords';
            lucide.createIcons({ root: progressionList });
            return;
        }

        playAllBtn.disabled = false;
        statsDisplay.textContent = `${progression.length} Chords`;
        progressionList.innerHTML = '';
        
        progression.forEach((chord, index) => {
            const card = document.createElement('div');
            card.className = 'chord-card glass';
            card.innerHTML = `
                <div class="card-index">${index + 1}</div>
                <div class="card-name">${chord.name}</div>
                <div class="card-details">${chord.details}</div>
                <div class="card-actions">
                    <button class="play-card-btn" title="Play">
                        <i data-lucide="play" size="16"></i>
                    </button>
                    <button class="delete-card-btn" title="Delete">
                        <i data-lucide="x" size="16"></i>
                    </button>
                </div>
            `;
            
            card.querySelector('.play-card-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (isPlaying) return;
                
                // Temporary playback state for individual play
                playbackMidis = chord.midis;
                playbackChord = { name: chord.name, details: chord.details };
                updateAnalysis();
                
                // Highlight specific frets
                chord.cells.forEach(cell => {
                    const el = document.querySelector(`.string-${cell.string} .fret[data-fret="${cell.fret}"]`);
                    if (el) el.classList.add('playback-highlight');
                });

                playChord(chord.midis);
                card.classList.add('playing');
                
                setTimeout(() => {
                    card.classList.remove('playing');
                    chord.cells.forEach(cell => {
                        const el = document.querySelector(`.string-${cell.string} .fret[data-fret="${cell.fret}"]`);
                        if (el) el.classList.remove('playback-highlight');
                    });
                    playbackMidis = null;
                    playbackChord = null;
                    updateAnalysis();
                }, 1500);
            });

            card.querySelector('.delete-card-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                progression = progression.filter(c => c.id !== chord.id);
                renderProgression();
            });

            progressionList.appendChild(card);
        });

        lucide.createIcons({ root: progressionList });
    };

    const drawLissajous = () => {
        if (!container.isConnected) {
            cancelAnimationFrame(animationId);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Prioritize playbackMidis if currently playing a progression
        const activeMidis = playbackMidis || Array.from(selectedMidis);
        const midis = [...activeMidis].sort((a, b) => a - b);
        
        const time = Date.now() / 1000;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width * 0.38;

        if (midis.length >= 2) {
            // Calculate ratio between the lowest and highest selected notes
            const f1 = 440 * Math.pow(2, (midis[0] - 69) / 12);
            const f2 = 440 * Math.pow(2, (midis[midis.length-1] - 69) / 12);
            const ratio = f1 / f2;

            ctx.beginPath();
            ctx.strokeStyle = '#a78bfa'; // Brighter purple
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#8b5cf6';

            // Draw a longer, smoother path
            for (let t = 0; t < Math.PI * 4; t += 0.02) {
                const x = centerX + radius * Math.sin(t + time * 2);
                const y = centerY + radius * Math.sin(t / ratio + time * 1.5);
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else if (midis.length === 1) {
            // Pulse circle for single note
            const radiusPulse = radius * 0.8 + Math.sin(time * 8) * 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radiusPulse, 0, Math.PI * 2);
            ctx.strokeStyle = '#34d399'; // Brighter emerald
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#10b981';
            ctx.stroke();
        } else {
            // Idle state: Subtle rotating dashed circle
            ctx.beginPath();
            ctx.setLineDash([5, 10]);
            ctx.arc(centerX, centerY, radius * 0.7, time, time + Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        animationId = requestAnimationFrame(drawLissajous);
    };

    drawLissajous();

    loopBtn.addEventListener('click', () => {
        isLooping = !isLooping;
        loopBtn.classList.toggle('active', isLooping);
        if (isLooping) {
            loopBtn.style.color = 'var(--secondary-glow)';
            loopBtn.style.borderColor = 'var(--secondary-glow)';
        } else {
            loopBtn.style.color = '';
            loopBtn.style.borderColor = '';
        }
    });

    playAllBtn.addEventListener('click', async () => {
        if (isPlaying) {
            // Stop playback
            isPlaying = false;
            return;
        }
        
        if (progression.length === 0) return;
        
        isPlaying = true;
        playAllBtn.innerHTML = '<i data-lucide="square"></i> Stop';
        lucide.createIcons({ root: playAllBtn });

        const runPlayback = async () => {
            for (let i = 0; i < progression.length; i++) {
                if (!isPlaying) break;

                const chord = progression[i];
                const card = progressionList.children[i];
                
                playbackMidis = chord.midis;
                playbackChord = { name: chord.name, details: chord.details };
                updateAnalysis();

                if (card) card.classList.add('active-play');
                
                chord.cells.forEach(cell => {
                    const el = document.querySelector(`.string-${cell.string} .fret[data-fret="${cell.fret}"]`);
                    if (el) el.classList.add('playback-highlight');
                });

                playChord(chord.midis);
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                if (card) card.classList.remove('active-play');
                chord.cells.forEach(cell => {
                    const el = document.querySelector(`.string-${cell.string} .fret[data-fret="${cell.fret}"]`);
                    if (el) el.classList.remove('playback-highlight');
                });
            }
        };

        do {
            await runPlayback();
        } while (isLooping && isPlaying);
        
        isPlaying = false;
        playbackMidis = null;
        playbackChord = null;
        updateAnalysis();
        playAllBtn.innerHTML = '<i data-lucide="play-circle"></i> Play';
        lucide.createIcons({ root: playAllBtn });
    });
}
