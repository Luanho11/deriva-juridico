// detalle.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('id');

function showNotification(message, type = 'info') {
    let notification = document.getElementById('download-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'download-notification';
        notification.style.cssText = `
            position:fixed;bottom:20px;right:20px;padding:15px 25px;
            border-radius:8px;color:white;font-weight:500;z-index:9999;
            box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all 0.3s ease;
            opacity:0;transform:translateY(20px);`;
        document.body.appendChild(notification);
    }
    const colors = { success: '#4CAF50', info: '#2196F3', error: '#F44336' };
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    setTimeout(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateY(20px)'; }, 3000);
}

// Detectar si es móvil
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

const elements = {
    title: document.getElementById('article-title'),
    subtitle: document.getElementById('article-subtitle'),
    resumen: document.getElementById('article-resumen'),
    image: document.getElementById('article-image'),
    viewBtn: document.getElementById('view-pdf'),
    downloadBtn: document.getElementById('download-pdf'),
    loader: document.getElementById('loader'),
    pdfModal: document.getElementById('pdf-modal'),
    pdfIframe: document.getElementById('pdf-iframe'),
    pdfClose: document.querySelector('.pdf-close'),
    authorPhoto: document.getElementById('author-photo'),
    authorName: document.getElementById('author-name'),
    authorDesc: document.getElementById('author-desc'),
    articleCitation: document.getElementById('article-citation')
};

elements.pdfClose.addEventListener('click', () => { elements.pdfModal.style.display = 'none'; });
window.addEventListener('click', (event) => {
    if (event.target === elements.pdfModal) elements.pdfModal.style.display = 'none';
});

const updateMetaTags = (data) => {
    try {
        const title = `${data.titulo} | Deriva Jurídico`;
        const description = data.resumen.substring(0, 160);
        const image = data.imagenUrl || 'https://derivajuridico.com/img/DJ_Logo.jpg';
        const url = window.location.href;

        document.title = title;

        const metaTags = {
            'og:title': title,
            'og:description': description,
            'og:image': image,
            'og:url': url,
            'og:type': 'article',
            'og:site_name': 'Deriva Jurídico',
            'twitter:card': 'summary_large_image',
            'twitter:title': title,
            'twitter:description': description,
            'twitter:image': image,
            'twitter:site': '@derivajuridico',
            'article:published_time': data.fechaCreacion || new Date().toISOString(),
            'article:author': data.autorNombre || 'Deriva Jurídico',
        };

        Object.entries(metaTags).forEach(([property, content]) => {
            let tag = document.querySelector(`meta[property="${property}"]`);
            if (tag) tag.setAttribute('content', content);
            tag = document.querySelector(`meta[name="${property}"]`);
            if (tag) tag.setAttribute('content', content);
        });
    } catch (error) {
        console.warn('Error al actualizar meta tags:', error);
    }
};

const loadArticle = async () => {
    try {
        elements.loader.classList.add('active');

        if (!articleId) {
            alert('No se especificó un artículo');
            window.location.href = 'publicaciones.html';
            return;
        }

        const docRef = doc(db, "articulos", articleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            updateMetaTags(data);

            // Textos principales
            elements.title.textContent = data.titulo || '';
            elements.subtitle.textContent = data.subtitulos ? data.subtitulos.join(', ') : '';
            elements.resumen.textContent = data.resumen || '';

            // Cita: guardada como HTML (puede tener <em>) o texto plano
            elements.articleCitation.innerHTML = data.cita || 'No disponible';

            // Imagen (oculta por CSS pero cargada para Open Graph)
            if (data.imagenUrl && elements.image) {
                elements.image.src = data.imagenUrl;
            }

            // Autor
            elements.authorName.textContent = data.autorNombre || 'Autor Desconocido';
            if (data.autorFotoUrl) {
                elements.authorPhoto.src = data.autorFotoUrl;
            } else {
                const photoContainer = elements.authorPhoto.parentElement;
                if (photoContainer) photoContainer.style.display = 'none';
            }
            elements.authorDesc.textContent = data.autorDesc || 'Sin descripción';

            // Botones PDF
            if (data.pdfUrl) {

                // Diferenciado: móvil en nueva pestaña, desktop en modal
                if (isMobile()) {
                    // EN MÓVIL: Nueva pestaña
                    elements.viewBtn.onclick = () => {
                        window.open(data.pdfUrl, '_blank');
                    };
                } else {
                    // EN DESKTOP: Modal 
                    elements.viewBtn.onclick = () => {
                        elements.pdfIframe.src = data.pdfUrl;
                        elements.pdfModal.style.display = 'block';
                    };
                }

                // Botón descargar igual para todos
                elements.downloadBtn.onclick = async () => {
                    try {
                        const fileName = data.pdfFileName ||
                            `${data.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
                        const response = await fetch(data.pdfUrl);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = fileName;
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(() => {
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                        }, 100);
                    } catch (error) {
                        const fallbackLink = document.createElement('a');
                        fallbackLink.href = data.pdfUrl;
                        fallbackLink.download = data.pdfFileName || 'articulo.pdf';
                        fallbackLink.target = '_blank';
                        fallbackLink.style.display = 'none';
                        document.body.appendChild(fallbackLink);
                        fallbackLink.click();
                        setTimeout(() => document.body.removeChild(fallbackLink), 100);
                        showNotification('PDF descargándose...', 'info');
                    }
                };
            } else {
                elements.viewBtn.style.display = 'none';
                elements.downloadBtn.style.display = 'none';
            }

        } else {
            alert('Artículo no encontrado');
            window.location.href = 'publicaciones.html';
        }
    } catch (error) {
        console.error("Error al cargar artículo:", error);
        alert("Error al cargar el artículo: " + error.message);
    } finally {
        elements.loader.classList.remove('active');
    }
};

document.addEventListener('DOMContentLoaded', loadArticle);