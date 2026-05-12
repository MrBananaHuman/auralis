import { initFretboard, clearFretboard } from '../fretboard.js';

export function mode8_render(container, currentKey) {
    container.innerHTML = `
        <div class="mode-container caged-mode">
            <div class="builder-dashboard glass">
                <div class="dashboard-main caged-dashboard">
                    <div class="chord-info-pill">
                        <div id="caged-chord-name" class="chord-name-compact">C Major</div>
                        <div id="caged-shape-name" class="chord-details-compact">C-Form</div>
                    </div>
                </div>
            </div>

            <!-- Root Selector -->
            <div class="caged-controls card glass">
                <div class="selector-section">
                    <div class="section-label">Root Note</div>
                    <div id="caged-root-btns" class="compact-grid"></div>
                </div>
                
                <div class="selector-section">
                    <div class="section-label">CAGED Form</div>
                    <div id="caged-shape-btns" class="caged-tabs">
                        <button class="caged-tab active" data-shape="C">C Form</button>
                        <button class="caged-tab" data-shape="A">A Form</button>
                        <button class="caged-tab" data-shape="G">G Form</button>
                        <button class="caged-tab" data-shape="E">E Form</button>
                        <button class="caged-tab" data-shape="D">D Form</button>
                    </div>
                </div>
            </div>

            <div id="fretboard-container-mode8" class="builder-fretboard-large glass"></div>
        </div>
    `;

    initFretboard('fretboard-container-mode8');

    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    let currentRoot = 'C';
    let currentShape = 'C';

    const rootBtnsContainer = document.getElementById('caged-root-btns');
    roots.forEach(r => {
        const btn = document.createElement('button');
        btn.className = `mini-btn ${r === currentRoot ? 'active' : ''}`;
        btn.textContent = r;
        btn.addEventListener('click', () => {
            currentRoot = r;
            rootBtnsContainer.querySelectorAll('.mini-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCAGED();
        });
        rootBtnsContainer.appendChild(btn);
    });

    const shapeBtns = document.querySelectorAll('.caged-tab');
    shapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentShape = btn.dataset.shape;
            shapeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCAGED();
        });
    });

    const cagedShapes = {
        'C': { rootString: 4, offsets: { 4: { f: 0, r: 'R' }, 3: { f: -1, r: '3' }, 2: { f: -3, r: '5' }, 1: { f: -2, r: 'R' }, 0: { f: -3, r: '3' } } },
        'A': { rootString: 4, offsets: { 4: { f: 0, r: 'R' }, 3: { f: 2, r: '5' }, 2: { f: 2, r: 'R' }, 1: { f: 2, r: '3' }, 0: { f: 0, r: '5' } } },
        'G': { rootString: 5, offsets: { 5: { f: 0, r: 'R' }, 4: { f: -1, r: '3' }, 3: { f: -3, r: '5' }, 2: { f: -3, r: 'R' }, 1: { f: -3, r: '3' }, 0: { f: 0, r: 'R' } } },
        'E': { rootString: 5, offsets: { 5: { f: 0, r: 'R' }, 4: { f: 2, r: '5' }, 3: { f: 2, r: 'R' }, 2: { f: 1, r: '3' }, 1: { f: 0, r: '5' }, 0: { f: 0, r: 'R' } } },
        'D': { rootString: 3, offsets: { 3: { f: 0, r: 'R' }, 2: { f: 2, r: '5' }, 1: { f: 3, r: 'R' }, 0: { f: 2, r: '3' } } }
    };

    function updateCAGED() {
        document.getElementById('caged-chord-name').textContent = `${currentRoot} Major`;
        document.getElementById('caged-shape-name').textContent = `${currentShape}-Form`;
        clearFretboard();

        // Clear previous CAGED custom classes
        document.querySelectorAll('#fretboard-container-mode8 .fret').forEach(f => {
            f.classList.remove('caged-root', 'caged-chord-tone');
            const m = f.querySelector('.note-marker');
            if (m) m.classList.remove('caged-root-marker', 'caged-chord-tone-marker');
        });

        const shapeConfig = cagedShapes[currentShape];
        const minOffset = Math.min(...Object.values(shapeConfig.offsets).map(o => o.f));
        
        // Find the lowest valid anchor fret for the root note on the rootString
        const stringDiv = document.querySelector(`#fretboard-container-mode8 .string-${shapeConfig.rootString}`);
        const frets = stringDiv.querySelectorAll('.fret');
        
        let anchorFret = -1;
        // Search from fret 0 upwards
        for (let i = 0; i < frets.length; i++) {
            const f = frets[i];
            // Get base note without octave. data-note might be "C4", "C#3", etc.
            // But wait, fretboard.js getNoteName returns "C", "C#".
            const noteName = f.dataset.note.match(/^[A-Ga-g][b#]?/)[0];
            if (noteName === currentRoot) {
                const fretNum = parseInt(f.dataset.fret);
                if (fretNum + minOffset >= 0 && fretNum + minOffset <= 15) { // Ensure entire shape fits
                    anchorFret = fretNum;
                    break; // Pick the first valid one
                }
            }
        }

        if (anchorFret === -1) {
            console.error("Could not find a valid anchor fret for this shape on the fretboard.");
            return;
        }

        // Draw the shape
        Object.keys(shapeConfig.offsets).forEach(strIdx => {
            const offsetInfo = shapeConfig.offsets[strIdx];
            const targetFretNum = anchorFret + offsetInfo.f;
            
            const cell = document.querySelector(`#fretboard-container-mode8 .string-${strIdx} .fret[data-fret="${targetFretNum}"]`);
            if (cell) {
                const marker = cell.querySelector('.note-marker');
                marker.classList.remove('hidden');
                
                if (offsetInfo.r === 'R') {
                    cell.classList.add('caged-root');
                    marker.classList.add('caged-root-marker');
                } else {
                    cell.classList.add('caged-chord-tone');
                    marker.classList.add('caged-chord-tone-marker');
                }
                marker.textContent = offsetInfo.r; // Display interval (R, 3, 5)
            }
        });
    }

    // Initial render
    setTimeout(updateCAGED, 100);
}
