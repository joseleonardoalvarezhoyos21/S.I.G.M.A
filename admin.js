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

let allQuestions = [];
window.imagenActualTemp = "";
window.opcionesImagenesTemp = ["", "", "", ""];

const modalEdit = document.getElementById("modal-edit");
const closeModalBtn = document.getElementById("close-modal-btn");
const formAddQuestion = document.getElementById("form-add-question");
const formEditQuestion = document.getElementById("form-edit-question");
const questionsListBody = document.getElementById("questions-list-body");
const filterArea = document.getElementById("filter-area");

document.addEventListener("DOMContentLoaded", () => {
    if (!window.MathLive) {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/mathlive";
        script.async = true;
        document.head.appendChild(script);
    }
    iniciarApp();
});

window.cambiarModoAdd = function(modo) {
    document.getElementById("btn-mode-none-add").classList.remove("active");
    document.getElementById("btn-mode-image-add").classList.remove("active");
    document.getElementById("btn-mode-canvas-add").classList.remove("active");
    
    const secImage = document.getElementById("section-image-add");
    const secCanvas = document.getElementById("section-canvas-add");

    if (secImage) {
        secImage.style.display = "none";
        secImage.classList.remove("active");
    }
    if (secCanvas) {
        secCanvas.style.display = "none";
        secCanvas.classList.remove("active");
    }

    if (modo === 'none') {
        document.getElementById("btn-mode-none-add").classList.add("active");
    } else if (modo === 'image') {
        document.getElementById("btn-mode-image-add").classList.add("active");
        if (secImage) {
            secImage.style.display = "block";
            secImage.classList.add("active");
        }
    } else if (modo === 'canvas') {
        document.getElementById("btn-mode-canvas-add").classList.add("active");
        if (secCanvas) {
            secCanvas.style.display = "block";
            secCanvas.classList.add("active");
        }
    }
};

window.cambiarSubModoAdd = function(submodo) {
    const btnMath = document.getElementById("btn-submode-math-add");
    const btnText = document.getElementById("btn-submode-text-add");
    const contMath = document.getElementById("sub-container-math-add");
    const contText = document.getElementById("sub-container-text-add");

    if (submodo === 'math') {
        btnMath.classList.add("active");
        btnText.classList.remove("active");
        contMath.style.display = "block";
        contText.style.display = "none";
    } else if (submodo === 'text') {
        btnText.classList.add("active");
        btnMath.classList.remove("active");
        contText.style.display = "block";
        contMath.style.display = "none";
    }
};

window.formatoTextoAdd = function(command) {
    document.execCommand(command, false, null);
    document.getElementById("textarea-container-add").focus();
};

window.cambiarModoEdit = function(modo) {
    document.getElementById("btn-mode-none-edit").classList.remove("active");
    document.getElementById("btn-mode-image-edit").classList.remove("active");
    document.getElementById("btn-mode-canvas-edit").classList.remove("active");
    
    const secImageEdit = document.getElementById("section-image-edit");
    const secCanvasEdit = document.getElementById("section-canvas-edit");

    if (secImageEdit) {
        secImageEdit.style.display = "none";
        secImageEdit.classList.remove("active");
    }
    if (secCanvasEdit) {
        secCanvasEdit.style.display = "none";
        secCanvasEdit.classList.remove("active");
    }

    if (modo === 'none') {
        document.getElementById("btn-mode-none-edit").classList.add("active");
    } else if (modo === 'image') {
        document.getElementById("btn-mode-image-edit").classList.add("active");
        if (secImageEdit) {
            secImageEdit.style.display = "block";
            secImageEdit.classList.add("active");
        }
    } else if (modo === 'canvas') {
        document.getElementById("btn-mode-canvas-edit").classList.add("active");
        if (secCanvasEdit) {
            secCanvasEdit.style.display = "block";
            secCanvasEdit.classList.add("active");
        }
    }
};

window.cambiarSubModoEdit = function(submodo) {
    const btnMath = document.getElementById("btn-submode-math-edit");
    const btnText = document.getElementById("btn-submode-text-edit");
    const contMath = document.getElementById("sub-container-math-edit");
    const contText = document.getElementById("sub-container-text-edit");

    if (submodo === 'math') {
        btnMath.classList.add("active");
        btnText.classList.remove("active");
        contMath.style.display = "block";
        contText.style.display = "none";
    } else if (submodo === 'text') {
        btnText.classList.add("active");
        btnMath.classList.remove("active");
        contText.style.display = "block";
        contMath.style.display = "none";
    }
};

window.formatoTextoEdit = function(command) {
    document.execCommand(command, false, null);
    document.getElementById("textarea-container-edit").focus();
};

