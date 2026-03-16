import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore, collection, getDocs, deleteDoc, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { firebaseConfig, storage } from './config.js';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Protección temprana
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'login.html';
});

// ── Elementos DOM
const postList        = document.getElementById('post-list');
const searchInput     = document.getElementById('search-input');
const prevPageBtn     = document.getElementById('prev-page');
const nextPageBtn     = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const logoutBtn       = document.getElementById('logout-btn');

// ── Estado
let currentUser  = null;
let allMyPosts   = [];
let filteredPosts = [];
let currentPage  = 1;
const itemsPerPage = 6;

// ── Utilidades
const sanitize = (input) => {
    const div = document.createElement('div');
    div.textContent = String(input || '');
    return div.innerHTML;
};

const formatDate = (ts) => {
    if (!ts) return '';
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
};

const showToast = (message, type = 'success') => {
    const toast     = document.getElementById("notification-toast");
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMsg  = toast.querySelector(".toast-message");
    const isError   = type === 'error';
    toast.className = `toast-${isError ? 'error' : 'success'}`;
    toastIcon.className = `toast-icon fas ${isError ? 'fa-times-circle' : 'fa-check-circle'}`;
    toastMsg.textContent = message;
    setTimeout(() => toast.classList.remove('toast-hidden'), 50);
    setTimeout(() => toast.classList.add('toast-hidden'), 4000);
};

// ── Renderizado 
function updatePaginationControls() {
    currentPageSpan.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === Math.ceil(filteredPosts.length / itemsPerPage);
}

function renderPosts() {
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPosts = filteredPosts.slice(start, start + itemsPerPage);

    if (filteredPosts.length === 0) {
        postList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>Aún no tienes publicaciones</h3>
                <p>Ve a <a href="admin.html">Publicaciones</a> y presiona "Añadir" para crear la primera.</p>
            </div>`;
        updatePaginationControls();
        return;
    }

    postList.innerHTML = paginatedPosts.map(post => {
        const fecha = formatDate(post.fechaCreacion);
        return `
        <li class="post-card">
            <div class="post-image-container">
                ${post.imagenUrl
                    ? `<img src="${post.imagenUrl}" class="post-image" alt="${sanitize(post.titulo)}">`
                    : '<div style="height:120px;background:#eee;border-radius:8px;"></div>'}
            </div>
            <div class="post-content">
                <h3>${sanitize(post.titulo)}</h3>
                <p>${sanitize(post.subtitulos?.join(', ') || '')}</p>
                <p class="post-type">
                    <strong>Tipo:</strong> ${sanitize(post.tipo || '')}
                </p>
                ${fecha ? `<p class="post-type"><strong>Fecha:</strong> ${fecha}</p>` : ''}
            </div>
            <div class="post-actions">
                <button class="edit-btn"   data-id="${post.id}">Editar</button>
                <button class="delete-btn" data-id="${post.id}">Eliminar</button>
            </div>
        </li>`;
    }).join('');

    updatePaginationControls();
    attachEventListeners();
}

// ── Listeners de tarjetas 
function attachEventListeners() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;
            try {
                await deleteDoc(doc(db, 'articulos', id));
                showToast('Publicación eliminada');
                allMyPosts    = allMyPosts.filter(p => p.id !== id);
                filteredPosts = filteredPosts.filter(p => p.id !== id);
                // Retroceder de página si queda vacía
                const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
                if (currentPage > totalPages && currentPage > 1) currentPage--;
                renderPosts();
            } catch (error) {
                showToast('Error al eliminar', 'error');
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            // Redirigir al panel general que tiene el modal de edición completo
            // Guardamos el id para que admin.js lo abra automáticamente
            sessionStorage.setItem('editPostId', id);
            window.location.href = 'admin.html';
        });
    });
}

// ── Búsqueda y paginación 
function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    filteredPosts = allMyPosts.filter(p =>
        p.titulo?.toLowerCase().includes(term) ||
        p.subtitulos?.join(' ').toLowerCase().includes(term) ||
        p.tipo?.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderPosts();
}

function handlePagination(direction) {
    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
    if (direction === 'prev' && currentPage > 1) currentPage--;
    else if (direction === 'next' && currentPage < totalPages) currentPage++;
    renderPosts();
}

// ── Cargar publicaciones del usuario actual 
async function loadMyPosts(userId) {
    const loader = document.getElementById('list-loader');
    if (loader) loader.classList.add('visible');
    try {
        await new Promise(r => requestAnimationFrame(r));
        const querySnapshot = await getDocs(collection(db, 'articulos'));
        allMyPosts = querySnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.autorId === userId);

        // Ordenar por fecha descendente
        allMyPosts.sort((a, b) => {
            const dateA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion || 0);
            const dateB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion || 0);
            return dateB - dateA;
        });

        filteredPosts = [...allMyPosts];
        renderPosts();
    } catch (error) {
        showToast('Error cargando publicaciones', 'error');
        console.error(error);
    } finally {
        if (loader) loader.classList.remove('visible');
    }
}

// ── Sesión
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch {
        showToast('Error al cerrar sesión', 'error');
    }
});

// ── Inicialización 
window.addEventListener('DOMContentLoaded', () => {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchInput._timeout);
        searchInput._timeout = setTimeout(() => handleSearch(e), 300);
    });
    prevPageBtn.addEventListener('click', () => handlePagination('prev'));
    nextPageBtn.addEventListener('click', () => handlePagination('next'));

    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = 'login.html'; return; }
        currentUser = user;
        await loadMyPosts(user.uid);
    });
});