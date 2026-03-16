document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.barra_navegacion');
    const overlay = document.querySelector('.nav-overlay');

    if (!hamburger || !nav) return;

    function openMenu() {
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        nav.classList.add('open');
        if (overlay) overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
        if (overlay) overlay.classList.remove('visible');
        document.body.style.overflow = '';

        // Opcional: Cerrar todos los submenús al cerrar el menú principal
        nav.querySelectorAll('.dropdown.mobile-open').forEach(el => el.classList.remove('mobile-open'));
    }

    hamburger.addEventListener('click', () => {
        hamburger.classList.contains('open') ? closeMenu() : openMenu();
    });

    // No cerrar el menú al hacer clic en enlaces del dropdown
    nav.querySelectorAll('a').forEach(link => {
        // Verificar si el enlace NO es parte de un dropdown
        const isInDropdown = link.closest('.dropdown');

        link.addEventListener('click', (e) => {
            // Si es un enlace de dropdown en móvil, NO cerrar el menú
            if (isInDropdown && window.innerWidth <= 900) {
                // Dejar que el manejador de dropdown maneje el evento
                return;
            }
            // Para otros enlaces, cerrar el menú
            closeMenu();
        });
    });

    // Cerrar al hacer clic en el overlay
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Cerrar con Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMenu();
    });

    // Manejar dropdowns en móvil sin cerrar el menú
    nav.querySelectorAll('.dropdown > a').forEach(dropToggle => {
        dropToggle.addEventListener('click', function (e) {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                e.stopPropagation();

                const li = this.closest('.dropdown');
                const isOpen = li.classList.contains('mobile-open');

                // Cerrar todos los demás y abrir este (comportamiento acordeón)
                nav.querySelectorAll('.dropdown.mobile-open').forEach(el => {
                    if (el !== li) el.classList.remove('mobile-open');
                });
                if (!isOpen) {
                    li.classList.add('mobile-open');
                } else {
                    li.classList.remove('mobile-open');
                }
            }
        });
    });

    // Al redimensionar la ventana, resetear estados si pasamos a desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
            // En desktop, aseguramos que no haya submenús abiertos por móvil
            nav.querySelectorAll('.dropdown.mobile-open').forEach(el => el.classList.remove('mobile-open'));
        }
    });
});