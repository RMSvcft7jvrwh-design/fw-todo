(() => {
    const clock = document.querySelector('.game-clock');
    if (!clock) return;

    const date = clock.querySelector('.game-clock-date');
    const time = clock.querySelector('.game-clock-time');
    const formatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });

    function updateClock() {
        const now = new Date();
        const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
        date.textContent = `${parts.year}.${parts.month}.${parts.day} (${parts.weekday})`;
        time.textContent = `${parts.hour}:${parts.minute}:${parts.second}`;
        clock.dateTime = now.toISOString();
    }

    updateClock();
    window.setInterval(updateClock, 1000);
})();
