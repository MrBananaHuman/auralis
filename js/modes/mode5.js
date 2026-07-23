// js/modes/mode5.js
import { stopAll, playChord } from '../audioEngine.js';
import { getChordNotes, NOTES, getChordFormula, MAJOR_DIATONIC_7TH_CHORDS, getScale } from '../musicTheory.js';
import { initFretboard } from '../fretboard.js';

export function mode5_render(container, currentKey = 'C') {
    const keyRoot = getScale(currentKey)[0].match(/^[A-Ga-g][b#]?/)[0];
    let currentRoot = keyRoot;
    let currentType = 'Maj7';
    let currentStringSet = [0, 1, 2, 3]; // Default to 4 strings: 1, 2, 3, 4
    let goldDegree = '1'; // 골드 강조 대상: '1'(root) 또는 '5'

    const chordTypes = ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'HalfDim7'];
    const chordTypeTo7th = {
        'Major': 'Maj7',
        'Minor': 'Min7',
        'Diminished': 'Dim7',
        'Augmented': 'Aug7'
    };
    const typeSuffix = {
        'Major': '', 'Minor': 'm', 'Diminished': 'dim', 'Augmented': 'aug',
        'Maj7': 'maj7', 'Min7': 'm7', 'Dom7': '7', 'HalfDim7': 'm7b5'
    };

    // 선택된 코드 진행 (클릭 순서 유지). 각 항목: { root, type, roman }
    let progression = [{ root: keyRoot, type: 'Maj7', roman: 'Imaj7' }];

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
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Gold</span>
                        <div id="gold-degree-toggle" style="display: flex; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden; font-size: 0.75rem; font-weight: 700;">
                            <button id="toggle-gold-root" style="padding: 0.35rem 1rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">Root</button>
                            <button id="toggle-gold-5th"  style="padding: 0.35rem 1rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">5th</button>
                        </div>
                    </div>
                </div>
                <div id="explorer-diatonic-btns" class="compact-grid" style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
                    <!-- Buttons dynamically populated here -->
                </div>
                <p style="margin-top: 0.75rem; color: var(--text-muted); font-size: 0.7rem;">
                    코드를 여러 개 클릭하면 진행(progression)으로 아래에 쌓입니다. 다시 클릭하면 제거돼요.
                </p>
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
                            <span id="legend-dot-1" style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 5px #f59e0b;"></span>
                            <span style="color: var(--text-muted);">1 (Root)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 5px #6366f1;"></span>
                            <span style="color: var(--text-muted);">3 (Third)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span id="legend-dot-5" style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #a5b4fc; box-shadow: 0 0 5px #a5b4fc;"></span>
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

            <!-- 코드 진행별 프렛보드 스택 (스크롤) -->
            <div id="explorer-boards" style="margin-top: 1.5rem;"></div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons({ root: container });

    const rootSelect = container.querySelector('#root-select');
    const typeSelect = container.querySelector('#type-select');
    const playBtn = container.querySelector('#play-chord-btn');
    const diatonicContainer = container.querySelector('#explorer-diatonic-btns');
    const keyDisplay = container.querySelector('#explorer-key-display');
    const boardsContainer = container.querySelector('#explorer-boards');

    // goldDegree('1' 또는 '5')가 골드 강조, 나머지는 인디고 계열 어둡→밝
    const getDegreeColors = () => {
        const colors = {
            '1':  '#3730a3',  // 어두운 인디고
            '3':  '#6366f1',  // 인디고
            'b3': '#6366f1',
            '5':  '#a5b4fc',  // 밝은 인디고
            'b5': '#a5b4fc',
            '#5': '#a5b4fc',
            '7':  '#c7d2fe',  // 라벤더
            'b7': '#c7d2fe',
        };
        if (goldDegree === '5') {
            colors['5'] = colors['b5'] = colors['#5'] = '#f59e0b';
        } else {
            colors['1'] = '#f59e0b';
        }
        return colors;
    };

    // 특정 보드(boardEl) 안에서만 코드 톤을 도수 색깔로 하이라이트
    const highlightChordOnBoard = (boardEl, notes, formula, stringSet) => {
        const degreeColors = getDegreeColors();

        notes.forEach((fullNote, idx) => {
            const noteName = fullNote.match(/^[A-Ga-g][b#]?/)[0];
            const deg = formula[idx];
            const color = degreeColors[deg] || 'rgba(255,255,255,0.3)';

            boardEl.querySelectorAll(`.fret[data-note="${noteName}"]`).forEach(cell => {
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

    // 진행의 각 코드마다 프렛보드 카드를 세로로 쌓아 렌더
    const renderBoards = () => {
        boardsContainer.innerHTML = '';

        progression.forEach((chord, i) => {
            const isFocused = chord.root === currentRoot && chord.type === currentType;
            const label = `${chord.root}${typeSuffix[chord.type] ?? chord.type}`;

            const card = document.createElement('div');
            card.className = 'card glass';
            card.style.cssText = `margin-bottom: 1.25rem; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid ${isFocused ? 'var(--primary)' : 'rgba(255,255,255,0.06)'};`;

            const header = document.createElement('div');
            header.style.cssText = 'display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer;';
            header.innerHTML = `
                <span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">${i + 1}</span>
                ${chord.roman ? `<span style="color: var(--primary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${chord.roman}</span>` : ''}
                <strong style="font-size: 1rem;">${label}</strong>
            `;
            // 헤더 클릭 시 해당 코드로 포커스 (오선지/포뮬러 갱신)
            header.addEventListener('click', () => {
                currentRoot = chord.root;
                currentType = chord.type;
                rootSelect.value = currentRoot;
                typeSelect.value = currentType;
                updateVisualization();
            });

            const boardDiv = document.createElement('div');
            const boardId = `explorer-board-${i}`;
            boardDiv.id = boardId;

            card.appendChild(header);
            card.appendChild(boardDiv);
            boardsContainer.appendChild(card);

            initFretboard(boardId);

            const type7th = chordTypeTo7th[chord.type] || chord.type;
            const notes = getChordNotes(chord.root, type7th, 4);
            const formula = getChordFormula(type7th);
            highlightChordOnBoard(boardDiv, notes, formula, currentStringSet);
        });
    };

    // Render Diatonic Quick Select Buttons based on the currentKey
    const renderDiatonicButtons = () => {
        if (!diatonicContainer || !keyDisplay) return;
        keyDisplay.textContent = `${currentKey} Major`;
        diatonicContainer.innerHTML = '';

        const scaleNotes = getScale(currentKey);
        const pool = MAJOR_DIATONIC_7TH_CHORDS;
        const romanSevenths = ['Imaj7','IIm7', 'IIIm7', 'IVmaj7','V7', 'VIm7', 'VIIø'];

        pool.forEach((info, idx) => {
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const btn = document.createElement('button');
            btn.className = 'mini-btn degree-btn';
            btn.style.padding = '0.5rem 1rem';
            btn.style.height = 'auto';
            btn.style.lineHeight = '1.3';

            if (progression.some(c => c.root === rootName && c.type === info.type)) {
                btn.classList.add('active');
            }

            const roman = romanSevenths[idx];
            btn.innerHTML = `
                <span style="font-size: 0.65rem; opacity: 0.6; text-transform: uppercase; font-weight: 700;">
                    ${roman}
                </span><br>
                <strong style="font-size: 0.9rem;">${rootName}${info.suffix}</strong>
            `;

            // 토글: 진행에 없으면 추가, 있으면 제거 (마지막 하나는 유지)
            btn.addEventListener('click', () => {
                const idxInProg = progression.findIndex(c => c.root === rootName && c.type === info.type);

                if (idxInProg !== -1) {
                    if (progression.length > 1) {
                        progression.splice(idxInProg, 1);
                        const last = progression[progression.length - 1];
                        currentRoot = last.root;
                        currentType = last.type;
                    }
                } else {
                    progression.push({ root: rootName, type: info.type, roman });
                    currentRoot = rootName;
                    currentType = info.type;
                }

                rootSelect.value = currentRoot;
                typeSelect.value = currentType;

                updateVisualization();
            });

            diatonicContainer.appendChild(btn);
        });
    };

    // 진행에 포함된 코드들의 다이아토닉 버튼을 active로 동기화
    const syncActiveDiatonicButton = () => {
        if (!diatonicContainer) return;
        const pool = MAJOR_DIATONIC_7TH_CHORDS;
        const scaleNotes = getScale(currentKey);
        diatonicContainer.querySelectorAll('button').forEach((btn, idx) => {
            btn.classList.remove('active');
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const info = pool[idx];
            if (progression.some(c => c.root === rootName && c.type === info.type)) {
                btn.classList.add('active');
            }
        });
    };

    const updateVisualization = () => {
        const type7th = chordTypeTo7th[currentType] || currentType;
        const notes = getChordNotes(currentRoot, type7th, 4); // Use 4th octave for staff
        const formula = getChordFormula(type7th);

        // 진행 전체를 프렛보드 스택으로 렌더
        renderBoards();

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

    // 드롭다운으로 직접 지정하면 진행을 그 코드 하나로 초기화
    rootSelect.addEventListener('change', (e) => {
        currentRoot = e.target.value;
        progression = [{ root: currentRoot, type: currentType, roman: null }];
        updateVisualization();
    });

    typeSelect.addEventListener('change', (e) => {
        currentType = e.target.value;
        progression = [{ root: currentRoot, type: currentType, roman: null }];
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

    // Gold highlight toggle (Root / 5th)
    const toggleGoldRootBtn = container.querySelector('#toggle-gold-root');
    const toggleGold5thBtn  = container.querySelector('#toggle-gold-5th');

    const updateToggleStyle = () => {
        const goldOnRoot = goldDegree === '1';
        toggleGoldRootBtn.style.background = goldOnRoot ? 'var(--primary)' : 'transparent';
        toggleGoldRootBtn.style.color      = goldOnRoot ? '#fff' : 'rgba(255,255,255,0.4)';
        toggleGold5thBtn.style.background  = goldOnRoot ? 'transparent' : 'var(--primary)';
        toggleGold5thBtn.style.color       = goldOnRoot ? 'rgba(255,255,255,0.4)' : '#fff';

        // 레전드 점 색도 골드 대상에 맞춰 동기화
        const colors = getDegreeColors();
        const dot1 = container.querySelector('#legend-dot-1');
        const dot5 = container.querySelector('#legend-dot-5');
        if (dot1) {
            dot1.style.background = colors['1'];
            dot1.style.boxShadow = `0 0 5px ${colors['1']}`;
        }
        if (dot5) {
            dot5.style.background = colors['5'];
            dot5.style.boxShadow = `0 0 5px ${colors['5']}`;
        }
    };

    toggleGoldRootBtn.addEventListener('click', () => {
        if (goldDegree !== '1') {
            goldDegree = '1';
            updateToggleStyle();
            updateVisualization();
        }
    });

    toggleGold5thBtn.addEventListener('click', () => {
        if (goldDegree !== '5') {
            goldDegree = '5';
            updateToggleStyle();
            updateVisualization();
        }
    });

    // Initial render
    updateToggleStyle();
    renderDiatonicButtons();
    updateVisualization();
}
