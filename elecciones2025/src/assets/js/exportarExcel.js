/**
 * exportarExcel.js
 * 
 * Script para generar reportes de votación en formato Excel (.xlsx)
 * Compatible con el sistema de votación existente
 * 
 * Dependencias:
 * - SheetJS (xlsx): https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
 * - Firebase ya configurado en firebase.js
 * 
 * Uso:
 * 1. Incluir SheetJS en tu HTML: <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
 * 2. Incluir este script: <script type="module" src="assets/js/exportarExcel.js"></script>
 * 3. Agregar botón: <button id="descargarExcel">Descargar Excel</button>
 */

// Importar configuración de Firebase (reutilizar la existente)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Configuración de Firebase (misma que en firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyA3DcP3Ut71H8xQzrQGc77KVNPaH9ptPHM",
  authDomain: "elecciones-centro-estudiantes.firebaseapp.com",
  projectId: "elecciones-centro-estudiantes",
  storageBucket: "elecciones-centro-estudiantes.firebasestorage.app",
  messagingSenderId: "182911906041",
  appId: "1:182911906041:web:f6ee4762e51fd414d8f228",
  measurementId: "G-ZBCN23CK31",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Mapeo de códigos de lista a nombres legibles
 */
const NOMBRES_LISTAS = {
  lista1: "Lista 252",
  lista2: "Lista 203", 
  lista3: "Voto en blanco",
};

/**
 * Función principal para obtener todos los votos de Firestore
 * @returns {Promise<Array>} Array con todos los votos
 */
async function obtenerTodosLosVotos() {
  try {
    console.log("Obteniendo votos desde Firestore...");
    
    // Crear query ordenado por fecha de voto
    const votosRef = collection(db, "votos");
    const q = query(votosRef, orderBy("fechaVoto", "desc"));
    const querySnapshot = await getDocs(q);
    
    const votos = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      votos.push({
        id: doc.id,
        dni: data.dni || "Sin DNI",
        nombreApellido: data.nombreApellido || "Sin nombre",
        division: data.division || "Sin división",
        lista: data.lista || "Sin lista",
        fechaVoto: data.fechaVoto,
        mesa: data.mesa || "N/A"
      });
    });
    
    console.log(`Se obtuvieron ${votos.length} votos`);
    return votos;
    
  } catch (error) {
    console.error("Error al obtener votos:", error);
    throw new Error("No se pudieron cargar los datos de votación");
  }
}

/**
 * Función para extraer el apellido de un nombre completo
 * @param {string} nombreCompleto - Nombre y apellido
 * @returns {string} Apellido extraído
 */
function extraerApellido(nombreCompleto) {
  if (!nombreCompleto || typeof nombreCompleto !== 'string') return 'ZZZ'; // Para ordenar al final
  
  const partes = nombreCompleto.trim().split(' ');
  if (partes.length < 2) return nombreCompleto.trim().toUpperCase();
  
  // El apellido es la última palabra (o las últimas si hay más de 2 partes)
  return partes[partes.length - 1].toUpperCase();
}

/**
 * Función para agrupar votos por división/curso
 * @param {Array} votos - Array de votos
 * @returns {Object} Objeto con votos agrupados por división
 */
function agruparVotosPorDivision(votos) {
  const votosPorDivision = {};
  
  votos.forEach(voto => {
    const division = voto.division.trim() || "Sin División";
    
    if (!votosPorDivision[division]) {
      votosPorDivision[division] = [];
    }
    
    votosPorDivision[division].push(voto);
  });
  
  // Ordenar las divisiones alfabéticamente
  const divisiones = Object.keys(votosPorDivision).sort();
  const votosPorDivisionOrdenado = {};
  
  divisiones.forEach(division => {
    // Ordenar votos dentro de cada división por apellido
    votosPorDivision[division].sort((a, b) => {
      const apellidoA = extraerApellido(a.nombreApellido);
      const apellidoB = extraerApellido(b.nombreApellido);
      return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
    });
    
    votosPorDivisionOrdenado[division] = votosPorDivision[division];
  });
  
  return votosPorDivisionOrdenado;
}

/**
 * Función para formatear fecha y hora
 * @param {*} fechaVoto - Timestamp de Firebase
 * @returns {string} Fecha formateada
 */
