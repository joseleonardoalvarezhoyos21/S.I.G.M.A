import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyASYjunAayzdmPGmUqIZD4s38droI2DybU",
    authDomain: "evaluaciones-nuevo-milenio.firebaseapp.com",
    projectId: "evaluaciones-nuevo-milenio",
    storageBucket: "evaluaciones-nuevo-milenio.firebasestorage.app",
    messagingSenderId: "824469538061",
    appId: "1:824469538061:web:403c9e6cb6a047baa19c44",
    measurementId: "G-70R3P77911" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Instancia secundaria para evitar que se cierre la sesión del administrador al registrar usuarios
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

const ADMIN_EMAIL = "josealvarez1654@outlook.com";

const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
const loginError = document.getElementById('login-error');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Restricción estricta: solo el correo administrador permitido
        if (user.email !== ADMIN_EMAIL) {
            await signOut(auth);
            alert("Acceso denegado. Esta consola es exclusiva para el administrador principal.");
            return;
        }

        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                if (userData.estado === 'inactivo') {
                    await signOut(auth);
                    alert("Su cuenta se encuentra inactiva. Contacte al soporte.");
                    return;
                }
            }

            if (loginSection) loginSection.style.display = 'none';
            if (dashboardContainer) dashboardContainer.style.display = 'block';
            cargarColegiosEnSelect();
            cargarColegiosYProfesores();
        } catch (error) {
            console.error("Error al validar estado en autenticación:", error);
            await signOut(auth);
        }
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
    }
});

const formAdminLogin = document.getElementById('form-admin-login');
if (formAdminLogin) {
    formAdminLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;

        // Validar antes de autenticar en Firebase si es el admin correcto
        if (email !== ADMIN_EMAIL) {
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = "Acceso denegado. Solo el administrador principal puede iniciar sesión aquí.";
            }
            return;
        }

        try {
            if (loginError) loginError.style.display = 'none';
            
            // 1. Iniciar sesión en Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Consultar el estado del usuario en Firestore
            const userDocRef = doc(db, "usuarios", uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                if (userData.estado === 'inactivo') {
                    await signOut(auth);
                    if (loginError) {
                        loginError.style.display = 'block';
                        loginError.textContent = "Su cuenta de administrador se encuentra inactiva.";
                    }
                    return;
                }
            }

        } catch (error) {
            console.error("Error de login:", error);
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = "Correo o contraseña de administrador incorrectos.";
            }
        }
    });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });
}

const rolSelect = document.getElementById('rol-usuario');
const grupoColegioSelect = document.getElementById('grupo-colegio-select');

if (rolSelect && grupoColegioSelect) {
    rolSelect.addEventListener('change', (e) => {
        if (e.target.value === 'profesor') {
            grupoColegioSelect.style.display = 'block';
        } else {
            grupoColegioSelect.style.display = 'none';
        }
    });
}

const formColegio = document.getElementById('form-colegio');
if (formColegio) {
    formColegio.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-colegio').value;
        const estado = document.getElementById('estado-colegio').value;

        try {
            await addDoc(collection(db, "colegios"), {
                nombre: nombre,
                estado: estado,
                fechaCreacion: new Date()
            });
            alert("Colegio registrado con éxito.");
            formColegio.reset();
            cargarColegiosEnSelect();
            cargarColegiosYProfesores();
        } catch (error) {
            console.error("Error al guardar colegio:", error);
            alert("Hubo un error al registrar el colegio.");
        }
    });
}

const formUsuario = document.getElementById('form-usuario');
if (formUsuario) {
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-usuario').value;
        const password = document.getElementById('password-usuario').value;
        const nombre = document.getElementById('nombre-usuario').value;
        const rol = document.getElementById('rol-usuario').value;
        const colegioId = document.getElementById('colegio-asociado').value;

        if (rol === 'profesor' && !colegioId) {
            alert("Debe seleccionar un colegio para el profesor asociado.");
            return;
        }

        try {
            // Se usa secondaryAuth para que la sesión del administrador no se cierre al crear el usuario
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            await setDoc(doc(db, "usuarios", uid), {
                nombre: nombre,
                email: email,
                rol: rol,
                colegioId: rol === 'profesor' ? colegioId : "",
                estado: "activo"
            });

            alert("Usuario creado exitosamente.");
            formUsuario.reset();
            if (grupoColegioSelect) grupoColegioSelect.style.display = 'none';
            cargarColegiosYProfesores();
        } catch (error) {
            console.error("Error al crear usuario:", error);
            alert("Error: " + error.message);
        }
    });
}

