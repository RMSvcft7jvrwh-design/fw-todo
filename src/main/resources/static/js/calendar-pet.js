(() => {
    const track = document.querySelector('.calendar-pet-track');
    const pet = track?.querySelector('.calendar-pet');
    if (!pet) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const spriteWidth = 124;
    const spriteHeight = 178;
    const walkFrames = {
        right: [
            [27, 190, 117, 178], [199, 190, 116, 178], [370, 190, 118, 178], [540, 190, 122, 178],
            [713, 190, 120, 178], [884, 190, 121, 178], [1057, 190, 119, 178], [1230, 190, 116, 178]
        ],
        left: [
            [28, 377, 116, 177], [200, 377, 116, 177], [371, 377, 118, 177], [541, 377, 122, 177],
            [714, 377, 120, 177], [886, 377, 120, 177], [1058, 377, 119, 177], [1231, 377, 116, 177]
        ]
    };

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
        if (!reducedMotion.matches) {
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
        if (!walking || reducedMotion.matches) return;
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
        if (reducedMotion.matches || travelLimit() === 0) return;
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

    window.addEventListener('resize', placePet);
    reducedMotion.addEventListener('change', resetMotion);
    resetMotion();
})();
