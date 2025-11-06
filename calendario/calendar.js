// Data de ejemplo - En un caso real, esto vendría de una base de datos
const eventos = [
  {
    id: 1,
    fecha: "2025-03-06",
    titulo: "Inicio del Ciclo Lectivo",
    descripcion:
      "Bienvenida a todos los estudiantes y presentación del calendario académico 2025.",
    tipo: "academico",
  },
  {
    id: 2,
    fecha: "2025-03-25",
    titulo: "Día de la Memoria por la Verdad y la Justicia",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 3,
    fecha: "2025-04-03",
    titulo: "Día del Veterano y de los Caídos en la Guerra de Malvinas",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 4,
    fecha: "2025-05-02",
    titulo: "Día del Trabajador",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 5,
    fecha: "2025-04-08",
    titulo: "Primera Asamblea Anual",
    descripcion: "",
    tipo: "centro",
  },
  {
    id: 6,
    fecha: "2025-05-26",
    titulo: "Día de la Revolución de Mayo",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 23,
    fecha: "2025-06-14",
    titulo: "Referéndum",
    descripcion: "Referéndum 2025: votación del nuevo estatuto",
    tipo: "centro",
  },
  {
    id: 7,
    fecha: "2025-06-21",
    titulo: "Paso a la Inmortalidad del Gral. Manuel Belgrano",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 8,
    fecha: "2025-06-18",
    titulo: "Paso a la Inmortalidad del Gral. Don Martín Miguel de Güemes",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 9,
    fecha: "2025-07-10",
    titulo: "Día de la Independencia",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 10,
    fecha: "2025-07-22",
    titulo: "Comienzo del Receso Escolar de Invierno",
    descripcion: "",
    tipo: "academico",
  },
  {
    id: 11,
    fecha: "2025-08-02",
    titulo: "Fin del Receso Escolar de Invierno",
    descripcion: "",
    tipo: "academico",
  },
  {
    id: 12,
    fecha: "2025-08-18",
    titulo: "Paso a la Inmortalidad del Gral. José de San Martín",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 13,
    fecha: "2025-09-12",
    titulo: "Día del Maestro",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 14,
    fecha: "2025-09-22",
    titulo: "Día del Estudiante",
    descripcion: "",
    tipo: "cultural",
  },
  // {
  //   id: 15,
  //   fecha: "2025-09-27",
  //   titulo: "Festejo del día de la Primavera",
  //   descripcion: "Día recreativo para toda la escuela por la Primavera",
  //   tipo: "centro",
  // },
  {
    id: 16,
    fecha: "2025-10-13",
    titulo: "Día del Respeto a la Diversidad Cultural",
    descripcion: "",
    tipo: "cultural",
  },
  // {
  //   id: 17,
  //   fecha: "2025-11-11",
  //   titulo: "Elecciones del Centro de Estudiantes del Ingeniero Emilio Mitre",
  //   descripcion: "Primera fecha de las elecciones estudiantiles",
  //   tipo: "centro",
  // },
  // {
  //   id: 18,
  //   fecha: "2025-11-12",
  //   titulo: "Elecciones del Centro de Estudiantes del Ingeniero Emilio Mitre",
  //   descripcion: "Segunda fecha de las elecciones estudiantiles",
  //   tipo: "centro",
  // },
  {
    id: 19,
    fecha: "2025-11-21",
    titulo: "Día de la Soberanía Nacional",
    descripcion: "",
    tipo: "cultural",
  },
  {
    id: 20,
    fecha: "2025-11-27",
    titulo: "Asamblea General Ordinaria",
    descripcion:
      "Última Asamblea del año, donde se presenta el balance y memoria de la gestión, y se le toman juramento a los nuevos miembros electos",
    tipo: "centro",
  },
  {
    id: 21,
    fecha: "2025-12-04",
    titulo: "Asunción presidencial",
    descripcion:
      "Asume el nuevo Centro de Estudiantes del Ingeniero Emilio Mitre",
    tipo: "centro",
  },
  {
    id: 22,
    fecha: "2025-12-23",
    titulo: "Fin del Ciclo Lectivo",
    descripcion:
      "Despedida a todos los estudiantes y cierre del calendario académico 2025.",
    tipo: "academico",
  },
];

