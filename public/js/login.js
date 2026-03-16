// Importar módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración e inicialización de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDxYKhzf5vm3VXZyvSefnuwYwYvXohaAk8",
    authDomain: "derivajuridico-2cc99.firebaseapp.com",
    projectId: "derivajuridico-2cc99",
    storageBucket: "derivajuridico-2cc99.appspot.com",
    messagingSenderId: "327704878028",
    appId: "1:327704878028:web:2686f0d8c734d7e9dedb69"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
await setPersistence(auth, browserSessionPersistence);
const db = getFirestore(app);

// Variables para el bloqueo por intentos fallidos
const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 300000; 
let attemptCount = 0;
let blockUntil = null;

// Función para mostrar notificaciones (Toast)
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Función para marcar campos inválidos
function markInvalidFields(fieldIds = []) {
    fieldIds.forEach(id => {
        if (id) {
            const inputGroup = document.getElementById(id).closest('.input-group');
            inputGroup.classList.add('invalid');
            setTimeout(() => {
                inputGroup.classList.remove('invalid');
            }, 1500);
        }
    });
}

// Función para validar el formato del correo electrónico
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Manejo del envío del formulario de login con validación y bloqueo
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Verificar si la cuenta está bloqueada
    if (blockUntil && Date.now() < blockUntil) {
        let secondsLeft = Math.ceil((blockUntil - Date.now()) / 1000);
        showNotification(`Demasiados intentos. Por favor espere ${secondsLeft} segundos.`, 'error');
        return;
    }

    // Obtener valores de los campos
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validar que los campos no estén vacíos
    if (!email || !password) {
        showNotification('Por favor complete todos los campos', 'error');
        markInvalidFields([!email ? 'email' : '', !password ? 'password' : '']);
        return;
    }

    // Validar el formato del correo electrónico
    if (!validateEmail(email)) {
        showNotification('El correo electrónico no es válido', 'error');
        markInvalidFields(['email']);
        return;
    }

    // Validar que la contraseña tenga al menos 6 caracteres
    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        markInvalidFields(['password']);
        return;
    }

    try {
        // Deshabilitar botón y mostrar spinner
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
        // Intentar autenticación
        await signInWithEmailAndPassword(auth, email, password);
        // Reiniciar contador de intentos al iniciar sesión correctamente
        attemptCount = 0;
        blockUntil = null;
        showNotification('Inicio de sesión exitoso', 'success');
        setTimeout(() => {
            window.location.href = "admin.html";
        }, 1500);
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';

        // Incrementar contador de intentos
        attemptCount++;
        // Si se excede el máximo, establecer bloqueo
        if (attemptCount >= MAX_ATTEMPTS) {
            blockUntil = Date.now() + BLOCK_TIME;
            showNotification(`Demasiados intentos. La cuenta queda bloqueada por ${BLOCK_TIME / 1000} segundos.`, 'error');
            submitBtn.disabled = true;
            // Restaurar el formulario después del tiempo de bloqueo
            setTimeout(() => {
                attemptCount = 0;
                blockUntil = null;
                submitBtn.disabled = false;
            }, BLOCK_TIME);
        }

        // Manejo de errores según el código
        let errorMessage;
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'El correo electrónico no es válido';
                markInvalidFields(['email']);
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No existe una cuenta con este correo';
                markInvalidFields(['email']);
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta';
                markInvalidFields(['password']);
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos. Cuenta temporalmente bloqueada';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Error de conexión. Verifique su red';
                break;
            default:
                errorMessage = 'Error al iniciar sesión. Intente nuevamente';
        }
        showNotification(errorMessage, 'error');
        console.error("Error de autenticación:", error);
    }

    // Redirigir usuario autenticado que intenta acceder a login
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "admin.html";
        }
    });
});