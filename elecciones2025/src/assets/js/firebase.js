import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3DcP3Ut71H8xQzrQGc77KVNPaH9ptPHM",
  authDomain: "elecciones-centro-estudiantes.firebaseapp.com",
  projectId: "elecciones-centro-estudiantes",
  storageBucket: "elecciones-centro-estudiantes.firebasestorage.app",
  messagingSenderId: "182911906041",
  appId: "1:182911906041:web:f6ee4762e51fd414d8f228",
  measurementId: "G-ZBCN23CK31",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const MESA_PASSWORD = "admin123";

function obtenerNumeroMesa() {
  const MESAS_PERMITIDAS = ["1", "2"];
  const currentPage = window.location.pathname.split("/").pop();
  const urlParams = new URLSearchParams(window.location.search);
  const mesaFromUrl = urlParams.get("mesa");
  
  if (currentPage === "votar.html" || currentPage === "presidente.html") {
    if (mesaFromUrl) {
      if (!MESAS_PERMITIDAS.includes(mesaFromUrl)) {
        window.location.href = "error.html";
        return "1";
      }
      return mesaFromUrl;
    }
    return "1";
  }
  
  if (mesaFromUrl) {
    if (!MESAS_PERMITIDAS.includes(mesaFromUrl)) {
      window.location.href = "error.html";
      return "1";
    }
    localStorage.setItem("numeroMesa", mesaFromUrl);
    return mesaFromUrl;
  }
  
  const mesaFromStorage = localStorage.getItem("numeroMesa");
  if (mesaFromStorage) {
    return mesaFromStorage;
  }
  
  return "1";
}

