(() => {
    document.querySelectorAll('.todo-toast[data-toast-kind="saved"], .todo-toast[data-toast-kind="deleted"]')
        .forEach(toast => window.setTimeout(() => toast.remove(), 5000));
})();
