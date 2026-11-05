(() => {
    const grid = document.getElementById('notice-grid');
    if (!grid) return;

    const dialog = document.getElementById('notice-dialog');
    const closeButton = document.getElementById('notice-close');
    const image = document.getElementById('detail-image');
    const pin = document.getElementById('detail-pin');
    const stamp = document.getElementById('detail-stamp');
    const edit = document.getElementById('detail-edit');
    const remove = document.getElementById('detail-delete');
    let opener = null;

    grid.addEventListener('click', event => {
        const card = event.target.closest('.notice-thumb');
        if (!card || !grid.contains(card)) return;

        opener = card;
        document.getElementById('detail-title').textContent = card.dataset.title;
        document.getElementById('detail-paper-title').textContent = card.dataset.title;
        document.getElementById('detail-memo').textContent = card.dataset.memo || '（メモなし）';
        document.getElementById('detail-category').textContent = card.dataset.category;
        document.getElementById('detail-priority').textContent = card.dataset.priority;
        document.getElementById('detail-due').textContent = card.dataset.due;
        document.getElementById('detail-status').textContent = card.dataset.status
            + (card.dataset.completedAt ? `（${card.dataset.completedAt}）` : '');

        image.src = card.querySelector('.notice-thumb__image').src;
        pin.src = card.querySelector('.notice-thumb__pin').src;
        const cardStamp = card.querySelector('.notice-thumb__stamp');
        stamp.hidden = !cardStamp;
        if (cardStamp) stamp.src = cardStamp.src;

        edit.href = card.dataset.editUrl;
        remove.href = card.dataset.deleteUrl;
        dialog.showModal();
        closeButton.focus();
    });

    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => opener?.focus());
})();