function verificarPaginaValida() {
  const PAGINAS_PERMITIDAS = [
    "presidente.html",
    "votar.html",
    "resultados.html",
    "error.html",
  ];
  const MESAS_PERMITIDAS = ["1", "2"];
  const currentPage = window.location.pathname.split("/").pop();
  const urlParams = new URLSearchParams(window.location.search);
  
  if (!currentPage || currentPage === "" || currentPage === "index.html") {
    return;
  }
  
  if (!PAGINAS_PERMITIDAS.includes(currentPage)) {
    window.location.href = "error.html";
    return;
  }
  
  if (currentPage === "error.html") {
    return;
  }
  
  const params = Array.from(urlParams.keys());
  if (params.length > 0) {
    if (params.length !== 1 || params[0] !== "mesa") {
      window.location.href = "error.html";
      return;
    }
    const mesaValue = urlParams.get("mesa");
    if (!MESAS_PERMITIDAS.includes(mesaValue)) {
      window.location.href = "error.html";
      return;
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  verificarPaginaValida();
});

function establecerNumeroMesa(numeroMesa) {
  localStorage.setItem("numeroMesa", numeroMesa);
}

// NUEVA FUNCIÓN: Verificar si un DNI ya está habilitado en cualquier mesa
async function verificarDNIHabilitadoGlobal(dni) {
  try {
    const docRef = doc(db, "votantes_activos_global", dni);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error al verificar DNI global:", error);
    return null;
  }
}

// NUEVA FUNCIÓN: Registrar DNI como habilitado globalmente
async function registrarDNIGlobal(dni, nombreApellido, division, mesa) {
  try {
    await setDoc(doc(db, "votantes_activos_global", dni), {
      dni: dni,
      nombreApellido: nombreApellido,
      division: division,
      mesa: mesa,
      habilitado: true,
      fechaHabilitacion: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error al registrar DNI global:", error);
    return false;
  }
}

// NUEVA FUNCIÓN: Eliminar DNI del registro global
async function eliminarDNIGlobal(dni) {
  try {
    await deleteDoc(doc(db, "votantes_activos_global", dni));
    return true;
  } catch (error) {
    console.error("Error al eliminar DNI global:", error);
    return false;
  }
}

function setupDNIFormatter() {
  const dniInput = document.getElementById("dni");
  if (!dniInput) return;
  
  dniInput.setAttribute("maxlength", "10");
  dniInput.setAttribute("pattern", "\\d{1,2}\\.\\d{3}\\.\\d{3}|\\d{1,8}");
  dniInput.setAttribute("title", "Ingrese 8 dígitos numéricos");
  
  dniInput.addEventListener("input", function (e) {
    const value = e.target.value.replace(/\D/g, "");
    const limitedValue = value.slice(0, 8);
    let formattedValue = "";
    
    for (let i = 0; i < limitedValue.length; i++) {
      if (i === 2 || i === 5) {
        formattedValue += ".";
      }
      formattedValue += limitedValue[i];
    }
    
    e.target.value = formattedValue;
  });
}

function setupRegisterVoterButton() {
  const registerButton = document.getElementById("registerVoter");
  const dniInput = document.getElementById("dni");
  const nombreInput = document.getElementById("nombre_apellido");
  const divisionInput = document.getElementById("division");
  
  if (!registerButton || !dniInput || !nombreInput || !divisionInput) return;
  
  function verificarCamposCompletos() {
    const dni = obtenerDNISinFormato(dniInput.value);
    const nombre = nombreInput.value.trim();
    const division = divisionInput.value.trim();
    return dni.length === 8 && nombre !== "" && division !== "";
  }
  
  async function actualizarEstadoBoton() {
    const camposCompletos = verificarCamposCompletos();
    const votanteActual = await obtenerVotanteActual();
    const mesaOcupada = votanteActual && votanteActual.habilitado;
    
    // NUEVA VERIFICACIÓN: Verificar si el DNI está habilitado globalmente
    const dni = obtenerDNISinFormato(dniInput.value);
    const dniHabilitadoGlobal = dni.length === 8 ? await verificarDNIHabilitadoGlobal(dni) : null;
    
    registerButton.disabled = !camposCompletos || mesaOcupada || dniHabilitadoGlobal;
    registerButton.classList.remove("btn-disabled", "btn-occupied", "btn-dni-ocupado");
    
    if (dniHabilitadoGlobal) {
      registerButton.textContent = `DNI habilitado en Mesa ${dniHabilitadoGlobal.mesa}`;
      registerButton.classList.add("btn-dni-ocupado");
    } else if (mesaOcupada) {
      registerButton.textContent = "Mesa Ocupada";
      registerButton.classList.add("btn-occupied");
    } else if (!camposCompletos) {
      registerButton.textContent = "Complete los campos";
      registerButton.classList.add("btn-disabled");
    } else {
      registerButton.textContent = "Habilitar Votante";
    }
  }
  
  // NUEVO: Listener para detectar cambios en tiempo real en el DNI global
  let unsubscribeGlobalListener = null;
  
  function configurarEscuchaGlobal() {
    // Limpiar listener anterior si existe
    if (unsubscribeGlobalListener) {
      unsubscribeGlobalListener();
    }
    
    const dni = obtenerDNISinFormato(dniInput.value);
    if (dni.length === 8) {
      // Escuchar cambios específicos para este DNI en el registro global
      const docRef = doc(db, "votantes_activos_global", dni);
      unsubscribeGlobalListener = onSnapshot(docRef, (doc) => {
        // Actualizar estado cuando cambie el registro global de este DNI
        actualizarEstadoBoton();
      });
    }
  }
  
  dniInput.addEventListener("input", () => {
    actualizarEstadoBoton();
    configurarEscuchaGlobal(); // Reconfigurar listener para el nuevo DNI
  });
  
  nombreInput.addEventListener("input", actualizarEstadoBoton);
  divisionInput.addEventListener("input", actualizarEstadoBoton);
  
  escucharEstadoVotante(actualizarEstadoBoton);
  actualizarEstadoBoton();
  configurarEscuchaGlobal();
  
  // Limpiar listeners cuando se cierre la ventana
  window.addEventListener("beforeunload", () => {
    if (unsubscribeGlobalListener) {
      unsubscribeGlobalListener();
    }
  });
}

function obtenerDNISinFormato(dniFormateado) {
  return dniFormateado.replace(/\D/g, "");
}

function formatearDNI(dni) {
  const dniStr = dni.toString();
  if (dniStr.length <= 2) return dniStr;
  if (dniStr.length <= 5) return dniStr.slice(0, 2) + "." + dniStr.slice(2);
  return dniStr.slice(0, 2) + "." + dniStr.slice(2, 5) + "." + dniStr.slice(5);
}

function showMessage(message, type = "info") {
  console.log(`[${type.toUpperCase()}] ${message}`);
  const messageDiv = document.createElement("div");
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    z-index: 1001;
    font-weight: bold;
    background-color: ${
      type === "error" ? "#e74c3c" : type === "success" ? "#27ae60" : "#3498db"
    };
  `;
  document.body.appendChild(messageDiv);
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}

function showSuccessModal(message) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  `;
  
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  
  const title = document.createElement("h2");
  title.textContent = "¡Voto Registrado!";
  title.style.cssText = `
    color: #27ae60;
    margin-bottom: 15px;
    font-size: 24px;
  `;
  
  const messageP = document.createElement("p");
  messageP.textContent = message;
  messageP.style.cssText = `
    color: #333;
    font-size: 16px;
    margin-bottom: 20px;
  `;
  
  const reloadMessage = document.createElement("p");
  reloadMessage.textContent = "La página se recargará automáticamente en unos segundos...";
  reloadMessage.style.cssText = `
    color: #666;
    font-size: 14px;
    margin-bottom: 20px;
    font-style: italic;
  `;
  
  const reloadPage = () => {
    window.location.reload();
  };
  
  modalContent.appendChild(title);
  modalContent.appendChild(messageP);
  modalContent.appendChild(reloadMessage);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  setTimeout(() => {
    reloadPage();
  }, 5000);
}

// FUNCIÓN MEJORADA: Habilitar votante con control global de DNI
async function habilitarVotante(dni, nombreApellido, division) {
  try {
    const numeroMesa = obtenerNumeroMesa();
    
    // Verificar si la mesa actual ya tiene un votante habilitado
    const votanteActual = await obtenerVotanteActual();
    if (votanteActual && votanteActual.habilitado) {
      showMessage(
        `Error: Ya hay un votante habilitado en Mesa ${numeroMesa}. ${votanteActual.nombreApellido} (DNI: ${votanteActual.dni}) debe votar primero.`,
        "error"
      );
      return false;
    }
    
    // NUEVA VERIFICACIÓN: Verificar si el DNI ya está habilitado en cualquier mesa
    const dniHabilitadoGlobal = await verificarDNIHabilitadoGlobal(dni);
    if (dniHabilitadoGlobal) {
      showMessage(
        `Error: El DNI ${dni} ya está habilitado en Mesa ${dniHabilitadoGlobal.mesa}. La persona ${dniHabilitadoGlobal.nombreApellido} debe votar primero.`,
        "error"
      );
      return false;
    }
    
    // Verificar si ya votó
    const yaVoto = await verificarVoto(dni);
    if (yaVoto) {
      showMessage("Error: Este DNI ya emitió su voto", "error");
      return false;
    }
    
    // Habilitar en la mesa específica
    await setDoc(doc(db, "votantes_activos", `mesa_${numeroMesa}`), {
      dni: dni,
      nombreApellido: nombreApellido,
      division: division,
      mesa: numeroMesa,
      habilitado: true,
      fechaHabilitacion: serverTimestamp(),
    });
    
    // NUEVO: Registrar el DNI globalmente
    const registroGlobalExitoso = await registrarDNIGlobal(dni, nombreApellido, division, numeroMesa);
    if (!registroGlobalExitoso) {
      // Si falla el registro global, revertir el registro de la mesa
      await deshabilitarVotante();
      showMessage("Error en el sistema. Intente nuevamente.", "error");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error al habilitar votante:", error);
    return false;
  }
}

// FUNCIÓN MEJORADA: Deshabilitar votante con limpieza global
async function deshabilitarVotante() {
  try {
    const numeroMesa = obtenerNumeroMesa();
    
    // Obtener datos del votante actual antes de deshabilitar
    const votanteActual = await obtenerVotanteActual();
    
    // Deshabilitar en la mesa específica
    await setDoc(doc(db, "votantes_activos", `mesa_${numeroMesa}`), {
      habilitado: false,
      fechaDeshabilitacion: serverTimestamp(),
    });
    
    // NUEVO: Si había un votante habilitado, eliminar su registro global
    if (votanteActual && votanteActual.habilitado && votanteActual.dni) {
      await eliminarDNIGlobal(votanteActual.dni);
    }
    
    return true;
  } catch (error) {
    console.error("Error al deshabilitar votante:", error);
    return false;
  }
}

async function obtenerVotanteActual() {
  try {
    const numeroMesa = obtenerNumeroMesa();
    const docRef = doc(db, "votantes_activos", `mesa_${numeroMesa}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener votante actual:", error);
    return null;
  }
}

function escucharEstadoVotante(callback) {
  const numeroMesa = obtenerNumeroMesa();
  const docRef = doc(db, "votantes_activos", `mesa_${numeroMesa}`);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  });
}

async function registrarAlumno(dni, nombreApellido, division) {
  try {
    const alumnosRef = collection(db, "alumnos");
    const q = query(alumnosRef, where("dni", "==", dni));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      showMessage("Error: El DNI ya está registrado", "error");
      return false;
    }
    
    await addDoc(alumnosRef, {
      dni: dni,
      nombreApellido: nombreApellido,
      division: division,
      fechaRegistro: serverTimestamp(),
    });
    
    showMessage("Alumno registrado exitosamente", "success");
    return true;
  } catch (error) {
    console.error("Error al registrar alumno:", error);
    showMessage("Error al registrar alumno: " + error.message, "error");
    return false;
  }
}

async function obtenerEstadisticas() {
  try {
    const [alumnosSnapshot, votosSnapshot] = await Promise.all([
      getDocs(collection(db, "alumnos")),
      getDocs(collection(db, "votos")),
    ]);
    
    return {
      totalAlumnos: alumnosSnapshot.size,
      totalVotos: votosSnapshot.size,
      participacion:
        alumnosSnapshot.size > 0
          ? ((votosSnapshot.size / alumnosSnapshot.size) * 100).toFixed(1)
          : 0,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return { totalAlumnos: 0, totalVotos: 0, participacion: 0 };
  }
}

async function verificarVoto(dni) {
  try {
    const votosRef = collection(db, "votos");
    const q = query(votosRef, where("dni", "==", dni));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error al verificar voto:", error);
    return false;
  }
}

async function verificarAlumno(dni) {
  try {
    const alumnosRef = collection(db, "alumnos");
    const q = query(alumnosRef, where("dni", "==", dni));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return querySnapshot.docs[0].data();
  } catch (error) {
    console.error("Error al verificar alumno:", error);
    return null;
  }
}

// FUNCIÓN MEJORADA: Registrar voto con limpieza automática del DNI global
async function registrarVoto(dni, lista, nombreApellido, division) {
  try {
    const votanteActual = await obtenerVotanteActual();
    if (!votanteActual || !votanteActual.habilitado || votanteActual.dni !== dni) {
      showMessage("Error: Votante no habilitado para votar", "error");
      return false;
    }
    
    const yaVoto = await verificarVoto(dni);
    if (yaVoto) {
      showMessage("Error: Este DNI ya emitió su voto", "error");
      return false;
    }
    
    const numeroMesa = obtenerNumeroMesa();
    
    // Registrar el voto
    await addDoc(collection(db, "votos"), {
      dni: dni,
      lista: lista,
      fechaVoto: serverTimestamp(),
      nombreApellido: nombreApellido,
      division: division,
      mesa: numeroMesa,
    });
    
    return true;
  } catch (error) {
    console.error("Error al registrar voto:", error);
    showMessage("Error al registrar voto: " + error.message, "error");
    return false;
  }
}

async function obtenerListaVotantes() {
  try {
    const numeroMesa = obtenerNumeroMesa();
    const votosRef = collection(db, "votos");
    const q = query(
      votosRef,
      where("mesa", "==", numeroMesa),
      orderBy("fechaVoto", "desc")
    );
    const querySnapshot = await getDocs(q);
    const votantes = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      votantes.push({
        dni: data.dni,
        nombreApellido: data.nombreApellido,
        division: data.division,
        lista: data.lista,
        fechaVoto: data.fechaVoto,
        mesa: data.mesa || "N/A",
      });
    });
    
    return votantes;
  } catch (error) {
    console.error("Error al obtener lista de votantes:", error);
    showMessage("Error al cargar la lista de votantes", "error");
    return [];
  }
}

async function actualizarListaVotantes() {
  const votersList = document.getElementById("votersList");
  if (!votersList) return;
  
  try {
    const votantes = await obtenerListaVotantes();
    if (votantes.length === 0) {
      votersList.innerHTML = '<div class="empty-list">No hay votantes registrados aún</div>';
      return;
    }
    
    let html = '<div class="voters-items">';
    votantes.forEach((votante, index) => {
      const fechaVoto = votante.fechaVoto
        ? votante.fechaVoto.toDate().toLocaleString("es-AR")
        : "Fecha no disponible";
      html += `
        <div class="voter-item">
            <div>
             <div class="voter-name">${votante.nombreApellido}</div>
             <div class="voter-name">DNI: <span class="voter-division" style="font-weight: bold">${votante.dni}</span></div>
             <div class="voter-division">División: ${votante.division}</div>
            </div>
            <div style="text-align: right">
              <div class="voter-time">${fechaVoto}</div>
              <div class="voter-division">Mesa: ${votante.mesa}</div>
            </div>
        </div>
      `;
    });
    html += "</div>";
    votersList.innerHTML = html;
  } catch (error) {
    console.error("Error al actualizar lista de votantes:", error);
    votersList.innerHTML = '<div class="empty-list">Error al cargar la lista</div>';
  }
}

function obtenerResultadosEnTiempoReal(callback) {
  const votosRef = collection(db, "votos");
  const alumnosRef = collection(db, "alumnos");
  
  const unsubscribeVotos = onSnapshot(votosRef, async (votosSnapshot) => {
    try {
      const alumnosSnapshot = await getDocs(alumnosRef);
      const conteoPorLista = {};
      const listas = ["lista1", "lista2", "lista3"];
      
      listas.forEach((lista) => {
        conteoPorLista[lista] = 0;
      });
      
      votosSnapshot.forEach((doc) => {
        const voto = doc.data();
        if (conteoPorLista.hasOwnProperty(voto.lista)) {
          conteoPorLista[voto.lista]++;
        }
      });
      
      const totalVotos = votosSnapshot.size;
      const totalAlumnos = alumnosSnapshot.size;
      
      const resultados = {
        totalVotos: totalVotos,
        totalAlumnos: totalAlumnos,
        participacion:
          totalAlumnos > 0 ? ((totalVotos / totalAlumnos) * 100).toFixed(1) : 0,
        listas: {},
      };
      
      listas.forEach((lista) => {
        const votos = conteoPorLista[lista];
        const porcentaje = totalVotos > 0 ? ((votos / totalVotos) * 100).toFixed(1) : 0;
        resultados.listas[lista] = {
          votos: votos,
          porcentaje: porcentaje,
        };
      });
      
      let ganador = null;
      let maxVotos = 0;
      Object.keys(resultados.listas).forEach((lista) => {
        if (resultados.listas[lista].votos > maxVotos) {
          maxVotos = resultados.listas[lista].votos;
          ganador = {
            lista: lista,
            votos: maxVotos,
            porcentaje: resultados.listas[lista].porcentaje,
          };
        }
      });
      
      resultados.ganador = ganador;
      callback(resultados);
    } catch (error) {
      console.error("Error al procesar resultados:", error);
    }
  });
  
  return unsubscribeVotos;
}

function mostrarSelectorMesa() {}

async function mostrarEstadoMesa() {
  const mesaActual = obtenerNumeroMesa();
  const estadoDiv = document.createElement("div");
  estadoDiv.id = "estadoMesa";
  estadoDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: white;
    border: 2px solid #27ae60;
    border-radius: 5px;
    padding: 10px;
    z-index: 1000;
    font-weight: bold;
    max-width: 300px;
  `;
  
  const actualizarEstado = async () => {
    const votanteActual = await obtenerVotanteActual();
    if (votanteActual && votanteActual.habilitado) {
      estadoDiv.innerHTML = `
        <div style="color: #e74c3c;">
          <strong>🔴 MESA ${mesaActual} OCUPADA</strong><br>
          Votante: ${votanteActual.nombreApellido}<br>
          DNI: ${votanteActual.dni}<br>
          División: ${votanteActual.division}
        </div>
      `;
      estadoDiv.style.borderColor = "#e74c3c";
    } else {
      estadoDiv.innerHTML = `
        <div style="color: #27ae60;">
          <strong>🟢 MESA ${mesaActual} DISPONIBLE</strong><br>
          Listo para habilitar votante
        </div>
      `;
      estadoDiv.style.borderColor = "#27ae60";
    }
  };
  
  await actualizarEstado();
  escucharEstadoVotante(actualizarEstado);
  document.body.appendChild(estadoDiv);
}

document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();
  mostrarSelectorMesa();
  
  if (currentPage === "presidente.html" || currentPage === "") {
    console.log("Inicializando mesa de control...");
    setupDNIFormatter();
    setupRegisterVoterButton();
    
    const mesaActual = obtenerNumeroMesa();
    console.log(`Mesa actual: ${mesaActual}`);
    mostrarEstadoMesa();
    
    let isListVisible = false;
    const form = document.getElementById("voterRegistrationForm");
    
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dni = obtenerDNISinFormato(document.getElementById("dni").value);
        const nombreApellido = document.getElementById("nombre_apellido").value;
        const division = document.getElementById("division").value;
        
        if (!dni || !nombreApellido || !division) {
          showMessage("Por favor complete todos los campos", "error");
          return;
        }
        
        const yaVoto = await verificarVoto(dni);
        if (yaVoto) {
          showMessage("Error: Este DNI ya emitió su voto", "error");
          return;
        }
        
        const success = await habilitarVotante(dni, nombreApellido, division);
        if (success) {
          showMessage(
            `Votante habilitado correctamente en Mesa ${mesaActual}`,
            "success"
          );
          form.reset();
          if (isListVisible) {
            actualizarListaVotantes();
          }
        } else {
          showMessage("Error al habilitar votante", "error");
        }
      });
    }
    
    const toggleButton = document.getElementById("toggleVotersList");
    const votersList = document.getElementById("votersList");
    
    if (toggleButton && votersList) {
      toggleButton.addEventListener("click", async () => {
        isListVisible = !isListVisible;
        if (isListVisible) {
          toggleButton.textContent = "Ocultar Lista";
          votersList.style.display = "block";
          await actualizarListaVotantes();
        } else {
          toggleButton.textContent = "Mostrar Lista";
          votersList.style.display = "none";
        }
      });
    }
    
    async function actualizarEstadisticas() {
      const stats = await obtenerEstadisticas();
      const registeredCountEl = document.getElementById("registeredCount");
      const votesCountEl = document.getElementById("votesCount");
      
      if (registeredCountEl) registeredCountEl.textContent = stats.totalAlumnos;
      if (votesCountEl) votesCountEl.textContent = stats.totalVotos;
    }
    
    actualizarEstadisticas();
    setInterval(actualizarEstadisticas, 10000);
    setInterval(() => {
      if (isListVisible) {
        actualizarListaVotantes();
      }
    }, 15000);
  }
  
  if (currentPage === "votar.html") {
    console.log("Inicializando sistema de votación...");
    const mesaActual = obtenerNumeroMesa();
    console.log(`Mesa actual: ${mesaActual}`);
    
    const votingContent = document.querySelector(".container");
    const form = document.getElementById("votingForm");
    
    if (votingContent) {
      votingContent.style.display = "none";
    }
    
    const waitingMessage = document.createElement("div");
    waitingMessage.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
      font-size: 24px;
      color: #666;
    `;
    waitingMessage.innerHTML = `
      <div>
        <h2>Esperando habilitación...</h2>
        <p>Por favor, espere a que el presidente de mesa lo habilite para votar.</p>
        <p><strong>Mesa: ${mesaActual}</strong></p>
      </div>
    `;
    document.body.appendChild(waitingMessage);
    
    const unsubscribe = escucharEstadoVotante((estadoVotante) => {
      if (estadoVotante && estadoVotante.habilitado) {
        waitingMessage.style.display = "none";
        if (votingContent) {
          votingContent.style.display = "flex";
        }
        
        const existingInfo = document.querySelector(".voter-info");
        if (existingInfo) {
          existingInfo.remove();
        }
        
        if (form) {
          const radioButtons = form.querySelectorAll('input[type="radio"]');
          const submitButton = document.getElementById("submitVote");
          
          radioButtons.forEach((radio) => {
            radio.addEventListener("change", () => {
              if (submitButton) {
                submitButton.disabled = false;
              }
            });
          });
          
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const selectedRadio = form.querySelector('input[name="voto"]:checked');
            
            if (!selectedRadio) {
              showMessage("Debe seleccionar una lista", "error");
              return;
            }
            
            const lista = selectedRadio.value;
            const success = await registrarVoto(
              estadoVotante.dni,
              lista,
              estadoVotante.nombreApellido,
              estadoVotante.division
            );
            
            if (success) {
              await deshabilitarVotante();
              showSuccessModal(
                "Su voto ha sido registrado correctamente. Gracias por participar."
              );
              form.reset();
              if (document.getElementById("submitVote")) {
                document.getElementById("submitVote").disabled = true;
              }
            }
          });
        }
      } else {
        if (votingContent) {
          votingContent.style.display = "none";
        }
        waitingMessage.style.display = "flex";
      }
    });
    
    window.addEventListener("beforeunload", () => {
      if (unsubscribe) unsubscribe();
    });
  }
  
  if (currentPage === "resultados.html") {
    console.log("Inicializando visualización de resultados...");
    
    function actualizarInterfazResultados(resultados) {
      const TOTAL_ESTUDIANTES = 1478; // Total real de estudiantes
      const totalVotos = resultados.totalVotos; // Votos emitidos
      const totalVotantes = totalVotos; // Alumnos que votaron (igual a votos emitidos)
      const participacion =
        totalVotos > 0
          ? ((totalVotos / TOTAL_ESTUDIANTES) * 100).toFixed(1)
          : 0;
      
      const totalAlumnosEl = document.getElementById("totalAlumnos");
      const totalVotosEl = document.getElementById("totalVotos");
      const participacionEl = document.getElementById("participacion");
      const totalStudentsElement = document.getElementById("total-students-porcentaje");
      
      if (totalAlumnosEl) totalAlumnosEl.textContent = totalVotantes;
      if (totalVotosEl) totalVotosEl.textContent = totalVotos;
      if (participacionEl) participacionEl.textContent = participacion + "%";
      if (totalStudentsElement) {
        totalStudentsElement.textContent = `${totalVotos}/${TOTAL_ESTUDIANTES} estudiantes`;
      }
      
      const totalVotesEl = document.getElementById("totalVotes");
      const totalVotersEl = document.getElementById("totalVoters");
      const participationRateEl = document.getElementById("participationRate");
      
      if (totalVotesEl) totalVotesEl.textContent = resultados.totalVotos;
      if (totalVotersEl) totalVotersEl.textContent = resultados.totalAlumnos;
      if (participationRateEl) participationRateEl.textContent = participacion + "%";
      
      Object.keys(resultados.listas).forEach((lista) => {
        const data = resultados.listas[lista];
        const percentageEl = document.getElementById(`percentage-${lista}`);
        const votesEl = document.getElementById(`votes-${lista}`);
        const barEl = document.getElementById(`bar-${lista}`);
        
        if (percentageEl) percentageEl.textContent = data.porcentaje + "%";
        if (votesEl) votesEl.textContent = data.votos + " votos";
        if (barEl) barEl.style.width = data.porcentaje + "%";
      });
    }
    
    const unsubscribe = obtenerResultadosEnTiempoReal(actualizarInterfazResultados);
    
    const refreshButton = document.getElementById("refreshResults");
    if (refreshButton) {
      refreshButton.addEventListener("click", () => {
        showMessage("Resultados actualizados", "info");
      });
    }
    
    window.addEventListener("beforeunload", () => {
      if (unsubscribe) unsubscribe();
    });
  }
});

// NUEVA FUNCIÓN: Limpiar registros huérfanos (función de mantenimiento)
async function limpiarRegistrosHuerfanos() {
  try {
    console.log("Iniciando limpieza de registros huérfanos...");
    
    // Obtener todos los registros globales
    const globalSnapshot = await getDocs(collection(db, "votantes_activos_global"));
    const registrosGlobales = new Map();
    
    globalSnapshot.forEach((doc) => {
      registrosGlobales.set(doc.id, doc.data());
    });
    
    // Obtener todos los votantes activos por mesa
    const mesasSnapshot = await getDocs(collection(db, "votantes_activos"));
    const votantesActivosPorMesa = new Map();
    
    mesasSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.habilitado && data.dni) {
        votantesActivosPorMesa.set(data.dni, data);
      }
    });
    
    // Buscar registros globales huérfanos (que no tienen correspondencia en mesas activas)
    for (const [dni, datosGlobal] of registrosGlobales) {
      if (!votantesActivosPorMesa.has(dni)) {
        console.log(`Eliminando registro global huérfano para DNI: ${dni}`);
        await eliminarDNIGlobal(dni);
      }
    }
    
    console.log("Limpieza de registros huérfanos completada");
    return true;
  } catch (error) {
    console.error("Error en limpieza de registros huérfanos:", error);
    return false;
  }
}

// NUEVA FUNCIÓN: Obtener estado global de DNIs habilitados (para depuración)
async function obtenerEstadoGlobalDNIs() {
  try {
    const globalSnapshot = await getDocs(collection(db, "votantes_activos_global"));
    const registrosGlobales = [];
    
    globalSnapshot.forEach((doc) => {
      registrosGlobales.push({
        dni: doc.id,
        ...doc.data()
      });
    });
    
    return registrosGlobales;
  } catch (error) {
    console.error("Error al obtener estado global de DNIs:", error);
    return [];
  }
}

window.VotingSystem = {
  registrarAlumno,
  registrarVoto,
  verificarVoto,
  verificarAlumno,
  obtenerEstadisticas,
  obtenerResultadosEnTiempoReal,
  obtenerListaVotantes,
  actualizarListaVotantes,
  habilitarVotante,
  deshabilitarVotante,
  obtenerVotanteActual,
  escucharEstadoVotante,
  obtenerNumeroMesa,
  establecerNumeroMesa,
  obtenerDNISinFormato,
  formatearDNI,
  // NUEVAS FUNCIONES EXPORTADAS
  verificarDNIHabilitadoGlobal,
  registrarDNIGlobal,
  eliminarDNIGlobal,
  limpiarRegistrosHuerfanos,
  obtenerEstadoGlobalDNIs,
};