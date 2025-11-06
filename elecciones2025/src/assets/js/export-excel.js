// export-excel.js - Módulo para exportar datos de votantes a Excel

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/**
 * Convierte una letra a su posición en el alfabeto (A=1, B=2, etc.)
 */
function letraANumero(letra) {
  return letra.charCodeAt(0) - 64; // A=65 en ASCII, entonces A=1, B=2, etc.
}

/**
 * Convierte una división a un formato numérico para ordenar
 * Ejemplo: "1°A°" -> 1.01, "1°E°" -> 1.05, "4°5°" -> 4.05, "7°2°" -> 7.02
 */
function parsearDivision(division) {
  if (!division || division === "N/A") return 999; // Al final

  // Limpiar la división y convertir a string
  const divisionLimpia = String(division).trim().toUpperCase();
  
  console.log(`Parseando división: "${divisionLimpia}"`);
  
  // Extraer año y división - ahora acepta formatos como "1°A°", "7°2°", "1A", "4°5"
  // Captura: número inicial, luego cualquier cosa en medio que sea letra o número
  const match = divisionLimpia.match(/^(\d+)[°º]?\s*([A-Z\d]+)[°º]?$/);
  
  if (!match) {
    console.log(`No se pudo parsear: "${divisionLimpia}"`);
    return 999; // Si no coincide, al final
  }
  
  const año = parseInt(match[1]);
  const divisionParte = match[2];
  
  console.log(`Año: ${año}, División: ${divisionParte}`);
  
  let numeroDivision;
  
  // Si es una letra, convertir a número
  if (/^[A-Z]$/.test(divisionParte)) {
    numeroDivision = letraANumero(divisionParte);
    console.log(`Letra ${divisionParte} -> ${numeroDivision}`);
  } 
  // Si es un número
  else if (/^\d+$/.test(divisionParte)) {
    numeroDivision = parseInt(divisionParte);
    console.log(`Número ${divisionParte} -> ${numeroDivision}`);
  } 
  else {
    console.log(`Formato no reconocido: "${divisionParte}"`);
    return 999; // Formato no reconocido
  }
  
  // Retornar como año.división (ej: 1.05 para 1E o 1°5°)
  const resultado = año + (numeroDivision / 100);
  console.log(`Resultado final: ${resultado}`);
  return resultado;
}

/**
 * Ordena votantes por curso (1A, 1B, etc.) y luego por nombre
 */
function ordenarVotantes(votantes) {
  return votantes.sort((a, b) => {
    // Primero ordenar por división
    const divisionA = parsearDivision(a.division);
    const divisionB = parsearDivision(b.division);
    
    if (divisionA !== divisionB) {
      return divisionA - divisionB;
    }
    
    // Si tienen la misma división, ordenar por nombre y apellido
    const nombreA = (a.nombreApellido || "").toLowerCase();
    const nombreB = (b.nombreApellido || "").toLowerCase();
    
    return nombreA.localeCompare(nombreB, 'es');
  });
}

/**
 * Obtiene todos los votantes de una mesa específica
 */
async function obtenerVotantesPorMesa(numeroMesa) {
  try {
    const db = getFirestore();
    const votosRef = collection(db, "votos");

    // Primero obtener TODOS los votos para debuggear
    const todosVotosSnapshot = await getDocs(votosRef);
    console.log(
      `Total de votos en la base de datos: ${todosVotosSnapshot.size}`
    );

    // Ver qué valores de "mesa" existen
    const mesasEncontradas = new Set();
    todosVotosSnapshot.forEach((doc) => {
      const data = doc.data();
      mesasEncontradas.add(data.mesa);
      console.log(
        `Voto encontrado - Mesa: "${
          data.mesa
        }" (tipo: ${typeof data.mesa}), DNI: ${data.dni}`
      );
    });

    console.log(`Mesas únicas encontradas:`, Array.from(mesasEncontradas));
    console.log(`Buscando mesa: "${numeroMesa}" (tipo: ${typeof numeroMesa})`);

    // Filtrar manualmente por mesa
    const votantes = [];
    todosVotosSnapshot.forEach((doc) => {
      const data = doc.data();
      // Comparar como string
      if (String(data.mesa) === String(numeroMesa)) {
        votantes.push({
          dni: data.dni || "N/A",
          nombreApellido: data.nombreApellido || "N/A",
          division: data.division || "N/A",
        });
      }
    });

    console.log(
      `Votantes encontrados para Mesa ${numeroMesa}: ${votantes.length}`
    );
    
    // Ordenar antes de retornar
    return ordenarVotantes(votantes);
  } catch (error) {
    console.error(`Error al obtener votantes de Mesa ${numeroMesa}:`, error);
    return [];
  }
}

/**
 * Obtiene todos los votantes (todas las mesas)
 */
async function obtenerTodosLosVotantes() {
  try {
    const db = getFirestore();
    const votosRef = collection(db, "votos");
    const q = query(votosRef, orderBy("fechaVoto", "asc"));

    const querySnapshot = await getDocs(q);
    const votantes = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      votantes.push({
        dni: data.dni || "N/A",
        nombreApellido: data.nombreApellido || "N/A",
        division: data.division || "N/A",
        mesa: data.mesa || "N/A",
      });
    });

    // Ordenar antes de retornar
    return ordenarVotantes(votantes);
  } catch (error) {
    console.error("Error al obtener todos los votantes:", error);
    return [];
  }
}

/**
 * Agrupa votantes por división
 * @param {Array} votantes - Array de votantes
 * @returns {Object} - Objeto con votantes agrupados por división
 */
