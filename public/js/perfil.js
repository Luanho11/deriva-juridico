import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Importar configuración de Firebase
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ── Protección de página: redirigir si no está autenticado 
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'login.html';
});

// ELEMENTOS DEL DOM
const elements = {
    // Elementos de perfil
    profileAvatarImg: document.getElementById('profile-avatar-img'),
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-email'),
    profileBio: document.getElementById('profile-bio'),
    
    // Elementos del formulario
    autorNombre: document.getElementById('autor-nombre'),
    autorDesc: document.getElementById('autor-desc'),
    autorFoto: document.getElementById('autor-foto'),
    photoPreview: document.getElementById('photo-preview'),
    profileForm: document.getElementById('profile-form'),
    saveProfileBtn: document.getElementById('save-profile-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    
    // Botones de acción
    logoutBtn: document.getElementById('logout-btn'),
    
    // Elementos de UI
    loadingOverlay: document.getElementById('loading-overlay'),
    notificationToast: document.getElementById('notification-toast'),
    toastIcon: document.querySelector('.toast-icon'),
    toastMessage: document.querySelector('.toast-message'),
    toastClose: document.querySelector('.toast-close')
};

// VARIABLES GLOBALES
let currentUser = null;
let selectedPhotoFile = null;
let currentPhotoUrl = null;

// FUNCIONES AUXILIARES

// Mostrar notificación Toast
function showNotification(message, type = 'success') {
    const iconClass = type === 'success' 
        ? 'fas fa-check-circle' 
        : type === 'warning' 
        ? 'fas fa-exclamation-circle' 
        : 'fas fa-times-circle';
    
    elements.toastIcon.className = `toast-icon ${iconClass}`;
    elements.toastMessage.textContent = message;
    elements.notificationToast.className = `toast-visible`;
    
    // Agregar clase según el tipo
    elements.notificationToast.classList.add(`toast-${type}`);
    
    setTimeout(() => {
        elements.notificationToast.className = 'toast-hidden';
        elements.notificationToast.classList.remove(`toast-${type}`);
    }, 4000);
}

// Mostrar/Ocultar loading overlay
function setLoading(isLoading) {
    if (isLoading) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// Validar campos del formulario
function validateForm() {
    const nombre = elements.autorNombre.value.trim();
    const desc = elements.autorDesc.value.trim();
    
    if (!nombre) {
        showNotification('El nombre completo es requerido', 'error');
        elements.autorNombre.focus();
        return false;
    }
    
    if (nombre.length < 3) {
        showNotification('El nombre debe tener al menos 3 caracteres', 'error');
        elements.autorNombre.focus();
        return false;
    }
    
    if (!desc) {
        showNotification('La biografía es requerida', 'error');
        elements.autorDesc.focus();
        return false;
    }
    
    if (desc.length < 10) {
        showNotification('La biografía debe tener al menos 10 caracteres', 'error');
        elements.autorDesc.focus();
        return false;
    }
    
    if (desc.length > 500) {
        showNotification('La biografía no puede exceder 500 caracteres', 'error');
        return false;
    }
    
    return true;
}

// Preview de imagen
function previewImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'preview-image-wrapper';
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Preview de foto">
            <p>Imagen seleccionada (se cargará al guardar)</p>
        `;
        elements.photoPreview.innerHTML = '';
        elements.photoPreview.appendChild(preview);
    };
    reader.readAsDataURL(file);
}

// FUNCIONES DE FIREBASE
// Cargar datos del usuario desde Firestore
async function loadUserProfile(userId) {
    try {
        const userDocRef = doc(db, 'usuarios', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Llenar formulario con datos existentes
            elements.autorNombre.value = userData.nombreAutor || '';
            elements.autorDesc.value = userData.bioAutor || '';
            
            // Mostrar foto en el perfil y preview
            if (userData.fotoAutorUrl) {
                elements.profileAvatarImg.src = userData.fotoAutorUrl;
                currentPhotoUrl = userData.fotoAutorUrl;
                
                const preview = document.createElement('div');
                preview.className = 'preview-image-wrapper';
                preview.innerHTML = `
                    <img src="${userData.fotoAutorUrl}" alt="Foto actual">
                    <p>Foto actual</p>
                `;
                elements.photoPreview.innerHTML = '';
                elements.photoPreview.appendChild(preview);
            }
            
            // Actualizar datos en el perfil header
            elements.profileName.textContent = userData.nombreAutor || 'Usuario';
            elements.profileBio.textContent = userData.bioAutor || 'Descripción breve del autor...';
        } else {
            console.log('No existe perfil previo, formulario vacío');
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
        showNotification('Error al cargar el perfil', 'error');
    }
}

// Subir foto a Firebase Storage
async function uploadAuthorPhoto(userId, file) {
    try {
        const timestamp = Date.now();
        const fileName = `autor_${userId}_${timestamp}`;
        const photoRef = ref(storage, `autores/${userId}/${fileName}`);
        
        await uploadBytes(photoRef, file);
        const downloadUrl = await getDownloadURL(photoRef);
        
        return downloadUrl;
    } catch (error) {
        console.error('Error subiendo foto:', error);
        showNotification('Error al subir la foto', 'error');
        throw error;
    }
}

// Eliminar foto antigua de Storage
async function deleteOldPhoto(userId) {
    try {
        if (currentPhotoUrl && currentPhotoUrl.includes('firebase')) {
            // Extraer referencia del URL y eliminar
            const urlParts = currentPhotoUrl.split('/');
            const filePath = urlParts[urlParts.length - 1].split('?')[0];
            const photoRef = ref(storage, `autores/${userId}/${filePath}`);
            await deleteObject(photoRef);
        }
    } catch (error) {
        console.warn('No se pudo eliminar foto antigua:', error);
    }
}

// Guardar perfil en Firestore
async function saveUserProfile(userId) {
    try {
        setLoading(true);
        
        // Validar formulario
        if (!validateForm()) {
            setLoading(false);
            return;
        }
        
        // Preparar datos
        const profileData = {
            nombreAutor: elements.autorNombre.value.trim(),
            bioAutor: elements.autorDesc.value.trim(),
            updatedAt: new Date().toISOString(),
            email: currentUser.email
        };
        
        // Si hay foto nueva, subirla
        if (selectedPhotoFile) {
            try {
                // Eliminar foto anterior si existe
                await deleteOldPhoto(userId);
                
                // Subir foto nueva
                const photoUrl = await uploadAuthorPhoto(userId, selectedPhotoFile);
                profileData.fotoAutorUrl = photoUrl;
            } catch (error) {
                setLoading(false);
                showNotification('Error al procesar la foto', 'error');
                return;
            }
        }
        
        // Guardar en Firestore
        const userDocRef = doc(db, 'usuarios', userId);
        await setDoc(userDocRef, profileData, { merge: true });
        
        // Actualizar variables locales
        currentPhotoUrl = profileData.fotoAutorUrl || currentPhotoUrl;
        selectedPhotoFile = null;
        
        // Actualizar vista del perfil
        elements.profileName.textContent = profileData.nombreAutor;
        elements.profileBio.textContent = profileData.bioAutor;
        if (profileData.fotoAutorUrl) {
            elements.profileAvatarImg.src = profileData.fotoAutorUrl;
        }
        
        showNotification('Perfil guardado exitosamente', 'success');
        setLoading(false);
    } catch (error) {
        console.error('Error guardando perfil:', error);
        showNotification('Error al guardar el perfil', 'error');
        setLoading(false);
    }
}

// EVENT LISTENERS
// Evento para cambio de foto
elements.autorFoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            showNotification('Por favor selecciona una imagen válida', 'error');
            elements.autorFoto.value = '';
            return;
        }
        
        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('La imagen no debe exceder 5MB', 'error');
            elements.autorFoto.value = '';
            return;
        }
        
        selectedPhotoFile = file;
        previewImage(file);
    }
});

// Evento para envío del formulario
elements.profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUser) {
        await saveUserProfile(currentUser.uid);
    }
});

// Botón cancelar
elements.cancelBtn.addEventListener('click', () => {
    elements.profileForm.reset();
    elements.photoPreview.innerHTML = '';
    selectedPhotoFile = null;
    showNotification('Cambios cancelados', 'warning');
});

// Botón cerrar sesión
elements.logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('Sesión cerrada', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
});

// Cerrar toast
elements.toastClose.addEventListener('click', () => {
    elements.notificationToast.className = 'toast-hidden';
    elements.notificationToast.classList.remove('toast-success', 'toast-error', 'toast-warning');
});

// INICIALIZACIÓN
// Verificar autenticación y cargar datos
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        elements.profileEmail.textContent = user.email;
        await loadUserProfile(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});