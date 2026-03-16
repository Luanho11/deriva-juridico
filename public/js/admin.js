// admin.js - Panel de Administración
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore, collection, getDocs, addDoc, deleteDoc,
    updateDoc, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { firebaseConfig, storage } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Redirigir si no está autenticado (chequeo temprano) ──────────────────────
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
});

// ÁREAS JURÍDICAS PREDEFINIDAS
const AREAS_BASE = [
    "Derecho Civil",
    "Derecho Comercial",
    "Arbitraje",
    "Derecho Administrativo",
    "Derecho Laboral",
    "Derecho Tributario",
    "Derecho Corporativo",
    "Derecho Ambiental",
    "Derecho Inmobiliario",
    "Propiedad Intelectual",
    "Derecho Internacional",
    "Finanzas",
    "Economía",
    "Derecho Penal",
    "Análisis Económico",
    "Gestión Pública",
    "Competencia y Regulación"
];

// VARIABLES GLOBALES
let currentPage = 1;
const itemsPerPage = 6;
let allPosts = [];
let filteredPosts = [];
let hasUnsavedChanges = false;
let currentEditingId = null;
let originalPostData = null;   
let currentAutorFotoUrl = null;
let currentUser = null;
let currentUserAuthorData = null;
let currentUserRole = 'asociado';   
let customAreas = [];               

// ELEMENTOS DEL DOM
const logoutBtn       = document.getElementById("logout-btn");
const addPostBtn      = document.getElementById("add-post-btn");
const cancelBtn       = document.getElementById("cancel-btn");
const articleForm     = document.getElementById("article-form");
const formModal       = document.getElementById("form-modal");
const modalCloseBtn   = document.getElementById("modal-close-btn");
const postList        = document.getElementById("post-list");
const formTitle       = document.getElementById("form-title");
const loadingOverlay  = document.getElementById("loading-overlay");
const searchInput     = document.getElementById('search-input');
const prevPageBtn     = document.getElementById('prev-page');
const nextPageBtn     = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const areasContainer  = document.getElementById('areas-container');
const nuevaAreaInput  = document.getElementById('nueva-area-input');
const agregarAreaBtn  = document.getElementById('agregar-area-btn');
const citaEditor      = document.getElementById('cita-editor');
const btnItalic       = document.getElementById('btn-italic');

// FUNCIONES DE PERFIL Y ROL
async function loadCurrentUserAuthorData(userId) {
    try {
        const userDocRef = doc(db, 'usuarios', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUserAuthorData = {
                nombreAutor: userData.nombreAutor || 'Autor Desconocido',
                bioAutor:    userData.bioAutor    || '',
                fotoAutorUrl: userData.fotoAutorUrl || null
            };
            // Leer el rol (si no existe, es 'asociado' por defecto)
            currentUserRole = userData.rol || 'asociado';
        } else {
            currentUserAuthorData = {
                nombreAutor: currentUser.email.split('@')[0],
                bioAutor:    '',
                fotoAutorUrl: null
            };
            currentUserRole = 'asociado';
        }
        console.log(`✓ Rol del usuario: ${currentUserRole}`);
    } catch (error) {
        console.error('Error cargando datos del autor:', error);
        currentUserAuthorData = {
            nombreAutor: currentUser.email.split('@')[0],
            bioAutor:    '',
            fotoAutorUrl: null
        };
        currentUserRole = 'asociado';
    }
}

const isAdmin = () => currentUserRole === 'admin';

// ÁREAS PERSONALIZADAS (Firestore)
async function loadCustomAreas() {
    try {
        const docRef  = doc(db, 'configuracion', 'areas');
        const docSnap = await getDoc(docRef);
        customAreas = docSnap.exists() ? (docSnap.data().custom || []) : [];
    } catch (e) {
        customAreas = [];
    }
}

