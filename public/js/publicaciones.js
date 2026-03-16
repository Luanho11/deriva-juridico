// publicaciones.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

let currentPage = 1;
const itemsPerPage = 6;
let allPosts = [];
let filteredPosts = [];

const elements = {
    postList:        document.getElementById('post-list'),
    searchInput:     document.getElementById('search-input'),
    prevPageBtn:     document.getElementById('prev-page'),
    nextPageBtn:     document.getElementById('next-page'),
    currentPageSpan: document.getElementById('current-page'),
    logoLoader:      document.querySelector('.logo-loader-container')
};

const sanitize = (input) => {
    const div = document.createElement('div');
    div.textContent = String(input || '');
    return div.innerHTML;
};

// Formatear timestamp de Firestore
const formatDate = (ts) => {
    if (!ts) return '';
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('es-PE', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    } catch (e) { return ''; }
};

const getCurrentPageType = () => {
    const pathname = window.location.pathname;
    if (pathname.includes('columnas.html')) return 'columna';
    if (pathname.includes('ensayos.html'))  return 'ensayo';
    return 'articulo';
};

const generateFilterButtons = () => {
    const allSubtitles = new Set();
    allPosts.forEach(post => {
        if (post.subtitulos && Array.isArray(post.subtitulos)) {
            post.subtitulos.forEach(sub => allSubtitles.add(sub));
        }
    });
    const filterButtonsContainer = document.querySelector('.filter-buttons');
    filterButtonsContainer.innerHTML = "";

    const allButton = document.createElement('button');
    allButton.classList.add('filter-button', 'active');
    allButton.innerHTML = '<span>Todos</span>';
    allButton.addEventListener('click', () => handleFilterClick(null));
    filterButtonsContainer.appendChild(allButton);

    allSubtitles.forEach(subtitle => {
        const button = document.createElement('button');
        button.classList.add('filter-button');
        button.innerHTML = `<span>${subtitle}</span>`;
        button.addEventListener('click', () => handleFilterClick(subtitle));
        filterButtonsContainer.appendChild(button);
    });
};

const handleFilterClick = (selectedSubtitle) => {
    if (selectedSubtitle) {
        filteredPosts = allPosts.filter(post =>
            post.subtitulos && post.subtitulos.includes(selectedSubtitle)
        );
    } else {
        filteredPosts = [...allPosts];
    }
    currentPage = 1;
    renderPosts();

    document.querySelectorAll('.filter-button').forEach(button => {
        button.classList.remove('active');
        const buttonText = button.querySelector('span').textContent;
        if ((!selectedSubtitle && buttonText === 'Todos') || buttonText === selectedSubtitle) {
            button.classList.add('active');
        }
    });
};

const renderPosts = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end   = start + itemsPerPage;
    const paginatedPosts = filteredPosts.slice(start, end);

    if (filteredPosts.length === 0) {
        elements.postList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-box-open"></i>
                <h3>No hay publicaciones disponibles</h3>
            </div>`;
    } else {
        elements.postList.innerHTML = paginatedPosts.map(post => {
            const fecha = formatDate(post.fechaCreacion);
            return `
            <div class="post-card" onclick="document.location='detalle.html?id=${post.id}'">
                ${post.imagenUrl
                    ? `<img src="${post.imagenUrl}" class="post-image" alt="${sanitize(post.titulo)}" style="object-position:${post.imagenPosicion || 'center center'}">`
                    : '<div class="post-image-placeholder"></div>'}
                <div class="post-content">
                    <h3>${sanitize(post.titulo)}</h3>
                    <p class="post-subtitle">${post.subtitulos ? post.subtitulos.join(', ') : ''}</p>
                    <p class="post-summary">${sanitize(post.resumen)}</p>
                    <p class="post-author"><strong>Autor:</strong> ${sanitize(post.autorNombre || 'Desconocido')}</p>
                    ${fecha ? `<p class="post-date" style="font-size:13px;color:#888;margin-top:4px;"><i class="fas fa-calendar-alt"></i> ${fecha}</p>` : ''}
                </div>
            </div>`;
        }).join('');
    }
    updatePaginationControls();
};

const updatePaginationControls = () => {
    elements.currentPageSpan.textContent = currentPage;
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === Math.ceil(filteredPosts.length / itemsPerPage);
};

const handleSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filteredPosts = allPosts.filter(post =>
        post.titulo?.toLowerCase().includes(searchTerm) ||
        post.subtitulos?.join(' ').toLowerCase().includes(searchTerm) ||
        post.autorNombre?.toLowerCase().includes(searchTerm) ||
        post.tipo?.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    renderPosts();
};

const handlePagination = (direction) => {
    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
    if (direction === 'prev' && currentPage > 1)       currentPage--;
    else if (direction === 'next' && currentPage < totalPages) currentPage++;
    renderPosts();
};

const loadPosts = async () => {
    try {
        elements.logoLoader.classList.add('visible');
        // Fuerza repaint antes del fetch para que el loader sea visible
        await new Promise(r => requestAnimationFrame(r));
        const querySnapshot = await getDocs(collection(db, "articulos"));
        const tipoFiltro = getCurrentPageType();
        allPosts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).filter(post => post.tipo === tipoFiltro);

        filteredPosts = [...allPosts];
        generateFilterButtons();
        renderPosts();
    } catch (error) {
        console.error("Error al cargar publicaciones:", error);
        alert("Error al cargar las publicaciones");
    } finally {
        elements.logoLoader.classList.remove('visible');
    }
};

const initEventListeners = () => {
    let timeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => handleSearch(e), 300);
    });
    elements.prevPageBtn.addEventListener('click', () => handlePagination('prev'));
    elements.nextPageBtn.addEventListener('click', () => handlePagination('next'));
};

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    initEventListeners();
});