const inputImageFile = document.getElementById("question-image-file");
const previewNewImage = document.getElementById("preview-new-image");

if (inputImageFile) {
    inputImageFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewNewImage.src = event.target.result;
                previewNewImage.style.display = "inline-block";
            };
            reader.readAsDataURL(file);
        } else {
            previewNewImage.src = "";
            previewNewImage.style.display = "none";
        }
    });
}

for (let i = 0; i < 4; i++) {
    const optInput = document.getElementById(`opt-file-${i}`);
    const optPreview = document.getElementById(`preview-opt-${i}`);
    if (optInput) {
        optInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    optPreview.src = event.target.result;
                    optPreview.style.display = "inline-block";
                };
                reader.readAsDataURL(file);
            } else {
                optPreview.src = "";
                optPreview.style.display = "none";
            }
        });
    }
}

const editImageFile = document.getElementById("edit-question-image-file");
if (editImageFile) {
    editImageFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        const previewEditImage = document.getElementById("preview-edit-image");
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewEditImage.src = event.target.result;
                previewEditImage.style.display = "inline-block";
            };
            reader.readAsDataURL(file);
        } else if (window.imagenActualTemp) {
            previewEditImage.src = window.imagenActualTemp;
            previewEditImage.style.display = "inline-block";
        } else {
            previewEditImage.style.display = "none";
        }
    });
}

for (let i = 0; i < 4; i++) {
    const editOptInput = document.getElementById(`edit-opt-file-${i}`);
    const editOptPreview = document.getElementById(`edit-preview-opt-${i}`);
    if (editOptInput) {
        editOptInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    editOptPreview.src = event.target.result;
                    editOptPreview.style.display = "inline-block";
                };
                reader.readAsDataURL(file);
            } else if (window.opcionesImagenesTemp[i]) {
                editOptPreview.src = window.opcionesImagenesTemp[i];
                editOptPreview.style.display = "inline-block";
            } else {
                editOptPreview.style.display = "none";
            }
        });
    }
}

window.openEditModal = function(id) {
    const q = allQuestions.find(item => item.id === id);
    if (!q) return;

    document.getElementById("edit-doc-id").value = q.id;
    document.getElementById("edit-area-select").value = q.area || q.materia || "matematicas";
    document.getElementById("edit-question-text").value = q.pregunta || q.texto || q.enunciado || q.question || q.descripcion || q.title || "";
    
    const opcionesTextos = q.opciones || q.options || ["", "", "", ""];
    for (let i = 0; i < 4; i++) {
        document.getElementById(`edit-opt-${i}`).value = opcionesTextos[i] || "";
    }
    
    let respuestaIndex = 0;
    if (q.respuesta !== undefined) respuestaIndex = q.respuesta;
    else if (q.correctAnswer !== undefined) respuestaIndex = q.correctAnswer;
    else if (q.correcta !== undefined) respuestaIndex = q.correcta;
    document.getElementById("edit-correct-answer").value = respuestaIndex;

    document.getElementById("edit-question-image-file").value = "";
    window.imagenActualTemp = q.imagen || "";
    const previewEditImage = document.getElementById("preview-edit-image");
    const editorEdit = document.getElementById("editor-container-edit");
    const textareaEdit = document.getElementById("textarea-container-edit");

    // Limpiar campos iniciales
    if (editorEdit) { if (typeof editorEdit.setValue === 'function') editorEdit.setValue(""); else editorEdit.value = ""; }
    if (textareaEdit) textareaEdit.innerHTML = "";

    // Revisar qué tipo de recurso complementario tenía guardado
    if (q.imagen && q.imagen.trim() !== "") {
        cambiarModoEdit('image');
        previewEditImage.src = q.imagen;
        previewEditImage.style.display = "inline-block";
    } else if (q.enunciadoEnriquecido && q.enunciadoEnriquecido.trim() !== "") {
        cambiarModoEdit('canvas');
        previewEditImage.src = "";
        previewEditImage.style.display = "none";

        // Detectar si es LaTeX o Texto Enriquecido HTML
        if (q.tipoEnriquecido === 'math' || q.enunciadoEnriquecido.includes("\\") || q.enunciadoEnriquecido.includes("frac")) {
            cambiarSubModoEdit('math');
            if (editorEdit) {
                if (typeof editorEdit.setValue === 'function') editorEdit.setValue(q.enunciadoEnriquecido);
                else editorEdit.value = q.enunciadoEnriquecido;
            }
        } else {
            cambiarSubModoEdit('text');
            if (textareaEdit) textareaEdit.innerHTML = q.enunciadoEnriquecido;
        }
    } else {
        cambiarModoEdit('none');
        previewEditImage.src = "";
        previewEditImage.style.display = "none";
    }

    const opcionesImgs = q.opcionesImagenes || ["", "", "", ""];
    window.opcionesImagenesTemp = [...opcionesImgs];
    for (let i = 0; i < 4; i++) {
        document.getElementById(`edit-opt-file-${i}`).value = "";
        const optPreviewEdit = document.getElementById(`edit-preview-opt-${i}`);
        if (opcionesImgs[i] && opcionesImgs[i].trim() !== "") {
            optPreviewEdit.src = opcionesImgs[i];
            optPreviewEdit.style.display = "inline-block";
        } else {
            optPreviewEdit.src = "";
            optPreviewEdit.style.display = "none";
        }
    }

    if (modalEdit) modalEdit.style.display = "block";
};

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        modalEdit.style.display = "none";
    });
}

