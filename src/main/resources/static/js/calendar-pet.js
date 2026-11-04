(() => {
    const track = document.querySelector('.calendar-pet-track, .report-pet-track');
    const pet = track?.querySelector('.calendar-pet, .report-pet');
    if (!pet) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const petGroup = window.AppearanceCatalog.pet;
    const selectedPet = petGroup.choices.find(choice => choice.id === window.AppearanceSettings.get().pet);
    const defaultPet = petGroup.choices.find(choice => choice.id === petGroup.defaultId);
    const sprite = selectedPet?.sprite?.frames?.walk ? selectedPet.sprite : defaultPet.sprite;
    const spriteWidth = sprite.viewport.width;
    const spriteHeight = sprite.viewport.height;
    const walkFrames = sprite.frames.walk;

    let position = 0;
    let direction = -1;
    let walking = false;
    let frameIndex = 0;
    let frameTime = 0;
    let legTime = 0;
    let pausedMidway = false;
    let lastTime = 0;
    let animationId;
    let pauseId;
    let initialized = false;

    function travelLimit() {
        return Math.max(0, track.clientWidth - spriteWidth);
    }

    function placePet() {
        if (pet.classList.contains('is-placed')) return;
        position = Math.max(0, Math.min(position, travelLimit()));
        pet.style.transform = `translateX(${position}px)`;
    }

    function showWalkFrame() {
        const [x, y, width, height] = walkFrames[direction > 0 ? 'right' : 'left'][frameIndex];
        const left = Math.floor((spriteWidth - width) / 2);
        const top = spriteHeight - height;
        pet.style.backgroundPosition = `${left - x}px ${top - y}px`;
    }

    function pauseWalk(duration) {
        walking = false;
        pet.classList.remove('is-walking');
        pet.style.removeProperty('background-position');
        lastTime = 0;
        animationId = undefined;
        if (!reducedMotion.matches && !pet.classList.contains('is-placed')) {
            pauseId = window.setTimeout(startWalk, duration);
        }
    }

    function stopWalk() {
        if (pauseId !== undefined) window.clearTimeout(pauseId);
        if (animationId !== undefined) window.cancelAnimationFrame(animationId);
        pauseId = undefined;
        animationId = undefined;
        walking = false;
        pet.classList.remove('is-walking');
        pet.style.removeProperty('background-position');
        lastTime = 0;
    }

    function step(now) {
        if (!walking || reducedMotion.matches || pet.classList.contains('is-placed')) return;
        if (lastTime === 0) {
            lastTime = now;
            animationId = window.requestAnimationFrame(step);
            return;
        }

        const elapsed = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        position += direction * 50 * elapsed;
        placePet();
        frameTime += elapsed * 1000;
        legTime += elapsed;
        if (frameTime >= 120) {
            frameIndex = (frameIndex + 1) % 8;
            frameTime %= 120;
            showWalkFrame();
        }
        if ((direction > 0 && position >= travelLimit()) || (direction < 0 && position <= 0)) {
            direction *= -1;
            legTime = 0;
            pausedMidway = false;
            pauseWalk(1800);
            return;
        }
        if (!pausedMidway && legTime >= 2.2) {
            pausedMidway = true;
            pauseWalk(1400);
            return;
        }
        animationId = window.requestAnimationFrame(step);
    }

    function startWalk() {
        pauseId = undefined;
        if (reducedMotion.matches || pet.classList.contains('is-placed') || travelLimit() === 0) return;
        walking = true;
        pet.classList.add('is-walking');
        frameIndex = 0;
        frameTime = 0;
        lastTime = 0;
        showWalkFrame();
        animationId = window.requestAnimationFrame(step);
    }

    function resetMotion() {
        stopWalk();
        if (pet.classList.contains('is-placed')) return;
        if (!initialized) {
            position = travelLimit();
            initialized = true;
        }
        if (position <= 0) direction = 1;
        if (position >= travelLimit()) direction = -1;
        legTime = 0;
        pausedMidway = false;
        placePet();
        if (!reducedMotion.matches) {
            pauseId = window.setTimeout(startWalk, 3500);
        }
    }

    pet.addEventListener('pet:pickup', stopWalk);
    window.addEventListener('resize', placePet);
    reducedMotion.addEventListener('change', resetMotion);
    resetMotion();
})();
