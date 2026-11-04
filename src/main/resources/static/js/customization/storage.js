(() => {
    const storageKey = 'todo-appearance-v1';
    const catalog = window.AppearanceCatalog;
    const defaults = Object.fromEntries(
        Object.entries(catalog).map(([category, group]) => [category, group.defaultId])
    );

    function normalize(values) {
        const input = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
        return Object.fromEntries(Object.entries(catalog).map(([category, group]) => {
            const id = group.legacyIds?.[input[category]] ?? input[category];
            return [category, group.choices.some(choice => choice.id === id) ? id : defaults[category]];
        }));
    }

    function load() {
        try {
            return normalize(JSON.parse(localStorage.getItem(storageKey)));
        } catch {
            return { ...defaults };
        }
    }

    let current = load();

    function save(changes) {
        current = normalize({ ...current, ...changes });
        try {
            localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
            // Keep the current page usable when storage is unavailable.
        }
        return { ...current };
    }

    function reset() {
        current = { ...defaults };
        try {
            localStorage.removeItem(storageKey);
        } catch {
            // Keep the default appearance on the current page.
        }
        return { ...current };
    }

    window.AppearanceStorage = Object.freeze({ get: () => ({ ...current }), save, reset });
})();
