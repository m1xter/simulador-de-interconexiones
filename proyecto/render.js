// ==========================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ==========================================
const BASE_LATENCY_RAM = 100;    
const BASE_LATENCY_IO = 500;     
const CONGESTION_FACTOR = 2.0;   

let busOcupado = false;

// ==========================================
// 2. DEFINICIÓN DE COMPONENTES
// ==========================================
// Plantilla de clase usada para los componentes del computador usados para la simulación (CPU,RAM,SSD)
class Componente {
    constructor(id, nombre, latenciaBase) {
        this.id = id;
        this.nombre = nombre;
        this.latenciaBase = latenciaBase;
    }

    actualizarUI(estaProcesando) {
        const el = document.getElementById(this.id);
        if (!el) return;
        
        if (estaProcesando) {
            // Brillo dinámico según el tipo de componente
            let color = "#bc00ff"; // Púrpura para CPU
            if (this.id === 'RAM') color = "#00f2ff"; // Azul para RAM
            if (this.id === 'SSD') color = "#ffde00"; // Amarillo para E/S
            
            el.style.boxShadow = `0 0 40px ${color}`;
            el.style.transform = "scale(1.15)";
        } else {
            el.style.boxShadow = "0 0 15px rgba(0,0,0,0.5)";
            el.style.transform = "scale(1)";
        }
    }

    async procesar() {
        this.actualizarUI(true);
        await new Promise(resolve => setTimeout(resolve, this.latenciaBase));
        this.actualizarUI(false);
    }
}




//cpu  valor actual (0ms)  latencia real (0.3 nano segundos) 
//ram  valor actual (150ms) latencia real (150 nano segundos)
//ssd  valor actual (400ms) latencia real (400 nano segundos)
const hardware = {
    cpu: new Componente('CPU', 'Procesador', 0),
    ram: new Componente('RAM', 'Memoria RAM', 150),
    ssd: new Componente('SSD', 'Sistema de E/S', 400)
};
// ==========================================
// 3. LÓGICA VISUAL DEL BUS (NUEVO)
// ==========================================

function actualizarEstadoBusUI(texto, colorClass) {
    const el = document.getElementById('bus-status-text');
    if (el) {
        el.innerText = texto;
        el.className = colorClass; // 'status-ready' o 'status-busy'
    }
}

// Función maestra para dibujar el rayo neón entre componentes
function dibujarLineaBus(origenId, destinoId) {
    const viewport = document.querySelector('.viewport');
    const container = document.querySelector('.bus-lines');
    
    // Crear el SVG si no existe
    if (!container.querySelector('svg')) {
        container.innerHTML = '<svg width="100%" height="100%"></svg>';
    }
    const svg = container.querySelector('svg');

    // Obtener posiciones exactas de los nodos
    const startEl = document.getElementById(origenId);
    const endEl = document.getElementById(destinoId);
    const viewRect = viewport.getBoundingClientRect();
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    // Calcular centros
    const x1 = startRect.left + startRect.width / 2 - viewRect.left;
    const y1 = startRect.top + startRect.height / 2 - viewRect.top;
    const x2 = endRect.left + endRect.width / 2 - viewRect.left;
    const y2 = endRect.top + endRect.height / 2 - viewRect.top;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", "bus-path"); // Clase con animación
    
    svg.appendChild(line);
    return line;
}

// ==========================================
// 4. MOTOR DE EJECUCIÓN
// ==========================================

let colaPeticiones = [];
let procesandoCola = false;
let contadorProcesos = 0;

//en esta fucion se agrega a la cola las intrucciones seleccionadas en el dashboard izquierdo 
//esta fucion recibe  como parametros  el origen de la instruccion , el destino de la instruccion  y el tamaño de bits de del bus
async function agregarACola(origen, destino, tamañoBits) {
    if (colaPeticiones.length == 0) {
    contadorProcesos = 0; // Reiniciar contador si la cola estaba vacía
    }
    const latenciaUsuario = parseInt(document.getElementById('latencia-slider').value);
    contadorProcesos++;

    colaPeticiones.push({ 
        id: contadorProcesos, 
        origen, 
        destino, 
        tamañoBits, 
        latenciaUsuario 
    });
    
    actualizarListaVisual();

    if (!procesandoCola) {
        procesarSiguienteTarea();
    }
}



// en esta funcion se hace un calculo para simular el procesamiento de instrucciones 
async function procesarSiguienteTarea() {

    //validacion de que hay instrucciones en cola
    if (colaPeticiones.length === 0) {
        procesandoCola = false;
        actualizarEstadoBusUI("LISTO", "status-ready");
        actualizarListaVisual();
        // Resetear métrica al terminar
        if(document.getElementById('real-latency')) document.getElementById('real-latency').innerText = "0";
        return;
    }

    procesandoCola = true;
    const tarea = colaPeticiones[0];
    
    // --- LÓGICA DE CÁLCULO DE RENDIMIENTO (FÓRMULA) ---
    const BUS_WIDTH = parseInt(document.getElementById('bus-width-select').value);
    const LATENCIA_RELOJ = parseInt(document.getElementById('latencia-slider').value);
    
    // 1. Calcular ciclos según tamaño de datos / ancho de bus
    const ciclos = Math.ceil(tarea.tamañoBits / BUS_WIDTH);
    
    // 2. Factor de Congestión: Aumenta según procesos en espera
    // Si hay 1 proceso = 1.0 (sin impacto). Si hay más, aumenta 20% por cada uno.
    const factorCongestion = 1 + ((colaPeticiones.length - 1) * 0.2);
    
    // 3. LATENCIA TOTAL SIMULADA
    const latenciaFinal = (ciclos * LATENCIA_RELOJ) * factorCongestion;
    
    // Actualizar UI con la métrica calculada (Innovación)
    if(document.getElementById('real-latency')) {
        document.getElementById('real-latency').innerText = Math.round(latenciaFinal);
    }

    actualizarListaVisual();

    // --- EJECUCIÓN VISUAL ---
    await tarea.origen.procesar();

    const linea = dibujarLineaBus(tarea.origen.id, tarea.destino.id);
    const hayCongestion = colaPeticiones.length > 1;
    actualizarEstadoBusUI(hayCongestion ? "CONGESTIÓN" : "OCUPADO", "status-busy");

    // El sistema espera el tiempo calculado por la fórmula
    await new Promise(r => setTimeout(r, latenciaFinal));

    linea.remove();
    await tarea.destino.procesar();

    colaPeticiones.shift();
    procesarSiguienteTarea();
}


function actualizarListaVisual() {
    const listaUI = document.getElementById('process-list');
    listaUI.innerHTML = '';

    colaPeticiones.forEach((tarea, index) => {
        const li = document.createElement('li');
        li.className = 'process-item' + (index === 0 && procesandoCola ? ' active' : '');
        li.innerHTML = `
            <span>ID: #${tarea.id}</span><br>
            <small>${tarea.origen.nombre} ➔ ${tarea.destino.nombre}</small>
        `;
        listaUI.appendChild(li);
    });
}

function abrirmanual() {
    window.open('manual.html', '_blank');
}

document.addEventListener('DOMContentLoaded', function() {    
    document.getElementById('btn-manual').addEventListener('click', abrirmanual);
});





