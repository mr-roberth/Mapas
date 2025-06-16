const API_URL = "https://script.google.com/macros/s/AKfycbwLv0nrvT0w7sCgoaP6etB5Oisb8J2C1U5yIlfBhPc7BNVpYmaMkWpTUhZmP0tsQ_P2-g/exec";
let usuario = null;

// Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    const hashedPassword = await hashSHA256(password);
    const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ email, password: hashedPassword })
    });
    
    const data = await response.json();
    if (data.error) return alert("Error: " + data.error);
    
    usuario = data;
    document.getElementById("userName").textContent = data.nombre;
    document.getElementById("login").classList.add("d-none");
    document.getElementById("app").classList.remove("d-none");
    cargarPreguntas();
});

// Logout
document.getElementById("logout").addEventListener("click", () => {
    usuario = null;
    document.getElementById("app").classList.add("d-none");
    document.getElementById("login").classList.remove("d-none");
});

// Hash SHA-256
async function hashSHA256(str) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cargar preguntas dinámicas
function cargarPreguntas() {
    const preguntas = [
        "¿El área está limpia y ordenada?",
        "¿Se usan los equipos de protección?",
        "¿Hay señalización adecuada?"
    ];
    
    const container = document.getElementById("preguntas");
    container.innerHTML = preguntas.map((pregunta, i) => `
        <div class="mb-3">
            <label class="form-label">${i + 1}. ${pregunta}</label>
            <select class="form-select respuesta" data-pregunta="${pregunta}">
                <option value="">Seleccione...</option>
                <option value="Cumple">✅ Cumple</option>
                <option value="Parcial">⚠ Parcialmente</option>
                <option value="NoCumple">❌ No Cumple</option>
            </select>
            <div class="mt-2 evidencia d-none">
                <input type="file" class="form-control foto" accept="image/*" capture="environment">
                <small class="text-muted">Tome una foto como evidencia</small>
            </div>
        </div>
    `).join("");
    
    // Mostrar campo de foto solo si no cumple
    document.querySelectorAll(".respuesta").forEach(select => {
        select.addEventListener("change", (e) => {
            const evidenciaDiv = e.target.closest(".mb-3").querySelector(".evidencia");
            evidenciaDiv.classList.toggle("d-none", e.target.value === "Cumple");
        });
    });
}

// Guardar evaluación
document.getElementById("guardar").addEventListener("click", async () => {
    const evaluaciones = [];
    
    for (const select of document.querySelectorAll(".respuesta")) {
        const pregunta = select.dataset.pregunta;
        const respuesta = select.value;
        let fotoId = "";
        
        if (respuesta !== "Cumple") {
            const fileInput = select.closest(".mb-3").querySelector(".foto");
            if (fileInput.files[0]) {
                const fotoBase64 = await toBase64(fileInput.files[0]);
                const res = await fetch(`${API_URL}?action=uploadPhoto`, {
                    method: "POST",
                    body: JSON.stringify({ fotoBase64, usuarioId: usuario.id })
                });
                fotoId = (await res.json()).fotoId;
            }
        }
        
        evaluaciones.push({ usuario: usuario.id, pregunta, respuesta, fotoId, comentarios: "" });
    }
    
    // Guardar en Google Sheets
    await fetch(`${API_URL}?action=saveEvaluation`, {
        method: "POST",
        body: JSON.stringify(evaluaciones)
    });
    
    alert("✅ Evaluación guardada!");
});

// Convertir imagen a Base64
function toBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
    });
}