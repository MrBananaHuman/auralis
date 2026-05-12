import re

js_files = [
    'js/musicTheory.js',
    'js/audioEngine.js',
    'js/fretboard.js',
    'js/midiHandler.js',
    'js/modes/mode1.js',
    'js/modes/mode2.js',
    'js/modes/mode3.js',
    'js/modes/mode4.js',
    'js/modes/mode5.js',
    'js/modes/mode6.js',
    'js/modes/mode7.js',
    'js/modes/mode8.js',
    'js/app.js'
]

combined_js = ""
for f in js_files:
    with open(f, 'r') as file:
        content = file.read()
        
        # Remove static import statements
        content = re.sub(r'import\s+\{.*?\}\s+from\s+[\'"].*?[\'"];?', '', content, flags=re.DOTALL)
        content = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?', '', content)
        
        # Remove export keyword
        content = re.sub(r'export\s+', '', content)
        
        # Fix dynamic import() in mode7.js — replace with direct reference
        content = re.sub(
            r"import\('\.\./musicTheory\.js'\)\.then\(mt\s*=>\s*\{",
            "Promise.resolve({ MAJOR_DIATONIC_CHORDS, getScale, getChordNotes }).then(mt => {",
            content
        )
        
        # Change top-level const/let to var to allow redeclarations
        content = re.sub(r'^const\s+', 'var ', content, flags=re.MULTILINE)
        content = re.sub(r'^let\s+', 'var ', content, flags=re.MULTILINE)
        
        combined_js += f"\n// --- {f} ---\n" + content

# Read CSS
with open('css/style.css', 'r') as file:
    css_content = file.read()

# Read HTML
with open('index.html', 'r') as file:
    html_content = file.read()

# 1. Replace CSS link with inline styles
html_content = re.sub(
    r'<link\s+rel="stylesheet"\s+href="css/style\.css">',
    f"<style>\n{css_content}\n</style>",
    html_content
)

# 2. Remove CDN script tags from <head> (we'll add them at the bottom)
html_content = re.sub(r'\s*<script\s+src="https://cdnjs\.cloudflare[^"]*">\s*</script>', '', html_content)
html_content = re.sub(r'\s*<script\s+src="https://unpkg\.com/lucide[^"]*">\s*</script>', '', html_content)

# 3. Remove module script tags
html_content = re.sub(r'\s*<script\s+type="module"[^>]*>\s*</script>', '', html_content)

# 4. Remove the lucide.createIcons() inline script
html_content = re.sub(r'\s*<script>\s*lucide\.createIcons\(\);\s*</script>', '', html_content)

# 5. Build the final script block and inject before </body>
html_content = html_content.replace('</body>', f'''
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
    <script>
    try {{
        {combined_js}
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }} catch(e) {{
        var errEl = document.getElementById('error-content');
        var errBox = document.getElementById('error-display');
        if (errEl && errBox) {{
            errBox.style.display = 'block';
            errEl.innerText += 'INIT: ' + e.message + '\\n' + (e.stack || '') + '\\n';
        }}
        console.error('Auralis Init Error:', e);
    }}
    </script>
</body>
''')

with open('ear_trainer_standalone.html', 'w') as f:
    f.write(html_content)

print("Successfully generated ear_trainer_standalone.html")
