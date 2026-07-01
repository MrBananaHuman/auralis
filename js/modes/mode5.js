// js/modes/mode5.js
import { stopAll, playChord } from '../audioEngine.js';
import { getChordNotes, NOTES, getChordFormula, MAJOR_DIATONIC_CHORDS, getScale } from '../musicTheory.js';
import { initFretboard, highlightNotesOnFretboard, clearFretboard } from '../fretboard.js';

export function mode5_render(container, currentKey = 'C') {
    let currentRoot = 'C';
    let currentType = 'Major';
    let currentStringSet = [0, 1, 2, 3]; // Default to 4 strings: 1, 2, 3, 4

    const chordTypes = ['Major', 'Minor', 'Diminished', 'Augmented'];
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
                <label style="display: block; margin-bottom: 0.75rem; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    Diatonic Quick Select (<span id="explorer-key-display"></span>)
                </label>
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

                    <!-- Legend: 근음(1도) 기준 포지션별 색깔 -->
                    <div class="voicing-legend" style="display: flex; flex-direction: column; align-items: center; gap: 0.6rem; margin-top: 1.5rem; font-size: 0.75rem; font-weight: 600;">
                        <div style="display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 5px #6366f1;"></span>
                                <span style="color: var(--text-muted);">포지션 1</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #10b981; box-shadow: 0 0 5px #10b981;"></span>
                                <span style="color: var(--text-muted);">포지션 2</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 5px #f59e0b;"></span>
                                <span style="color: var(--text-muted);">포지션 3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #ec4899; box-shadow: 0 0 5px #ec4899;"></span>
                                <span style="color: var(--text-muted);">포지션 4</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 5px #06b6d4;"></span>
                                <span style="color: var(--text-muted);">포지션 5</span>
                            </div>
                        </div>
                        <div style="color: var(--text-muted); opacity: 0.7; font-size: 0.7rem;">같은 색 = 근음(1도)을 기준으로 묶인 1·3·5·7</div>
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

    // Helper: 근음(1도) 위치를 기준으로 1·3·5·7을 같은 색으로 묶어 표시
    const highlightAllVoicingShapesOnFretboard = (notes, formula, stringSet) => {
        clearFretboard();

        if (stringSet.length !== 3 && stringSet.length !== 4) {
            const labelsMap = {};
            notes.forEach((fullNote, idx) => {
                const noteName = fullNote.match(/^[A-Ga-g][b#]?/)[0];
                labelsMap[noteName] = formula[idx];
            });
            highlightNotesOnFretboard(notes, labelsMap, stringSet);
            return;
        }

        const sortedStrings = [...stringSet].sort((a, b) => b - a);
        const voicings = stringSet.length === 4 ? ['root', '1st', '2nd', '3rd'] : ['root', '1st', '2nd'];

        // 모든 유효한 보이싱 클러스터 수집 (각 클러스터는 1·3·5·7이 4프렛 안에 모인 묶음)
        // cluster = { rootFret, notes: [{strIdx, fret, cell, degree}] }
        const allClusters = [];

        voicings.forEach(voicingMode => {
            let targetDegrees = [];
            if (stringSet.length === 4) {
                if (voicingMode === 'root') targetDegrees = [formula[0], formula[2], formula[3], formula[1]];
                else if (voicingMode === '1st') targetDegrees = [formula[1], formula[3], formula[0], formula[2]];
                else if (voicingMode === '2nd') targetDegrees = [formula[2], formula[0], formula[1], formula[3]];
                else if (voicingMode === '3rd') targetDegrees = [formula[3], formula[1], formula[2], formula[0]];
            } else {
                if (voicingMode === 'root') targetDegrees = [formula[0], formula[1], formula[2]];
                else if (voicingMode === '1st') targetDegrees = [formula[1], formula[2], formula[0]];
                else if (voicingMode === '2nd') targetDegrees = [formula[2], formula[0], formula[1]];
            }
            if (targetDegrees.length === 0) return;

            const stringNoteNames = targetDegrees.map(deg => {
                const idx = formula.indexOf(deg);
                return idx !== -1 ? notes[idx].match(/^[A-Ga-g][b#]?/)[0] : null;
            });
            if (stringNoteNames.includes(null)) return;

            const stringFrets = sortedStrings.map((strIdx, i) => {
                const noteName = stringNoteNames[i];
                return Array.from(
                    document.querySelectorAll(`#fretboard-container .string-${strIdx} .fret[data-note="${noteName}"]`)
                ).map(cell => ({
                    fret: parseInt(cell.dataset.fret),
                    note: noteName,
                    degree: targetDegrees[i],
                    cell,
                    strIdx
                }));
            });

            const combinations = [];
            const gen = (idx, curr) => {
                if (idx === stringFrets.length) { combinations.push([...curr]); return; }
                stringFrets[idx].forEach(d => { curr.push(d); gen(idx + 1, curr); curr.pop(); });
            };
            gen(0, []);

            combinations
                .filter(combo => {
                    const frets = combo.map(c => c.fret).filter(f => f > 0);
                    return frets.length <= 1 || Math.max(...frets) - Math.min(...frets) <= 4;
                })
                .forEach(combo => {
                    // 클러스터의 기준: 근음(1도)이 있는 프렛 위치
                    const rootNote = combo.find(n => n.degree === formula[0]);
                    const rootFret = rootNote ? rootNote.fret : Math.min(...combo.map(n => n.fret));
                    allClusters.push({ rootFret, notes: combo });
                });
        });

        // 근음 프렛 위치 순서로 정렬 (넥 왼쪽 → 오른쪽)
        allClusters.sort((a, b) => a.rootFret - b.rootFret);

        // 고유한 근음 프렛 위치마다 색 배정
        const clusterColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
        const rootFretToColor = new Map();
        let colorCount = 0;
        allClusters.forEach(cluster => {
            if (!rootFretToColor.has(cluster.rootFret)) {
                rootFretToColor.set(cluster.rootFret, clusterColors[colorCount++ % clusterColors.length]);
            }
        });

        // 각 셀에 색 적용 (같은 셀이 여러 클러스터에 겹치면 근음이 가장 가까운 클러스터 색으로)
        const paintedCells = new Set();
        allClusters.forEach(cluster => {
            const color = rootFretToColor.get(cluster.rootFret);
            cluster.notes.forEach(({ cell, degree, strIdx, fret }) => {
                const key = `${strIdx}-${fret}`;
                if (paintedCells.has(key)) return;
                paintedCells.add(key);

                const marker = cell.querySelector('.note-marker');
                if (marker) {
                    marker.textContent = degree;
                    marker.classList.remove('hidden');
                    marker.classList.add('active');
                    marker.style.background = color;
                    marker.style.boxShadow = `0 0 10px ${color}`;
                    marker.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    marker.style.borderWidth = '1px';
                    marker.style.borderStyle = 'solid';
                }
            });
        });
    };

    // Render Diatonic Quick Select Buttons based on the currentKey
    const renderDiatonicButtons = () => {
        if (!diatonicContainer || !keyDisplay) return;
        keyDisplay.textContent = `${currentKey} Major`;
        diatonicContainer.innerHTML = '';

        const scaleNotes = getScale(currentKey);

        MAJOR_DIATONIC_CHORDS.forEach((info, idx) => {
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const btn = document.createElement('button');
            btn.className = 'mini-btn degree-btn';
            btn.style.padding = '0.5rem 1rem';
            btn.style.height = 'auto';
            btn.style.lineHeight = '1.3';
            
            // Highlight active diatonic chord matching selected root and type
            if (rootName === currentRoot && info.type === currentType) {
                btn.classList.add('active');
            }

            btn.innerHTML = `
                <span style="font-size: 0.65rem; opacity: 0.6; text-transform: uppercase; font-weight: 700;">
                    ${['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][idx]}
                </span><br>
                <strong style="font-size: 0.9rem;">${rootName}${info.suffix}</strong>
            `;

            btn.addEventListener('click', () => {
                currentRoot = rootName;
                currentType = info.type;

                // Sync dropdown select values
                rootSelect.value = currentRoot;
                typeSelect.value = currentType;

                // Update active states
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
        diatonicContainer.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
            
            const scaleNotes = getScale(currentKey);
            const idx = Array.from(diatonicContainer.children).indexOf(btn);
            if (idx !== -1) {
                const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
                const info = MAJOR_DIATONIC_CHORDS[idx];
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

    // Initial render
    renderDiatonicButtons();
    updateVisualization();
}
