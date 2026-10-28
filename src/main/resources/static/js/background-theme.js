(() => {
    const hourFormatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        hourCycle: 'h23'
    });

    function updateBackground() {
        const hour = Number(hourFormatter.formatToParts(new Date()).find(part => part.type === 'hour').value);
        document.documentElement.classList.toggle('theme-night', hour < 6 || hour >= 18);
    }

    updateBackground();
    window.setInterval(updateBackground, 1000);
})();
