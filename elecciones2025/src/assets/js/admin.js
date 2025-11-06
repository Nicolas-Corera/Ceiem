import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
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
let todosLosAlumnos = [];
let todosLosVotos = [];
let resultados = {};
let unsubscribeAlumnos = null;
let unsubscribeVotos = null;
let unsubscribeVotantesActivos = null;
let unsubscribeVotantesGlobales = null; // NUEVO
function showMessage(message, type = "info") {
  const messageDiv = document.createElement("div");
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  document.body.appendChild(messageDiv);
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}
function iniciarListenersEnTiempoReal() {
  console.log("Iniciando listeners en tiempo real...");
  const alumnosRef = collection(db, "alumnos");
  unsubscribeAlumnos = onSnapshot(
    alumnosRef,
    (snapshot) => {
      console.log("Cambio detectado en alumnos");
      todosLosAlumnos = [];
      snapshot.forEach((doc) => {
        todosLosAlumnos.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      actualizarEstadisticas();
    },
    (error) => {
      console.error("Error en listener de alumnos:", error);
      showMessage("Error al monitorear alumnos", "error");
    }
  );
  const votosRef = collection(db, "votos");
  unsubscribeVotos = onSnapshot(
    votosRef,
    (snapshot) => {
      console.log("Cambio detectado en votos");
      todosLosVotos = [];
      snapshot.forEach((doc) => {
        todosLosVotos.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      actualizarTablaVotos();
      calcularResultados();
      actualizarEstadisticas();
    },
    (error) => {
      console.error("Error en listener de votos:", error);
      showMessage("Error al monitorear votos", "error");
    }
  );
  const votantesActivosRef = collection(db, "votantes_activos");
  unsubscribeVotantesActivos = onSnapshot(
    votantesActivosRef,
    (snapshot) => {
      console.log("Cambio detectado en votantes activos");
      actualizarTablaVotantesActivos();
    },
    (error) => {
      console.error("Error en listener de votantes activos:", error);
      showMessage("Error al monitorear votantes activos", "error");
    }
  );
  const votantesGlobalesRef = collection(db, "votantes_activos_global");
  unsubscribeVotantesGlobales = onSnapshot(
    votantesGlobalesRef,
    (snapshot) => {
      console.log("Cambio detectado en votantes globales");
      actualizarTablaVotantesGlobales();
    },
    (error) => {
      console.error("Error en listener de votantes globales:", error);
      showMessage("Error al monitorear votantes globales", "error");
    }
  );
  showMessage("Sistema de actualización en tiempo real activado", "success");
}
function detenerListenersEnTiempoReal() {
  if (unsubscribeAlumnos) {
    unsubscribeAlumnos();
    unsubscribeAlumnos = null;
  }
  if (unsubscribeVotos) {
    unsubscribeVotos();
    unsubscribeVotos = null;
  }
  if (unsubscribeVotantesActivos) {
    unsubscribeVotantesActivos();
    unsubscribeVotantesActivos = null;
  }
  if (unsubscribeVotantesGlobales) {
    unsubscribeVotantesGlobales();
    unsubscribeVotantesGlobales = null;
  }
  console.log("Listeners en tiempo real detenidos");
}
async function obtenerAlumnos() {
  try {
    const alumnosSnapshot = await getDocs(collection(db, "alumnos"));
    todosLosAlumnos = [];
    alumnosSnapshot.forEach((doc) => {
      todosLosAlumnos.push({
        id: doc.id,
        ...doc.data(),
      });
    });
  } catch (error) {
    console.error("Error al obtener alumnos:", error);
    showMessage("Error al cargar alumnos", "error");
  }
}
async function obtenerVotos() {
  try {
    const votosSnapshot = await getDocs(collection(db, "votos"));
    todosLosVotos = [];
    votosSnapshot.forEach((doc) => {
      todosLosVotos.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    actualizarTablaVotos();
    calcularResultados();
  } catch (error) {
    console.error("Error al obtener votos:", error);
    showMessage("Error al cargar votos", "error");
  }
}
async function obtenerVotantesActivos() {
  try {
    const votantesActivosSnapshot = await getDocs(
      collection(db, "votantes_activos")
    );
    const votantesActivos = [];
    votantesActivosSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.habilitado) {
        votantesActivos.push({
          id: doc.id,
          ...data,
        });
      }
    });
    return votantesActivos;
  } catch (error) {
    console.error("Error al obtener votantes activos:", error);
    showMessage("Error al cargar votantes activos", "error");
    return [];
  }
}
async function obtenerVotantesGlobales() {
  try {
    const votantesGlobalesSnapshot = await getDocs(
      collection(db, "votantes_activos_global")
    );
    const votantesGlobales = [];
    votantesGlobalesSnapshot.forEach((doc) => {
      votantesGlobales.push({
        id: doc.id,
        dni: doc.id,
        ...doc.data(),
      });
    });
    return votantesGlobales;
  } catch (error) {
    console.error("Error al obtener votantes globales:", error);
    showMessage("Error al cargar votantes globales", "error");
    return [];
  }
}
async function actualizarTablaVotantesActivos() {
  const tbody = document.getElementById("votantesActivosTableBody");
  if (!tbody) return;
  const votantesActivos = await obtenerVotantesActivos();
  tbody.innerHTML = "";
  if (votantesActivos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">No hay votantes habilitados en este momento</td></tr>';
    return;
  }
  votantesActivos.forEach((votante) => {
    const fechaHabilitacion = votante.fechaHabilitacion
      ? votante.fechaHabilitacion.toDate().toLocaleString("es-AR")
      : "Sin fecha";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${votante.dni}</td>
      <td>${votante.nombreApellido}</td>
      <td>${votante.division}</td>
      <td>Mesa ${votante.mesa}</td>
      <td>${fechaHabilitacion}</td>
      <td>
        <button onclick="cerrarMesa('${votante.id}', '${votante.mesa}', '${votante.dni}')" class="delete-btn">
          Cerrar Mesa
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}
async function actualizarTablaVotantesGlobales() {
  const tbody = document.getElementById("votantesGlobalesTableBody");
  if (!tbody) return;
  const votantesGlobales = await obtenerVotantesGlobales();
  tbody.innerHTML = "";
  if (votantesGlobales.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">No hay DNIs habilitados globalmente</td></tr>';
    return;
  }
  votantesGlobales.forEach((votante) => {
    const fechaHabilitacion = votante.fechaHabilitacion
      ? votante.fechaHabilitacion.toDate().toLocaleString("es-AR")
      : "Sin fecha";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${votante.dni}</td>
      <td>${votante.nombreApellido}</td>
      <td>${votante.division}</td>
      <td>Mesa ${votante.mesa}</td>
      <td>${fechaHabilitacion}</td>
      <td>
        <button onclick="eliminarDNIGlobal('${votante.dni}')" class="delete-btn">
          Liberar DNI
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}
window.cerrarMesa = async function (votanteId, mesa, dni) {
  if (
    confirm(
      `¿Estás seguro de cerrar la Mesa ${mesa} y deshabilitar al votante con DNI ${dni}?`
    )
  ) {
    try {
      await setDoc(doc(db, "votantes_activos", votanteId), {
        habilitado: false,
        fechaDeshabilitacion: serverTimestamp(),
      });
      await deleteDoc(doc(db, "votantes_activos_global", dni));
      showMessage(
        `Mesa ${mesa} cerrada correctamente. Votante deshabilitado y liberado globalmente.`,
        "success"
      );
    } catch (error) {
      console.error("Error al cerrar mesa:", error);
      showMessage("Error al cerrar mesa", "error");
    }
  }
};
window.eliminarDNIGlobal = async function (dni) {
  if (confirm(`¿Estás seguro de liberar el DNI ${dni} del registro global?`)) {
    try {
      await deleteDoc(doc(db, "votantes_activos_global", dni));
      showMessage(
        `DNI ${dni} liberado correctamente del registro global`,
        "success"
      );
    } catch (error) {
      console.error("Error al liberar DNI global:", error);
      showMessage("Error al liberar DNI global", "error");
    }
  }
};
function actualizarEstadisticas() {
  const TOTAL_ESTUDIANTES = 1478; // Total real de estudiantes
  const totalVotos = todosLosVotos.length; // Votos emitidos
  const totalVotantes = totalVotos; // Alumnos que votaron (igual a votos emitidos)
  const participacion =
    totalVotos > 0 ? ((totalVotos / TOTAL_ESTUDIANTES) * 100).toFixed(1) : 0;
  const totalAlumnosEl = document.getElementById("totalAlumnos");
  const totalVotosEl = document.getElementById("totalVotos");
  const participacionEl = document.getElementById("participacion");
  const totalStudentsElement = document.getElementById(
    "total-students-porcentaje"
  );
  if (totalAlumnosEl) totalAlumnosEl.textContent = totalVotantes;
  if (totalVotosEl) totalVotosEl.textContent = totalVotos;
  if (participacionEl) participacionEl.textContent = participacion + "%";
  if (totalStudentsElement) {
    totalStudentsElement.textContent = `${totalVotos}/${TOTAL_ESTUDIANTES} estudiantes`;
  }
}
function calcularResultados() {
  const listas = ["lista1", "lista2", "lista3"];
  const nombresListas = {
    lista1: "252",
    lista2: "203",
    lista3: "Voto en blanco",
  };
  resultados = {};
  listas.forEach((lista) => {
    resultados[lista] = {
      votos: 0,
      porcentaje: 0,
      nombre: nombresListas[lista], // Agregar el nombre real
    };
  });
  todosLosVotos.forEach((voto) => {
    if (resultados[voto.lista]) {
      resultados[voto.lista].votos++;
    }
  });
  const totalVotos = todosLosVotos.length;
  Object.keys(resultados).forEach((lista) => {
    if (totalVotos > 0) {
      resultados[lista].porcentaje = (
        (resultados[lista].votos / totalVotos) *
        100
      ).toFixed(1);
    }
  });
  mostrarResultados();
}
function mostrarResultados() {
  const container = document.getElementById("resultadosListas");
  if (!container) return;
  let html =
    "<table><thead><tr><th>Lista</th><th>Votos</th><th>Porcentaje</th></tr></thead><tbody>";
  Object.keys(resultados).forEach((lista) => {
    const data = resultados[lista];
    html += `
      <tr>
        <td>${data.nombre}</td>
        <td>${data.votos}</td>
        <td>${data.porcentaje}%</td>
      </tr>
    `;
  });
  html += "</tbody></table>";
  container.innerHTML = html;
}
function actualizarTablaVotos(votosFiltrados = null) {
  const tbody = document.getElementById("votosTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const votos = votosFiltrados || todosLosVotos;
  if (votos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">Aún no hay votos registrados</td></tr>';
    return;
  }
  votos.forEach((voto) => {
    const fechaVoto = voto.fechaVoto
      ? voto.fechaVoto.toDate().toLocaleString("es-AR")
      : "Sin fecha";
    const row = document.createElement("tr");
    row.innerHTML = `
                    <td>${voto.dni}</td>
                    <td>${voto.nombreApellido}</td>
                    <td>${voto.division}</td>
                    <td>${fechaVoto}</td>
                    <td>${voto.mesa || "N/A"}</td>
                    <td>
                        <button onclick="eliminarVoto('${voto.id}', '${
      voto.dni
    }')" class="delete-btn">
                            Eliminar
                        </button>
                    </td>
                `;
    tbody.appendChild(row);
  });
}
window.eliminarAlumno = async function (id, dni) {
  if (confirm(`¿Estás seguro de eliminar al alumno con DNI ${dni}?`)) {
    try {
      await deleteDoc(doc(db, "alumnos", id));
      showMessage("Alumno eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar alumno:", error);
      showMessage("Error al eliminar alumno", "error");
    }
  }
};
window.eliminarVoto = async function (id, dni) {
  if (confirm(`¿Estás seguro de eliminar el voto del DNI ${dni}?`)) {
    try {
      await deleteDoc(doc(db, "votos", id));
      showMessage("Voto eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar voto:", error);
      showMessage("Error al eliminar voto", "error");
    }
  }
};
async function borrarTodosLosVotos() {
  if (confirm("¿Estás COMPLETAMENTE seguro de eliminar TODOS los votos?")) {
    if (confirm("Esta acción NO se puede deshacer. ¿Continuar?")) {
      try {
        const votosSnapshot = await getDocs(collection(db, "votos"));
        const deletePromises = [];
        votosSnapshot.forEach((doc) => {
          deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        showMessage("Todos los votos han sido eliminados", "success");
      } catch (error) {
        console.error("Error al eliminar votos:", error);
        showMessage("Error al eliminar votos", "error");
      }
    }
  }
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
async function limpiarRegistrosHuerfanos() {
  if (confirm("¿Desea limpiar registros huérfanos del sistema?")) {
    try {
      showMessage("Iniciando limpieza de registros huérfanos...", "info");
      const globalSnapshot = await getDocs(
        collection(db, "votantes_activos_global")
      );
      const registrosGlobales = new Map();
      globalSnapshot.forEach((doc) => {
        registrosGlobales.set(doc.id, doc.data());
      });
      const mesasSnapshot = await getDocs(collection(db, "votantes_activos"));
      const votantesActivosPorMesa = new Map();
      mesasSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.habilitado && data.dni) {
          votantesActivosPorMesa.set(data.dni, data);
        }
      });
      let eliminados = 0;
      for (const [dni, datosGlobal] of registrosGlobales) {
        if (!votantesActivosPorMesa.has(dni)) {
          console.log(`Eliminando registro global huérfano para DNI: ${dni}`);
          await deleteDoc(doc(db, "votantes_activos_global", dni));
          eliminados++;
        }
      }
      showMessage(
        `Limpieza completada. Se eliminaron ${eliminados} registros huérfanos.`,
        "success"
      );
    } catch (error) {
      console.error("Error en limpieza de registros huérfanos:", error);
      showMessage("Error en la limpieza: " + error.message, "error");
    }
  }
}
async function limpiarTodoGlobal() {
  if (
    confirm(
      "¿ADVERTENCIA! ¿Desea eliminar TODOS los registros globales de DNI?"
    )
  ) {
    if (
      confirm("Esta acción liberará TODOS los DNIs habilitados. ¿Continuar?")
    ) {
      try {
        showMessage("Limpiando colección global...", "info");
        const globalSnapshot = await getDocs(
          collection(db, "votantes_activos_global")
        );
        const deletePromises = [];
        globalSnapshot.forEach((doc) => {
          deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        showMessage(
          `Limpieza global completada: ${globalSnapshot.size} registros eliminados`,
          "success"
        );
      } catch (error) {
        console.error("Error al limpiar colección global:", error);
        showMessage("Error en limpieza global: " + error.message, "error");
      }
    }
  }
}
function descargarResultados() {
  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `resultados_votacion_${fecha}.csv`;
  let csv = "Lista,Votos,Porcentaje\n";
  Object.keys(resultados).forEach((lista) => {
    const data = resultados[lista];
    csv += `${lista.toUpperCase()},${data.votos},${data.porcentaje}%\n`;
  });
  csv += "\nEstadísticas Generales\n";
  csv += `Total Alumnos,${todosLosAlumnos.length}\n`;
  csv += `Total Votos,${todosLosVotos.length}\n`;
  csv += `Participación,${
    todosLosVotos.length > 0
      ? ((todosLosVotos.length / todosLosAlumnos.length) * 100).toFixed(1)
      : 0
  }%\n`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
  showMessage("Resultados descargados correctamente", "success");
}
function buscarAlumno() {
  const termino = document.getElementById("buscarAlumno").value.toLowerCase();
  const alumnosFiltrados = todosLosAlumnos.filter(
    (alumno) =>
      alumno.dni.toString().includes(termino) ||
      alumno.division.toLowerCase().includes(termino) ||
      alumno.nombreApellido.toLowerCase().includes(termino)
  );
  showMessage(`Encontrados ${alumnosFiltrados.length} alumnos`, "info");
}
function buscarVoto() {
  const termino = document.getElementById("buscarVoto").value.toLowerCase();
  if (!termino) {
    actualizarTablaVotos();
    return;
  }
  const votosFiltrados = todosLosVotos.filter((voto) =>
    voto.dni.toString().includes(termino)
  );
  actualizarTablaVotos(votosFiltrados);
  showMessage(`Encontrados ${votosFiltrados.length} votos`, "info");
}
document
  .getElementById("borrarTodosVotos")
  .addEventListener("click", borrarTodosLosVotos);
document
  .getElementById("descargarResultados")
  .addEventListener("click", descargarResultados);
document
  .getElementById("buscarAlumnoBtn")
  .addEventListener("click", buscarAlumno);
document.getElementById("buscarVotoBtn").addEventListener("click", buscarVoto);
document.getElementById("buscarAlumno").addEventListener("input", buscarAlumno);
document.getElementById("buscarVoto").addEventListener("input", buscarVoto);
document
  .getElementById("limpiarHuerfanos")
  ?.addEventListener("click", limpiarRegistrosHuerfanos);
document
  .getElementById("limpiarTodoGlobal")
  ?.addEventListener("click", limpiarTodoGlobal);
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Inicializando panel de administración...");
  try {
    await obtenerAlumnos();
    await obtenerVotos();
    actualizarEstadisticas();
    await actualizarTablaVotantesActivos();
    await actualizarTablaVotantesGlobales(); // NUEVO
    iniciarListenersEnTiempoReal();
    showMessage("Panel de administración cargado correctamente", "success");
  } catch (error) {
    console.error("Error al inicializar:", error);
    showMessage("Error al cargar el panel", "error");
  }
});
window.addEventListener("beforeunload", () => {
  detenerListenersEnTiempoReal();
});