async function cargarColegiosEnSelect() {
    const selectColegio = document.getElementById('colegio-asociado');
    if (!selectColegio) return;
    
    selectColegio.innerHTML = '<option value="">Seleccione un colegio...</option>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "colegios"));
        querySnapshot.forEach((docColegio) => {
            const colegio = docColegio.data();
            const option = document.createElement('option');
            option.value = docColegio.id;
            option.textContent = colegio.nombre;
            selectColegio.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar colegios:", error);
    }
}

async function cargarColegiosYProfesores() {
    let container = document.getElementById('lista-colegios-container');
    
    if (!container && dashboardContainer) {
        container = document.createElement('div');
        container.id = 'lista-colegios-container';
        container.style.marginTop = '30px';
        dashboardContainer.appendChild(container);
    }

    if (!container) return;

    container.innerHTML = '<p>Cargando colegios y profesores...</p>';

    try {
        const snapshotColegios = await getDocs(collection(db, "colegios"));
        const snapshotUsuarios = await getDocs(collection(db, "usuarios"));
        
        const profesores = [];
        snapshotUsuarios.forEach(docUsr => {
            profesores.push({ id: docUsr.id, ...docUsr.data() });
        });

        if (snapshotColegios.empty) {
            container.innerHTML = '<p>No hay colegios registrados.</p>';
            return;
        }

        let html = '<h3 style="margin-top:20px;">Listado de Colegios y Profesores</h3>';

        snapshotColegios.forEach(docColegio => {
            const colegio = docColegio.data();
            const colegioId = docColegio.id;
            const esActivoColegio = colegio.estado === 'activo';

            const profesoresDelColegio = profesores.filter(p => p.colegioId === colegioId);

            html += `
                <div style="border: 1px solid #ccc; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #fafafa;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="margin: 0; color: #2b6cb0;">🏫 ${colegio.nombre}</h4>
                            <span style="font-size: 0.85rem; color: ${esActivoColegio ? 'green' : 'red'};">
                                Estado: <strong>${colegio.estado.toUpperCase()}</strong>
                            </span>
                        </div>
                        <div>
                            <button id="btn-col-${colegioId}" style="padding: 6px 12px; background-color: ${esActivoColegio ? '#e53e3e' : '#38a169'}; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                ${esActivoColegio ? 'Desactivar Colegio' : 'Activar Colegio'}
                            </button>
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <strong>Profesores Asociados (${profesoresDelColegio.length}):</strong>
            `;

            if (profesoresDelColegio.length === 0) {
                html += `<p style="font-size: 0.85rem; color: #666; font-style: italic; margin: 5px 0 0 0;">No hay profesores asociados.</p>`;
            } else {
                html += `<ul style="list-style-type: none; padding-left: 0; margin-top: 5px;">`;
                profesoresDelColegio.forEach(profesor => {
                    const esActivoProfesor = profesor.estado === 'activo';
                    html += `
                        <li style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 6px 10px; margin-bottom: 5px; border-radius: 4px; border: 1px solid #eee;">
                            <span style="font-size: 0.9rem;">
                                <strong>${profesor.nombre || 'Sin nombre'}</strong> (${profesor.email}) - 
                                <span style="color: ${esActivoProfesor ? 'green' : 'red'};">${profesor.estado || 'activo'}</span>
                            </span>
                            <button id="btn-prof-${profesor.id}" style="padding: 4px 8px; font-size: 0.8rem; background-color: ${esActivoProfesor ? '#e53e3e' : '#38a169'}; color: white; border: none; border-radius: 3px; cursor: pointer;">
                                ${esActivoProfesor ? 'Desactivar' : 'Activar'}
                            </button>
                        </li>
                    `;
                });
                html += `</ul>`;
            }

            html += `</div></div>`;
        });

        container.innerHTML = html;

        snapshotColegios.forEach(docColegio => {
            const colegioId = docColegio.id;
            const colegioData = docColegio.data();
            const btnCol = document.getElementById(`btn-col-${colegioId}`);
            if (btnCol) {
                btnCol.addEventListener('click', () => toggleEstadoColegio(colegioId, colegioData.estado, profesores));
            }
        });

        profesores.forEach(profesor => {
            const btnProf = document.getElementById(`btn-prof-${profesor.id}`);
            if (btnProf) {
                btnProf.addEventListener('click', () => toggleEstadoProfesor(profesor.id, profesor.estado || 'activo'));
            }
        });

    } catch (error) {
        console.error("Error al cargar la lista de colegios y profesores:", error);
        container.innerHTML = '<p style="color: red;">Error al cargar la información.</p>';
    }
}

async function toggleEstadoColegio(colegioId, estadoActual, profesores) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    
    try {
        await updateDoc(doc(db, "colegios", colegioId), { estado: nuevoEstado });

        if (nuevoEstado === 'inactivo') {
            const profesoresDelColegio = profesores.filter(p => p.colegioId === colegioId);
            for (let prof of profesoresDelColegio) {
                await updateDoc(doc(db, "usuarios", prof.id), { estado: 'inactivo' });
            }
        }

        alert(`Colegio cambiado a ${nuevoEstado} exitosamente.`);
        cargarColegiosYProfesores();
    } catch (error) {
        console.error("Error al actualizar el colegio:", error);
        alert("Hubo un error al actualizar el estado del colegio.");
    }
}

async function toggleEstadoProfesor(profesorId, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';

    try {
        await updateDoc(doc(db, "usuarios", profesorId), { estado: nuevoEstado });
        alert(`Profesor cambiado a ${nuevoEstado} exitosamente.`);
        cargarColegiosYProfesores();
    } catch (error) {
        console.error("Error al actualizar el profesor:", error);
        alert("Hubo un error al actualizar el estado del profesor.");
    }
}