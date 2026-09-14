// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyASYjunAayzdmPGmUqIZD4s38droI2DybU",
    authDomain: "evaluaciones-nuevo-milenio.firebaseapp.com",
    projectId: "evaluaciones-nuevo-milenio",
    storageBucket: "evaluaciones-nuevo-milenio.firebasestorage.app",
    messagingSenderId: "824469538061",
    appId: "1:824469538061:web:403c9e6cb6a047baa19c44",
    measurementId: "G-70R3P77911"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let preguntas = [];
let codigoExamenActual = "";

document.addEventListener("DOMContentLoaded", () => {
    if (!window.MathLive) {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/mathlive";
        script.async = true;
        document.head.appendChild(script);
    }
});

// ==========================================
// CONFIGURACIÓN DE ESTADO Y TEMPORIZADOR
// ==========================================
let TOTAL_TIME_SECONDS = 1200; // Valor por defecto (20 minutos)
let timeRemaining = TOTAL_TIME_SECONDS;
let timerInterval = null;

let currentQuestionIndex = 0;
let selectedOptionIndex = null;
let userAnswers = [];
let studentName = "";
let selectedArea = "";
let isQuizSubmitted = false;

// ==========================================
// ELEMENTOS DOM
// ==========================================
const screenWelcome = document.getElementById("screen-welcome");
const screenQuiz = document.getElementById("screen-quiz");
const screenResults = document.getElementById("screen-results");

const formStart = document.getElementById("form-start");
const inputStudentName = document.getElementById("student-name");
const inputQuizCode = document.getElementById("quiz-code");

const questionNumber = document.getElementById("question-number");
const progressBar = document.getElementById("progress-bar");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const btnNext = document.getElementById("btn-next");

const resultStudentName = document.getElementById("result-student-name");
const resultScore = document.getElementById("result-score");
const resultPercentage = document.getElementById("result-percentage");
const resultCorrect = document.getElementById("result-correct");
const resultIncorrect = document.getElementById("result-incorrect");
const resultMessage = document.getElementById("result-message");
const resultTime = document.getElementById("result-time");
const emailStatus = document.getElementById("email-status");
const btnRestart = document.getElementById("btn-restart");

// ==========================================
// CARGAR SOLO LAS PREGUNTAS DEL PROFESOR ACTUAL
// ==========================================
async function cargarPreguntasParaSeleccion() {
    const contenedor = document.getElementById("admin-preguntas-lista");
    if (!contenedor) return;

    const user = auth.currentUser;
    if (!user) {
        contenedor.innerHTML = "<p style='color: #e74c3c; padding: 10px;'>Debes iniciar sesión para ver tus preguntas.</p>";
        return;
    }

    contenedor.innerHTML = "<p style='color: #666; padding: 10px;'>Cargando tus preguntas...</p>";

    const filtroAreaSelect = document.getElementById("admin-filtro-area");
    const areaSeleccionada = filtroAreaSelect ? filtroAreaSelect.value : "todas";

    try {
        const snapshot = await db.collection("preguntas")
            .where("creadorId", "==", user.uid)
            .get();

        if (snapshot.empty) {
            contenedor.innerHTML = "<p style='color: #e74c3c; padding: 10px;'>No tienes preguntas registradas aún.</p>";
            return;
        }

        let html = "";
        let contadorVisual = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const areaPregunta = (data.area || data.materia || "general").toLowerCase();

            if (areaSeleccionada !== "todas" && areaPregunta !== areaSeleccionada.toLowerCase()) {
                return;
            }

            contadorVisual++;
            const textoPregunta = data.pregunta || data.texto || data.enunciado || "Pregunta sin texto";

            html += `
                <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 6px; text-align: left;">
                    <label style="cursor: pointer; display: flex; align-items: flex-start; gap: 8px; font-size: 0.9rem;">
                        <input type="checkbox" name="admin-pregunta-ck" value="${doc.id}" style="margin-top: 3px;">
                        <div style="color: var(--text-color);"><strong>[${areaPregunta.toUpperCase()}]</strong> ${textoPregunta}</div>
                    </label>
                </div>
            `;
        });

        if (contadorVisual === 0) {
            contenedor.innerHTML = `<p style='color: #e74c3c; padding: 10px;'>No se encontraron preguntas para el área seleccionada.</p>`;
        } else {
            contenedor.innerHTML = html;
        }

    } catch (error) {
        console.error("Error al cargar preguntas para selección:", error);
        contenedor.innerHTML = "<p style='color: #e74c3c; padding: 10px;'>Error al conectar con la base de datos.</p>";
    }
}

