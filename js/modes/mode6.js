// js/modes/mode6.js
import { playNote, playChord, stopAll } from '../audioEngine.js';
import { pickRandom, INTERVAL_NAMES, getNoteName, getScale, MAJOR_DIATONIC_CHORDS, getChordNotes } from '../musicTheory.js';
import { initFretboard, clearFretboard, highlightRoot, highlightTargetRoot, onFretClick } from '../fretboard.js';

export function mode6_render(container, currentKey) {
    let currentRootMidi = null;
    let targetTones = []; // { degree: 3, midi: X, found: false }
    let userSelections = [];
    let isAnswerRevealed = false;
    let currentChordInfo = null;

    const html = `
        <div class="glass-panel geometry-explorer">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2 style="font-size: 2rem; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Functional Fretboard</h2>
                <p style="color: var(--text-muted);">Complete the chord shapes to master fretboard geometry.</p>
            </div>

            <div class="explorer-layout" style="display: flex; flex-direction: column; gap: 2rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div class="explorer-controls" style="display: flex; flex-direction: column; gap: 1rem;">
                        <div id="context-badge" class="theory-badge" style="justify-content: flex-start;">
                            <span id="degree-text">Degree: ---</span>
                            <span id="chord-type-text">Chord: ---</span>
                        </div>

                        <div id="target-info-card" class="glass-panel" style="background: rgba(99, 102, 241, 0.05); border: 2px solid var(--primary); padding: 2rem; text-align: left; position: relative;">
                            <div style="position: absolute; top: 0; right: 0; padding: 0.5rem 1rem; background: var(--primary); color: white; font-size: 0.7rem; font-weight: 800; border-bottom-left-radius: 12px; letter-spacing: 1px;">MISSION</div>
                            <span style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">Complete the Shape</span>
                            <div id="interval-name-display" style="font-size: 1.8rem; font-weight: 900; color: var(--text-main);">Find 3rd & 5th</div>
                            <div id="notes-display" style="font-size: 1.1rem; color: var(--primary); margin-top: 0.5rem; font-weight: 600;">---</div>
                        </div>

                        <div style="display: flex; gap: 1rem; margin-top: auto;">
                            <button class="play-action-btn" id="play-btn" style="margin: 0; width: 60px; height: 60px;">
                                <i data-lucide="play"></i>
                            </button>
                            <button class="btn-primary" id="next-btn" style="background: var(--success); flex: 1; margin: 0; justify-content: center;">
                                Next Chord <i data-lucide="arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <div class="explorer-visuals" style="background: rgba(255,255,255,0.02); border-radius: 20px; padding: 1rem; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center;">
                        <div class="staff-container" style="width: 100%; max-width: 400px; position: relative;">
                            <svg id="staff-svg" viewBox="0 0 240 140" preserveAspectRatio="xMidYMid meet">
                                <rect x="0" y="0" width="240" height="140" fill="white" rx="12" />
                                <line x1="20" y1="40" x2="220" y2="40" stroke="#ddd" stroke-width="1" />
                                <line x1="20" y1="55" x2="220" y2="55" stroke="#ddd" stroke-width="1" />
                                <line x1="20" y1="70" x2="220" y2="70" stroke="#ddd" stroke-width="1" />
                                <line x1="20" y1="85" x2="220" y2="85" stroke="#ddd" stroke-width="1" />
                                <line x1="20" y1="100" x2="220" y2="100" stroke="#ddd" stroke-width="1" />
                                <text x="25" y="85" fill="#333" font-size="45" font-family="serif">𝄞</text>
                                <g id="staff-notes"></g>
                            </svg>
                            <div id="chord-symbol" style="position: absolute; top: 15px; right: 25px; font-weight: 900; color: var(--primary); font-size: 1.5rem;"></div>
                        </div>
                        <div id="status-message" style="margin-top: 1.5rem; font-weight: 700; color: var(--text-muted); font-size: 1.1rem; text-align: center;">Press Play to start</div>
                    </div>
                </div>
            </div>

            <div id="harmony-map-container" class="glass-panel" style="margin-top: 2rem; padding: 1.5rem; overflow-x: auto; background: rgba(0,0,0,0.2);">
                <div style="display: flex; gap: 0.5rem; min-width: 800px; justify-content: space-between;"></div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons({ root: container });

    const playBtn = container.querySelector('#play-btn');
    const nextBtn = container.querySelector('#next-btn');
    const statusMessage = container.querySelector('#status-message');
    const intervalNameDisplay = container.querySelector('#interval-name-display');
    const notesDisplay = container.querySelector('#notes-display');
    const degreeText = container.querySelector('#degree-text');
    const chordTypeText = container.querySelector('#chord-type-text');
    const chordSymbol = container.querySelector('#chord-symbol');
    const harmonyMap = container.querySelector('#harmony-map-container div');

    initFretboard('fretboard-container');

    const generateRound = () => {
        try {
            stopAll();
            clearFretboard();
            
            // Clear all state classes from fret cells and markers
            document.querySelectorAll('.fret').forEach(f => {
                f.classList.remove('target-root-fret', 'correct-target', 'wrong-target');
            });
            document.querySelectorAll('.note-marker').forEach(m => {
                m.classList.remove('target-root', 'active', 'midi-user', 'root-marker');
                m.style.background = ''; // Clear any manual overrides
            });

            userSelections = [];
            isAnswerRevealed = false;
            statusMessage.textContent = 'Find the 3rd and 5th on the fretboard!';
            statusMessage.className = '';
            nextBtn.classList.add('hidden');

            const scaleNotes = getScale(currentKey);
            if (!scaleNotes || scaleNotes.length === 0) throw new Error("Failed to generate scale notes.");
            
            renderHarmonyMap(scaleNotes);

            const randomDegree = Math.floor(Math.random() * 7) + 1;
            const diatonicChord = MAJOR_DIATONIC_CHORDS[randomDegree - 1];
            
            const columns = harmonyMap.querySelectorAll('.map-col');
            columns.forEach((col, idx) => {
                if (idx === randomDegree - 1) col.classList.add('active-focus');
                else col.classList.remove('active-focus');
            });

            const rootNoteFull = scaleNotes[randomDegree - 1];
            // Expand range to cover higher octaves (E2 to B4)
            currentRootMidi = Math.floor(Math.random() * 32) + 40; 
            const rootBase = rootNoteFull.match(/^[A-Ga-g][b#]?/)[0];
            while (getNoteName(currentRootMidi) !== rootBase) currentRootMidi++;

            // Calculate 3rd and 5th
            const semi3 = (diatonicChord.type === 'Major' ? 4 : 3);
            const semi5 = (diatonicChord.type === 'Diminished' ? 6 : 7);

            targetTones = [
                { degree: 3, midi: currentRootMidi + semi3, name: getNoteName(currentRootMidi + semi3) },
                { degree: 5, midi: currentRootMidi + semi5, name: getNoteName(currentRootMidi + semi5) }
            ];

            currentChordInfo = {
                rootBase,
                type: diatonicChord.type,
                suffix: diatonicChord.suffix,
                roman: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'][randomDegree - 1]
            };

            updateUI();
            highlightRoot(currentRootMidi);
            
            // Pick ONE random cell among all roots
            // Expand allowed strings to include 2nd, 3rd, 4th strings
            const rootCells = document.querySelectorAll(`.fret[data-midi="${currentRootMidi}"]`);
            if (rootCells.length > 0) {
                // strings 1-6 map to indices 0-5. 
                // We want to favor strings 2, 3, 4, 5, 6
                const allowedStrings = ['string-1', 'string-2', 'string-3', 'string-4', 'string-5']; 
                let filteredCells = Array.from(rootCells).filter(cell => {
                    const parentString = cell.closest('.string');
                    const fretNum = parseInt(cell.dataset.fret);
                    return parentString && 
                           allowedStrings.some(cls => parentString.classList.contains(cls)) &&
                           fretNum >= 0 && fretNum <= 12; 
                });

                const finalCells = filteredCells.length > 0 ? filteredCells : Array.from(rootCells);
                
                const randomCell = pickRandom(finalCells);
                randomCell.classList.add('target-root-fret');
                const marker = randomCell.querySelector('.note-marker');
                if (marker) {
                    marker.classList.remove('hidden');
                    marker.classList.add('target-root', 'root-marker');
                    marker.textContent = 'R';
                }
            }

            const rootOct = Math.floor(currentRootMidi/12) - 1;
            const t3Oct = Math.floor(targetTones[0].midi/12) - 1;
            const t5Oct = Math.floor(targetTones[1].midi/12) - 1;

            drawStaff([
                { note: `${rootBase}${rootOct}`, label: 'R' },
                { note: `${targetTones[0].name}${t3Oct}`, label: '3rd' },
                { note: `${targetTones[1].name}${t5Oct}`, label: '5th' }
            ]);
            playRound();
        } catch (err) {
            console.error(err);
            statusMessage.innerHTML = `<span style="color: #ef4444;">Error: ${err.message}</span>`;
        }
    };

    function updateUI() {
        if (!currentChordInfo) return;
        degreeText.textContent = `Degree: ${currentChordInfo.roman} (${currentChordInfo.rootBase})`;
        chordTypeText.textContent = `Chord: ${currentChordInfo.type}`;
        chordSymbol.textContent = `${currentChordInfo.rootBase}${currentChordInfo.suffix}`;
        
        intervalNameDisplay.textContent = `Complete ${currentChordInfo.rootBase} ${currentChordInfo.type}`;
        notesDisplay.textContent = `Find: ${targetTones[0].name} (3rd) & ${targetTones[1].name} (5th)`;
    }

    function renderHarmonyMap(scaleNotes) {
        harmonyMap.innerHTML = '';
        scaleNotes.forEach((noteFull, idx) => {
            const noteBase = noteFull.match(/^[A-Ga-g][b#]?/)[0];
            const chord = MAJOR_DIATONIC_CHORDS[idx];
            const roman = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][idx];
            const col = document.createElement('div');
            col.className = 'map-col';
            col.innerHTML = `
                <div class="map-chord">${chord.type === 'Major' ? 'M7' : (chord.type === 'Minor' ? 'm7' : 'm7b5')}</div>
                <div class="map-note">${noteBase}</div>
                <div class="map-degree">${idx + 1}</div>
                <div class="map-roman">${roman}</div>
            `;
            harmonyMap.appendChild(col);
        });
    }

    function drawStaff(notes) {
        const g = container.querySelector('#staff-notes');
        if (!g) return;
        g.innerHTML = '';
        const midiToY = (noteStr) => {
            const noteName = noteStr.match(/^[A-Ga-g][b#]?/)[0];
            const octave = parseInt(noteStr.slice(-1));
            const staffSteps = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
            const rootSteps = staffSteps[noteName[0]];
            // Apply visual +2 octave offset so E2-Eb3 notes sit on the staff (E4-Eb5 style)
            const totalSteps = (octave - 2) * 7 + rootSteps - 6; 
            return 70 - (totalSteps * 7.5);
        };

        notes.forEach((obj, idx) => {
            const y = midiToY(obj.note);
            const x = 70 + idx * 50;
            if (y <= 30 || y >= 110) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", x - 15); line.setAttribute("y1", y <= 30 ? 25 : 115);
                line.setAttribute("x2", x + 15); line.setAttribute("y2", y <= 30 ? 25 : 115);
                line.setAttribute("stroke", "#bbb");
                g.appendChild(line);
            }
            const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            ellipse.setAttribute("cx", x); ellipse.setAttribute("cy", y);
            ellipse.setAttribute("rx", 7); ellipse.setAttribute("ry", 5);
            ellipse.setAttribute("fill", idx === 0 ? "var(--primary)" : "#333");
            g.appendChild(ellipse);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x); text.setAttribute("y", y - 12);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", idx === 0 ? "var(--primary)" : "#666");
            text.setAttribute("font-size", "10");
            text.setAttribute("font-weight", "bold");
            text.textContent = obj.label;
            g.appendChild(text);
        });
    }

    const playRound = () => {
        stopAll();
        const rootOct = Math.floor(currentRootMidi/12) - 1;
        const t3Oct = Math.floor(targetTones[0].midi/12) - 1;
        const t5Oct = Math.floor(targetTones[1].midi/12) - 1;
        const notes = [`${currentChordInfo.rootBase}${rootOct}`, `${targetTones[0].name}${t3Oct}`, `${targetTones[1].name}${t5Oct}`];
        playChord(notes, '2n');
    };

    playBtn.addEventListener('click', () => {
        if (!currentRootMidi) generateRound();
        else playRound();
    });

    nextBtn.addEventListener('click', generateRound);

    onFretClick(({ midi, element }) => {
        if (isAnswerRevealed || !currentRootMidi) return;
        
        // Prevent double selecting same fret
        if (userSelections.some(s => s.element === element)) return;

        userSelections.push({ midi, element });
        
        // Visual feedback for click
        const marker = element.querySelector('.note-marker');
        if (marker) {
            marker.classList.remove('hidden');
            marker.classList.add('active', 'midi-user');
            marker.textContent = userSelections.length === 1 ? '3' : '5';
        }

        if (userSelections.length === 2) {
            validateSelections();
        }
    });

    function validateSelections() {
        isAnswerRevealed = true;
        const selectedNoteNames = userSelections.map(s => getNoteName(s.midi));
        const targetNoteNames = targetTones.map(t => t.name);
        
        // Check if the user's selections contain both the target 3rd and 5th note names
        const allCorrect = targetNoteNames.every(name => selectedNoteNames.includes(name));

        if (allCorrect) {
            statusMessage.textContent = "Perfect Shape! You completed the chord.";
            statusMessage.className = 'status-correct';
            userSelections.forEach(s => s.element.classList.add('correct-target'));
        } else {
            statusMessage.innerHTML = "Incorrect Shape.<br>All correct 3rd and 5th positions are now shown.";
            statusMessage.className = 'status-wrong';
            userSelections.forEach(s => {
                if (targetNoteNames.includes(getNoteName(s.midi))) s.element.classList.add('correct-target');
                else s.element.classList.add('wrong-target');
            });
        }

        const targetMidis = targetTones.map(t => t.midi); // Keep for original octave styling

        // Highlight ALL occurrences of the target notes (3rd and 5th)
        targetTones.forEach(target => {
            const allMatchingFrets = document.querySelectorAll(`.fret[data-note="${target.name}"]`);
            allMatchingFrets.forEach(cell => {
                const marker = cell.querySelector('.note-marker');
                if (marker) {
                    marker.classList.remove('hidden', 'midi-user');
                    marker.classList.add('active');
                    
                    // Distinguish between the 'answer' octaves and 'other' octaves
                    if (targetMidis.includes(parseInt(cell.dataset.midi))) {
                        cell.classList.add('correct-target');
                        marker.style.background = 'var(--primary)'; // Dark indigo for the target octave
                        marker.style.opacity = '1';
                    } else {
                        // Other octaves - slightly dimmer or different look
                        marker.style.background = 'rgba(99, 102, 241, 0.4)'; 
                        marker.style.border = '1px dashed var(--primary)';
                        marker.style.opacity = '0.7';
                    }
                    marker.textContent = target.degree;
                }
            });
        });

        playRound();
        nextBtn.classList.remove('hidden');
    }
}
