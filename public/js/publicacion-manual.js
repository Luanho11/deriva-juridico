// publicacion-manual.js – Publicación Manual (solo admins)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { firebaseConfig, storage } from './config.js';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Redirigir si no está autenticado 
onAuthStateChanged(auth, (user) => { if (!user) window.location.href = 'login.html'; });

// ÁREAS BASE
const AREAS_BASE = [
    "Derecho Civil", "Derecho Comercial", "Arbitraje",
    "Derecho Administrativo", "Derecho Laboral", "Derecho Tributario",
    "Derecho Corporativo", "Derecho Ambiental", "Derecho Inmobiliario",
    "Propiedad Intelectual", "Derecho Internacional", "Finanzas",
    "Economía", "Derecho Penal", "Análisis Económico",
    "Gestión Pública", "Competencia y Regulación"
];

let customAreas  = [];
let currentUser  = null;

// =====================================================
// ELEMENTOS
// =====================================================
const formContainer    = document.getElementById('form-container');
const accessDenied     = document.getElementById('access-denied');
const loadingOverlay   = document.getElementById('loading-overlay');
const loadingText      = document.getElementById('loading-text');
const manualForm       = document.getElementById('manual-form');
const areasContainer   = document.getElementById('areas-container');
const nuevaAreaInput   = document.getElementById('nueva-area-input');
const agregarAreaBtn   = document.getElementById('agregar-area-btn');
const citaEditor       = document.getElementById('cita-editor');
const btnItalic        = document.getElementById('btn-italic');
const logoutBtn        = document.getElementById('logout-btn');
const autorFotoInput   = document.getElementById('autor-foto');
const photoPreview     = document.getElementById('author-photo-preview');

// =====================================================
// TOAST
// =====================================================
const showToast = (message, type = 'success') => {
    const toast     = document.getElementById("notification-toast");
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMsg  = toast.querySelector(".toast-message");
    const isError   = type === 'error';
    toast.className = `toast-${isError ? 'error' : 'success'}`;
    toastIcon.className = `toast-icon fas ${isError ? 'fa-times-circle' : 'fa-check-circle'}`;
    toastMsg.textContent = message;
    setTimeout(() => toast.classList.remove('toast-hidden'), 50);
    setTimeout(() => toast.classList.add('toast-hidden'), 4500);
};

// =====================================================
// VERIFICAR ROL ADMIN
// =====================================================
async function checkAdminRole(userId) {
    try {
        const userDocRef = doc(db, 'usuarios', userId);
        const userDoc    = await getDoc(userDocRef);
        if (!userDoc.exists()) return false;
        return (userDoc.data().rol || '') === 'admin';
    } catch (e) {
        return false;
    }
}

// =====================================================
// ÁREAS
// =====================================================
async function loadCustomAreas() {
    try {
        const docRef  = doc(db, 'configuracion', 'areas');
        const docSnap = await getDoc(docRef);
        customAreas = docSnap.exists() ? (docSnap.data().custom || []) : [];
    } catch (e) {
        customAreas = [];
    }
}

function getSelectedAreas() {
    return Array.from(document.querySelectorAll('input[name="areas"]:checked')).map(cb => cb.value);
}

function renderAreasContainer(selectedAreas = []) {
    const allAreas = [...AREAS_BASE, ...customAreas];
    areasContainer.innerHTML = allAreas.map((area) => {
        const isCustom = customAreas.includes(area);
        return `
        <label class="area-checkbox">
            <input type="checkbox" value="${area}" name="areas"
                   ${selectedAreas.includes(area) ? 'checked' : ''}>
            <span>${area}</span>
            ${isCustom
                ? `<button type="button" class="delete-area-btn"
                           data-area="${area}" title="Eliminar área">&times;</button>`
                : ''}
        </label>`;
    }).join('');

    areasContainer.querySelectorAll('.delete-area-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const area = btn.getAttribute('data-area');
            if (window.confirm(`¿Eliminar el área "${area}"?`)) {
                deleteCustomArea(area);
            }
        });
    });
}

async function saveCustomArea(area) {
    const trimmed = area.trim();
    if (!trimmed) return;
    const allCurrent = [...AREAS_BASE, ...customAreas].map(a => a.toLowerCase());
    if (allCurrent.includes(trimmed.toLowerCase())) {
        showToast('Esa área ya existe', 'error'); return;
    }
    try {
        customAreas.push(trimmed);
        await setDoc(doc(db, 'configuracion', 'areas'), { custom: customAreas }, { merge: true });
        const selected = getSelectedAreas();
        renderAreasContainer(selected);
        showToast(`Área "${trimmed}" agregada`);
        nuevaAreaInput.value = '';
    } catch (e) {
        customAreas.pop();
        showToast('Error guardando el área', 'error');
    }
}

async function deleteCustomArea(area) {
    try {
        const selected = getSelectedAreas().filter(a => a !== area);
        customAreas = customAreas.filter(a => a !== area);
        await setDoc(doc(db, 'configuracion', 'areas'), { custom: customAreas }, { merge: true });
        renderAreasContainer(selected);
        showToast(`Área "${area}" eliminada`);
    } catch (e) {
        showToast('Error eliminando área', 'error');
    }
}

// SUBIR ARCHIVOS
function sanitizeFileName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9.\-_]/g,"_");
}

async function uploadToFirebase(file, folder) {
    const fileName  = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    const snapshot  = await uploadBytes(storageRef, file);
    const url       = await getDownloadURL(snapshot.ref);
    return { url, fileName: file.name };
}