// ==========================================
// CREAR EVALUACIÓN MANUAL (ASOCIADA AL PROFESOR)
// ==========================================
async function crearEvaluacionManual() {
    const user = auth.currentUser;
    if (!user) {
        alert("⚠️ Sesión no válida. Por favor, vuelve a iniciar sesión.");
        return;
    }

    const tituloInput = document.getElementById("admin-titulo");
    const titulo = tituloInput ? tituloInput.value.trim() : "";
    
    const tiempoInput = document.getElementById("admin-tiempo");
    const minutosAsignados = tiempoInput ? parseInt(tiempoInput.value) || 20 : 20;
    const tiempoEnSegundos = minutosAsignados * 60;

    const checkboxes = document.querySelectorAll('input[name="admin-pregunta-ck"]:checked');

    if (!titulo) {
        alert("⚠️ Por favor, ingresa un título para la evaluación.");
        if (tituloInput) tituloInput.focus();
        return;
    }

    if (checkboxes.length === 0) {
        alert("⚠️ Debes seleccionar al menos una pregunta para generar la evaluación.");
        return;
    }

    const preguntasIds = Array.from(checkboxes).map(cb => cb.value);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const codigoEvaluacion = `EXAM-${randomNum}`;

    try {
        await db.collection("evaluaciones").add({
            codigo: codigoEvaluacion,
            titulo: titulo,
            preguntasIds: preguntasIds,
            duracionSegundos: tiempoEnSegundos,
            activa: true,
            creadorId: user.uid,
            creadaEn: firebase.firestore.FieldValue.serverTimestamp()
        });

        const resultadoDiv = document.getElementById("admin-resultado");
        if (resultadoDiv) {
            resultadoDiv.innerHTML = `✅ ¡Evaluación creada con éxito! Código: <span style="color: #27ae60; font-size: 1.2rem;">${codigoEvaluacion}</span> (Duración: ${minutosAsignados} min)`;
        }
        
        tituloInput.value = "";
        if (tiempoInput) tiempoInput.value = "20";
        checkboxes.forEach(cb => cb.checked = false);
        
        cargarListaEvaluacionesAdmin();
        cargarListaEvaluaciones();

    } catch (error) {
        console.error("Error al crear la evaluación:", error);
        alert("❌ Ocurrió un error al guardar la evaluación en Firebase.");
    }
}

// ==========================================
// CARGAR PREGUNTAS POR CÓDIGO DE EVALUACIÓN (ESTUDIANTE)
// ==========================================
async function fetchQuestionsByCode(quizCode) {
    try {
        const cleanCode = (quizCode || "").toString().trim().toUpperCase();

        if (!cleanCode) {
            alert("⚠️ Por favor, ingresa el código de la evaluación.");
            return false;
        }

        codigoExamenActual = cleanCode;

        const evalSnapshot = await db.collection("evaluaciones")
            .where("codigo", "==", cleanCode)
            .where("activa", "==", true)
            .get();

        if (evalSnapshot.empty) {
            alert("⚠️ El código de evaluación no existe o la prueba está desactivada/cerrada por el profesor.");
            return false;
        }

        const evalData = evalSnapshot.docs[0].data();
        
        if (evalData.duracionSegundos) {
            TOTAL_TIME_SECONDS = evalData.duracionSegundos;
        } else {
            TOTAL_TIME_SECONDS = 1200;
        }

        const questionIds = evalData.preguntasIds || evalData.preguntas || evalData.ids || [];
        selectedArea = evalData.materia || evalData.area || "EVALUACIÓN";

        if (questionIds.length === 0) {
            alert("⚠️ Esta evaluación existe pero no tiene IDs de preguntas asociados.");
            return false;
        }

        const questionPromises = questionIds.map(async (id) => {
            if (!id) return null;
            const cleanId = id.toString().trim();
            const docSnap = await db.collection("preguntas").doc(cleanId).get();
            if (docSnap.exists) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        });

        const results = await Promise.all(questionPromises);
        preguntas = results.filter(q => q !== null);

        if (preguntas.length === 0) {
            alert("❌ No se pudieron recuperar los documentos de las preguntas.");
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error crítico al obtener la evaluación:", error);
        alert("❌ Error de conexión o permisos al cargar la evaluación.");
        return false;
    }
}

// ==========================================
// EVENTOS Y LÓGICA DEL EXAMEN
// ==========================================
formStart.addEventListener("submit", async (e) => {
    e.preventDefault();

    studentName = inputStudentName.value.trim();
    const quizCode = inputQuizCode.value.trim().toUpperCase();
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+(\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)+$/;

    if (studentName.length < 7) {
        alert("⚠️ Por favor, ingresa tu nombre y apellido completos (mínimo 7 caracteres).");
        return;
    }

    if (!nameRegex.test(studentName)) {
        alert("⚠️ Por favor, ingresa un nombre y apellido válidos (ejemplo: 'Juan Pérez').");
        return;
    }

    const hasQuestions = await fetchQuestionsByCode(quizCode);
    if (!hasQuestions) return;

    isQuizSubmitted = false;
    currentQuestionIndex = 0;
    userAnswers = [];

    screenWelcome.classList.remove("active");
    screenQuiz.classList.add("active");

    startTimer();
    showQuestion();
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden && screenQuiz.classList.contains("active") && !isQuizSubmitted) {
        clearInterval(timerInterval);
        if (selectedOptionIndex !== null) {
            userAnswers[currentQuestionIndex] = selectedOptionIndex;
        }
        showResults(true);
    }
});

