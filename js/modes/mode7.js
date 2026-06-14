// js/modes/mode7.js
import { initFretboard, onFretClick, clearFretboard, highlightRoot } from '../fretboard.js';
import { identifyChord, pickRandom, getNoteName, getChordNotes, getChordFormula } from '../musicTheory.js';
import { playChord, stopAll } from '../audioEngine.js';

export function mode7_render(container, currentKey) {
    container.innerHTML = `
        <div class="mode-container builder-mode">
            <!-- Professional Dashboard -->
            <div class="builder-dashboard glass">
                <div class="dashboard-main">
                    <div class="chord-info-pill">
                        <div id="identified-chord-name" class="chord-name-compact">No Notes Selected</div>
                        <div id="identified-chord-details" class="chord-details-compact">Select frets or use Quick Select...</div>
                    </div>
                    <div class="dashboard-visualizer">
                        <canvas id="lissajous-canvas" width="80" height="80"></canvas>
                    </div>
                </div>
            </div>

            <!-- Sleek Action Bar (Floating above Fretboard) -->
            <div class="action-pill-bar">
                <button id="add-chord-btn" class="pill-btn primary ripple" style="opacity: 1; pointer-events: auto;">
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

            <!-- Timeline Controls (BPM, Rhythm, Time Signature) -->
            <div class="timeline-controls card glass" style="margin-bottom: 1rem; padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(15, 23, 42, 0.4);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <label style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">BPM</label>
                    <input type="range" id="bpm-slider" min="40" max="240" value="120" style="width: 120px; accent-color: var(--primary); cursor: pointer;">
                    <span id="bpm-val" style="font-size: 0.9rem; font-weight: 700; min-width: 30px; color: var(--text-main);">120</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <label style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Rhythm</label>
                        <select id="rhythm-select" class="custom-select" style="padding: 0.4rem 2rem 0.4rem 0.75rem; font-size: 0.85rem; width: auto; min-width: 110px;">
                            <option value="4n">Quarter (4분)</option>
                            <option value="8n">Eighth (8분)</option>
                            <option value="2n">Half (2분)</option>
                            <option value="1n">Whole (온음)</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <label style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Time Sig</label>
                        <select id="time-sig-select" class="custom-select" style="padding: 0.4rem 2rem 0.4rem 0.75rem; font-size: 0.85rem; width: auto; min-width: 80px;">
                            <option value="4/4">4/4</option>
                            <option value="3/4">3/4</option>
                        </select>
                    </div>
                </div>
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

    const bpmSlider = container.querySelector('#bpm-slider');
    const rhythmSelect = container.querySelector('#rhythm-select');
    const timeSigSelect = container.querySelector('#time-sig-select');
    const bpmVal = container.querySelector('#bpm-val');

    let selectedMidis = new Set();
    let selectedCells = []; 
    let playbackMidis = null; 
    let playbackChord = null; 
    let isGuidanceActive = false;
    let progression = [];
    let isPlaying = false;
    let isLooping = false;
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

    // BPM Slider display sync
    bpmSlider.addEventListener('input', (e) => {
        bpmVal.textContent = e.target.value;
    });

    // Helper: Calculates playback delay millisecond based on BPM, Time Signature, and Rhythm
    const getPlaybackDelayMs = () => {
        const bpm = parseInt(bpmSlider.value, 10);
        const rhythm = rhythmSelect.value;
        const timeSig = timeSigSelect.value;
        const beatsPerMeasure = timeSig === '3/4' ? 3 : 4;
        const oneBeatMs = 60000 / bpm;

        switch (rhythm) {
            case '1n': return oneBeatMs * beatsPerMeasure;
            case '2n': return oneBeatMs * 2;
            case '4n': return oneBeatMs * 1;
            case '8n': return oneBeatMs * 0.5;
            default: return oneBeatMs * 1;
        }
    };

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
                .slice(0, 4)
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
            // Updated: Display current quick select info when no manual selection is active
            const chordSuffixes = {
                'Major': '', 'Minor': 'm', 'Diminished': 'dim', 'Augmented': 'aug',
                'Sus4': 'sus4', 'Sus2': 'sus2', 'Maj7': 'maj7', 'Min7': 'm7',
                'Dom7': '7', 'Dim7': 'dim7', 'm7b5': 'm7b5', 'HalfDim7': 'm7b5'
            };
            const suffix = chordSuffixes[currentQuickType] || '';
            chordNameDisplay.textContent = `${currentQuickRoot}${suffix}`;
            chordDetailsDisplay.textContent = `Quick Selected | Type: ${currentQuickType}`;
            chordNameDisplay.classList.remove('playback-active');
            addChordBtn.disabled = false; // Always enabled for quick addition
        } else if (activeChord) {
            chordNameDisplay.textContent = activeChord.name || 'Cluster';
            chordDetailsDisplay.textContent = activeChord.details || `Type: ${activeChord.type} | Root: ${activeChord.root}`;
            if (playbackChord) chordNameDisplay.classList.add('playback-active');
            else chordNameDisplay.classList.remove('playback-active');
            addChordBtn.disabled = false;
        }
    };

    onFretClick(({ midi, element }) => {
        if (isPlaying) return;

        const stringIdx = element.closest('.string').classList[1].split('-')[1];
        const fretIdx = element.dataset.fret;
        const cellId = `s${stringIdx}f${fretIdx}`;
        const marker = element.querySelector('.note-marker');

        if (isGuidanceActive) {
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

                const hasAnySelected = container.querySelectorAll('.fret.selected').length > 0;
                container.querySelectorAll('.fret.candidate').forEach(f => {
                    if (hasAnySelected) f.classList.add('dimmed');
                    else f.classList.remove('dimmed');
                });
                
                updateAnalysis();
                return;
            }
        }

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
            isGuidanceActive = false;
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
        let midis = Array.from(selectedMidis);
        let cells = [...selectedCells];
        let chordName = '';
        let chordDetails = '';

        const chordSuffixes = {
            'Major': '', 'Minor': 'm', 'Diminished': 'dim', 'Augmented': 'aug',
            'Sus4': 'sus4', 'Sus2': 'sus2', 'Maj7': 'maj7', 'Min7': 'm7',
            'Dom7': '7', 'Dim7': 'dim7', 'm7b5': 'm7b5', 'HalfDim7': 'm7b5'
        };

        if (midis.length === 0) {
            // Auto-Voicing Generator: Auto-selects fret positions for the quick select chord tones
            const formula = getChordFormula(currentQuickType);
            const notes = getChordNotes(currentQuickRoot, currentQuickType, 4);

            // Assign strings: 4-part voicing uses strings 4,3,2,1. 3-part uses strings 3,2,1.
            const stringSet = formula.length === 4 ? [3, 2, 1, 0] : [2, 1, 0];
            const sortedStrings = [...stringSet].sort((a, b) => b - a);

            let targetDegrees = [];
            if (formula.length === 4) {
                targetDegrees = [formula[0], formula[2], formula[3], formula[1]]; // Root position Drop 2
            } else {
                targetDegrees = [formula[0], formula[1], formula[2]]; // Root position Closed
            }

            const stringNoteNames = targetDegrees.map(deg => {
                const idx = formula.indexOf(deg);
                return idx !== -1 ? notes[idx].match(/^[A-Ga-g][b#]?/)[0] : null;
            });

            // Find matching frets on the assigned strings
            sortedStrings.forEach((strIdx, i) => {
                const noteName = stringNoteNames[i];
                if (!noteName) return;

                const stringBaseMidi = [64, 59, 55, 50, 45, 40][strIdx];
                for (let fret = 0; fret <= 15; fret++) {
                    const midiNote = stringBaseMidi + fret;
                    const testNoteName = getNoteName(midiNote);
                    if (testNoteName === noteName) {
                        midis.push(midiNote);
                        cells.push({
                            id: `s${strIdx}f${fret}`,
                            midi: midiNote,
                            string: strIdx.toString(),
                            fret: fret.toString()
                        });
                        break;
                    }
                }
            });

            const suffix = chordSuffixes[currentQuickType] || '';
            chordName = `${currentQuickRoot}${suffix}`;
            chordDetails = `Type: ${currentQuickType} | Root: ${currentQuickRoot} (Auto-Voiced)`;
        } else {
            const result = identifyChord(midis);
            chordName = result.name || 'Cluster';
            chordDetails = result.type ? `Type: ${result.type} | Root: ${result.root}` : 'Unknown combination';
        }

        if (midis.length === 0) return; // Fallback safety

        const chordObj = {
            id: Date.now(),
            name: chordName,
            midis: [...midis],
            cells: [...cells],
            details: chordDetails
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
                
                playbackMidis = chord.midis;
                playbackChord = { name: chord.name, details: chord.details };
                updateAnalysis();
                
                chord.cells.forEach(cell => {
                    const el = document.querySelector(`.string-${cell.string} .fret[data-fret="${cell.fret}"]`);
                    if (el) el.classList.add('playback-highlight');
                });

                playChord(chord.midis);
                card.classList.add('playing');
                
                const delayMs = getPlaybackDelayMs();
                setTimeout(() => {
                    card.classList.remove('playing');
                    chord.cells.forEach(cell => {
                        const el = document.querySelector(`.string-${cell.string} .fret[data-fret="${cell.fret}"]`);
                        if (el) el.classList.remove('playback-highlight');
                    });
                    playbackMidis = null;
                    playbackChord = null;
                    updateAnalysis();
                }, delayMs);
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
        const activeMidis = playbackMidis || Array.from(selectedMidis);
        const midis = [...activeMidis].sort((a, b) => a - b);
        
        const time = Date.now() / 1000;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width * 0.38;

        if (midis.length >= 2) {
            const f1 = 440 * Math.pow(2, (midis[0] - 69) / 12);
            const f2 = 440 * Math.pow(2, (midis[midis.length-1] - 69) / 12);
            const ratio = f1 / f2;

            ctx.beginPath();
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#8b5cf6';

            for (let t = 0; t < Math.PI * 4; t += 0.02) {
                const x = centerX + radius * Math.sin(t + time * 2);
                const y = centerY + radius * Math.sin(t / ratio + time * 1.5);
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else if (midis.length === 1) {
            const radiusPulse = radius * 0.8 + Math.sin(time * 8) * 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radiusPulse, 0, Math.PI * 2);
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#10b981';
            ctx.stroke();
        } else {
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
                
                const delayMs = getPlaybackDelayMs();
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
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

    // Run initial display update
    setTimeout(updateAnalysis, 100);
}