// PREVIEW FOTO AUTOR
autorFotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) { photoPreview.innerHTML = ''; return; }
    if (!file.type.startsWith('image/')) {
        showToast('Selecciona una imagen válida', 'error');
        autorFotoInput.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('La imagen no debe superar 5MB', 'error');
        autorFotoInput.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        photoPreview.innerHTML = `
            <img src="${ev.target.result}" alt="Preview">
            <span style="font-size:13px;color:#555;">${file.name}</span>`;
    };
    reader.readAsDataURL(file);
});

// EDITOR CURSIVA
btnItalic.addEventListener('click', () => {
    citaEditor.focus();
    document.execCommand('italic', false, null);
    btnItalic.style.background = '#c8d6e8';
    setTimeout(() => { btnItalic.style.background = ''; }, 300);
});

// VALIDACIÓN
function validateForm(data, files) {
    if (!data.tipo)          { showToast('Selecciona un tipo de publicación', 'error'); return false; }
    if (!data.titulo?.trim()){ showToast('El título es obligatorio', 'error'); return false; }
    if (!data.subtitulos?.length) { showToast('Selecciona al menos un área jurídica', 'error'); return false; }
    if (!data.resumen?.trim()){ showToast('El resumen es obligatorio', 'error'); return false; }
    if (!data.autorNombre?.trim()) { showToast('El nombre del autor es obligatorio', 'error'); return false; }
    if (!data.autorDesc?.trim())   { showToast('La biografía del autor es obligatoria', 'error'); return false; }
    if (!files.imagenFile) { showToast('Debes subir una imagen de portada', 'error'); return false; }
    if (!files.pdfFile)    { showToast('Debes subir el archivo PDF', 'error'); return false; }
    return true;
}

// =====================================================
// ENVÍO DEL FORMULARIO
// =====================================================
manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.classList.remove('hidden');

    try {
        const titulo      = document.getElementById('titulo').value.trim();
        const tipo        = document.getElementById('tipo').value;
        const resumen     = document.getElementById('resumen').value.trim();
        const cita        = citaEditor.innerHTML.trim();
        const autorNombre = document.getElementById('autor-nombre').value.trim();
        const autorDesc   = document.getElementById('autor-desc').value.trim();
        const imagenFile  = document.getElementById('imagen').files[0];
        const pdfFile     = document.getElementById('pdf').files[0];
        const autorFotoFile = autorFotoInput.files[0] || null;
        const subtitulos  = getSelectedAreas();

        const data  = { titulo, tipo, resumen, cita, subtitulos, autorNombre, autorDesc };
        const files = { imagenFile, pdfFile };

        if (!validateForm(data, files)) {
            loadingOverlay.classList.add('hidden'); return;
        }

        // Subir imagen
        loadingText.textContent = 'Subiendo imagen...';
        const { url: imagenUrl } = await uploadToFirebase(imagenFile, 'imagenes');

        // Subir PDF
        loadingText.textContent = 'Subiendo PDF...';
        const { url: pdfUrl, fileName: pdfFileName } = await uploadToFirebase(pdfFile, 'pdfs');

        // Subir foto del autor (opcional)
        let autorFotoUrl = null;
        if (autorFotoFile) {
            loadingText.textContent = 'Subiendo foto del autor...';
            const { url } = await uploadToFirebase(autorFotoFile, `autores/externos`);
            autorFotoUrl = url;
        }

        // Guardar en Firestore
        loadingText.textContent = 'Guardando publicación...';
        await addDoc(collection(db, 'articulos'), {
            titulo,
            tipo,
            resumen,
            cita,
            subtitulos,
            imagenUrl,
            pdfUrl,
            pdfFileName,
            // Datos del autor externo (no del admin que sube)
            autorNombre,
            autorDesc,
            autorFotoUrl,
            autorId:       `externo_${Date.now()}`,  // marcador de autor externo
            esAutorExterno: true,
            subidoPor:     currentUser.uid,          // quién subió
            fechaCreacion: new Date(),
        });

        showToast('Publicación externa guardada correctamente');
        manualForm.reset();
        citaEditor.innerHTML = '';
        photoPreview.innerHTML = '';
        renderAreasContainer();

    } catch (error) {
        console.error('Error:', error);
        showToast(`Error: ${error.message || 'Error inesperado'}`, 'error');
    } finally {
        setTimeout(() => loadingOverlay.classList.add('hidden'), 800);
    }
});

// LOGOUT
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
});

// Cerrar toast
document.querySelector('.toast-close')?.addEventListener('click', () => {
    document.getElementById('notification-toast').className = 'toast-hidden';
});

// INICIALIZACIÓN
window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = 'login.html'; return; }
        currentUser = user;

        // Mostrar loader mientras se verifica el rol y se cargan las áreas
        const pageLoader = document.getElementById('page-loader');
        if (pageLoader) pageLoader.classList.add('visible');

        const isAdmin = await checkAdminRole(user.uid);

        if (!isAdmin) {
            if (pageLoader) pageLoader.classList.remove('visible');
            accessDenied.classList.remove('hidden');
            return;
        }

        // Admin: cargar áreas y luego mostrar formulario
        await loadCustomAreas();
        if (pageLoader) pageLoader.classList.remove('visible');
        formContainer.classList.remove('hidden');
        renderAreasContainer();

        agregarAreaBtn.addEventListener('click', () => {
            const area = nuevaAreaInput.value.trim();
            if (!area) { showToast('Escribe el nombre del área', 'error'); return; }
            if (area.length > 60) { showToast('Máx. 60 caracteres', 'error'); return; }
            saveCustomArea(area);
        });
        nuevaAreaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); agregarAreaBtn.click(); }
        });
    });
});