function agruparPorDivision(votantes) {
  const agrupados = {};
  
  votantes.forEach((votante) => {
    const division = votante.division || "N/A";
    
    if (!agrupados[division]) {
      agrupados[division] = [];
    }
    
    agrupados[division].push(votante);
  });
  
  return agrupados;
}

/**
 * Crea datos para una hoja de Excel con lista de votantes
 * @param {Array} votantes - Array de votantes
 * @returns {Array} - Array de arrays para crear la hoja
 */
function crearDatosHojaVotantes(votantes) {
  // Crear encabezados
  const datos = [
    ["N°", "Curso", "Nombre y Apellido", "Documento"]
  ];
  
  // Agregar cada votante
  votantes.forEach((votante, index) => {
    datos.push([
      index + 1,
      votante.division,
      votante.nombreApellido,
      votante.dni
    ]);
  });
  
  return datos;
}

/**
 * Genera y descarga el archivo Excel con 3 hojas: TOTAL, MESA 1 y MESA 2
 */
async function generarExcelVotantes() {
  try {
    // Verificar que la librería XLSX esté disponible
    if (typeof XLSX === "undefined") {
      console.error("La librería XLSX no está cargada");
      alert(
        "Error: No se pudo cargar la librería de Excel. Verifique la conexión."
      );
      return;
    }

    // Mostrar mensaje de carga
    mostrarMensajeCarga("Generando archivo Excel...");

    // Obtener datos solo de TOTAL, MESA 1 y MESA 2
    const [todosVotantes, mesa1, mesa2] = await Promise.all([
      obtenerTodosLosVotantes(),
      obtenerVotantesPorMesa("1"),
      obtenerVotantesPorMesa("2"),
    ]);

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();

    // ===== HOJA 1: TOTAL (AMBAS MESAS) =====
    const datosTotal = crearDatosHojaVotantes(todosVotantes);
    const hojaTotal = XLSX.utils.aoa_to_sheet(datosTotal);
    hojaTotal["!cols"] = [
      { wch: 6 },  // N°
      { wch: 12 }, // Curso
      { wch: 30 }, // Nombre y Apellido
      { wch: 15 }, // Documento
    ];
    XLSX.utils.book_append_sheet(wb, hojaTotal, "TOTAL");

    // ===== HOJA 2: MESA 1 =====
    const datosMesa1 = crearDatosHojaVotantes(mesa1);
    const hojaMesa1 = XLSX.utils.aoa_to_sheet(datosMesa1);
    hojaMesa1["!cols"] = [
      { wch: 6 },  // N°
      { wch: 12 }, // Curso
      { wch: 30 }, // Nombre y Apellido
      { wch: 15 }, // Documento
    ];
    XLSX.utils.book_append_sheet(wb, hojaMesa1, "MESA 1");

    // ===== HOJA 3: MESA 2 =====
    const datosMesa2 = crearDatosHojaVotantes(mesa2);
    const hojaMesa2 = XLSX.utils.aoa_to_sheet(datosMesa2);
    hojaMesa2["!cols"] = [
      { wch: 6 },  // N°
      { wch: 12 }, // Curso
      { wch: 30 }, // Nombre y Apellido
      { wch: 15 }, // Documento
    ];
    XLSX.utils.book_append_sheet(wb, hojaMesa2, "MESA 2");

    // Generar nombre del archivo con fecha y hora
    const ahora = new Date();
    const fecha = `${ahora.getDate()}-${
      ahora.getMonth() + 1
    }-${ahora.getFullYear()}`;
    const hora = `${ahora.getHours()}-${ahora.getMinutes()}`;
    const nombreArchivo = `Votantes_CEIEM_2025_${fecha}_${hora}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);

    ocultarMensajeCarga();
    mostrarMensajeExito(
      `¡Archivo generado exitosamente!`
    );
  } catch (error) {
    console.error("Error al generar Excel:", error);
    ocultarMensajeCarga();
    mostrarMensajeError(
      "Error al generar el archivo Excel. Intente nuevamente."
    );
  }
}

/**
 * Muestra un mensaje de carga
 */
function mostrarMensajeCarga(texto) {
  const loader = document.createElement("div");
  loader.id = "excel-loader";
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  loader.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">${texto}</div>
      <div style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
    </div>
  `;

  // Agregar animación
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(loader);
}

/**
 * Oculta el mensaje de carga
 */
function ocultarMensajeCarga() {
  const loader = document.getElementById("excel-loader");
  if (loader) {
    loader.remove();
  }
}

/**
 * Muestra un mensaje de éxito
 */
function mostrarMensajeExito(texto) {
  const mensaje = document.createElement("div");
  mensaje.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  mensaje.textContent = texto;
  document.body.appendChild(mensaje);

  setTimeout(() => {
    mensaje.remove();
  }, 4000);
}

/**
 * Muestra un mensaje de error
 */
function mostrarMensajeError(texto) {
  const mensaje = document.createElement("div");
  mensaje.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #e74c3c;
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  mensaje.textContent = texto;
  document.body.appendChild(mensaje);

  setTimeout(() => {
    mensaje.remove();
  }, 4000);
}

/**
 * Inicializa el botón de exportación
 */
function inicializarBotonExportacion(idBoton = "exportarExcel") {
  document.addEventListener("DOMContentLoaded", () => {
    const boton = document.getElementById(idBoton);

    if (boton) {
      boton.addEventListener("click", generarExcelVotantes);
    } else {
      console.warn(
        `Botón con id "${idBoton}" no encontrado. Para usar este módulo, agregue un botón con ese id al HTML.`
      );
    }
  });
}

inicializarBotonExportacion();

export {
  generarExcelVotantes,
  obtenerVotantesPorMesa,
  obtenerTodosLosVotantes,
  inicializarBotonExportacion,
};