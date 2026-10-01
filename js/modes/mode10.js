// js/modes/mode10.js — Scale Explorer
// Key + Scale이 음 집합을 정하고, '1도(시작음)'는 그 안에서 도수를 세기
// 시작할 음을 고른다 (모달 시점). 예: Key C Major + 1도 B → B=1, C=b2 (반음 간격).
// 표시: 음이름 ↔ 도수 전환, 도수 필터, 6번줄 1도 위치 앵커 강조.
import { NOTES, NOTE_TO_INT, getNoteName } from '../musicTheory.js';
import { initFretboard } from '../fretboard.js';

export function mode10_render(container, currentKey = 'C') {
    const SCALE_TYPES = {
        'Major':            [0, 2, 4, 5, 7, 9, 11],
        'Natural Minor':    [0, 2, 3, 5, 7, 8, 10],
        'Harmonic Minor':   [0, 2, 3, 5, 7, 8, 11],
        'Melodic Minor':    [0, 2, 3, 5, 7, 9, 11],
        'Major Pentatonic': [0, 2, 4, 7, 9],
        'Minor Pentatonic': [0, 3, 5, 7, 10],
        'Blues':            [0, 3, 5, 6, 7, 10],
        'Dorian':           [0, 2, 3, 5, 7, 9, 10],
        'Mixolydian':       [0, 2, 4, 5, 7, 9, 10],
        'Lydian':           [0, 2, 4, 6, 7, 9, 11]
    };

    // 시작음으로부터의 반음 거리 → 도수 라벨
    const SEMITONE_DEGREE = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

    let keyRoot = currentKey in NOTE_TO_INT ? currentKey : 'C';
    let currentScale = 'Major';
    let startNote = keyRoot; // 1도로 삼을 음 (스케일 구성음 중 하나)
    let displayMode = 'degrees'; // 'notes' | 'degrees'
    let enabledDegrees = new Set([1, 2, 3, 4, 5, 6, 7]);

    const ROOT_COLOR = '#f59e0b';
    const TONE_COLOR = '#6366f1';

    const html = `
        <div class="glass-panel chord-explorer">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2>Scale Explorer</h2>
                <p>View any scale across the neck — pick where "1" starts, anchored on the 6th string.</p>
            </div>

            <div class="card glass" style="margin-bottom: 1.5rem; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: center; align-items: end; gap: 1.25rem; flex-wrap: wrap;">
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Key</label>
                        <div class="custom-select-wrapper">
                            <select id="scale-key-select" class="custom-select" style="min-width: 80px;">
                                ${NOTES.map(n => `<option value="${n}" ${n === keyRoot ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Scale</label>
                        <div class="custom-select-wrapper">
                            <select id="scale-type-select" class="custom-select" style="min-width: 150px;">
                                ${Object.keys(SCALE_TYPES).map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">1도 (시작음)</label>
                        <div class="custom-select-wrapper">
                            <select id="scale-start-select" class="custom-select" style="min-width: 80px;"></select>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Display</label>
                        <div style="display: flex; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden; font-size: 0.75rem; font-weight: 700;">
                            <button class="scale-display-btn" data-dmode="degrees" style="padding: 0.45rem 0.9rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">1-7도</button>
                            <button class="scale-display-btn" data-dmode="notes"   style="padding: 0.45rem 0.9rem; background: transparent; color: rgba(255,255,255,0.4); border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.15s;">음이름</button>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: center; align-items: center; gap: 0.8rem; margin-top: 1rem; flex-wrap: wrap;">
                    <span style="color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Degrees</span>
                    ${[1, 2, 3, 4, 5, 6, 7].map(d => `
                        <div style="display: flex; align-items: center; gap: 0.3rem;">
                            <input type="checkbox" id="scale-deg-${d}" class="string-checkbox scale-degree-checkbox" value="${d}" checked>
                            <label for="scale-deg-${d}" style="font-size: 0.85rem; font-weight: 600; cursor: pointer; color: var(--text-main);">${d}</label>
                        </div>
                    `).join('')}

                    <div style="display: flex; gap: 1rem; margin-left: 1.5rem; font-size: 0.75rem; font-weight: 600;">
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${ROOT_COLOR}; box-shadow: 0 0 5px ${ROOT_COLOR};"></span>
                            <span style="color: var(--text-muted);">1도</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${TONE_COLOR}; box-shadow: 0 0 5px ${TONE_COLOR};"></span>
                            <span style="color: var(--text-muted);">Scale Tones</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${ROOT_COLOR}; border: 2px solid #fff;"></span>
                            <span style="color: var(--text-muted);">6번줄 1도 (앵커)</span>
                        </div>
                    </div>
                </div>

                <p id="scale-summary" style="margin-top: 0.9rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;"></p>
                <p style="margin-top: 0.4rem; text-align: center; color: var(--text-muted); font-size: 0.68rem; opacity: 0.7;">
                    Key/Scale이 음 집합을 정하고, '1도'는 도수를 세기 시작할 음입니다. 예: Key C + 1도 B → 시(B)=1, 도(C)=b2 (반음)
                </p>
            </div>

            <div id="scale-board"></div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons({ root: container });

    const keySelect = container.querySelector('#scale-key-select');
    const scaleSelect = container.querySelector('#scale-type-select');
    const startSelect = container.querySelector('#scale-start-select');
    const displayBtns = container.querySelectorAll('.scale-display-btn');
    const degreeCheckboxes = container.querySelectorAll('.scale-degree-checkbox');
    const summaryEl = container.querySelector('#scale-summary');

    initFretboard('scale-board');
    const boardEl = container.querySelector('#scale-board');

    const degreeNumber = deg => parseInt(deg.replace(/[b#]/g, ''), 10);

    // 현재 Key + Scale의 구성음 (pitch class 이름)
    const scaleNoteNames = () => {
        const rootInt = NOTE_TO_INT[keyRoot];
        return SCALE_TYPES[currentScale].map(iv => getNoteName(rootInt + iv));
    };

    // 시작음 기준 도수 라벨. 스케일에 완전4도가 없으면 b5 대신 #4로 표기 (Lydian)
    const degreeLabelFor = (noteName, notesSet) => {
        const semis = (NOTE_TO_INT[noteName] - NOTE_TO_INT[startNote] + 12) % 12;
        let label = SEMITONE_DEGREE[semis];
        if (label === 'b5') {
            const hasP4 = [...notesSet].some(n => (NOTE_TO_INT[n] - NOTE_TO_INT[startNote] + 12) % 12 === 5);
            if (!hasP4) label = '#4';
        }
        return label;
    };

    // 1도(시작음) 드롭다운을 현재 스케일 구성음으로 재구성
    const rebuildStartOptions = () => {
        const notes = scaleNoteNames();
        if (!notes.includes(startNote)) startNote = keyRoot;
        startSelect.innerHTML = notes
            .map(n => `<option value="${n}" ${n === startNote ? 'selected' : ''}>${n}</option>`)
            .join('');
    };

    const syncDisplayButtons = () => {
        displayBtns.forEach(btn => {
            const active = btn.dataset.dmode === displayMode;
            btn.style.background = active ? 'var(--primary)' : 'transparent';
            btn.style.color = active ? '#fff' : 'rgba(255,255,255,0.4)';
        });
    };

    const updateVisualization = () => {
        boardEl.querySelectorAll('.note-marker').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('active');
            m.textContent = '';
            m.style.border = 'none';
        });

        const notes = scaleNoteNames();
        const notesSet = new Set(notes);
        const startInt = NOTE_TO_INT[startNote];

        // 요약 줄: 시작음부터 반음 거리 순서로 정렬해 표시
        const ordered = [...notes].sort((a, b) =>
            ((NOTE_TO_INT[a] - startInt + 12) % 12) - ((NOTE_TO_INT[b] - startInt + 12) % 12)
        );
        summaryEl.innerHTML = ordered.map(name => {
            const deg = degreeLabelFor(name, notesSet);
            const on = enabledDegrees.has(degreeNumber(deg));
            const isStart = name === startNote;
            return `<span style="opacity: ${on ? 1 : 0.3}; margin: 0 0.4rem;"><strong style="color: ${isStart ? ROOT_COLOR : 'var(--text-main)'};">${deg}</strong> ${name}</span>`;
        }).join('');

        notes.forEach(noteName => {
            const deg = degreeLabelFor(noteName, notesSet);
            if (!enabledDegrees.has(degreeNumber(deg))) return;

            const isStart = noteName === startNote;
            const color = isStart ? ROOT_COLOR : TONE_COLOR;
            const label = displayMode === 'degrees' ? deg : noteName;

            boardEl.querySelectorAll(`.fret[data-note="${noteName}"]`).forEach(cell => {
                const parentString = cell.closest('.string');
                if (!parentString) return;
                const strIdx = parseInt(parentString.className.match(/string-(\d+)/)[1]);

                const marker = cell.querySelector('.note-marker');
                if (!marker) return;

                marker.textContent = label;
                marker.classList.remove('hidden');
                marker.classList.add('active');
                marker.style.background = color;
                marker.style.boxShadow = `0 0 10px ${color}`;
                marker.style.color = '#fff';

                // 6번줄의 1도는 포지션 앵커: 흰 테두리로 강조
                if (isStart && strIdx === 5) {
                    marker.style.border = '2px solid #fff';
                    marker.style.boxShadow = `0 0 14px ${ROOT_COLOR}`;
                } else {
                    marker.style.border = '1px solid rgba(255, 255, 255, 0.4)';
                }
            });
        });
    };

    keySelect.addEventListener('change', e => {
        keyRoot = e.target.value;
        startNote = keyRoot;
        rebuildStartOptions();
        updateVisualization();
    });

    scaleSelect.addEventListener('change', e => {
        currentScale = e.target.value;
        rebuildStartOptions();
        updateVisualization();
    });

    startSelect.addEventListener('change', e => {
        startNote = e.target.value;
        updateVisualization();
    });

    displayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (displayMode !== btn.dataset.dmode) {
                displayMode = btn.dataset.dmode;
                syncDisplayButtons();
                updateVisualization();
            }
        });
    });

    degreeCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            enabledDegrees = new Set(
                Array.from(degreeCheckboxes).filter(c => c.checked).map(c => parseInt(c.value))
            );
            updateVisualization();
        });
    });

    // Initial render
    rebuildStartOptions();
    syncDisplayButtons();
    updateVisualization();
}
