(() => {
    const catalog = window.AppearanceCatalog;
    const storage = window.AppearanceStorage;

    function apply(settings = storage.get()) {
        for (const category of Object.keys(catalog)) {
            document.documentElement.dataset[category] = settings[category];
        }
    }

    function save(changes) {
        const settings = storage.save(changes);
        apply(settings);
        return settings;
    }

    function reset() {
        const settings = storage.reset();
        apply(settings);
        return settings;
    }

    // Preserve the API used by the previous appearance-settings.js.
    window.AppearanceSettings = Object.freeze({ get: storage.get, save, reset, apply });
    apply();
})();
