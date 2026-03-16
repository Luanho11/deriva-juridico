document.addEventListener('DOMContentLoaded', function () {
    const shareButton = document.getElementById('share-button');
    const shareModal = document.getElementById('share-modal');
    const shareClose = document.getElementById('share-close');

    const shareFacebook = document.getElementById('share-facebook');
    const shareTwitter = document.getElementById('share-twitter');
    const shareLinkedin = document.getElementById('share-linkedin');
    const shareWhatsapp = document.getElementById('share-whatsapp');
    const shareInstagram = document.getElementById('share-instagram');
    const shareReddit = document.getElementById('share-reddit');
    const shareEmail = document.getElementById('share-email');

    const shareCopyButton = document.getElementById('share-copy-button');
    const shareUrlInput = document.getElementById('share-url-input');
    const shareButtonsGrid = document.getElementById('share-buttons-grid');
    const shareNavPrev = document.getElementById('share-nav-prev');
    const shareNavNext = document.getElementById('share-nav-next');
    const shareButtonsWrapper = document.querySelector('.share-buttons-wrapper');

    let currentScroll = 0;
    const scrollAmount = 100;

    // Obtener URL actual y título
    function getShareData() {
        const currentUrl = window.location.href;
        const title = document.getElementById('article-title')?.textContent || 'Artículo de Deriva Jurídico';
        return { url: currentUrl, title: title };
    }

    // Llenar el campo de URL al abrir el modal
    function populateUrlInput() {
        const { url } = getShareData();
        shareUrlInput.value = url;
    }

    // Actualizar estado de botones de navegación
    function updateNavButtons() {
        if (!shareButtonsGrid || !shareButtonsWrapper) return;

        const gridWidth = shareButtonsGrid.scrollWidth;
        const wrapperWidth = shareButtonsWrapper.clientWidth;
        const maxScroll = Math.max(0, gridWidth - wrapperWidth);

        // Botón izquierdo: mostrar solo si hay scroll previo
        if (currentScroll > 0) {
            shareNavPrev.classList.add('visible');
        } else {
            shareNavPrev.classList.remove('visible');
        }

        // Botón derecho: mostrar solo si hay más contenido
        if (currentScroll < maxScroll) {
            shareNavNext.classList.add('visible');
        } else {
            shareNavNext.classList.remove('visible');
        }
    }

    // Navegar izquierda
    shareNavPrev?.addEventListener('click', function (e) {
        e.preventDefault();
        currentScroll = Math.max(0, currentScroll - scrollAmount);
        shareButtonsGrid.style.transform = `translateX(-${currentScroll}px)`;
        updateNavButtons();
    });

    // Navegar derecha
    shareNavNext?.addEventListener('click', function (e) {
        e.preventDefault();
        const gridWidth = shareButtonsGrid.scrollWidth;
        const wrapperWidth = shareButtonsWrapper.clientWidth;
        const maxScroll = Math.max(0, gridWidth - wrapperWidth);

        currentScroll = Math.min(maxScroll, currentScroll + scrollAmount);
        shareButtonsGrid.style.transform = `translateX(-${currentScroll}px)`;
        updateNavButtons();
    });

    // Abrir modal
    shareButton?.addEventListener('click', function (e) {
        e.preventDefault();
        shareModal.classList.add('show');
        populateUrlInput();

        // Resetear scroll y ocultar botón izquierdo al inicio
        currentScroll = 0;
        shareButtonsGrid.style.transform = 'translateX(0)';

        // Actualizar botones
        setTimeout(updateNavButtons, 50);
        document.body.style.overflow = 'hidden';
    });

    // Cerrar modal
    function closeShareModal() {
        shareModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    shareClose?.addEventListener('click', closeShareModal);

    // Cerrar modal al hacer click fuera
    window.addEventListener('click', function (e) {
        if (e.target === shareModal) {
            closeShareModal();
        }
    });

    // Compartir en Facebook
    shareFacebook?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url, title } = getShareData();
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
        window.open(facebookUrl, 'facebook-share', 'width=600,height=400');
    });

    // Compartir en Twitter/X
    shareTwitter?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url, title } = getShareData();
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        window.open(twitterUrl, 'twitter-share', 'width=600,height=400');
    });

    // Compartir en LinkedIn
    shareLinkedin?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url } = getShareData();
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(linkedinUrl, 'linkedin-share', 'width=600,height=400');
    });

    // Compartir en WhatsApp
    shareWhatsapp?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url, title } = getShareData();
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
        window.open(whatsappUrl, 'whatsapp-share', 'width=600,height=400');
    });

    // Compartir en Instagram: abre el sharesheet de Instagram con el link limpio
    shareInstagram?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url } = getShareData();
        window.location.href = `instagram://sharesheet?text=${url}`;
    });

    // Botón "Otros": selector nativo del sistema (Web Share API)
    const shareOtros = document.getElementById('share-otros');
    shareOtros?.addEventListener('click', async function (e) {
        e.preventDefault();
        const { url, title } = getShareData();
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    showNotification('No se pudo abrir el menú de compartir.');
                }
            }
        } else {
            // Fallback: copiar al portapapeles en escritorio
            try {
                await navigator.clipboard.writeText(url);
                showNotification('Enlace copiado al portapapeles.');
            } catch {
                showNotification('Copia el enlace de la barra de direcciones.');
            }
        }
    });

    // Función para mostrar notificación
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #25d366;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideUpNotif 0.3s ease;
            max-width: 90%;
            text-align: center;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideDownNotif 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    // Agregar estilos de animación para notificación
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideUpNotif {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes slideDownNotif {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Compartir en Reddit
    shareReddit?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url, title } = getShareData();
        const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&resubmit=true`;
        window.open(redditUrl, 'reddit-share', 'width=800,height=600');
    });

    // Compartir por Email
    shareEmail?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url, title } = getShareData();
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent('Te comparto este artículo: ' + url)}`;
        window.location.href = mailtoUrl;
    });

    // Copiar enlace
    shareCopyButton?.addEventListener('click', function (e) {
        e.preventDefault();
        const { url } = getShareData();

        navigator.clipboard.writeText(url).then(() => {
            const originalText = shareCopyButton.innerHTML;
            const originalBg = shareCopyButton.style.backgroundColor;

            shareCopyButton.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            shareCopyButton.style.backgroundColor = '#28a745';

            setTimeout(() => {
                shareCopyButton.innerHTML = originalText;
                shareCopyButton.style.backgroundColor = '';
            }, 2000);
        }).catch(() => {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            const originalText = shareCopyButton.innerHTML;
            const originalBg = shareCopyButton.style.backgroundColor;

            shareCopyButton.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            shareCopyButton.style.backgroundColor = '#28a745';

            setTimeout(() => {
                shareCopyButton.innerHTML = originalText;
                shareCopyButton.style.backgroundColor = '';
            }, 2000);
        });
    });

    // Ajustar botones de navegación al redimensionar
    window.addEventListener('resize', updateNavButtons);

    // ── Soporte swipe táctil en el grid de botones 
    let touchStartX = 0;
    let touchStartScroll = 0;
    let isSwiping = false;

    shareButtonsGrid?.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartScroll = currentScroll;
        isSwiping = true;
    }, { passive: true });

    shareButtonsGrid?.addEventListener('touchmove', function (e) {
        if (!isSwiping) return;
        const delta = touchStartX - e.touches[0].clientX;
        const gridWidth = shareButtonsGrid.scrollWidth;
        const wrapperWidth = shareButtonsWrapper ? shareButtonsWrapper.clientWidth : 0;
        const maxScroll = Math.max(0, gridWidth - wrapperWidth);
        currentScroll = Math.max(0, Math.min(maxScroll, touchStartScroll + delta));
        shareButtonsGrid.style.transform = `translateX(-${currentScroll}px)`;
        updateNavButtons();
    }, { passive: true });

    shareButtonsGrid?.addEventListener('touchend', function () {
        isSwiping = false;
    }, { passive: true });
});