function formatearFechaHora(fechaVoto) {
  if (!fechaVoto) return "Sin fecha";
  
  try {
    // Convertir timestamp de Firebase a Date
    const fecha = fechaVoto.toDate ? fechaVoto.toDate() : new Date(fechaVoto);
    
    return fecha.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (error) {
    console.warn("Error al formatear fecha:", error);
    return "Fecha inválida";
  }
}

/**
 * Función para crear las hojas de Excel por división
 * @param {Object} votosPorDivision - Votos agrupados por división
 * @returns {Object} Objeto con las hojas creadas
 */
function crearHojasPorDivision(votosPorDivision) {
  const hojas = {};
  
  Object.keys(votosPorDivision).forEach(division => {
    const votos = votosPorDivision[division];
    
    // Crear datos para la hoja
    const datosHoja = [
      // Encabezados
      ["N°", "Curso", "Nombre y Apellido", "Documento", "A quién votó", "Horario en que votó", "Mesa"]
    ];
    
    // Agregar filas de datos con numeración
    votos.forEach((voto, index) => {
      datosHoja.push([
        index + 1, // Número secuencial
        division,
        voto.nombreApellido,
        voto.dni,
        NOMBRES_LISTAS[voto.lista] || voto.lista,
        formatearFechaHora(voto.fechaVoto),
        `Mesa ${voto.mesa}`
      ]);
    });
    
    // Crear hoja de cálculo
    const hoja = XLSX.utils.aoa_to_sheet(datosHoja);
    
    // Configurar ancho de columnas
    hoja['!cols'] = [
      { width: 6 },   // N°
      { width: 12 },  // Curso
      { width: 25 },  // Nombre
      { width: 12 },  // DNI
      { width: 25 },  // Lista
      { width: 25 },  // Fecha
      { width: 10 }   // Mesa
    ];
    
    // Nombre de la hoja (Excel tiene límite de 31 caracteres)
    let nombreHoja = division.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
    hojas[nombreHoja] = hoja;
  });
  
  return hojas;
}

/**
 * Función para crear la hoja de totales
 * @param {Object} votosPorDivision - Votos agrupados por división
 * @returns {Object} Hoja con totales
 */
function crearHojaTotales(votosPorDivision) {
  const datosTotales = [
    // Encabezados
    ["Curso/División", "Total de Votos", "Lista 252", "Lista 203", "Voto en Blanco"]
  ];
  let totalGeneral = 0;
  let totalesListas = { lista1: 0, lista2: 0, lista3: 0};
  Object.keys(votosPorDivision).forEach(division => {
    const votos = votosPorDivision[division];
    const totalDivision = votos.length;
    totalGeneral += totalDivision;
    const conteoListas = { lista1: 0, lista2: 0, lista3: 0};
    votos.forEach(voto => {
      if (conteoListas.hasOwnProperty(voto.lista)) {
        conteoListas[voto.lista]++;
        totalesListas[voto.lista]++;
      }
    });
    datosTotales.push([
      division,
      totalDivision,
      conteoListas.lista1,
      conteoListas.lista2,
      conteoListas.lista3,
    ]);
  });
  datosTotales.push([
    "TOTAL GENERAL",
    totalGeneral,
    totalesListas.lista1,
    totalesListas.lista2,
    totalesListas.lista3,
  ]);
  const hojaTotales = XLSX.utils.aoa_to_sheet(datosTotales);
  hojaTotales['!cols'] = [
    { width: 15 },  // División
    { width: 12 },  // Total
    { width: 10 },  // Lista 1
    { width: 10 },  // Lista 2
    { width: 15 },  // Lista 3
  ];
  return hojaTotales;
}
async function generarExcel() {
  try {
    mostrarMensajeCarga("Generando reporte Excel...");
    if (typeof XLSX === 'undefined') {
      throw new Error("SheetJS no está cargado. Asegúrate de incluir la librería XLSX.");
    }
    const votos = await obtenerTodosLosVotos();
    if (votos.length === 0) {
      throw new Error("No hay votos registrados para exportar");
    }
    const votosPorDivision = agruparVotosPorDivision(votos);
    const libroExcel = XLSX.utils.book_new();
    const hojasPorDivision = crearHojasPorDivision(votosPorDivision);
    Object.keys(hojasPorDivision).forEach(nombreHoja => {
      XLSX.utils.book_append_sheet(libroExcel, hojasPorDivision[nombreHoja], nombreHoja);
    });
    const hojaTotales = crearHojaTotales(votosPorDivision);
    XLSX.utils.book_append_sheet(libroExcel, hojaTotales, "Totales");
    const fechaActual = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `votaciones_${fechaActual}.xlsx`;
    XLSX.writeFile(libroExcel, nombreArchivo);
    mostrarMensajeExito(`Excel generado correctamente: ${nombreArchivo}`);
    
    console.log(`Reporte Excel generado: ${nombreArchivo}`);
    console.log(`Total de votos exportados: ${votos.length}`);
    console.log(`Divisiones incluidas: ${Object.keys(votosPorDivision).join(", ")}`);
    
  } catch (error) {
    console.error("Error al generar Excel:", error);
    mostrarMensajeError("Error al generar Excel: " + error.message);
  }
}
function mostrarMensajeCarga(mensaje) {
  const existente = document.getElementById("excelLoadingMessage");
  if (existente) existente.remove();
  const div = document.createElement("div");
  div.id = "excelLoadingMessage";
  div.textContent = mensaje;
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3498db;
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 1000;
    font-weight: bold;
  `;
  document.body.appendChild(div);
}
function mostrarMensajeExito(mensaje) {
  limpiarMensajes();
  const div = document.createElement("div");
  div.textContent = mensaje;
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 1000;
    font-weight: bold;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}
function mostrarMensajeError(mensaje) {
  limpiarMensajes();
  const div = document.createElement("div");
  div.textContent = mensaje;
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #e74c3c;
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 1000;
    font-weight: bold;
  `;
  document.body.appendChild(div);
  
  setTimeout(() => div.remove(), 5000);
}
function limpiarMensajes() {
  const existente = document.getElementById("excelLoadingMessage");
  if (existente) existente.remove();
}
function inicializar() {
  const botonDescarga = document.getElementById("descargarExcel");
  if (botonDescarga) {
    botonDescarga.addEventListener("click", generarExcel);
    console.log("Exportador de Excel inicializado correctamente");
  } else {
    console.warn("No se encontró el botón #descargarExcel");
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializar);
} else {
  inicializar();
}
window.ExcelExporter = {
  generarExcel,
  obtenerTodosLosVotos,
  agruparVotosPorDivision
};