async function saveCustomArea(area) {
    try {
        const trimmed = area.trim();
        if (!trimmed) return;
        const allCurrent = [...AREAS_BASE, ...customAreas].map(a => a.toLowerCase());
        if (allCurrent.includes(trimmed.toLowerCase())) {
            showToast('Esa área ya existe', 'error');
            return;
        }
        customAreas.push(trimmed);
        const docRef = doc(db, 'configuracion', 'areas');
        await setDoc(docRef, { custom: customAreas }, { merge: true });
        renderAreasContainer();
        showToast(`✓ Área "${trimmed}" agregada`);
        nuevaAreaInput.value = '';
    } catch (e) {
        showToast('Error guardando el área', 'error');
        console.error(e);
    }
}

async function deleteCustomArea(area) {
    try {
        // Conservar checkboxes seleccionados antes de re-renderizar
        const currentlyChecked = Array.from(
            document.querySelectorAll('input[name="areas"]:checked')
        ).map(cb => cb.value);

        customAreas = customAreas.filter(a => a !== area);
        const docRef = doc(db, 'configuracion', 'areas');
        await setDoc(docRef, { custom: customAreas }, { merge: true });
        renderAreasContainer(currentlyChecked.filter(a => a !== area));
        showToast(`Área "${area}" eliminada`);
    } catch (e) {
        showToast('Error eliminando el área', 'error');
        console.error(e);
    }
}

function renderAreasContainer(selectedAreas = []) {
    const baseHtml = AREAS_BASE.map(area => `
        <label class="area-checkbox">
            <input type="checkbox" value="${area}" name="areas"
                   ${selectedAreas.includes(area) ? 'checked' : ''}>
            <span>${area}</span>
        </label>
    `).join('');

    const customHtml = customAreas.map(area => `
        <label class="area-checkbox area-custom">
            <input type="checkbox" value="${area}" name="areas"
                   ${selectedAreas.includes(area) ? 'checked' : ''}>
            <span>${area}</span>
            <button type="button" class="delete-custom-area" title="Eliminar área" data-area="${area}">&times;</button>
        </label>
    `).join('');

    areasContainer.innerHTML = baseHtml + customHtml;

    // Listeners para botones de eliminar área
    areasContainer.querySelectorAll('.delete-custom-area').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const areaName = btn.getAttribute('data-area');
            deleteCustomArea(areaName);
        });
    });
}

// FUNCIONES MODAL
const openModal = () => {
    formModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    hasUnsavedChanges = false;
};

const closeModal = () => {
    if (hasUnsavedChanges) {
        if (!window.confirm('Tienes cambios sin guardar.\n\n¿Deseas cerrar sin guardar?')) return;
    }
    formModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    hasUnsavedChanges = false;
};

articleForm.addEventListener('change', () => { hasUnsavedChanges = true; });
articleForm.addEventListener('input',  () => { hasUnsavedChanges = true; });
citaEditor.addEventListener('input',   () => { hasUnsavedChanges = true; });

formModal.addEventListener("click", (e) => { if (e.target === formModal) closeModal(); });

// EDITOR DE CITA (Cursiva)
btnItalic.addEventListener('click', () => {
    citaEditor.focus();
    document.execCommand('italic', false, null);
});

