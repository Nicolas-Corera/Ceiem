// stats.js - Módulo para mostrar estadísticas de participación

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

const TOTAL_ESTUDIANTES = 1478;

/**
 * Obtiene las estadísticas de participación en tiempo real
 */
async function obtenerEstadisticasParticipacion() {
  try {
    const db = getFirestore();
    const votosSnapshot = await getDocs(collection(db, "votos"));

    const totalVotos = votosSnapshot.size;
    const totalVotantes = totalVotos; // Cada voto representa un votante único
    const participacion =
      totalVotos > 0 ? ((totalVotos / TOTAL_ESTUDIANTES) * 100).toFixed(1) : 0;

    return {
      totalVotantes,
      totalVotos,
      participacion,
      totalEstudiantes: TOTAL_ESTUDIANTES,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de participación:", error);
    return {
      totalVotantes: 0,
      totalVotos: 0,
      participacion: 0,
      totalEstudiantes: TOTAL_ESTUDIANTES,
    };
  }
}

/**
 * Actualiza la interfaz con las estadísticas
 */
function actualizarInterfazEstadisticas(stats) {
  const totalAlumnosEl = document.getElementById("totalAlumnos");
  const totalVotosEl = document.getElementById("totalVotos");
  const participacionEl = document.getElementById("participacion");
  const totalStudentsEl = document.getElementById("total-students-porcentaje");

  if (totalAlumnosEl) {
    totalAlumnosEl.textContent = stats.totalVotantes;
  }

  if (totalVotosEl) {
    totalVotosEl.textContent = stats.totalVotos;
  }

  if (participacionEl) {
    participacionEl.textContent = stats.participacion + "%";
  }

  if (totalStudentsEl) {
    totalStudentsEl.textContent = `${stats.totalVotos}/${TOTAL_ESTUDIANTES} estudiantes`;
  }
}

/**
 * Configura el listener en tiempo real para actualizar estadísticas
 */
function configurarEstadisticasEnTiempoReal() {
  const db = getFirestore();
  const votosRef = collection(db, "votos");

  return onSnapshot(votosRef, async () => {
    const stats = await obtenerEstadisticasParticipacion();
    actualizarInterfazEstadisticas(stats);
  });
}

/**
 * Inicializa el módulo de estadísticas
 */
async function inicializarEstadisticas() {
  // Cargar estadísticas iniciales
  const stats = await obtenerEstadisticasParticipacion();
  actualizarInterfazEstadisticas(stats);

  // Configurar actualización en tiempo real
  const unsubscribe = configurarEstadisticasEnTiempoReal();

  // Limpiar listener cuando se cierre la ventana
  window.addEventListener("beforeunload", () => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return unsubscribe;
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  inicializarEstadisticas();
});

// Exportar funciones para uso externo si es necesario
export {
  obtenerEstadisticasParticipacion,
  actualizarInterfazEstadisticas,
  configurarEstadisticasEnTiempoReal,
  inicializarEstadisticas,
};