// Elementos del DOM
const monthSelector = document.querySelector(".month-selector");
const eventTypeFilter = document.querySelector(".event-type-filter");
const timeline = document.querySelector(".timeline");

// Función para formatear fechas
function formatearFecha(fecha) {
  const opciones = { day: "numeric", month: "long", year: "numeric" };
  return new Date(fecha).toLocaleDateString("es-ES", opciones);
}

// Función para obtener el mes de una fecha
function obtenerMes(fecha) {
  return new Date(fecha).toLocaleDateString("es-ES", { month: "long" });
}

// Función para agrupar eventos por mes
function agruparEventosPorMes(eventos) {
  return eventos.reduce((grupos, evento) => {
    const mes = obtenerMes(evento.fecha);
    if (!grupos[mes]) {
      grupos[mes] = [];
    }
    grupos[mes].push(evento);
    return grupos;
  }, {});
}

// Función para generar el HTML de un evento
function generarHTMLEvento(evento) {
  return `
        <div class="event-card" data-event-id="${evento.id}">
            <div class="event-date">${formatearFecha(evento.fecha)}</div>
            <h3 class="event-title">${evento.titulo}</h3>
            <p class="event-description">${evento.descripcion}</p>
            <span class="event-tag tag-${evento.tipo}">${
    evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)
  }</span>
        </div>
    `;
}

// Función para renderizar la línea de tiempo
function renderizarTimeline(eventosFiltrados) {
  const eventosPorMes = agruparEventosPorMes(eventosFiltrados);
  let timelineHTML = "";

  Object.entries(eventosPorMes).forEach(([mes, eventosDelMes]) => {
    timelineHTML += `
            <div class="month-section">
                <h2 class="month-title">${
                  mes.charAt(0).toUpperCase() + mes.slice(1)
                }</h2>
                ${eventosDelMes
                  .map((evento) => generarHTMLEvento(evento))
                  .join("")}
            </div>
        `;
  });

  timeline.innerHTML = timelineHTML;
}

// Función para filtrar eventos
function filtrarEventos() {
  const mesSelecionado = monthSelector.value.toLowerCase();
  const tipoSeleccionado = eventTypeFilter.value.toLowerCase();

  let eventosFiltrados = [...eventos];

  if (mesSelecionado) {
    eventosFiltrados = eventosFiltrados.filter(
      (evento) => obtenerMes(evento.fecha).toLowerCase() === mesSelecionado
    );
  }

  if (tipoSeleccionado) {
    eventosFiltrados = eventosFiltrados.filter(
      (evento) => evento.tipo === tipoSeleccionado
    );
  }

  renderizarTimeline(eventosFiltrados);
}

// Función para inicializar los selectores de mes
function inicializarSelectoresMes() {
  const meses = [...new Set(eventos.map((evento) => obtenerMes(evento.fecha)))];
  monthSelector.innerHTML = `
        <option value="">Todos los meses</option>
        ${meses
          .map(
            (mes) => `
            <option value="${mes.toLowerCase()}">${
              mes.charAt(0).toUpperCase() + mes.slice(1)
            }</option>
        `
          )
          .join("")}
    `;
}

// Event Listeners
monthSelector.addEventListener("change", filtrarEventos);
eventTypeFilter.addEventListener("change", filtrarEventos);

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  inicializarSelectoresMes();
  renderizarTimeline(eventos);

  // // Añadir funcionalidad a los quick links
  // const quickLinks = document.querySelectorAll(".quick-link");
  // quickLinks.forEach((link) => {
  //   link.addEventListener("click", (e) => {
  //     e.preventDefault();
  //     const tipo = e.target.textContent.toLowerCase();
  //     eventTypeFilter.value =
  //       tipo === "academico"
  //         ? "academico"
  //         : tipo.replace("eventos ", "academico")
  //         ? "centro"
  //         : tipo.replace("eventos ", "centro")
  //         ? "culturales"
  //         : tipo.replace("eventos ", "culturales");
  //     filtrarEventos();
  //   });
  // });
});

// Añadir animaciones smooth scroll
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const href = this.getAttribute("href");
    if (href !== "#") {
      document.querySelector(href).scrollIntoView({
        behavior: "smooth",
      });
    }
  });
});
