// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Firebase configuration - misma configuración que en control.js
const firebaseConfig = {
  apiKey: "AIzaSyA3DcP3Ut71H8xQzrQGc77KVNPaH9ptPHM",
  authDomain: "elecciones-centro-estudiantes.firebaseapp.com",
  projectId: "elecciones-centro-estudiantes",
  storageBucket: "elecciones-centro-estudiantes.firebasestorage.app",
  messagingSenderId: "182911906041",
  appId: "1:182911906041:web:f6ee4762e51fd414d8f228",
  measurementId: "G-ZBCN23CK31",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constantes
const TOTAL_STUDENTS = 1478; // Mismo total de estudiantes usado en control.js
const UPDATE_INTERVAL = 10 * 60 * 1000; // 5 minutos en milisegundos

// Variables para el control de actualización
let lastUpdateTime = 0;
let cachedVotes = [];
let isManualReload = false;
let updateTimer = null;

// Detectar si la página se cargó por recarga manual
window.addEventListener('pageshow', (event) => {
  if (event.persisted || (window.performance && window.performance.navigation.type === 1)) {
    // La página se cargó por recarga manual (F5 o botón de recarga)
    isManualReload = true;
  }
});

// Candidatos - extraído del control.js
const candidatesInfo = {
  1: {
    name: "SÍ, A FAVOR",
    list: "A FAVOR DE LA REFORMA",
    image: "../../../img/a-favor.png",
  },
  2: {
    name: "NO, EN CONTRA",
    list: "EN CONTRA DE LA REFORMA",
    image: "../../../img/en-contra.png",
  },
  4: {
    name: "VOTO EN BLANCO",
    list: "VOTO EN BLANCO",
    image: "../../../img/Voto en blanco.png",
  },
};

// Función para formatear timestamps
function formatTimestamp(timestamp) {
  if (!timestamp) return "-";

  try {
    if (typeof timestamp === "object" && timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    } else if (typeof timestamp === "string") {
      return timestamp;
    }
    return "-";
  } catch (error) {
    console.error("Error al formatear timestamp:", error);
    return timestamp.toString();
  }
}

// Función para mostrar/ocultar contenedores según el estado de la elección
function toggleElectionState(hasVotes) {
  const preElectionContainer = document.getElementById("pre-election-container");
  const resultsContainer = document.getElementById("results-container");
  
  if (hasVotes) {
    preElectionContainer.style.display = "none";
    resultsContainer.style.display = "block";
  } else {
    preElectionContainer.style.display = "block";
    resultsContainer.style.display = "none";
  }
}

// Función para actualizar la UI con resultados
function updateResultsUI(votes) {
  // Actualizar contador de votos y participación
  const totalVotes = votes.length;
  document.getElementById("total-votes").textContent = totalVotes;
  
  const participationPercentage = ((totalVotes / TOTAL_STUDENTS) * 100).toFixed(1);
  document.getElementById("participation").textContent = `${participationPercentage}%`;
  document.getElementById("total-students").textContent = `${totalVotes} de ${TOTAL_STUDENTS} estudiantes`;
  
  // Actualizar último voto
  if (totalVotes > 0) {
    const sortedVotes = [...votes].sort((a, b) => {
      const timestampA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : Date.parse(a.timestamp);
      const timestampB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : Date.parse(b.timestamp);
      return timestampB - timestampA;
    });
    
    // document.getElementById("last-vote").textContent = formatTimestamp(sortedVotes[0].timestamp);
  } else {
    // document.getElementById("last-vote").textContent = "-";
  }
  
  // Actualizar última actualización
  document.getElementById("last-updated").textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;

  // Contar votos por candidato
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.candidate] = (acc[vote.candidate] || 0) + 1;
    return acc;
  }, {});
  
  // Generar HTML de resultados
  const resultsList = document.getElementById("results-list");
  resultsList.innerHTML = "";
  
  // Ordenar candidatos por cantidad de votos (descendente)
  const sortedCandidates = Object.keys(candidatesInfo).sort((a, b) => 
    (voteCounts[b] || 0) - (voteCounts[a] || 0)
  );
  
  // Iterar sobre los candidatos ordenados
  sortedCandidates.forEach(candidateId => {
    const info = candidatesInfo[candidateId];
    const count = voteCounts[candidateId] || 0;
    const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
    
    // Usar el template para crear un nuevo elemento de resultado
    const template = document.getElementById("result-template");
    const resultElement = document.importNode(template.content, true);
    
    // Completar los datos del candidato
    resultElement.querySelector(".candidate-name").textContent = `${info.name} (${info.list})`;
    resultElement.querySelector(".vote-count").textContent = `${percentage}%`;
    
    const resultBar = resultElement.querySelector(".result-bar");
    resultBar.style.width = `${percentage}%`;

    // NUEVA FUNCIONALIDAD: Hacer la barra transparente cuando el porcentaje es 0
    if (percentage <= 0) {
      resultBar.style.background = "transparent";
      resultBar.style.boxShadow = "none";
      resultBar.style.border = "none";
    } else {
      // Mantener el estilo original para porcentajes mayores a 0
      resultBar.style.background = "var(--gradient-secondary)";
      resultBar.style.boxShadow = "";
      resultBar.style.border = "";
    }
    
    // Agregar el elemento al contenedor de resultados
    resultsList.appendChild(resultElement);
  });
  
  // Actualizar el tiempo de última actualización
  lastUpdateTime = Date.now();
}