window.addEventListener("click", (e) => {
    if (e.target === modalEdit) {
        modalEdit.style.display = "none";
    }
});

function cargarPreguntas() {
    db.collection("preguntas").onSnapshot((snapshot) => {
        allQuestions = [];
        snapshot.forEach((doc) => {
            allQuestions.push({ id: doc.id, ...doc.data() });
        });
        filtrarYMostrarPreguntas();
    }, (error) => {
        console.error(error);
    });
}

function filtrarYMostrarPreguntas() {
    const areaFiltro = filterArea ? filterArea.value : "todas";
    let preguntasFiltradas = allQuestions;

    if (areaFiltro && areaFiltro !== "todas") {
        preguntasFiltradas = allQuestions.filter(q => {
            const areaDoc = (q.area || q.materia || "").toLowerCase().trim();
            return areaDoc === areaFiltro.toLowerCase().trim();
        });
    }

    if (!questionsListBody) return;
    questionsListBody.innerHTML = "";

    if (preguntasFiltradas.length === 0) {
        questionsListBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay preguntas registradas en esta área.</td></tr>`;
        return;
    }

    preguntasFiltradas.forEach((q) => {
        const textoPregunta = q.pregunta || q.texto || q.enunciado || q.question || q.descripcion || q.title || "(Sin texto)";
        
        let respuestaVal = 0;
        if (q.respuesta !== undefined) respuestaVal = q.respuesta;
        else if (q.correctAnswer !== undefined) respuestaVal = q.correctAnswer;
        else if (q.correcta !== undefined) respuestaVal = q.correcta;

        const letrasOpciones = ['A', 'B', 'C', 'D'];
        const respuestaCorrectaLetra = letrasOpciones[respuestaVal] || 'A';
        const areaMostrar = q.area || q.materia || 'GENERAL';

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${areaMostrar.toUpperCase()}</strong></td>
            <td>${textoPregunta.length > 80 ? textoPregunta.substring(0, 80) + '...' : textoPregunta}</td>
            <td><span style="color: green; font-weight: bold;">Opción ${respuestaCorrectaLetra}</span></td>
            <td>
                <button class="btn-edit" onclick="openEditModal('${q.id}')">Editar</button>
                <button class="btn-delete" onclick="eliminarPregunta('${q.id}')">Eliminar</button>
            </td>
        `;
        questionsListBody.appendChild(tr);
    });
}

if (filterArea) {
    filterArea.addEventListener("change", filtrarYMostrarPreguntas);
}

