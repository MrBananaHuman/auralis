// js/modes/mode10.js — Scale Explorer
// 스케일 전체를 프렛보드에 표시. 음이름 ↔ 도수(1-7) 표시 전환,
// 원하는 도수만 필터, root(1도)는 자유 지정. 6번줄 root 위치를 앵커로 강조.
import { NOTES, NOTE_TO_INT, getNoteName } from '../musicTheory.js';
import { initFretboard } from '../fretboard.js';

export function mode10_render(container, currentKey = 'C') {
    const SCALE_TYPES = {
        'Major':            { intervals: [0, 2, 4, 5, 7, 9, 11],  degrees: ['1', '2', '3', '4', '5', '6', '7'] },
        'Natural Minor':    { intervals: [0, 2, 3, 5, 7, 8, 10],  degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
        'Harmonic Minor':   { intervals: [0, 2, 3, 5, 7, 8, 11],  degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
        'Melodic Minor':    { intervals: [0, 2, 3, 5, 7, 9, 11],  degrees: ['1', '2', 'b3', '4', '5', '6', '7'] },
        'Major Pentatonic': { intervals: [0, 2, 4, 7, 9],         degrees: ['1', '2', '3', '5', '6'] },
        'Minor Pentatonic': { intervals: [0, 3, 5, 7, 10],        degrees: ['1', 'b3', '4', '5', 'b7'] },
        'Blues':            { intervals: [0, 3, 5, 6, 7, 10],     degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
        'Dorian':           { intervals: [0, 2, 3, 5, 7, 9, 10],  degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
        'Mixolydian':       { intervals: [0, 2, 4, 5, 7, 9, 10],  degrees: ['1', '2', '3', '4', '5', '6', 'b7'] },
        'Lydian':           { intervals: [0, 2, 4, 6, 7, 9, 11],  degrees: ['1', '2', '3', '#4', '5', '6', '7'] }
    };

    let currentRoot = currentKey in NOTE_TO_INT ? currentKey : 'C';
    let currentScale = 'Major';
    let displayMode = 'degrees'; // 'notes' | 'degrees'
    let enabledDegrees = new Set([1, 2, 3, 4, 5, 6, 7]); // 도수 번호(b/# 무시) 필터

    const ROOT_COLOR = '#f59e0b';
    const TONE_COLOR = '#6366f1';

    const html = `
        <div class="glass-panel chord-explorer">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2>Scale Explorer</h2>
                <p>View any scale across the neck — as note names or degrees, anchored on the 6th string.</p>
            </div>

            <div class="card glass" style="margin-bottom: 1.5rem; padding: 1rem; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: center; align-items: end; gap: 1.25rem; flex-wrap: wrap;">
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Root (1도)</label>
                        <div class="custom-select-wrapper">
                            <select id="scale-root-select" class="custom-select" style="min-width: 80px;">
                                ${NOTES.map(n => `<option value="${n}" ${n === currentRoot ? 'selected' : ''}>${n}</option>`).join('')}
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
                            <span style="color: var(--text-muted);">Root</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${TONE_COLOR}; box-shadow: 0 0 5px ${TONE_COLOR};"></span>
                            <span style="color: var(--text-muted);">Scale Tones</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${ROOT_COLOR}; border: 2px solid #fff;"></span>
                            <span style="color: var(--text-muted);">6번줄 Root (앵커)</span>
                        </div>
                    </div>
                </div>

                <p id="scale-summary" style="margin-top: 0.9rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;"></p>
            </div>

            <div id="scale-board"></div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons({ root: container });

    const rootSelect = container.querySelector('#scale-root-select');
    const scaleSelect = container.querySelector('#scale-type-select');
    const displayBtns = container.querySelectorAll('.scale-display-btn');
    const degreeCheckboxes = container.querySelectorAll('.scale-degree-checkbox');
    const summaryEl = container.querySelector('#scale-summary');

    initFretboard('scale-board');
    const boardEl = container.querySelector('#scale-board');

    // 도수 문자열('b3', '#4')에서 번호만 추출
    const degreeNumber = deg => parseInt(deg.replace(/[b#]/g, ''), 10);

    const syncDisplayButtons = () => {
        displayBtns.forEach(btn => {
            const active = btn.dataset.dmode === displayMode;
            btn.style.background = active ? 'var(--primary)' : 'transparent';
            btn.style.color = active ? '#fff' : 'rgba(255,255,255,0.4)';
        });
    };

    const updateVisualization = () => {
        // 보드 초기화
        boardEl.querySelectorAll('.note-marker').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('active');
            m.textContent = '';
            m.style.border = 'none';
        });

        const { intervals, degrees } = SCALE_TYPES[currentScale];
        const rootInt = NOTE_TO_INT[currentRoot];

        // 요약 줄: 전체 스케일 구성음
        summaryEl.innerHTML = intervals.map((iv, i) => {
            const name = getNoteName(rootInt + iv);
            const deg = degrees[i];
            const on = enabledDegrees.has(degreeNumber(deg));
            return `<span style="opacity: ${on ? 1 : 0.3}; margin: 0 0.4rem;"><strong style="color: ${i === 0 ? ROOT_COLOR : 'var(--text-main)'};">${deg}</strong> ${name}</span>`;
        }).join('');

        intervals.forEach((iv, i) => {
            const deg = degrees[i];
            if (!enabledDegrees.has(degreeNumber(deg))) return;

            const noteName = getNoteName(rootInt + iv);
            const isRoot = i === 0;
            const color = isRoot ? ROOT_COLOR : TONE_COLOR;
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

                // 6번줄(가장 낮은 줄) root는 포지션 앵커: 흰 테두리로 강조
                if (isRoot && strIdx === 5) {
                    marker.style.border = '2px solid #fff';
                    marker.style.boxShadow = `0 0 14px ${ROOT_COLOR}`;
                } else {
                    marker.style.border = '1px solid rgba(255, 255, 255, 0.4)';
                }
            });
        });
    };

    rootSelect.addEventListener('change', e => {
        currentRoot = e.target.value;
        updateVisualization();
    });

    scaleSelect.addEventListener('change', e => {
        currentScale = e.target.value;
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
    syncDisplayButtons();
    updateVisualization();
}