// FUNCIÓN PARA SUBIR ARCHIVOS
function sanitizeFileName(fileName) {
    return fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

async function uploadToFirebase(file, folder) {
    if (!file) throw new Error('No se proporcionó archivo');
    const sanitizedName = sanitizeFileName(file.name);
    const fileName = `${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { url: downloadURL, fileName: file.name };
}

// FUNCIÓN DE VALIDACIÓN
function validateFormData(data, files, isEdit = false) {
    const MAX_IMAGE_SIZE = 5  * 1024 * 1024;
    const MAX_PDF_SIZE   = 10 * 1024 * 1024;

    if (!data.tipo) {
        showToast('Debes seleccionar un tipo de publicación', 'error');
        return false;
    }
    if (!data.titulo?.trim()) {
        showToast('El título es obligatorio', 'error');
        return false;
    }
    if (data.titulo.trim().length > 200) {
        showToast('El título no puede superar 200 caracteres', 'error');
        return false;
    }
    if (!Array.isArray(data.subtitulos) || data.subtitulos.length === 0) {
        showToast('Debes seleccionar al menos un área jurídica', 'error');
        return false;
    }
    if (!data.resumen?.trim()) {
        showToast('El resumen es obligatorio', 'error');
        return false;
    }
    if (data.resumen.length < 10) {
        showToast('El resumen es muy corto (mín. 10 caracteres)', 'error');
        return false;
    }
    if (data.resumen.length > 500) {
        showToast('El resumen es demasiado largo (máx. 500 caracteres)', 'error');
        return false;
    }

    if (!isEdit) {
        if (!files.imagenFile) { showToast('Debes subir una imagen', 'error'); return false; }
        if (!files.pdfFile)    { showToast('Debes subir un PDF',     'error'); return false; }
    }
    if (files.imagenFile) {
        if (!files.imagenFile.type.startsWith('image/')) { showToast('El archivo de imagen no es válido', 'error'); return false; }
        if (files.imagenFile.size > MAX_IMAGE_SIZE)      { showToast('La imagen no debe superar 5MB',     'error'); return false; }
    }
    if (files.pdfFile) {
        if (files.pdfFile.type !== 'application/pdf') { showToast('El archivo debe ser un PDF válido', 'error'); return false; }
        if (files.pdfFile.size > MAX_PDF_SIZE)        { showToast('El PDF no debe superar 10MB',      'error'); return false; }
    }
    return true;
}

// =====================================================
// TOAST
// =====================================================
const showToast = (message, type = 'success') => {
    const toast       = document.getElementById("notification-toast");
    const toastIcon   = toast.querySelector(".toast-icon");
    const toastMsg    = toast.querySelector(".toast-message");
    const isError     = type === 'error';
    toast.className   = `toast-${isError ? 'error' : 'success'}`;
    toastIcon.className = `toast-icon fas ${isError ? 'fa-times-circle' : 'fa-check-circle'}`;
    toastMsg.textContent = message;
    setTimeout(() => toast.classList.remove('toast-hidden'), 50);
    setTimeout(() => toast.classList.add('toast-hidden'), 4000);
};

// =====================================================
// CARGAR PUBLICACIONES
// =====================================================
async function loadPosts() {
    const loader = document.getElementById('list-loader');
    if (loader) loader.classList.add('visible');
    try {
        // rAF garantiza que el loader se pinte ANTES de que empiece el fetch
        await new Promise(r => requestAnimationFrame(r));
        const querySnapshot = await getDocs(collection(db, "articulos"));
        allPosts = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        filteredPosts = [...allPosts];
        renderPosts();
    } catch (error) {
        showToast('Error cargando publicaciones', 'error');
    } finally {
        if (loader) loader.classList.remove('visible');
    }
}

// =====================================================
// RENDERIZAR PUBLICACIONES (con permisos)
// =====================================================
function formatDate(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sanitize(input) {
    const div = document.createElement('div');
    div.textContent = String(input || '');
    return div.innerHTML;
}

function renderPosts() {
    const start = (currentPage - 1) * itemsPerPage;
    const end   = start + itemsPerPage;
    const paginatedPosts = filteredPosts.slice(start, end);

    postList.innerHTML = paginatedPosts.map(post => {
        const canEdit   = isAdmin() || post.autorId === currentUser?.uid;
        const canDelete = isAdmin() || post.autorId === currentUser?.uid;
        const fecha     = formatDate(post.fechaCreacion);

        return `
        <li class="post-card">
            <div class="post-image-container">
                ${post.imagenUrl
                    ? `<img src="${post.imagenUrl}" class="post-image" alt="${sanitize(post.titulo)}">`
                    : '<div style="height:120px;background:#eee;"></div>'}
            </div>
            <div class="post-content">
                <h3>${sanitize(post.titulo)}</h3>
                <p>${sanitize(post.subtitulos?.join(', ') || '')}</p>
                <p class="post-type"><strong>Autor:</strong> ${sanitize(post.autorNombre || 'Desconocido')}</p>
                ${fecha ? `<p class="post-type"><strong>Fecha:</strong> ${fecha}</p>` : ''}
            </div>
            <div class="post-actions">
                ${canEdit   ? `<button class="edit-btn"   data-id="${post.id}">Editar</button>`   : ''}
                ${canDelete ? `<button class="delete-btn" data-id="${post.id}">Eliminar</button>` : ''}
                ${!canEdit && !canDelete ? `<span style="color:#999;font-size:13px;">Solo lectura</span>` : ''}
            </div>
        </li>`;
    }).join('');

    updatePaginationControls();
    attachPostEventListeners();
}

function updatePaginationControls() {
    currentPageSpan.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === Math.ceil(filteredPosts.length / itemsPerPage);
}

// BÚSQUEDA Y PAGINACIÓN
function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    filteredPosts = allPosts.filter(post =>
        post.titulo?.toLowerCase().includes(term) ||
        post.subtitulos?.join(' ').toLowerCase().includes(term) ||
        post.resumen?.toLowerCase().includes(term) ||
        post.autorNombre?.toLowerCase().includes(term)
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

// EVENTOS DE PUBLICACIONES (Editar / Eliminar)
function attachPostEventListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id   = e.target.getAttribute("data-id");
            const post = allPosts.find(p => p.id === id);
            if (!isAdmin() && post?.autorId !== currentUser?.uid) {
                showToast('Solo puedes eliminar tus propias publicaciones', 'error');
                return;
            }
            if (window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) {
                try {
                    await deleteDoc(doc(db, "articulos", id));
                    showToast('Publicación eliminada correctamente');
                    await loadPosts();
                } catch (error) {
                    showToast('Error eliminando publicación', 'error');
                }
            }
        });
    });

    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            try {
                const docSnap = await getDoc(doc(db, "articulos", id));
                if (!docSnap.exists()) { showToast('Publicación no encontrada', 'error'); return; }
                const data = docSnap.data();

                // Verificar permisos
                if (!isAdmin() && data.autorId !== currentUser?.uid) {
                    showToast('Solo puedes editar tus propias publicaciones', 'error');
                    return;
                }

                // Llenar formulario
                document.getElementById("tipo").value    = data.tipo    || 'articulo';
                document.getElementById("titulo").value  = data.titulo  || '';
                document.getElementById("resumen").value = data.resumen || '';

                // Mostrar crop preview con imagen existente y posición guardada
                if (data.imagenUrl) {
                    const pos = (data.imagenPosicion || '50% 50%').split(' ');
                    const posX = parseFloat(pos[0]) || 50;
                    const posY = parseFloat(pos[1]) || 50;
                    setupCropPreview(data.imagenUrl, posX, posY);
                }

                // Cita enriquecida
                citaEditor.innerHTML = data.cita || '';

                // Áreas jurídicas seleccionadas
                renderAreasContainer(data.subtitulos || []);

                // Guardar datos originales para no sobreescribir al guardar
                originalPostData = {
                    autorId:       data.autorId       || null,
                    autorNombre:   data.autorNombre    || '',
                    autorDesc:     data.autorDesc      || '',
                    autorFotoUrl:  data.autorFotoUrl   || null,
                    fechaCreacion: data.fechaCreacion  || null,
                    esAutorExterno: data.esAutorExterno ?? false,
                    subidoPor:     data.subidoPor      || null
                };

                currentAutorFotoUrl = data.autorFotoUrl || '';
                currentEditingId    = id;
                formTitle.textContent = "Editar Publicación";
                openModal();
                hasUnsavedChanges = false;
            } catch (error) {
                showToast('Error cargando publicación', 'error');
            }
        });
    });
}

// EVENTOS DE MODAL Y BOTONES
logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        showToast('Error al cerrar sesión', 'error');
    }
});

addPostBtn.addEventListener("click", () => {
    currentEditingId = null;
    originalPostData = null;
    formTitle.textContent = "Nueva Publicación";
    articleForm.reset();
    citaEditor.innerHTML = '';
    renderAreasContainer();
    // Resetear crop
    document.getElementById('crop-group').style.display = 'none';
    cropOffsetX = 50;
    cropOffsetY = 50;
    openModal();
});

cancelBtn.addEventListener("click",    closeModal);
modalCloseBtn.addEventListener("click", closeModal);

// Agregar área personalizada
agregarAreaBtn.addEventListener('click', () => {
    const area = nuevaAreaInput.value.trim();
    if (!area) { showToast('Escribe el nombre del área', 'error'); return; }
    saveCustomArea(area);
});
nuevaAreaInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); agregarAreaBtn.click(); }
});

// ENVÍO DEL FORMULARIO
articleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loadingOverlay.classList.remove('hidden');

    try {
        const tipo       = document.getElementById("tipo").value;
        const titulo     = document.getElementById("titulo").value.trim();
        const resumen    = document.getElementById("resumen").value.trim();
        const cita       = citaEditor.innerHTML.trim(); 
        const imagenFile = document.getElementById("imagen").files[0];
        const pdfFile    = document.getElementById("pdf").files[0];
        const imagenPosicion = `${cropOffsetX}% ${cropOffsetY}%`;

        // Áreas seleccionadas
        const areas = Array.from(document.querySelectorAll('input[name="areas"]:checked'))
                          .map(cb => cb.value);

        const formData = {
            titulo, subtitulos: areas, resumen, tipo, cita, imagenPosicion
        };

        const fileData = { imagenFile, pdfFile, autorFotoFile: null };

        if (!validateFormData(formData, fileData, currentEditingId !== null)) {
            loadingOverlay.classList.add('hidden');
            return;
        }

        let imagenUrl, pdfUrl, pdfFileName = '';

        if (imagenFile) {
            loadingOverlay.querySelector('p').textContent = 'Subiendo imagen...';
            const imgData = await uploadToFirebase(imagenFile, 'imagenes');
            imagenUrl = imgData.url;
        }
        if (pdfFile) {
            loadingOverlay.querySelector('p').textContent = 'Subiendo PDF...';
            const pdfData = await uploadToFirebase(pdfFile, 'pdfs');
            pdfUrl = pdfData.url;
            pdfFileName = pdfData.fileName;
        }

        if (currentEditingId) {
            const updateData = {
                ...formData,
                autorId:        originalPostData.autorId,
                autorNombre:    originalPostData.autorNombre,
                autorDesc:      originalPostData.autorDesc,
                autorFotoUrl:   originalPostData.autorFotoUrl,
                fechaCreacion:  originalPostData.fechaCreacion,
                ...(originalPostData.esAutorExterno && { esAutorExterno: true }),
                ...(originalPostData.subidoPor      && { subidoPor: originalPostData.subidoPor }),
                ...(imagenUrl  && { imagenUrl }),
                ...(pdfUrl     && { pdfUrl, pdfFileName })
            };
            await updateDoc(doc(db, "articulos", currentEditingId), updateData);
            showToast('Publicación actualizada correctamente');
        } else {
            const newData = {
                ...formData,
                autorId:      currentUser.uid,
                autorNombre:  currentUserAuthorData.nombreAutor,
                autorDesc:    currentUserAuthorData.bioAutor,
                autorFotoUrl: currentUserAuthorData.fotoAutorUrl,
                fechaCreacion: new Date(),
                ...(imagenUrl  && { imagenUrl }),
                ...(pdfUrl     && { pdfUrl, pdfFileName })
            };
            await addDoc(collection(db, "articulos"), newData);
            showToast('Publicación guardada correctamente');
        }

        articleForm.reset();
        citaEditor.innerHTML = '';
        renderAreasContainer();
        hasUnsavedChanges = false;
        closeModal();
        await loadPosts();

    } catch (error) {
        console.error("Error en submit:", error);
        showToast(`Error al guardar: ${error.message || 'Error inesperado'}`, 'error');
    } finally {
        setTimeout(() => loadingOverlay.classList.add('hidden'), 1000);
    }
});

// ENCUADRE DE IMAGEN (drag to position)
let cropOffsetX = 50; // % horizontal (50 = centro)
let cropOffsetY = 50; // % vertical   (50 = centro)

function initCropDrag() {
    const frame    = document.getElementById('crop-frame');
    const cropImg  = document.getElementById('crop-img');
    if (!frame || !cropImg) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    function clampPosition() {
        const fw = frame.offsetWidth;
        const fh = frame.offsetHeight;
        const iw = cropImg.offsetWidth;
        const ih = cropImg.offsetHeight;
        const minLeft = fw - iw;
        const minTop  = fh - ih;
        let left = parseFloat(cropImg.style.left) || 0;
        let top  = parseFloat(cropImg.style.top)  || 0;
        left = Math.min(0, Math.max(minLeft, left));
        top  = Math.min(0, Math.max(minTop,  top));
        cropImg.style.left = left + 'px';
        cropImg.style.top  = top  + 'px';
        // Guardar como porcentaje para object-position
        cropOffsetX = Math.round(((Math.abs(left)) / (iw - fw)) * 100) || 50;
        cropOffsetY = Math.round(((Math.abs(top))  / (ih - fh)) * 100) || 50;
    }

    function onDown(e) {
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX   = clientX;
        startY   = clientY;
        startLeft = parseFloat(cropImg.style.left) || 0;
        startTop  = parseFloat(cropImg.style.top)  || 0;
        e.preventDefault();
    }

    function onMove(e) {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        cropImg.style.left = (startLeft + clientX - startX) + 'px';
        cropImg.style.top  = (startTop  + clientY - startY) + 'px';
        clampPosition();
        e.preventDefault();
    }

    function onUp() { isDragging = false; }

    frame.addEventListener('mousedown',  onDown, { passive: false });
    frame.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove',  onMove, { passive: false });
    document.addEventListener('touchmove',  onMove, { passive: false });
    document.addEventListener('mouseup',  onUp);
    document.addEventListener('touchend', onUp);
}

function setupCropPreview(src, posX = 50, posY = 50) {
    const frame   = document.getElementById('crop-frame');
    const cropImg = document.getElementById('crop-img');
    const group   = document.getElementById('crop-group');
    if (!frame || !cropImg || !group) return;

    cropOffsetX = posX;
    cropOffsetY = posY;
    group.style.display = 'block';
    cropImg.src = src;

    cropImg.onload = () => {
        const fw = frame.offsetWidth;
        const fh = frame.offsetHeight;
        // Escalar imagen para que cubra el frame (como object-fit: cover)
        const scale = Math.max(fw / cropImg.naturalWidth, fh / cropImg.naturalHeight);
        const iw = cropImg.naturalWidth  * scale;
        const ih = cropImg.naturalHeight * scale;
        cropImg.style.width  = iw + 'px';
        cropImg.style.height = ih + 'px';
        // Posicionar según posX/posY guardados
        cropImg.style.left = -((posX / 100) * (iw - fw)) + 'px';
        cropImg.style.top  = -((posY / 100) * (ih - fh)) + 'px';
    };
}

// INICIALIZACIÓN
const initEventListeners = () => {
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => handlePagination('prev'));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => handlePagination('next'));
};

window.addEventListener("DOMContentLoaded", () => {
    initCropDrag();

    // Mostrar crop preview al seleccionar imagen
    document.getElementById('imagen').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setupCropPreview(ev.target.result, 50, 50);
        reader.readAsDataURL(file);
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = "login.html"; return; }
        currentUser = user;
        await loadCurrentUserAuthorData(user.uid);
        await loadCustomAreas();
        renderAreasContainer();
        await loadPosts();
        initEventListeners();

        // Si se viene desde "Mis Publicaciones" con un ID para editar
        const editPostId = sessionStorage.getItem('editPostId');
        if (editPostId) {
            sessionStorage.removeItem('editPostId');
            // Simular click del botón editar para ese ID
            setTimeout(() => {
                const btn = document.querySelector(`.edit-btn[data-id="${editPostId}"]`);
                if (btn) btn.click();
            }, 300);
        }
    });
});