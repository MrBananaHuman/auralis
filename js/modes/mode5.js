// js/modes/mode5.js
import { stopAll, playChord } from '../audioEngine.js';
import { getChordNotes, NOTES, getChordFormula } from '../musicTheory.js';
import { initFretboard, highlightNotesOnFretboard, clearFretboard } from '../fretboard.js';

export function mode5_render(container) {
    let currentRoot = 'C';
    let currentType = 'Major';
    let currentStringSet = [0, 1, 2, 3]; // Default to 4 strings: 1, 2, 3, 4
    let currentVoicing = 'all'; // Default voicing: All Notes

    const chordTypes = ['Major', 'Minor', 'Diminished', 'Augmented'];
    const chordTypeTo7th = {
        'Major': 'Maj7',
        'Minor': 'Min7',
        'Diminished': 'Dim7',
        'Augmented': 'Aug7'
    };

    const html = `
        <div class="glass-panel chord-explorer">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2>Chord Explorer</h2>
                <p>Master 7th chords and their intervals across the neck.</p>
            </div>

            <div class="explorer-layout">
                <div class="explorer-controls">
                    <div class="settings-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
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
                        <div class="setting-item">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">Voicing Shape</label>
                            <div class="custom-select-wrapper">
                                <select id="voicing-select" class="custom-select">
                                    <option value="all" ${currentVoicing === 'all' ? 'selected' : ''}>All Notes</option>
                                    <option value="root" ${currentVoicing === 'root' ? 'selected' : ''}>Root Position</option>
                                    <option value="1st" ${currentVoicing === '1st' ? 'selected' : ''}>1st Inversion</option>
                                    <option value="2nd" ${currentVoicing === '2nd' ? 'selected' : ''}>2nd Inversion</option>
                                    <option value="3rd" ${currentVoicing === '3rd' ? 'selected' : ''}>3rd Inversion</option>
                                </select>
                            </div>
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
    const voicingSelect = container.querySelector('#voicing-select');
    const playBtn = container.querySelector('#play-chord-btn');

    // Setup Fretboard
    initFretboard('fretboard-container');

    // Helper: Highlights clustered inversion shapes rather than drawing all notes
    const highlightVoicingShapeOnFretboard = (notes, formula, voicingMode, stringSet) => {
        clearFretboard();

        // 1. If "All Notes" or string set is not exactly 3 or 4 strings, show all notes
        if (voicingMode === 'all' || (stringSet.length !== 3 && stringSet.length !== 4)) {
            const labelsMap = {};
            notes.forEach((fullNote, idx) => {
                const noteName = fullNote.match(/^[A-Ga-g][b#]?/)[0];
                labelsMap[noteName] = formula[idx];
            });
            highlightNotesOnFretboard(notes, labelsMap, stringSet);
            return;
        }

        // 2. Sort stringSet from lowest pitch (highest index, e.g. 5 for low E) to highest pitch
        const sortedStrings = [...stringSet].sort((a, b) => b - a);

        // Map inversions to target scale degrees (Low to High string order)
        let targetDegrees = [];
        if (stringSet.length === 4) {
            // Drop 2 chord voicing formulas
            if (voicingMode === 'root') targetDegrees = [formula[0], formula[2], formula[3], formula[1]]; // R, 5, 7, 3
            else if (voicingMode === '1st') targetDegrees = [formula[1], formula[3], formula[0], formula[2]]; // 3, 7, 1, 5
            else if (voicingMode === '2nd') targetDegrees = [formula[2], formula[0], formula[1], formula[3]]; // 5, 1, 3, 7
            else if (voicingMode === '3rd') targetDegrees = [formula[3], formula[1], formula[2], formula[0]]; // 7, 3, 5, 1
        } else if (stringSet.length === 3) {
            // Closed Triad voicing formulas
            if (voicingMode === 'root') targetDegrees = [formula[0], formula[1], formula[2]]; // 1, 3, 5
            else if (voicingMode === '1st') targetDegrees = [formula[1], formula[2], formula[0]]; // 3, 5, 1
            else if (voicingMode === '2nd') targetDegrees = [formula[2], formula[0], formula[1]]; // 5, 1, 3
        }

        if (targetDegrees.length === 0) return;

        // Map targetDegrees to note names
        const stringNoteNames = targetDegrees.map(deg => {
            const idx = formula.indexOf(deg);
            if (idx === -1) return null;
            return notes[idx].match(/^[A-Ga-g][b#]?/)[0];
        });

        if (stringNoteNames.includes(null)) return;

        // Collect all fret cells for each note on their assigned string
        const stringFrets = sortedStrings.map((strIdx, i) => {
            const noteName = stringNoteNames[i];
            const cells = document.querySelectorAll(`#fretboard-container .string-${strIdx} .fret[data-note="${noteName}"]`);
            return Array.from(cells).map(cell => ({
                fret: parseInt(cell.dataset.fret),
                note: noteName,
                degree: targetDegrees[i],
                cell: cell
            }));
        });

        // Generate Cartesian product (combinations of frets across the selected strings)
        const combinations = [];
        const generateCombos = (strIdx, currentCombo) => {
            if (strIdx === stringFrets.length) {
                combinations.push([...currentCombo]);
                return;
            }
            stringFrets[strIdx].forEach(fretData => {
                currentCombo.push(fretData);
                generateCombos(strIdx + 1, currentCombo);
                currentCombo.pop();
            });
        };
        generateCombos(0, []);

        // Filter valid voicing shapes where the maximum fret span is <= 4 frets (ignoring open strings 0)
        const validCombinations = combinations.filter(combo => {
            const frets = combo.map(c => c.fret).filter(f => f > 0);
            if (frets.length <= 1) return true;
            const maxFret = Math.max(...frets);
            const minFret = Math.min(...frets);
            return (maxFret - minFret) <= 4;
        });

        // Activate the markers for valid shape combinations
        validCombinations.forEach(combo => {
            combo.forEach(fretData => {
                const marker = fretData.cell.querySelector('.note-marker');
                if (marker) {
                    marker.textContent = fretData.degree;
                    marker.classList.remove('hidden');
                    marker.classList.add('active');
                }
            });
        });
    };

    const updateVisualization = () => {
        const type7th = chordTypeTo7th[currentType] || currentType;
        const notes = getChordNotes(currentRoot, type7th, 4); // Use 4th octave for staff
        const formula = getChordFormula(type7th);
        
        // Fretboard highlight using voicing filter
        highlightVoicingShapeOnFretboard(notes, formula, currentVoicing, currentStringSet);

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

    voicingSelect.addEventListener('change', (e) => {
        currentVoicing = e.target.value;
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
    updateVisualization();
}
