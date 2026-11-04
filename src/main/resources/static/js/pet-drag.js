(() => {
    const pet = document.querySelector('.calendar-pet, .report-pet, .idle-pet');
    if (!pet) return;

    let pointerId = null;
    let grabX = 0;
    let grabY = 0;
    let flightFrame;
    let lastFlightTime = 0;
    let speedX = 0;
    let speedY = 0;
    let lastMove;
    let dragSpeedX = 0;
    let dragSpeedY = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gravity = 1800;
    const maxThrowSpeed = 1400;
    const groundOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pet-ground-offset'));
    const selectedPet = window.AppearanceCatalog.pet.choices.find(choice => choice.id === window.AppearanceSettings.get().pet);

    // The supplied grab sheet has a solid white background. Clear only white
    // pixels connected to the sheet edges so white details inside the pet stay.
    const grabSheet = new Image();
    grabSheet.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = grabSheet.naturalWidth;
        canvas.height = grabSheet.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(grabSheet, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = image.data;
        const width = canvas.width;
        const height = canvas.height;
        const seen = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        function add(index) {
            if (seen[index]) return;
            const pixel = index * 4;
            if (pixels[pixel] < 245 || pixels[pixel + 1] < 245 || pixels[pixel + 2] < 245) return;
            seen[index] = 1;
            queue[tail++] = index;
        }

        for (let x = 0; x < width; x++) {
            add(x);
            add((height - 1) * width + x);
        }
        for (let y = 0; y < height; y++) {
            add(y * width);
            add(y * width + width - 1);
        }
        while (head < tail) {
            const index = queue[head++];
            pixels[index * 4 + 3] = 0;
            const x = index % width;
            if (x > 0) add(index - 1);
            if (x + 1 < width) add(index + 1);
            if (index >= width) add(index - width);
            if (index + width < width * height) add(index + width);
        }

        context.putImageData(image, 0, 0);
        pet.style.setProperty('--pet-grab-image', `url("${canvas.toDataURL('image/png')}")`);
        pet.classList.add('is-grab-ready');
    };
    if (selectedPet?.images.grabbed) grabSheet.src = selectedPet.images.grabbed;

    function clamp(value, limit) {
        return Math.max(0, Math.min(value, Math.max(0, limit)));
    }

    function place(left, top) {
        pet.style.left = `${clamp(left, window.innerWidth - pet.offsetWidth)}px`;
        pet.style.top = `${clamp(top, window.innerHeight - pet.offsetHeight)}px`;
    }

    function groundTop() {
        return Math.max(0, window.innerHeight - pet.offsetHeight - (Number.isFinite(groundOffset) ? groundOffset : 28));
    }

    function stopFlight() {
        if (flightFrame !== undefined) window.cancelAnimationFrame(flightFrame);
        flightFrame = undefined;
        lastFlightTime = 0;
        speedX = 0;
        speedY = 0;
    }

    function fly(now) {
        if (lastFlightTime === 0) lastFlightTime = now;
        const elapsed = Math.min((now - lastFlightTime) / 1000, 0.05);
        lastFlightTime = now;
        speedY += gravity * elapsed;

        const floor = groundTop();
        const nextTop = pet.offsetTop + speedY * elapsed;
        const nextLeft = pet.offsetLeft + speedX * elapsed;
        const maxLeft = Math.max(0, window.innerWidth - pet.offsetWidth);
        if (nextTop < 0 && speedY < 0) speedY = 0;
        if (nextLeft < 0 || nextLeft > maxLeft) speedX = 0;
        if (nextTop >= floor && speedY >= 0) {
            speedY = 0;
            speedX *= Math.exp(-7 * elapsed);
            if (Math.abs(speedX) < 15) speedX = 0;
        } else {
            speedX *= Math.exp(-0.9 * elapsed);
        }
        place(nextLeft, Math.min(nextTop, floor));

        if (pet.offsetTop >= floor && speedX === 0 && speedY === 0) {
            stopFlight();
        } else {
            flightFrame = window.requestAnimationFrame(fly);
        }
    }

    function startFlight(horizontalSpeed = 0, verticalSpeed = 0) {
        stopFlight();
        if (pet.offsetTop > groundTop()) place(pet.offsetLeft, groundTop());
        if (reducedMotion.matches || (pet.offsetTop >= groundTop() && horizontalSpeed === 0 && verticalSpeed >= 0)) {
            place(pet.offsetLeft, groundTop());
        } else {
            speedX = Math.max(-maxThrowSpeed, Math.min(horizontalSpeed, maxThrowSpeed));
            speedY = Math.max(-maxThrowSpeed, Math.min(verticalSpeed, maxThrowSpeed));
            flightFrame = window.requestAnimationFrame(fly);
        }
    }

    function rememberMove(event) {
        if (lastMove) {
            const distanceX = event.clientX - lastMove.x;
            const distanceY = event.clientY - lastMove.y;
            if (distanceX === 0 && distanceY === 0) return;
            const elapsed = Math.max((event.timeStamp - lastMove.time) / 1000, 0.016);
            dragSpeedX = distanceX / elapsed;
            dragSpeedY = distanceY / elapsed;
        }
        lastMove = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    }

    function throwSpeed(event) {
        if (!lastMove) return { x: 0, y: 0 };
        if (event.clientX !== lastMove.x || event.clientY !== lastMove.y) rememberMove(event);
        const carry = Math.max(0, 1 - Math.max(0, event.timeStamp - lastMove.time) / 180);
        return { x: dragSpeedX * carry, y: dragSpeedY * carry };
    }

    function finish(event) {
        if (event.pointerId !== pointerId) return;
        const velocity = event.type === 'pointerup' ? throwSpeed(event) : { x: 0, y: 0 };
        pointerId = null;
        pet.classList.remove('is-dragging');
        if (pet.hasPointerCapture(event.pointerId)) {
            pet.releasePointerCapture(event.pointerId);
        }
        startFlight(velocity.x, velocity.y);
    }

    pet.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
        event.preventDefault();
        stopFlight();
        lastMove = undefined;
        dragSpeedX = 0;
        dragSpeedY = 0;
        rememberMove(event);

        const bounds = pet.getBoundingClientRect();
        grabX = event.clientX - bounds.left;
        grabY = event.clientY - bounds.top;
        pointerId = event.pointerId;

        pet.classList.add('is-placed', 'is-dragging');
        pet.dispatchEvent(new Event('pet:pickup'));
        if (pet.parentElement.matches('.calendar-pet-track, .report-pet-track')) {
            pet.parentElement.setAttribute('aria-hidden', 'true');
            pet.removeAttribute('aria-hidden');
            pet.setAttribute('role', 'img');
            pet.setAttribute('aria-label', 'メカ祥子');
        }
        document.body.append(pet);
        pet.style.position = 'fixed';
        pet.style.right = 'auto';
        pet.style.bottom = 'auto';
        pet.style.transform = 'none';
        place(bounds.left, bounds.top);
        pet.setPointerCapture(event.pointerId);
    });

    pet.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId) return;
        rememberMove(event);
        place(event.clientX - grabX, event.clientY - grabY);
    });

    pet.addEventListener('pointerup', finish);
    pet.addEventListener('pointercancel', finish);
    pet.addEventListener('lostpointercapture', finish);
    window.addEventListener('blur', () => {
        if (pointerId !== null) finish({ pointerId });
    });
    window.addEventListener('resize', () => {
        if (pet.classList.contains('is-placed')) {
            place(pet.offsetLeft, pet.offsetTop);
            if (pointerId === null) startFlight();
        }
    });
    reducedMotion.addEventListener('change', () => {
        if (pet.classList.contains('is-placed') && pointerId === null) startFlight();
    });
})();
