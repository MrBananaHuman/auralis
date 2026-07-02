// js/modes/mode5.js
import { stopAll, playChord } from '../audioEngine.js';
import { getChordNotes, NOTES, getChordFormula, MAJOR_DIATONIC_CHORDS, MAJOR_DIATONIC_7TH_CHORDS, getScale } from '../musicTheory.js';
import { initFretboard, clearFretboard } from '../fretboard.js';

export function mode5_render(container, currentKey = 'C') {
    let currentRoot = 'C';
    let currentType = 'Maj7';
    let currentStringSet = [0, 1, 2, 3]; // Default to 4 strings: 1, 2, 3, 4
    let showSeventh = true;

    const chordTypes = ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'HalfDim7'];
    const chordTypeTo7th = {
        'Major': 'Maj7',
        'Minor': 'Min7',
        'Diminished': 'Dim7',
        'Augmented': 'Aug7'
    };

    const html = `
        <div class="glass-panel chord-explorer">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2>Chord Explorer</h2>
                <p>Master 7th chords and their inversion shapes across the neck.</p>
            </div>

            <!-- Diatonic Quick Selector (Dynamic based on Global Key) -->
            <div class="diatonic-selector card glass" style="margin-bottom: 2rem; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); text-align: center;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;">
                    <label style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                        Diatonic Quick Select (<span id="explorer-key-display"></span>)
                    </label>
                    <div id="diatonic-mode-toggle" style="display: flex; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden; font-size: 0.75rem; font-weight: 700;">
                        <button id="toggle-triads" style="padding: 0.35rem 1rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">Triads</button>
                        <button id="toggle-7ths"   style="padding: 0.35rem 1rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">7ths</button>
                    </div>
                </div>
                <div id="explorer-diatonic-btns" class="compact-grid" style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
                    <!-- Buttons dynamically populated here -->
                </div>
            </div>

            <div class="explorer-layout">
                <div class="explorer-controls">
                    <div class="settings-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="setting-item">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">Root Note</label>
                            <div class="custom-select-wrapper">
                                <select id="root-select" class="custom-select">
                                    ${NOTES.map(n => `<option value="${n}" ${n === currentRoot ? 'selected' : ''}>${n}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="setting-item">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">Chord Type</label>
                            <div class="custom-select-wrapper">
                                <select id="type-select" class="custom-select">
                                    ${chordTypes.map(t => `<option value="${t}" ${t === currentType ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Legend for Scale Degrees -->
                    <div class="voicing-legend" style="display: flex; justify-content: center; gap: 1.25rem; margin-top: 1.5rem; flex-wrap: wrap; font-size: 0.75rem; font-weight: 600;">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #3730a3; box-shadow: 0 0 5px #3730a3;"></span>
                            <span style="color: var(--text-muted);">1 (Root)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 5px #6366f1;"></span>
                            <span style="color: var(--text-muted);">3 (Third)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #a5b4fc; box-shadow: 0 0 5px #a5b4fc;"></span>
                            <span style="color: var(--text-muted);">5 (Fifth)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #e0e7ff; box-shadow: 0 0 5px #e0e7ff;"></span>
                            <span style="color: var(--text-muted);">7 (Seventh)</span>
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem; display: flex; align-items: center; gap: 2.5rem;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 0.75rem; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">Select Strings (1-6)</label>
                            <div class="string-checkbox-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                                ${[1, 2, 3, 4, 5, 6].map(s => `
                                    <div class="string-check-item" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <input type="checkbox" id="string-check-${s}" class="string-checkbox" value="${s-1}" ${currentStringSet.includes(s-1) ? 'checked' : ''}>
                                        <label for="string-check-${s}" style="font-size: 0.9rem; font-weight: 600; cursor: pointer; color: var(--text-main);">${s}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <button class="play-chord-premium" id="play-chord-btn" style="flex-shrink: 0;">
                            <i data-lucide="play"></i>
                            <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Play Chord</span>
                        </button>
                    </div>
                </div>

                <div class="explorer-visuals">
                    <div id="chord-formula-container" class="formula-display">
                        <!-- Formula badges injected here -->
                    </div>
                    
                    <div class="staff-container">
                        <svg id="staff-svg" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
                            <!-- Staff lines -->
                            <line x1="10" y1="30" x2="190" y2="30" stroke="#333" stroke-width="1" />
                            <line x1="10" y1="45" x2="190" y2="45" stroke="#333" stroke-width="1" />
                            <line x1="10" y1="60" x2="190" y2="60" stroke="#333" stroke-width="1" />
                            <line x1="10" y1="75" x2="190" y2="75" stroke="#333" stroke-width="1" />
                            <line x1="10" y1="90" x2="190" y2="90" stroke="#333" stroke-width="1" />
                            
                            <!-- Clef (simplified) -->
                            <text x="15" y="75" fill="#111" font-size="40" font-family="serif">𝄞</text>
                            
                            <g id="staff-notes"></g>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons({ root: container });

    const rootSelect = container.querySelector('#root-select');
    const typeSelect = container.querySelector('#type-select');
    const playBtn = container.querySelector('#play-chord-btn');
    const diatonicContainer = container.querySelector('#explorer-diatonic-btns');
    const keyDisplay = container.querySelector('#explorer-key-display');

    // Setup Fretboard
    initFretboard('fretboard-container');

    // 1 → 3 → 5 → 7 : 같은 인디고 계열, 어두운 → 밝은 순
    const degreeColors = {
        '1':  '#3730a3',  // 가장 어두운 인디고 - Root
        '3':  '#6366f1',  // 인디고
        'b3': '#6366f1',
        '5':  '#a5b4fc',  // 밝은 인디고
        'b5': '#a5b4fc',
        '#5': '#a5b4fc',
        '7':  '#e0e7ff',  // 가장 밝은 라벤더 - 7th
        'b7': '#e0e7ff',
    };

    // Highlight every chord tone on the fretboard, colored by scale degree
    const highlightAllVoicingShapesOnFretboard = (notes, formula, stringSet) => {
        clearFretboard();

        notes.forEach((fullNote, idx) => {
            const noteName = fullNote.match(/^[A-Ga-g][b#]?/)[0];
            const deg = formula[idx];
            const color = degreeColors[deg] || 'rgba(255,255,255,0.3)';

            document.querySelectorAll(`.fret[data-note="${noteName}"]`).forEach(cell => {
                const parentString = cell.closest('.string');
                if (!parentString) return;
                const strIdx = parseInt(parentString.className.match(/string-(\d+)/)[1]);
                if (!stringSet.includes(strIdx)) return;

                const marker = cell.querySelector('.note-marker');
                if (!marker) return;

                marker.textContent = deg;
                marker.classList.remove('hidden');
                marker.classList.add('active');
                marker.style.background = color;
                marker.style.boxShadow = `0 0 10px ${color}`;
                marker.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                marker.style.borderWidth = '1px';
                marker.style.borderStyle = 'solid';
            });
        });
    };

    // Render Diatonic Quick Select Buttons based on the currentKey
    const renderDiatonicButtons = () => {
        if (!diatonicContainer || !keyDisplay) return;
        keyDisplay.textContent = `${currentKey} Major`;
        diatonicContainer.innerHTML = '';

        const scaleNotes = getScale(currentKey);
        const pool = showSeventh ? MAJOR_DIATONIC_7TH_CHORDS : MAJOR_DIATONIC_CHORDS;
        const romanTriads  = ['I',    'ii',   'iii',   'IV',    'V',   'vi',   'vii°'];
        const romanSevenths = ['Imaj7','IIm7', 'IIIm7', 'IVmaj7','V7', 'VIm7', 'VIIø'];

        pool.forEach((info, idx) => {
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const btn = document.createElement('button');
            btn.className = 'mini-btn degree-btn';
            btn.style.padding = '0.5rem 1rem';
            btn.style.height = 'auto';
            btn.style.lineHeight = '1.3';

            if (rootName === currentRoot && info.type === currentType) {
                btn.classList.add('active');
            }

            const roman = showSeventh ? romanSevenths[idx] : romanTriads[idx];
            btn.innerHTML = `
                <span style="font-size: 0.65rem; opacity: 0.6; text-transform: uppercase; font-weight: 700;">
                    ${roman}
                </span><br>
                <strong style="font-size: 0.9rem;">${rootName}${info.suffix}</strong>
            `;

            btn.addEventListener('click', () => {
                currentRoot = rootName;
                currentType = info.type;

                rootSelect.value = currentRoot;
                typeSelect.value = currentType;

                diatonicContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                updateVisualization();
            });

            diatonicContainer.appendChild(btn);
        });
    };

    // Sync Active Diatonic Button after root or type changes via dropdown
    const syncActiveDiatonicButton = () => {
        if (!diatonicContainer) return;
        const pool = showSeventh ? MAJOR_DIATONIC_7TH_CHORDS : MAJOR_DIATONIC_CHORDS;
        diatonicContainer.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');

            const scaleNotes = getScale(currentKey);
            const idx = Array.from(diatonicContainer.children).indexOf(btn);
            if (idx !== -1) {
                const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
                const info = pool[idx];
                if (rootName === currentRoot && info.type === currentType) {
                    btn.classList.add('active');
                }
            }
        });
    };

    const updateVisualization = () => {
        const type7th = chordTypeTo7th[currentType] || currentType;
        const notes = getChordNotes(currentRoot, type7th, 4); // Use 4th octave for staff
        const formula = getChordFormula(type7th);
        
        // Fretboard highlight color-coded by voicing shape
        highlightAllVoicingShapesOnFretboard(notes, formula, currentStringSet);

        // Update Formula UI
        const formulaContainer = container.querySelector('#chord-formula-container');
        formulaContainer.innerHTML = formula.map((deg, i) => `
            <div class="formula-badge ${deg.includes('b') || deg.includes('#') ? 'altered' : ''}">
                <span class="formula-deg">${deg}</span>
                <span class="formula-note">${notes[i].match(/^[A-Ga-g][b#]?/)[0]}</span>
            </div>
        `).join('<div class="formula-sep"></div>');

        // Update Staff
        drawStaff(notes, formula);

        // Sync quick diatonic active state
        syncActiveDiatonicButton();
    };

    function drawStaff(notes, formula) {
        const g = container.querySelector('#staff-notes');
        g.innerHTML = '';
        
        // Simplify staff mapping (Root position)
        // Center line (B4) = 60px. Each step is 7.5px.
        // MIDI mapping for C4=60, D4=62...
        const midiToY = (noteStr) => {
            const noteName = noteStr.match(/^[A-Ga-g][b#]?/)[0];
            const octave = parseInt(noteStr.slice(-1));
            const noteValues = { 'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11 };
            const midi = (octave + 1) * 12 + noteValues[noteName];
            
            // Map B4 (71) to 60px
            // Staff position (steps from B4)
            const staffSteps = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
            const rootSteps = staffSteps[noteName[0]]; // base letter
            const totalSteps = (octave - 4) * 7 + rootSteps - 6; // -6 because B4 is 6th step in octave 4 relative to C
            
            return 60 - (totalSteps * 7.5);
        };

        notes.forEach((noteStr, idx) => {
            const y = midiToY(noteStr);
            const x = 70 + idx * 35; // adjusted from 40 to 35 for 7th chord layout spacing
            
            // Draw note head
            const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            ellipse.setAttribute("cx", x);
            ellipse.setAttribute("cy", y);
            ellipse.setAttribute("rx", 6);
            ellipse.setAttribute("ry", 4.5);
            ellipse.setAttribute("fill", idx === 0 ? "var(--primary)" : "#111");
            g.appendChild(ellipse);

            // Label degree
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y - 12);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "#555");
            text.setAttribute("font-size", "10");
            text.setAttribute("font-weight", "bold");
            text.textContent = formula[idx];
            g.appendChild(text);

            // Ledger lines if needed
            if (y >= 105) { // Below staff
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", x - 10); line.setAttribute("y1", 105);
                line.setAttribute("x2", x + 10); line.setAttribute("y2", 105);
                line.setAttribute("stroke", "#333");
                g.appendChild(line);
            }
        });
    }

    rootSelect.addEventListener('change', (e) => {
        currentRoot = e.target.value;
        updateVisualization();
    });

    typeSelect.addEventListener('change', (e) => {
        currentType = e.target.value;
        updateVisualization();
    });

    const checkboxes = container.querySelectorAll('.string-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            currentStringSet = Array.from(checkboxes)
                .filter(c => c.checked)
                .map(c => parseInt(c.value));
            updateVisualization();
        });
    });

    playBtn.addEventListener('click', () => {
        stopAll();
        const type7th = chordTypeTo7th[currentType] || currentType;
        const notes = getChordNotes(currentRoot, type7th, 4);
        playChord(notes, '1n');
    });

    // Diatonic mode toggle (Triads / 7ths)
    const toggleTriadsBtn = container.querySelector('#toggle-triads');
    const toggle7thsBtn   = container.querySelector('#toggle-7ths');

    const updateToggleStyle = () => {
        toggleTriadsBtn.style.background = showSeventh ? 'transparent' : 'var(--primary)';
        toggleTriadsBtn.style.color      = showSeventh ? 'rgba(255,255,255,0.4)' : '#fff';
        toggle7thsBtn.style.background   = showSeventh ? 'var(--primary)' : 'transparent';
        toggle7thsBtn.style.color        = showSeventh ? '#fff' : 'rgba(255,255,255,0.4)';
    };

    toggleTriadsBtn.addEventListener('click', () => {
        if (showSeventh) {
            showSeventh = false;
            updateToggleStyle();
            // revert to triad equivalent of current 7th type if needed
            const triadFallback = { 'Maj7': 'Major', 'Min7': 'Minor', 'Dom7': 'Major', 'HalfDim7': 'Diminished' };
            if (triadFallback[currentType]) {
                currentType = triadFallback[currentType];
                typeSelect.value = currentType;
            }
            renderDiatonicButtons();
            updateVisualization();
        }
    });

    toggle7thsBtn.addEventListener('click', () => {
        if (!showSeventh) {
            showSeventh = true;
            updateToggleStyle();
            // upgrade triad type to 7th equivalent
            const seventhUpgrade = { 'Major': 'Maj7', 'Minor': 'Min7', 'Diminished': 'HalfDim7', 'Augmented': 'Maj7' };
            if (seventhUpgrade[currentType]) {
                currentType = seventhUpgrade[currentType];
                typeSelect.value = currentType;
            }
            renderDiatonicButtons();
            updateVisualization();
        }
    });

    // Initial render
    updateToggleStyle();
    renderDiatonicButtons();
    updateVisualization();
}