function startTimer() {
    timeRemaining = TOTAL_TIME_SECONDS;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert("⏰ ¡El tiempo se ha agotado! La evaluación se enviará automáticamente.");

            if (selectedOptionIndex !== null) {
                userAnswers[currentQuestionIndex] = selectedOptionIndex;
            }
            showResults(false);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById("timer-display");
    if (timerElement) {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerElement.textContent = `⏱️ Tiempo restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (timeRemaining <= 60) {
            timerElement.style.color = "#e74c3c";
            timerElement.style.fontWeight = "bold";
        } else {
            timerElement.style.color = "inherit";
        }
    }
}

function showQuestion() {
    const q = preguntas[currentQuestionIndex];
    selectedOptionIndex = null;

    questionNumber.textContent = `Pregunta ${currentQuestionIndex + 1} de ${preguntas.length}`;
    const progressPercent = (currentQuestionIndex / preguntas.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    const textoPregunta = q.pregunta || q.texto || q.enunciado || "";
    let complementoHTML = "";

    if (q.imagen && q.imagen.trim() !== "") {
        complementoHTML = `
            <div style="margin: 15px 0; text-align: center;">
                <img src="${q.imagen}" alt="Imagen de la pregunta" style="max-width: 100%; max-height: 280px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); object-fit: contain;">
            </div>`;
    } else if (q.enunciadoEnriquecido && q.enunciadoEnriquecido.trim() !== "") {
        if (q.tipoEnriquecido === 'math') {
            complementoHTML = `
                <div style="margin: 15px 0; font-size: 1.2rem; text-align: left;">
                    <math-field read-only style="border:none; background:transparent; width:100%;">${q.enunciadoEnriquecido}</math-field>
                </div>`;
        } else {
            complementoHTML = `
                <div style="margin: 15px 0; font-size: 1.1rem; line-height: 1.5; text-align: left;">
                    ${q.enunciadoEnriquecido}
                </div>`;
        }
    }

    questionText.innerHTML = `
        <div style="margin-bottom: 10px;">${textoPregunta}</div>
        ${complementoHTML}
    `;

    optionsContainer.innerHTML = "";
    btnNext.disabled = true;

    const prefixes = ["A", "B", "C", "D"];
    const opcionesTextos = q.opciones || ["", "", "", ""];
    const opcionesImgs = q.opcionesImagenes || ["", "", "", ""];

    opcionesTextos.forEach((opcion, index) => {
        const btn = document.createElement("button");
        btn.classList.add("option-btn");

        let contenidoOpcion = `${prefixes[index]}. ${opcion || ""}`;

        if (opcionesImgs[index] && opcionesImgs[index].trim() !== "") {
            contenidoOpcion += `<br><img src="${opcionesImgs[index]}" style="max-width: 100%; max-height: 120px; margin-top: 5px; border-radius: 4px; object-fit: contain;">`;
        }

        btn.innerHTML = contenidoOpcion;
        btn.addEventListener("click", () => selectOption(index, btn));
        optionsContainer.appendChild(btn);
    });
}

function selectOption(index, selectedBtn) {
    const allButtons = optionsContainer.querySelectorAll(".option-btn");
    allButtons.forEach(btn => btn.classList.remove("selected"));

    selectedBtn.classList.add("selected");
    selectedOptionIndex = index;
    btnNext.disabled = false;
}

btnNext.addEventListener("click", () => {
    if (selectedOptionIndex !== null) {
        userAnswers[currentQuestionIndex] = selectedOptionIndex;
        currentQuestionIndex++;

        if (currentQuestionIndex < preguntas.length) {
            showQuestion();
        } else {
            clearInterval(timerInterval);
            showResults(false);
        }
    }
});

async function showResults(leftScreen = false) {
    if (isQuizSubmitted) return;
    isQuizSubmitted = true;

    clearInterval(timerInterval);

    screenQuiz.classList.remove("active");
    screenResults.classList.add("active");

    let correctCount = 0;
    const reviewContainer = document.getElementById("incorrect-review-container");
    reviewContainer.innerHTML = "";

    let reviewHTML = "";
    let emailErrorsText = "";

    preguntas.forEach((q, qIndex) => {
        const answerIndex = userAnswers[qIndex];
        const textPregunta = q.pregunta || q.texto || q.enunciado || "";

        if (answerIndex === q.respuesta) {
            correctCount++;
        } else {
            const userAnswerText = answerIndex !== undefined ? (q.opciones[answerIndex] || `Opción ${answerIndex + 1}`) : "Sin responder";
            const correctAnswerText = q.opciones[q.respuesta] || `Opción ${q.respuesta + 1}`;

            reviewHTML += `
                <div class="review-item" style="border: 1px solid #e74c3c; border-radius: 8px; padding: 12px; margin-bottom: 12px; background-color: #fdf2f2; text-align: left;">
                    <p style="margin: 0 0 6px 0; font-weight: bold; color: #c0392b;">Pregunta ${qIndex + 1}: ${textPregunta}</p>
                    <p style="margin: 2px 0; color: #e74c3c;">❌ <strong>Tu respuesta:</strong> ${userAnswerText}</p>
                    <p style="margin: 2px 0; color: #27ae60;">✔️ <strong>Respuesta correcta:</strong> ${correctAnswerText}</p>
                </div>
            `;

            emailErrorsText += `Pregunta ${qIndex + 1}: ${textPregunta}\n`;
            emailErrorsText += `   ❌ Respuesta dada: ${userAnswerText}\n`;
            emailErrorsText += `   ✔️ Respuesta correcta: ${correctAnswerText}\n\n`;
        }
    });

    if (reviewHTML !== "") {
        reviewContainer.innerHTML = `<h3 style="margin-top: 20px; color: #e74c3c; text-align: left;">Revisión de errores:</h3>` + reviewHTML;
    } else {
        reviewContainer.innerHTML = `<p style="color: #27ae60; font-weight: bold; margin-top: 15px;">🎉 ¡Excelente! Respondiste todas las preguntas correctamente.</p>`;
        emailErrorsText = "¡Perfecto! El estudiante no tuvo ninguna respuesta incorrecta.";
    }

    const totalQuestions = preguntas.length;
    const incorrectCount = totalQuestions - correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const secondsUsed = TOTAL_TIME_SECONDS - Math.max(0, timeRemaining);
    const minutesUsed = Math.floor(secondsUsed / 60);
    const remainingSecs = secondsUsed % 60;
    const timeUsedText = `${minutesUsed}m ${remainingSecs < 10 ? '0' : ''}${remainingSecs}s`;

    resultStudentName.textContent = `${studentName} (${selectedArea.toUpperCase()})`;
    resultScore.textContent = `${correctCount} / ${totalQuestions}`;
    resultPercentage.textContent = `${percentage}%`;
    resultCorrect.textContent = correctCount;
    resultIncorrect.textContent = incorrectCount;

    if (resultTime) {
        resultTime.textContent = timeUsedText;
    }

    if (leftScreen) {
        resultMessage.textContent = "⚠️ La evaluación finalizó automáticamente por salir de la pantalla.";
        resultMessage.style.color = "#d9534f";
    } else if (percentage >= 90) {
        resultMessage.textContent = "¡Excelente trabajo! 🏆";
    } else if (percentage >= 70) {
        resultMessage.textContent = "¡Muy buen trabajo! 👏";
    } else if (percentage >= 60) {
        resultMessage.textContent = "Buen trabajo, pero puedes mejorar. 📚";
    } else {
        resultMessage.textContent = "Debes seguir estudiando. 💪";
    }

    try {
        await db.collection("resultados").add({
            nombreEstudiante: studentName,
            codigoEvaluacion: codigoExamenActual,
            nota: `${correctCount} / ${totalQuestions} (${percentage}%)`,
            aciertos: correctCount,
            totalPreguntas: totalQuestions,
            porcentaje: percentage,
            tiempoUtilizado: timeUsedText,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            salioDePantalla: leftScreen ? "⚠️ Salió de la pantalla" : "Normal"
        });
    } catch (fbError) {
        console.error("❌ Error al guardar el resultado en Firebase:", fbError);
    }

    emailStatus.textContent = "Enviando resultados por correo...";

    let feedbackText = leftScreen ? `⚠️ ALERTA: El estudiante ${studentName} SALIÓ DE LA PANTALLA.` : resultMessage.textContent;

    const templateParams = {
        student_name: String(`${studentName} [Materia: ${selectedArea.toUpperCase()}]`),
        score: String(`${correctCount} / ${totalQuestions}`),
        percentage: String(`${percentage}%`),
        correct: String(correctCount),
        incorrect: String(incorrectCount),
        message: String(feedbackText),
        time_used: String(timeUsedText),
        error_details: String(emailErrorsText)
    };

    emailjs.send('service_2jsg9pd', 'template_82xq02a', templateParams)
        .then(() => {
            emailStatus.textContent = "Resultados enviados correctamente por correo. ✔️";
            emailStatus.style.color = "#2ecc71";
        }, (error) => {
            emailStatus.textContent = "No se pudo enviar el correo automático.";
            emailStatus.style.color = "#e74c3c";
        });
}

btnRestart.addEventListener("click", () => {
    clearInterval(timerInterval);
    currentQuestionIndex = 0;
    selectedOptionIndex = null;
    userAnswers = [];
    isQuizSubmitted = false;
    inputStudentName.value = "";
    inputQuizCode.value = "";
    emailStatus.textContent = "";
    document.getElementById("incorrect-review-container").innerHTML = "";

    screenResults.classList.remove("active");
    screenWelcome.classList.add("active");
});

document.addEventListener("contextmenu", (e) => {
    if (screenQuiz.classList.contains("active")) e.preventDefault();
});

["copy", "cut", "paste"].forEach((eventName) => {
    document.addEventListener(eventName, (e) => {
        if (screenQuiz.classList.contains("active")) e.preventDefault();
    });
});

document.addEventListener("keydown", (e) => {
    if (screenQuiz.classList.contains("active")) {
        if (e.ctrlKey || e.metaKey || e.key === "F12") e.preventDefault();
    }
});

// ==========================================
// CONTROL DE VISTAS CON MODAL PERSONALIZADO
// ==========================================
function mostrarVista(tipo) {
    const vistaEstudiante = document.getElementById("vista-estudiante");
    const vistaAdmin = document.getElementById("vista-admin");

    if (tipo === "estudiante") {
        vistaEstudiante.style.display = "block";
        vistaAdmin.style.display = "none";
    } else if (tipo === "admin") {
        solicitarAccesoAdmin();
    }
}

function solicitarAccesoAdmin() {
    const modal = document.getElementById('modal-admin-login');
    if (modal) {
        document.getElementById('admin-user-input').value = '';
        document.getElementById('admin-pass-input').value = '';
        const errorMsg = document.getElementById('login-error-msg');
        if (errorMsg) errorMsg.style.display = 'none';
        modal.style.display = 'flex';
    }
}

function cerrarModalAdmin() {
    const modal = document.getElementById('modal-admin-login');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==========================================
// LOGIN CON VALIDACIÓN DE ESTADO Y COLEGIO (ACTUALIZADO)
// ==========================================
const formAdminLogin = document.getElementById('form-admin-login');
if (formAdminLogin) {
    formAdminLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email') ? document.getElementById('admin-email').value : document.getElementById('admin-user-input').value;
        const password = document.getElementById('admin-password') ? document.getElementById('admin-password').value : document.getElementById('admin-pass-input').value;
        const loginError = document.getElementById('login-error') || document.getElementById('login-error-msg');

        try {
            if (loginError) loginError.style.display = 'none';
            
            // 1. Iniciar sesión en Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            // 2. Consultar el estado del usuario en Firestore (utilizando la sintaxis modular o namespaced de compatibilidad según corresponda, aquí usando Firestore namespaced SDK)
            const userDoc = await db.collection("usuarios").doc(uid).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Validar si el profesor está inactivo
                if (userData.estado === 'inactivo') {
                    await auth.signOut();
                    if (loginError) {
                        loginError.style.display = 'block';
                        loginError.textContent = "Su cuenta se encuentra inactiva. Contacte al administrador.";
                    }
                    return;
                }

                // Validar si el colegio asociado está inactivo (Cascada)
                if (userData.colegioId) {
                    const colegioDoc = await db.collection("colegios").doc(userData.colegioId).get();
                    if (colegioDoc.exists && colegioDoc.data().estado === 'inactivo') {
                        await auth.signOut();
                        if (loginError) {
                            loginError.style.display = 'block';
                            loginError.textContent = "El colegio asociado está inactivo. Acceso denegado.";
                        }
                        return;
                    }
                }
            }

            cerrarModalAdmin();
            
            const vistaEstudiante = document.getElementById("vista-estudiante");
            const vistaAdmin = document.getElementById("vista-admin");
            if (vistaEstudiante) vistaEstudiante.style.display = "none";
            if (vistaAdmin) vistaAdmin.style.display = "block";
            
            if (typeof cargarPreguntasParaSeleccion === "function") cargarPreguntasParaSeleccion();
            if (typeof cargarListaEvaluaciones === "function") cargarListaEvaluaciones();
            if (typeof cargarListaEvaluacionesAdmin === "function") cargarListaEvaluacionesAdmin();

        } catch (error) {
            console.error("Error de login:", error);
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = "Correo o contraseña incorrectos.";
            }
        }
    });
}

// ==========================================
// CARGAR LISTADOS Y GESTIÓN DE ADMINISTRADOR (SOLO DEL PROFESOR)
// ==========================================
async function cargarListaEvaluaciones() {
    const contenedor = document.getElementById("admin-evaluaciones-lista") || document.getElementById("excel-codigo-evaluacion");
    if (!contenedor) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await db.collection("evaluaciones")
            .where("creadorId", "==", user.uid)
            .orderBy("creadaEn", "desc")
            .get();

        if (snapshot.empty) return;

        if (contenedor.tagName === "SELECT") {
            contenedor.innerHTML = '<option value="">Selecciona una evaluación...</option>';
            snapshot.forEach(doc => {
                const data = doc.data();
                const option = document.createElement("option");
                option.value = data.codigo;
                option.textContent = `${data.codigo} - ${data.titulo || 'Sin título'} (${data.activa ? 'Activa' : 'Cerrada'})`;
                contenedor.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error al cargar la lista desplegable:", error);
    }
}

async function cargarListaEvaluacionesAdmin() {
    const contenedor = document.getElementById("admin-lista-evaluaciones");
    if (!contenedor) return;

    const user = auth.currentUser;
    if (!user) {
        contenedor.innerHTML = "<p style='color: #e74c3c; margin: 0;'>Debes iniciar sesión.</p>";
        return;
    }

    contenedor.innerHTML = "<p style='color: #666; margin: 0;'>Cargando tus evaluaciones...</p>";

    try {
        const snapshot = await db.collection("evaluaciones")
            .where("creadorId", "==", user.uid)
            .orderBy("creadaEn", "desc")
            .get();

        if (snapshot.empty) {
            contenedor.innerHTML = "<p style='color: #e74c3c; margin: 0;'>No tienes evaluaciones registradas.</p>";
            return;
        }

        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const mins = data.duracionSegundos ? Math.floor(data.duracionSegundos / 60) : 20;
            html += `
                <div style="padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${data.codigo}</strong>: ${data.titulo || 'Sin título'} (${mins} min) 
                        <span style="color: ${data.activa ? '#27ae60' : '#e74c3c'}; font-weight: bold;">(${data.activa ? 'Activa' : 'Cerrada'})</span>
                    </div>
                    <button type="button" onclick="document.getElementById('excel-codigo-evaluacion').value='${data.codigo}';" style="padding: 4px 8px; font-size: 0.8rem; cursor: pointer; background-color: #34495e; color: white; border: none; border-radius: 4px;">Seleccionar</button>
                </div>
            `;
        });
        contenedor.innerHTML = html;
    } catch (error) {
        console.error("Error al cargar lista de administración:", error);
        contenedor.innerHTML = "<p style='color: #e74c3c;'>Error al cargar las evaluaciones.</p>";
    }
}

// ==========================================
// VENTANA FLOTANTE Y EDICIÓN DE EVALUACIÓN
// ==========================================
let evaluacionIdEnEdicion = null;

async function editarEvaluacionSeleccionada() {
    const inputCodigo = document.getElementById("excel-codigo-evaluacion");
    const codigoEvaluacion = inputCodigo ? inputCodigo.value.trim().toUpperCase() : "";

    if (!codigoEvaluacion) {
        alert("⚠️ Selecciona o ingresa el código de la evaluación a editar en el campo de gestión.");
        return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await db.collection("evaluaciones")
            .where("codigo", "==", codigoEvaluacion)
            .where("creadorId", "==", user.uid)
            .get();

        if (snapshot.empty) {
            alert(`⚠️ No se encontró la evaluación con código: ${codigoEvaluacion} asociada a tu cuenta.`);
            return;
        }

        const docRef = snapshot.docs[0];
        evaluacionIdEnEdicion = docRef.id;
        const data = docRef.data();

        document.getElementById("edit-eval-titulo").value = data.titulo || "";
        
        const editTiempoInput = document.getElementById("edit-eval-tiempo");
        if (editTiempoInput) {
            editTiempoInput.value = data.duracionSegundos ? Math.floor(data.duracionSegundos / 60) : 20;
        }

        const preguntasAsociadas = data.preguntasIds || data.preguntas || data.ids || [];

        const contenedorPreguntas = document.getElementById("edit-eval-preguntas-lista");
        contenedorPreguntas.innerHTML = "<p style='color: #666;'>Cargando preguntas...</p>";

        const preguntasSnapshot = await db.collection("preguntas")
            .where("creadorId", "==", user.uid)
            .get();

        if (preguntasSnapshot.empty) {
            contenedorPreguntas.innerHTML = "<p style='color: #e74c3c;'>No tienes preguntas registradas en el sistema.</p>";
            return;
        }

        let html = "";
        preguntasSnapshot.forEach(pDoc => {
            const pData = pDoc.data();
            const textoPregunta = pData.pregunta || pData.texto || pData.enunciado || "Pregunta sin texto";
            const area = pData.area || pData.materia || "general";
            const estaMarcada = preguntasAsociadas.includes(pDoc.id) ? "checked" : "";

            html += `
                <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 6px;">
                    <label style="cursor: pointer; display: flex; align-items: flex-start; gap: 8px; font-size: 0.9rem;">
                        <input type="checkbox" name="edit-pregunta-ck" value="${pDoc.id}" ${estaMarcada} style="margin-top: 3px;">
                        <div style="color: var(--text-color);"><strong>[${area.toUpperCase()}]</strong> ${textoPregunta}</div>
                    </label>
                </div>
            `;
        });
        contenedorPreguntas.innerHTML = html;

        const modal = document.getElementById("modal-editar-evaluacion");
        if (modal) modal.style.display = "flex";

    } catch (error) {
        console.error("Error al abrir editor:", error);
        alert("❌ Ocurrió un error al cargar los datos para la edición.");
    }
}

function cerrarModalEditar() {
    const modal = document.getElementById("modal-editar-evaluacion");
    if (modal) modal.style.display = "none";
    evaluacionIdEnEdicion = null;
}

async function guardarEdicionEvaluacion() {
    if (!evaluacionIdEnEdicion) return;

    const nuevoTitulo = document.getElementById("edit-eval-titulo").value.trim();
    
    const editTiempoInput = document.getElementById("edit-eval-tiempo");
    const nuevosMinutos = editTiempoInput ? parseInt(editTiempoInput.value) || 20 : 20;
    const nuevosSegundos = nuevosMinutos * 60;

    const checkboxesSeleccionados = document.querySelectorAll('input[name="edit-pregunta-ck"]:checked');

    if (!nuevoTitulo) {
        alert("⚠️ El título de la evaluación no puede estar vacío.");
        return;
    }

    if (checkboxesSeleccionados.length === 0) {
        alert("⚠️ Debes seleccionar al menos una pregunta para la evaluación.");
        return;
    }

    const nuevosIdsPreguntas = Array.from(checkboxesSeleccionados).map(cb => cb.value);

    try {
        await db.collection("evaluaciones").doc(evaluacionIdEnEdicion).update({
            titulo: nuevoTitulo,
            duracionSegundos: nuevosSegundos,
            preguntasIds: nuevosIdsPreguntas,
            actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("✅ ¡Evaluación actualizada correctamente!");
        cerrarModalEditar();
        if (typeof cargarListaEvaluacionesAdmin === "function") cargarListaEvaluacionesAdmin();
        if (typeof cargarListaEvaluaciones === "function") cargarListaEvaluaciones();
    } catch (error) {
        console.error("Error al guardar cambios de edición:", error);
        alert("❌ Error al actualizar la evaluación en Firebase.");
    }
}

// ==========================================
// FUNCIONES ADICIONALES DE GESTIÓN
// ==========================================
async function cerrarEvaluacionPorCodigo() {
    const codigo = document.getElementById("excel-codigo-evaluacion").value.trim().toUpperCase();
    if (!codigo) {
        alert("⚠️ Ingresa el código de la evaluación.");
        return;
    }
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await db.collection("evaluaciones")
            .where("codigo", "==", codigo)
            .where("creadorId", "==", user.uid)
            .get();

        if (snapshot.empty) {
            alert("⚠️ No se encontró la evaluación en tu cuenta.");
            return;
        }
        const docRef = snapshot.docs[0];
        const estadoActual = docRef.data().activa;
        await docRef.ref.update({ activa: !estadoActual });
        alert(`🔒 Estado de la evaluación cambiado a: ${!estadoActual ? 'Activa' : 'Cerrada'}`);
        cargarListaEvaluacionesAdmin();
    } catch (error) {
        console.error("Error:", error);
        alert("❌ Error al cambiar el estado.");
    }
}

async function eliminarEvaluacionSeleccionada() {
    const codigo = document.getElementById("excel-codigo-evaluacion").value.trim().toUpperCase();
    if (!codigo) {
        alert("⚠️ Ingresa el código de la evaluación a eliminar.");
        return;
    }
    if (!confirm(`¿Estás seguro de eliminar la evaluación con código ${codigo}?`)) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await db.collection("evaluaciones")
            .where("codigo", "==", codigo)
            .where("creadorId", "==", user.uid)
            .get();

        if (snapshot.empty) {
            alert("⚠️ No se encontró la evaluación en tu cuenta.");
            return;
        }
        await snapshot.docs[0].ref.delete();
        alert("🗑️ Evaluación eliminada correctamente.");
        document.getElementById("excel-codigo-evaluacion").value = "";
        cargarListaEvaluacionesAdmin();
    } catch (error) {
        console.error("Error:", error);
        alert("❌ Error al eliminar.");
    }
}

async function exportarResultadosExcel() {
    const codigo = document.getElementById("excel-codigo-evaluacion").value.trim().toUpperCase();
    if (!codigo) {
        alert("⚠️ Ingresa el código de la evaluación para descargar sus resultados.");
        return;
    }
    try {
        const snapshot = await db.collection("resultados").where("codigoEvaluacion", "==", codigo).get();
        if (snapshot.empty) {
            alert("⚠️ No hay resultados registrados para este código.");
            return;
        }
        const datosExcel = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            datosExcel.push({
                "Estudiante": d.nombreEstudiante,
                "Código Examen": d.codigoEvaluacion,
                "Calificación": d.nota,
                "Aciertos": d.aciertos,
                "Total Preguntas": d.totalPreguntas,
                "Porcentaje": d.porcentaje + "%",
                "Tiempo Usado": d.tiempoUtilizado,
                "Fecha": d.fecha ? d.fecha.toDate().toLocaleString() : "N/D",
                "Salidas de Pantalla": d.salioDePantalla || "Normal"
            });
        });
        const worksheet = XLSX.utils.json_to_sheet(datosExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
        XLSX.writeFile(workbook, `Resultados_${codigo}.xlsx`);
    } catch (error) {
        console.error("Error al exportar:", error);
        alert("❌ Error al generar el archivo Excel.");
    }
}

function actualizarListaAdmin() {
    cargarListaEvaluacionesAdmin();
}