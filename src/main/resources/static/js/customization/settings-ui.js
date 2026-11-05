(() => {
    const catalog = window.AppearanceCatalog;
    const settings = window.AppearanceSettings;
    const form = document.getElementById('appearance-settings');
    if (!form) return;

    const groups = document.getElementById('appearance-options');
    const status = document.getElementById('appearance-status');

    function render() {
        const selected = settings.get();
        const fragment = document.createDocumentFragment();
        for (const [category, group] of Object.entries(catalog)) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'settings-group';
            const legend = document.createElement('legend');
            legend.textContent = group.label;
            fieldset.append(legend);

            const options = document.createElement('div');
            options.className = 'settings-options';
            for (const choice of group.choices) {
                const label = document.createElement('label');
                label.className = 'settings-option';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = category;
                input.value = choice.id;
                input.checked = selected[category] === choice.id;

                const body = document.createElement('span');
                body.className = 'settings-option__body';
                const preview = document.createElement('span');
                preview.className = `settings-preview ${choice.previewClass || ''}`.trim();
                if (choice.images?.preview) preview.style.backgroundImage = `url("${choice.images.preview}")`;
                preview.setAttribute('aria-hidden', 'true');
                const title = document.createElement('span');
                title.textContent = choice.label;
                body.append(preview, title);
                label.append(input, body);
                options.append(label);
            }
            fieldset.append(options);
            fragment.append(fieldset);
        }
        groups.replaceChildren(fragment);
    }

    form.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
        if (!catalog[input.name]?.choices.some(choice => choice.id === input.value)) return;
        settings.save({ [input.name]: input.value });
        status.textContent = '設定を保存しました。';
        if (input.name === 'pet') window.location.reload();
    });

    document.getElementById('appearance-reset').addEventListener('click', () => {
        const previousPet = settings.get().pet;
        settings.reset();
        render();
        status.textContent = '初期設定に戻しました。';
        if (previousPet !== settings.get().pet) window.location.reload();
    });

    render();
})();
