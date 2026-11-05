const pet = document.querySelector('.calendar-pet, .report-pet, .idle-pet');
const choice = window.AppearanceCatalog?.pet.choices.find(item => item.id === window.AppearanceSettings.get().pet);

if (pet && choice?.sprite?.format === 'atlas') {
    const sprite = choice.sprite;
    const track = pet.parentElement.matches('.calendar-pet-track, .report-pet-track') ? pet.parentElement : null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let manifest;
    let scale;
    let x = 0;
    let direction = -1;
    let action = 'idle';
    let frameIndex = 0;
    let elapsed = 0;
    let lastTime = 0;
    let requestId;
    let previousSpecial;
    let sleepCycles = 0;
    let sleepTarget = 0;

    pet.classList.add('pet-atlas');
    if (track) track.setAttribute('aria-label', `${choice.name}が歩き回る`);
    else pet.setAttribute('aria-label', `${choice.name}が動いている`);

    function viewportWidth() { return sprite.crop.width * scale; }
    function screenWidth() { return Math.min(window.innerWidth, window.visualViewport?.width || window.innerWidth); }
    function limit() {
        const width = track && !pet.classList.contains('is-placed') ? track.clientWidth : screenWidth();
        return Math.max(0, width - viewportWidth());
    }
    function setX(value) {
        x = Math.max(0, Math.min(value, limit()));
        if (track && !pet.classList.contains('is-placed')) pet.style.transform = `translateX(${x}px)`;
        else {
            pet.style.right = 'auto';
            pet.style.left = `${x}px`;
        }
    }
    function setSize() {
        scale = window.innerWidth <= 600 ? sprite.scale.mobile : sprite.scale.desktop;
        pet.style.width = `${viewportWidth()}px`;
        pet.style.height = `${sprite.crop.height * scale}px`;
        if (track) track.style.height = pet.style.height;
        pet.style.backgroundSize = `${sprite.frame.width * sprite.frame.columns * scale}px ${sprite.frame.height * manifest.atlas.rows * scale}px`;
        if (!track && !pet.classList.contains('is-placed') && window.visualViewport?.height < window.innerHeight - 10) {
            const ground = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pet-ground-offset')) || 0;
            pet.style.bottom = 'auto';
            pet.style.top = `${Math.max(0, window.visualViewport.height - pet.offsetHeight - ground)}px`;
        }
        setX(x);
        showFrame();
    }
    function frames() { return manifest.animations[action].frames; }
    function showFrame() {
        if (!manifest) return;
        const index = frames()[frameIndex].atlasIndex;
        pet.dataset.frame = String(index);
        const column = index % sprite.frame.columns;
        const row = Math.floor(index / sprite.frame.columns);
        pet.style.backgroundPosition = `${-(column * sprite.frame.width + sprite.crop.x) * scale}px ${-(row * sprite.frame.height + sprite.crop.y) * scale}px`;
        pet.style.scale = action === 'walk' && direction > 0 ? '-1 1' : '1 1';
        pet.style.clipPath = action === 'grabbed' ? 'inset(0 20% 0)' :
            ['walk', 'land', 'stretch'].includes(action) ? 'inset(39% 0 0)' : 'inset(39% 13% 0)';
    }
    function setAction(next) {
        action = next;
        pet.dataset.action = next;
        frameIndex = 0;
        elapsed = 0;
        showFrame();
    }
    function chooseAction() {
        const candidates = sprite.actions.filter(item => item.id === 'idle' || item.id === 'walk' || item.id !== previousSpecial);
        const total = candidates.reduce((sum, item) => sum + item.weight, 0);
        let ticket = Math.random() * total;
        const selected = candidates.find(item => (ticket -= item.weight) < 0) || candidates.at(-1);
        previousSpecial = ['idle', 'walk'].includes(selected.id) ? undefined : selected.id;
        if (selected.id === 'walk') {
            direction = x <= 0 ? 1 : x >= limit() ? -1 : (Math.random() < 0.5 ? -1 : 1);
        }
        setAction(selected.id);
    }
    function completeAction() {
        if (action === 'grabbed') {
            frameIndex = 2;
            return;
        }
        if (action === 'thrown') {
            frameIndex = 0;
            return;
        }
        if (action === 'curl') {
            sleepCycles = 0;
            sleepTarget = 4 + Math.floor(Math.random() * 4);
            setAction('sleep');
            return;
        }
        if (action === 'sleep' && ++sleepCycles < sleepTarget) {
            frameIndex = 0;
            return;
        }
        if (['sleep', 'stretch', 'land'].includes(action)) {
            setAction(action === 'sleep' ? 'stretch' : 'idle');
            return;
        }
        chooseAction();
    }
    function tick(now) {
        if (!lastTime) lastTime = now;
        const delta = Math.min(now - lastTime, 50);
        lastTime = now;
        if (action === 'walk') {
            setX(x + direction * sprite.actions.find(item => item.id === 'walk').speed * delta / 1000);
            if (x <= 0) direction = 1;
            if (x >= limit()) direction = -1;
        }
        elapsed += delta;
        while (elapsed >= frames()[frameIndex].durationMs) {
            elapsed -= frames()[frameIndex].durationMs;
            frameIndex++;
            if (frameIndex >= frames().length) completeAction();
            showFrame();
        }
        requestId = window.requestAnimationFrame(tick);
    }

    try {
        const response = await fetch(sprite.manifest);
        if (!response.ok) throw new Error(`Pet manifest: ${response.status}`);
        manifest = await response.json();
        const actualFrames = Object.values(manifest.animations).reduce((sum, item) => sum + item.count, 0);
        if (manifest.frameCount !== sprite.expectedFrames || actualFrames !== sprite.expectedFrames) {
            throw new Error('The pet manifest frame count does not match its catalog definition.');
        }
        const atlas = new Image();
        atlas.src = choice.images.atlas;
        await atlas.decode();
        const initialLeft = pet.getBoundingClientRect().left;
        pet.style.backgroundImage = `url("${choice.images.atlas}")`;
        pet.style.backgroundRepeat = 'no-repeat';
        setSize();
        setX(track ? limit() : initialLeft);
        setAction('idle');
        pet.classList.add('is-animating');
        if (!reducedMotion.matches) requestId = window.requestAnimationFrame(tick);
        pet.addEventListener('pet:pickup', () => setAction('grabbed'));
        pet.addEventListener('pet:release', () => setAction('thrown'));
        pet.addEventListener('pet:landed', () => setAction(reducedMotion.matches ? 'idle' : 'land'));
        window.addEventListener('resize', setSize);
        reducedMotion.addEventListener('change', () => {
            if (requestId !== undefined) window.cancelAnimationFrame(requestId);
            requestId = undefined;
            lastTime = 0;
            setAction('idle');
            if (!reducedMotion.matches) requestId = window.requestAnimationFrame(tick);
        });
        window.addEventListener('pagehide', () => window.cancelAnimationFrame(requestId), { once: true });
    } catch (error) {
        console.error('Could not start the selected pet.', error);
    }
}
