(() => {
    const grid = document.getElementById('notice-grid');
    const cards = [...grid.querySelectorAll('.notice-thumb')];
    const dialog = document.getElementById('notice-dialog');
    const closeButton = document.getElementById('notice-close');
    const keyword = document.getElementById('preview-keyword');
    const category = document.getElementById('preview-category');
    const count = document.getElementById('preview-count');
    let opener = null;

    function openNotice(card) {
        opener = card;
        for (const field of ['title', 'memo', 'category', 'priority', 'due', 'status']) {
            document.getElementById(`detail-${field}`).textContent = card.dataset[field];
        }
        document.getElementById('detail-paper-title').textContent = card.dataset.title;
        document.getElementById('detail-image').src = card.querySelector('.notice-thumb__image').src;
        document.getElementById('detail-pin').src = card.querySelector('.notice-thumb__pin').src;
        const sourceStamp = card.querySelector('.notice-thumb__stamp');
        const detailStamp = document.getElementById('detail-stamp');
        detailStamp.hidden = !sourceStamp;
        if (sourceStamp) detailStamp.src = sourceStamp.src;
        dialog.showModal();
        closeButton.focus();
    }

    grid.addEventListener('click', event => {
        const card = event.target.closest('.notice-thumb');
        if (card) openNotice(card);
    });

    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => opener?.focus());

    function applyFilter() {
        const query = keyword.value.trim().toLocaleLowerCase('ja-JP');
        let visible = 0;
        for (const card of cards) {
            const matched = card.dataset.title.toLocaleLowerCase('ja-JP').includes(query)
                && (!category.value || card.dataset.category === category.value);
            card.hidden = !matched;
            if (matched) visible++;
        }
        count.textContent = `${visible}件の依頼書`;
    }

    document.getElementById('preview-search').addEventListener('click', applyFilter);
    keyword.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilter();
        }
    });
    category.addEventListener('change', applyFilter);

    for (const button of document.querySelectorAll('[data-order]')) {
        button.addEventListener('click', () => {
            const direction = button.dataset.order === 'asc' ? 1 : -1;
            [...grid.children].sort((a, b) => direction * a.dataset.due.localeCompare(b.dataset.due)).forEach(card => grid.append(card));
            for (const peer of document.querySelectorAll('[data-order]')) peer.setAttribute('aria-pressed', String(peer === button));
        });
    }
})();
