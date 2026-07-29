// js/modes/mode9.js — Voicing Explorer
// 코드 진행을 만들고, 각 코드의 운지 가능한 위치를 음이름(C, D, E...)으로
// 프렛보드에 표시한다. Drop 2 / Drop 3 보이싱 필터 지원.
import { stopAll, playChord } from '../audioEngine.js';
import { getChordNotes, NOTES, getChordFormula, MAJOR_DIATONIC_7TH_CHORDS, getScale } from '../musicTheory.js';
import { initFretboard } from '../fretboard.js';

export function mode9_render(container, currentKey = 'C') {
    const keyRoot = getScale(currentKey)[0].match(/^[A-Ga-g][b#]?/)[0];
    let currentRoot = keyRoot;
    let currentType = 'Maj7';
    let voicingMode = 'all'; // 'all' | 'drop2' | 'drop3'

    // 하모니 빌더의 코드 + 7th 코드 전부
    const chordTypes = [
        'Major', 'Minor', 'Sus4', 'Sus2', 'Augmented', 'Diminished',
        'Dom7', 'Maj7', 'Min7', 'Dim7', 'm7b5',
        '6', 'm6', 'add9', '9', 'Maj9', 'Min9'
    ];
    const typeSuffix = {
        'Major': '', 'Minor': 'm', 'Sus4': 'sus4', 'Sus2': 'sus2',
        'Augmented': 'aug', 'Diminished': 'dim',
        'Dom7': '7', 'Maj7': 'maj7', 'Min7': 'm7', 'Dim7': 'dim7', 'm7b5': 'm7b5',
        '6': '6', 'm6': 'm6', 'add9': 'add9', '9': '9', 'Maj9': 'maj9', 'Min9': 'm9'
    };

    // 코드 톤 순서(1-3-5-7-9)별 색: root는 골드로 강조
    const TONE_COLORS = ['#f59e0b', '#6366f1', '#a5b4fc', '#c7d2fe', '#e879f9'];

    // Drop 보이싱 정의: 줄 세트(낮은 줄→높은 줄, 0=1번줄 ~ 5=6번줄)와
    // 각 전위(inversion)에서 낮은 줄부터 배치되는 코드 톤 인덱스(0=1도, 1=3도, 2=5도, 3=7도)
    const DROP2_SETS = [[5, 4, 3, 2], [4, 3, 2, 1], [3, 2, 1, 0]];
    const DROP3_SETS = [[5, 3, 2, 1], [4, 2, 1, 0]];
    const DROP2_INVERSIONS = [[0, 2, 3, 1], [1, 3, 0, 2], [2, 0, 1, 3], [3, 1, 2, 0]];
    const DROP3_INVERSIONS = [[0, 3, 1, 2], [1, 0, 2, 3], [2, 1, 3, 0], [3, 2, 0, 1]];

    // 선택된 코드 진행 (클릭 순서 유지). 각 항목: { root, type, roman }
    let progression = [{ root: keyRoot, type: 'Maj7', roman: 'Imaj7' }];

    const html = `
        <div class="glass-panel chord-explorer">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2>Voicing Explorer</h2>
                <p>Build a progression and memorize every playable position, note by note.</p>
            </div>

            <!-- 코드 선택 패널 -->
            <div class="diatonic-selector card glass" style="margin-bottom: 1.5rem; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); text-align: center;">
                <label style="display: block; margin-bottom: 0.75rem; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    Diatonic Quick Select (<span id="voicing-key-display"></span>)
                </label>
                <div id="voicing-diatonic-btns" class="compact-grid" style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;"></div>

                <div style="display: flex; justify-content: center; align-items: end; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Root</label>
                        <div class="custom-select-wrapper">
                            <select id="voicing-root-select" class="custom-select" style="min-width: 80px;">
                                ${NOTES.map(n => `<option value="${n}">${n}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Type</label>
                        <div class="custom-select-wrapper">
                            <select id="voicing-type-select" class="custom-select" style="min-width: 110px;">
                                ${chordTypes.map(t => `<option value="${t}" ${t === 'Dom7' ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <button id="voicing-add-btn" class="btn-ghost-small ripple" style="padding: 0.6rem 1.1rem;">
                        <i data-lucide="plus-circle"></i> Add Chord
                    </button>
                </div>
                <p style="margin-top: 0.75rem; color: var(--text-muted); font-size: 0.7rem;">
                    다이아토닉 버튼은 클릭해서 추가/제거, 그 외 코드는 Root + Type으로 추가하세요. (예: 블루스 F7 / Bb7 / C7)
                </p>
            </div>

            <!-- 보이싱 필터 + 레전드 + 재생 -->
            <div style="display: flex; justify-content: center; align-items: center; gap: 2rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Voicing</span>
                    <div style="display: flex; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden; font-size: 0.75rem; font-weight: 700;">
                        <button class="voicing-mode-btn" data-vmode="all"   style="padding: 0.35rem 0.9rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">All</button>
                        <button class="voicing-mode-btn" data-vmode="drop2" style="padding: 0.35rem 0.9rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">Drop 2</button>
                        <button class="voicing-mode-btn" data-vmode="drop3" style="padding: 0.35rem 0.9rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">Drop 3</button>
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; font-weight: 600;">
                    ${['Root', '3rd', '5th', '7th', '9th'].map((lbl, i) => `
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${TONE_COLORS[i]}; box-shadow: 0 0 5px ${TONE_COLORS[i]};"></span>
                            <span style="color: var(--text-muted);">${lbl}</span>
                        </div>
                    `).join('')}
                </div>

                <button class="play-chord-premium" id="voicing-play-btn" style="width: 72px; height: 72px;">
                    <i data-lucide="play"></i>
                    <span style="font-size: 0.55rem; text-transform: uppercase; letter-spacing: 1px;">Play</span>
                </button>
            </div>

            <!-- 포커스된 코드의 악보 -->
            <div class="card glass" style="display: flex; justify-content: center; align-items: center; gap: 2rem; flex-wrap: wrap; padding: 1rem; margin-bottom: 1.5rem; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
                <div id="voicing-formula" class="formula-display"></div>
                <div class="staff-container" style="max-width: 340px;">
                    <svg id="voicing-staff-svg" viewBox="0 0 220 120" preserveAspectRatio="xMidYMid meet" style="background: white; border-radius: 8px;">
                        <line x1="10" y1="30" x2="210" y2="30" stroke="#333" stroke-width="1" />
                        <line x1="10" y1="45" x2="210" y2="45" stroke="#333" stroke-width="1" />
                        <line x1="10" y1="60" x2="210" y2="60" stroke="#333" stroke-width="1" />
                        <line x1="10" y1="75" x2="210" y2="75" stroke="#333" stroke-width="1" />
                        <line x1="10" y1="90" x2="210" y2="90" stroke="#333" stroke-width="1" />
                        <text x="15" y="75" fill="#111" font-size="40" font-family="serif">𝄞</text>
                        <g id="voicing-staff-notes"></g>
                    </svg>
                </div>
            </div>

            <!-- 코드별 프렛보드 스택 -->
            <div id="voicing-boards"></div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons({ root: container });

    const rootSelect = container.querySelector('#voicing-root-select');
    const typeSelect = container.querySelector('#voicing-type-select');
    const addBtn = container.querySelector('#voicing-add-btn');
    const playBtn = container.querySelector('#voicing-play-btn');
    const diatonicContainer = container.querySelector('#voicing-diatonic-btns');
    const keyDisplay = container.querySelector('#voicing-key-display');
    const boardsContainer = container.querySelector('#voicing-boards');
    const voicingModeBtns = container.querySelectorAll('.voicing-mode-btn');

    const chordNoteNames = (chord) => {
        return getChordNotes(chord.root, chord.type, 4).map(n => n.match(/^[A-Ga-g][b#]?/)[0]);
    };

    const chordLabel = (chord) => `${chord.root}${typeSuffix[chord.type] ?? chord.type}`;

    // Drop 2/3 보이싱에 속하는 셀 계산: 줄 세트 × 전위 조합에서
    // 프렛 스팬 4 이내(개방현 제외)로 잡을 수 있는 모양만 남긴다
    const computeDropCells = (boardEl, noteNames, mode) => {
        const sets = mode === 'drop2' ? DROP2_SETS : DROP3_SETS;
        const inversions = mode === 'drop2' ? DROP2_INVERSIONS : DROP3_INVERSIONS;
        const memberCells = new Map(); // cell element -> tone index

        sets.forEach(strSet => {
            inversions.forEach(order => {
                const perString = strSet.map((strIdx, i) => {
                    const toneIdx = order[i];
                    const cells = boardEl.querySelectorAll(`.string-${strIdx} .fret[data-note="${noteNames[toneIdx]}"]`);
                    return Array.from(cells).map(cell => ({ cell, fret: parseInt(cell.dataset.fret), toneIdx }));
                });

                const walk = (i, acc) => {
                    if (i === perString.length) {
                        const frets = acc.map(c => c.fret).filter(f => f > 0);
                        const span = frets.length <= 1 ? 0 : Math.max(...frets) - Math.min(...frets);
                        if (span <= 4) acc.forEach(c => memberCells.set(c.cell, c.toneIdx));
                        return;
                    }
                    perString[i].forEach(c => { acc.push(c); walk(i + 1, acc); acc.pop(); });
                };
                walk(0, []);
            });
        });

        return memberCells;
    };

    const lightCell = (cell, label, color) => {
        const marker = cell.querySelector('.note-marker');
        if (!marker) return;
        marker.textContent = label;
        marker.classList.remove('hidden');
        marker.classList.add('active');
        marker.style.background = color;
        marker.style.boxShadow = `0 0 10px ${color}`;
        marker.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        marker.style.borderWidth = '1px';
        marker.style.borderStyle = 'solid';
        marker.style.color = '#fff';
    };

    // 진행의 각 코드마다 프렛보드 카드 렌더 (음이름 라벨)
    const renderBoards = () => {
        boardsContainer.innerHTML = '';

        progression.forEach((chord, i) => {
            const isFocused = chord.root === currentRoot && chord.type === currentType;
            const noteNames = chordNoteNames(chord);
            const dropApplicable = noteNames.length === 4;
            const effectiveMode = (voicingMode !== 'all' && !dropApplicable) ? 'all' : voicingMode;

            const card = document.createElement('div');
            card.className = 'card glass';
            card.style.cssText = `margin-bottom: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid ${isFocused ? 'var(--primary)' : 'rgba(255,255,255,0.06)'};`;

            const header = document.createElement('div');
            header.style.cssText = 'display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.4rem; cursor: pointer;';
            header.innerHTML = `
                <span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">${i + 1}</span>
                ${chord.roman ? `<span style="color: var(--primary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${chord.roman}</span>` : ''}
                <strong style="font-size: 1rem;">${chordLabel(chord)}</strong>
                <span style="color: var(--text-muted); font-size: 0.7rem;">${noteNames.join(' · ')}</span>
                ${(voicingMode !== 'all' && !dropApplicable) ? '<span style="color: var(--text-muted); font-size: 0.65rem;">(drop 보이싱은 4음 코드만 — 전체 표시)</span>' : ''}
                <button class="voicing-remove-btn" style="margin-left: auto; background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; padding: 0 0.3rem;">✕</button>
            `;

            header.addEventListener('click', (e) => {
                if (e.target.closest('.voicing-remove-btn')) return;
                currentRoot = chord.root;
                currentType = chord.type;
                updateVisualization();
            });

            header.querySelector('.voicing-remove-btn').addEventListener('click', () => {
                if (progression.length <= 1) return;
                progression.splice(i, 1);
                if (isFocused) {
                    const last = progression[progression.length - 1];
                    currentRoot = last.root;
                    currentType = last.type;
                }
                updateVisualization();
            });

            const boardDiv = document.createElement('div');
            const boardId = `voicing-board-${i}`;
            boardDiv.id = boardId;
            boardDiv.className = 'compact-fretboard';

            card.appendChild(header);
            card.appendChild(boardDiv);
            boardsContainer.appendChild(card);

            initFretboard(boardId);

            if (effectiveMode === 'all') {
                noteNames.forEach((name, toneIdx) => {
                    const color = TONE_COLORS[toneIdx] || TONE_COLORS[TONE_COLORS.length - 1];
                    boardDiv.querySelectorAll(`.fret[data-note="${name}"]`).forEach(cell => {
                        lightCell(cell, name, color);
                    });
                });
            } else {
                const members = computeDropCells(boardDiv, noteNames, effectiveMode);
                members.forEach((toneIdx, cell) => {
                    const color = TONE_COLORS[toneIdx] || TONE_COLORS[TONE_COLORS.length - 1];
                    lightCell(cell, noteNames[toneIdx], color);
                });
            }
        });
    };

    // 다이아토닉 7th 버튼 (토글 추가/제거)
    const renderDiatonicButtons = () => {
        keyDisplay.textContent = `${currentKey} Major`;
        diatonicContainer.innerHTML = '';

        const scaleNotes = getScale(currentKey);
        const romanSevenths = ['Imaj7', 'IIm7', 'IIIm7', 'IVmaj7', 'V7', 'VIm7', 'VIIø'];

        MAJOR_DIATONIC_7TH_CHORDS.forEach((info, idx) => {
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const btn = document.createElement('button');
            btn.className = 'mini-btn degree-btn';
            btn.style.padding = '0.5rem 1rem';
            btn.style.height = 'auto';
            btn.style.lineHeight = '1.3';

            btn.innerHTML = `
                <span style="font-size: 0.65rem; opacity: 0.6; text-transform: uppercase; font-weight: 700;">
                    ${romanSevenths[idx]}
                </span><br>
                <strong style="font-size: 0.9rem;">${rootName}${info.suffix}</strong>
            `;

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
                    progression.push({ root: rootName, type: info.type, roman: romanSevenths[idx] });
                    currentRoot = rootName;
                    currentType = info.type;
                }

                updateVisualization();
            });

            diatonicContainer.appendChild(btn);
        });
    };

    const syncActiveDiatonicButton = () => {
        const scaleNotes = getScale(currentKey);
        diatonicContainer.querySelectorAll('button').forEach((btn, idx) => {
            btn.classList.remove('active');
            const rootName = scaleNotes[idx].match(/^[A-Ga-g][b#]?/)[0];
            const info = MAJOR_DIATONIC_7TH_CHORDS[idx];
            if (progression.some(c => c.root === rootName && c.type === info.type)) {
                btn.classList.add('active');
            }
        });
    };

    const syncVoicingModeButtons = () => {
        voicingModeBtns.forEach(btn => {
            const active = btn.dataset.vmode === voicingMode;
            btn.style.background = active ? 'var(--primary)' : 'transparent';
            btn.style.color = active ? '#fff' : 'rgba(255,255,255,0.4)';
        });
    };

    // 포커스된 코드의 악보 (음표 위에 음이름 표기)
    const drawStaff = (notes, noteNames) => {
        const g = container.querySelector('#voicing-staff-notes');
        g.innerHTML = '';

        const midiToY = (noteStr) => {
            const noteName = noteStr.match(/^[A-Ga-g][b#]?/)[0];
            const octave = parseInt(noteStr.slice(-1));
            const staffSteps = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
            const rootSteps = staffSteps[noteName[0]];
            const totalSteps = (octave - 4) * 7 + rootSteps - 6;
            return 60 - (totalSteps * 7.5);
        };

        const spacing = notes.length > 4 ? 30 : 35;
        notes.forEach((noteStr, idx) => {
            const y = midiToY(noteStr);
            const x = 70 + idx * spacing;

            const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            ellipse.setAttribute("cx", x);
            ellipse.setAttribute("cy", y);
            ellipse.setAttribute("rx", 6);
            ellipse.setAttribute("ry", 4.5);
            ellipse.setAttribute("fill", idx === 0 ? "var(--primary)" : "#111");
            g.appendChild(ellipse);

            // 음표 위 음이름 라벨
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y - 12);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "#333");
            text.setAttribute("font-size", "11");
            text.setAttribute("font-weight", "bold");
            text.textContent = noteNames[idx];
            g.appendChild(text);

            if (y >= 105) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", x - 10); line.setAttribute("y1", 105);
                line.setAttribute("x2", x + 10); line.setAttribute("y2", 105);
                line.setAttribute("stroke", "#333");
                g.appendChild(line);
            }
        });
    };

    const updateVisualization = () => {
        const notes = getChordNotes(currentRoot, currentType, 4);
        const noteNames = notes.map(n => n.match(/^[A-Ga-g][b#]?/)[0]);
        const formula = getChordFormula(currentType);

        renderBoards();

        // 포뮬러 배지: 도수 + 음이름
        const formulaContainer = container.querySelector('#voicing-formula');
        formulaContainer.innerHTML = formula.map((deg, i) => `
            <div class="formula-badge ${deg.includes('b') || deg.includes('#') ? 'altered' : ''}">
                <span class="formula-deg">${deg}</span>
                <span class="formula-note">${noteNames[i] ?? ''}</span>
            </div>
        `).join('<div class="formula-sep"></div>');

        drawStaff(notes, noteNames);
        syncActiveDiatonicButton();
        syncVoicingModeButtons();
    };

    // 커스텀 코드 추가 (이미 있으면 포커스만 이동)
    addBtn.addEventListener('click', () => {
        const root = rootSelect.value;
        const type = typeSelect.value;
        if (!progression.some(c => c.root === root && c.type === type)) {
            progression.push({ root, type, roman: null });
        }
        currentRoot = root;
        currentType = type;
        updateVisualization();
    });

    voicingModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (voicingMode !== btn.dataset.vmode) {
                voicingMode = btn.dataset.vmode;
                updateVisualization();
            }
        });
    });

    playBtn.addEventListener('click', () => {
        stopAll();
        playChord(getChordNotes(currentRoot, currentType, 4), '1n');
    });

    // Initial render
    renderDiatonicButtons();
    updateVisualization();
}