if (formAddQuestion) {
    formAddQuestion.addEventListener("submit", async (e) => {
        e.preventDefault();

        const area = document.getElementById("area-select").value;
        const pregunta = document.getElementById("question-text-input").value;
        const respuesta = parseInt(document.getElementById("correct-answer-select").value);

        let imagenEnunciado = "";
        let enunciadoEnriquecido = "";
        let tipoEnriquecido = "";

        const btnImageActive = document.getElementById("btn-mode-image-add").classList.contains("active");
        const btnCanvasActive = document.getElementById("btn-mode-canvas-add").classList.contains("active");

        if (btnImageActive) {
            imagenEnunciado = previewNewImage.src && previewNewImage.style.display !== "none" ? previewNewImage.src : "";
        } else if (btnCanvasActive) {
            const isMathActive = document.getElementById("btn-submode-math-add").classList.contains("active");
            if (isMathActive) {
                tipoEnriquecido = "math";
                const editorAdd = document.getElementById("editor-container-add");
                if (editorAdd) {
                    enunciadoEnriquecido = (typeof editorAdd.getValue === 'function' ? editorAdd.getValue() : editorAdd.value).trim();
                }
            } else {
                tipoEnriquecido = "text";
                const textareaAdd = document.getElementById("textarea-container-add");
                if (textareaAdd) {
                    enunciadoEnriquecido = textareaAdd.innerHTML.trim();
                }
            }
        }

        const opciones = [];
        const opcionesImagenes = [];

        for (let i = 0; i < 4; i++) {
            opciones.push(document.getElementById(`opt-${i}`).value);
            const previewOpt = document.getElementById(`preview-opt-${i}`);
            opcionesImagenes.push(previewOpt.style.display !== "none" ? previewOpt.src : "");
        }

        try {
            await db.collection("preguntas").add({
                area,
                pregunta,
                imagen: imagenEnunciado,
                enunciadoEnriquecido,
                tipoEnriquecido,
                opciones,
                opcionesImagenes,
                respuesta,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("¡Pregunta guardada exitosamente!");
            formAddQuestion.reset();
            previewNewImage.src = "";
            previewNewImage.style.display = "none";
            
            const editorAdd = document.getElementById("editor-container-add");
            if (editorAdd) {
                if (typeof editorAdd.setValue === 'function') editorAdd.setValue("");
                else editorAdd.value = "";
            }
            const textareaAdd = document.getElementById("textarea-container-add");
            if (textareaAdd) textareaAdd.innerHTML = "";

            cambiarModoAdd('none');
            cambiarSubModoAdd('math');

            for (let i = 0; i < 4; i++) {
                document.getElementById(`preview-opt-${i}`).src = "";
                document.getElementById(`preview-opt-${i}`).style.display = "none";
            }
        } catch (error) {
            alert("Hubo un error al guardar la pregunta.");
        }
    });
}

if (formEditQuestion) {
    formEditQuestion.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("edit-doc-id").value;
        const area = document.getElementById("edit-area-select").value;
        const pregunta = document.getElementById("edit-question-text").value;
        const respuesta = parseInt(document.getElementById("edit-correct-answer").value);

        let imagenEnunciado = "";
        let enunciadoEnriquecido = "";
        let tipoEnriquecido = "";

        const btnImageActive = document.getElementById("btn-mode-image-edit").classList.contains("active");
        const btnCanvasActive = document.getElementById("btn-mode-canvas-edit").classList.contains("active");
        const btnNoneActive = document.getElementById("btn-mode-none-edit").classList.contains("active");

        if (btnNoneActive) {
            imagenEnunciado = "";
            enunciadoEnriquecido = "";
            tipoEnriquecido = "";
        } else if (btnImageActive) {
            const previewEditImage = document.getElementById("preview-edit-image");
            if (previewEditImage.src && previewEditImage.style.display !== "none") {
                imagenEnunciado = previewEditImage.src;
            }
        } else if (btnCanvasActive) {
            const isMathActive = document.getElementById("btn-submode-math-edit").classList.contains("active");
            if (isMathActive) {
                tipoEnriquecido = "math";
                const editorEdit = document.getElementById("editor-container-edit");
                if (editorEdit) {
                    enunciadoEnriquecido = (typeof editorEdit.getValue === 'function' ? editorEdit.getValue() : editorEdit.value).trim();
                }
            } else {
                tipoEnriquecido = "text";
                const textareaEdit = document.getElementById("textarea-container-edit");
                if (textareaEdit) {
                    enunciadoEnriquecido = textareaEdit.innerHTML.trim();
                }
            }
        }

        const opciones = [];
        const opcionesImagenes = [];

        for (let i = 0; i < 4; i++) {
            opciones.push(document.getElementById(`edit-opt-${i}`).value);
            const previewEditOpt = document.getElementById(`edit-preview-opt-${i}`);
            let imgOp = window.opcionesImagenesTemp[i] || "";
            if (previewEditOpt.style.display !== "none" && previewEditOpt.src) {
                imgOp = previewEditOpt.src;
            }
            opcionesImagenes.push(imgOp);
        }

        try {
            await db.collection("preguntas").doc(id).update({
                area,
                pregunta,
                imagen: imagenEnunciado,
                enunciadoEnriquecido,
                tipoEnriquecido,
                opciones,
                opcionesImagenes,
                respuesta,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("¡Pregunta actualizada con éxito!");
            modalEdit.style.display = "none";
        } catch (error) {
            alert("Hubo un error al actualizar la pregunta.");
        }
    });
}

window.eliminarPregunta = async function(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta pregunta?")) {
        try {
            await db.collection("preguntas").doc(id).delete();
            alert("Pregunta eliminada correctamente.");
        } catch (error) {
            alert("No se pudo eliminar la pregunta.");
        }
    }
};

function iniciarApp() {
    cargarPreguntas();
}