// Función para verificar si es tiempo de actualizar
function shouldUpdate() {
  // Si nunca se ha actualizado o si han pasado 5 minutos desde la última actualización
  return lastUpdateTime === 0 || (Date.now() - lastUpdateTime >= UPDATE_INTERVAL);
}

// Función para programar la próxima actualización
function scheduleNextUpdate() {
  // Limpiar cualquier temporizador existente
  if (updateTimer) {
    clearTimeout(updateTimer);
  }
  
  // Programar próxima actualización en 5 minutos
  updateTimer = setTimeout(() => {
    fetchAndUpdateData();
  }, UPDATE_INTERVAL);
  
  // Actualizar el contador visual en la página (opcional)
  updateCountdown();
}

// Función para actualizar el contador visual (opcional)
function updateCountdown() {
  const timeRemaining = UPDATE_INTERVAL - (Date.now() - lastUpdateTime);
  const minutesRemaining = Math.floor(timeRemaining / 60000);
  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);
  
  // Actualizar el elemento del contador si existe
  const countdownElement = document.getElementById("update-countdown");
  if (countdownElement) {
    countdownElement.textContent = `Próxima actualización en: ${minutesRemaining}m ${secondsRemaining}s`;
  }
  
  // Actualizar cada segundo si queda tiempo
  if (timeRemaining > 0) {
    setTimeout(updateCountdown, 1000);
  }
}

// Función para obtener datos y actualizar la UI
function fetchAndUpdateData() {
  // Obtener los datos de Firebase
  const votesRef = collection(db, "VOTOS");
  
  getDocs(votesRef).then((snapshot) => {
    cachedVotes = snapshot.docs.map(doc => doc.data());
    
    // Determinar si hay votos para mostrar la sección correspondiente
    toggleElectionState(cachedVotes.length > 0);
    
    // Actualizar la UI con los resultados
    updateResultsUI(cachedVotes);
    
    // Programar la próxima actualización
    scheduleNextUpdate();
  }).catch(error => {
    console.error("Error al obtener datos:", error);
    // Intentar nuevamente en 30 segundos en caso de error
    setTimeout(fetchAndUpdateData, 30000);
  });
}

// Función para inicializar la página de resultados
function initResults() {
  if (isManualReload && cachedVotes.length > 0) {
    // Si es una recarga manual y ya tenemos datos en caché, usar esos datos
    console.log("Recarga manual detectada. Usando datos en caché.");
    toggleElectionState(cachedVotes.length > 0);
    updateResultsUI(cachedVotes);
    scheduleNextUpdate();
    shouldUpdate()
  } else {
    // Primera carga o actualización automática programada
    fetchAndUpdateData();
  }
  
  // Desactivar el listener en tiempo real de Firebase
  // En vez de usar onSnapshot, ahora usamos getDocs en intervalos programados
}

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", initResults);