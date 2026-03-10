const palos = ["♥", "♦", "♣", "♠"];

// Configuración backend
const API_URL = "http://localhost:3000/api";

// Estado de usuario y apuesta
let usuarioActual = null; // { id, nombre, puntos }
let apuestaActual = null; // { partida_id, caballo, monto }

const juego = {
    meta: 6,
    caballos: [],
    mazo: [],
    lineas: [],
    ganador: null
};

// ---- Funciones de usuario / puntos / apuestas ----

async function registrarUsuario(){
    const nombre = document.getElementById("nombreUsuario").value.trim();
    const estado = document.getElementById("estadoAuth");
    if(!nombre){
        estado.innerText = "Ingresa un nombre.";
        return;
    }
    try{
        const res = await fetch(`${API_URL}/registro`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ nombre })
        });
        const data = await res.json();
        if(!res.ok){
            estado.innerText = data.error || "Error en el registro.";
            return;
        }
        usuarioActual = { id: data.id, nombre: data.nombre, puntos: data.puntos };
        actualizarPanelUsuario();
        estado.innerText = "Usuario registrado y conectado.";
    }catch(e){
        estado.innerText = "Error de conexión con el servidor.";
    }
}

async function loginUsuario(){
    const nombre = document.getElementById("nombreUsuario").value.trim();
    const estado = document.getElementById("estadoAuth");
    if(!nombre){
        estado.innerText = "Ingresa un nombre.";
        return;
    }
    try{
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ nombre })
        });
        const data = await res.json();
        if(!res.ok){
            estado.innerText = data.error || "Error al iniciar sesión.";
            return;
        }
        usuarioActual = { id: data.id, nombre: data.nombre, puntos: data.puntos };
        actualizarPanelUsuario();
        estado.innerText = "Sesión iniciada correctamente.";
    }catch(e){
        estado.innerText = "Error de conexión con el servidor.";
    }
}

function actualizarPanelUsuario(){
    if(!usuarioActual) return;
    document.getElementById("panelUsuario").classList.remove("oculto");
    document.getElementById("nombreActual").innerText = usuarioActual.nombre;
    document.getElementById("puntosActuales").innerText = usuarioActual.puntos;
    // También reflejar en pantalla de juego
    const nombreJuego = document.getElementById("nombreActualJuego");
    const puntosJuego = document.getElementById("puntosActualesJuego");
    if(nombreJuego) nombreJuego.innerText = usuarioActual.nombre;
    if(puntosJuego) puntosJuego.innerText = usuarioActual.puntos;
}

async function comprarPuntos(){
    if(!usuarioActual) return;
    const paquetes = parseInt(document.getElementById("paquetes").value, 10) || 0;
    const estado = document.getElementById("estadoCompra");
    if(paquetes <= 0){
        estado.innerText = "Ingresa una cantidad válida de paquetes.";
        return;
    }
    try{
        const res = await fetch(`${API_URL}/compras`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ usuario_id: usuarioActual.id, paquetes })
        });
        const data = await res.json();
        if(!res.ok){
            estado.innerText = data.error || "Error al comprar puntos.";
            return;
        }
        usuarioActual.puntos = data.puntos_actuales;
        actualizarPanelUsuario();
        estado.innerText = `Compra realizada. Nuevos puntos: ${data.puntos_actuales}`;
    }catch(e){
        estado.innerText = "Error de conexión con el servidor.";
    }
}

async function prepararApuesta(){
    if(!usuarioActual){
        document.getElementById("estadoApuesta").innerText = "Primero inicia sesión.";
        return false;
    }
    const caballo = document.getElementById("caballoApuesta").value;
    const monto = parseInt(document.getElementById("montoApuesta").value, 10) || 0;
    const estado = document.getElementById("estadoApuesta");

    if(monto <= 0){
        estado.innerText = "El monto de la apuesta debe ser mayor a 0.";
        return false;
    }
    if(monto > usuarioActual.puntos){
        estado.innerText = "No tienes puntos suficientes para esa apuesta.";
        return false;
    }

    try{
        // 1. Crear partida
        const resPartida = await fetch(`${API_URL}/partidas`, { method: "POST" });
        const partida = await resPartida.json();
        if(!resPartida.ok){
            estado.innerText = partida.error || "Error al crear la partida.";
            return false;
        }

        // 2. Registrar apuesta
        const resApuesta = await fetch(`${API_URL}/apuestas`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                partida_id: partida.id,
                usuario_id: usuarioActual.id,
                caballo,
                monto
            })
        });
        const dataApuesta = await resApuesta.json();
        if(!resApuesta.ok){
            estado.innerText = dataApuesta.error || "Error al registrar la apuesta.";
            return false;
        }

        usuarioActual.puntos = dataApuesta.puntos_restantes;
        actualizarPanelUsuario();
        apuestaActual = {
            partida_id: partida.id,
            caballo,
            monto
        };
        estado.innerText = `Apuesta registrada. Partida #${partida.id}`;
        return true;
    }catch(e){
        estado.innerText = "Error de conexión con el servidor.";
        return false;
    }
}

async function mostrarJuego(){
    // Antes de iniciar, asegurar que hay apuesta preparada
    const ok = await prepararApuesta();
    if(!ok) return;

    document.getElementById("portada").style.display = "none";
    document.getElementById("juego").classList.remove("oculto");
    iniciarJuego();
}

function volverAPortada(){
    document.getElementById("juego").classList.add("oculto");
    document.getElementById("portada").style.display = "flex";
    document.getElementById("ganador").innerText = "";
    document.getElementById("mensaje").innerText = "Haz clic en la carta para avanzar la carrera";
    const cartaDiv = document.getElementById("cartaGrande");
    cartaDiv.innerHTML = '<span class="texto-carta-placeholder">Clic para sacar carta</span>';
    cartaDiv.classList.remove("animando");
    const btn = document.getElementById("btnTurno");
    if(btn){
        btn.disabled = false;
        btn.classList.remove("deshabilitado");
        btn.innerText = "Sacar carta";
    }
    cerrarOverlayGanador();
}

function crearMazo(){
    const valores = ["2","3","4","5","6","7","8","9","10","J","Q","K"];
    juego.mazo = [];

    palos.forEach(palo => {
        valores.forEach(valor => {
            juego.mazo.push({valor, palo});
        });
    });
}

function barajar(){
    for(let i = juego.mazo.length -1; i>0; i--){
        let j = Math.floor(Math.random() * (i+1));
        [juego.mazo[i], juego.mazo[j]] = [juego.mazo[j], juego.mazo[i]];
    }
}

function crearCaballos(){
    juego.caballos = [];
    palos.forEach(palo => {
        juego.caballos.push({
            palo,
            posicion: 0
        });
    });
}

function crearLineas(){
    juego.lineas = [];
    for(let i=1; i<=4; i++){
        juego.lineas.push({
            nivel: i,
            carta: null,
            activada: false
        });
    }
    dibujarLineas();
}

function dibujarLineas(){
    let contenedor = document.getElementById("lineas");
    contenedor.innerHTML = "";

    juego.lineas.forEach(linea => {
        let div = document.createElement("div");
        div.classList.add("carta");

        if(linea.activada){
            div.classList.add("revelada");
            div.innerText = linea.carta.valor + linea.carta.palo;
        } else {
            div.innerText = "🂠";
        }

        contenedor.appendChild(div);
    });
}

function avanzarCaballo(palo){
    document.getElementById("mensaje").innerText =
        "Avanza el caballo " + palo;

    juego.caballos.forEach(c => {
        if(c.palo === palo){
            c.posicion++;
            if(c.posicion >= juego.meta){
                c.posicion = juego.meta;
                juego.ganador = palo;
            }
        }
    });
}

function retrocederCaballo(palo){
    document.getElementById("mensaje").innerText =
        "Se revela carta → Retrocede caballo " + palo;

    juego.caballos.forEach(c => {
        if(c.palo === palo && c.posicion > 0){
            c.posicion--;
        }
    });
}

function verificarLineas(){
    juego.lineas.forEach(linea => {
        if(!linea.activada){
            let todosPasaron = juego.caballos.every(
                c => c.posicion >= linea.nivel
            );

            if(todosPasaron){
                linea.activada = true;
                linea.carta = juego.mazo.pop();
                retrocederCaballo(linea.carta.palo);
                dibujarLineas();
            }
        }
    });
}

function dibujarTablero(){
    let tablero = document.getElementById("tablero");
    tablero.innerHTML = "";

    for(let i=juego.meta; i>=0; i--){
        let fila = document.createElement("div");
        fila.className = "fila";
        if(i === juego.meta){
            fila.classList.add("meta-fila");
        }

        juego.caballos.forEach(c => {
            let celda = document.createElement("div");
            celda.className = "celda";

            if(c.posicion === i){
                let clasePalo = "";
                if(c.palo === "♥") clasePalo = "palo-corazon";
                else if(c.palo === "♦") clasePalo = "palo-diamante";
                else if(c.palo === "♣") clasePalo = "palo-trebol";
                else if(c.palo === "♠") clasePalo = "palo-pica";

                celda.innerHTML =
                    '<div class="icono-caballo">🐎</div>'+
                    `<div class="icono-palo ${clasePalo}">${c.palo}</div>`;
                celda.classList.add("caballo");
            }

            fila.appendChild(celda);
        });

        tablero.appendChild(fila);
    }
}

function mostrarOverlayGanador(paloGanador){
    const overlay = document.getElementById("overlayGanador");
    const texto = document.getElementById("overlayTexto");
    if(!overlay || !texto) return;

    let nombrePalo = "";
    if(paloGanador === "♥") nombrePalo = "Caballo de Corazones";
    else if(paloGanador === "♦") nombrePalo = "Caballo de Diamantes";
    else if(paloGanador === "♣") nombrePalo = "Caballo de Tréboles";
    else if(paloGanador === "♠") nombrePalo = "Caballo de Picas";
    else nombrePalo = "Caballo " + paloGanador;

    texto.innerText = `¡${nombrePalo} es el GANADOR!`;
    overlay.classList.remove("oculto");
    overlay.classList.add("mostrar");
}

function cerrarOverlayGanador(){
    const overlay = document.getElementById("overlayGanador");
    if(overlay){
        overlay.classList.add("oculto");
        overlay.classList.remove("mostrar");
    }
}

function turno(){
    if(juego.ganador) return;

    if(juego.mazo.length === 0){
        document.getElementById("mensaje").innerText = "No quedan más cartas en el mazo.";
        const btn = document.getElementById("btnTurno");
        if(btn){
            btn.disabled = true;
            btn.classList.add("deshabilitado");
            btn.innerText = "Sin cartas";
        }
        return;
    }

    let carta = juego.mazo.pop();

    const cartaDiv = document.getElementById("cartaGrande");
    // reiniciar animación
    cartaDiv.classList.remove("animando");
    // truco para forzar reflow
    void cartaDiv.offsetWidth;
    cartaDiv.classList.add("animando");
    cartaDiv.innerText = carta.valor + carta.palo;

    avanzarCaballo(carta.palo);
    dibujarTablero();

    setTimeout(() => {
        verificarLineas();
        dibujarTablero();

        if(juego.ganador){
            document.getElementById("ganador").innerText =
                "🏆 GANADOR: Caballo " + juego.ganador;

            // Notificar al backend para pagar apuestas si hay apuesta activa
            if(apuestaActual && apuestaActual.partida_id){
                fetch(`${API_URL}/partidas/${apuestaActual.partida_id}/finalizar`, {
                    method: "POST",
                    headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ ganador_caballo: juego.ganador })
                })
                .then(r => r.json())
                .then(() => {
                    // Refrescar puntos del usuario desde el backend
                    if(usuarioActual){
                        return fetch(`${API_URL}/login`, {
                            method: "POST",
                            headers: {"Content-Type":"application/json"},
                            body: JSON.stringify({ nombre: usuarioActual.nombre })
                        })
                        .then(r => r.json())
                        .then(data => {
                            if(data && data.puntos !== undefined){
                                usuarioActual.puntos = data.puntos;
                                actualizarPanelUsuario();
                            }
                        });
                    }
                })
                .catch(() => {
                    // en caso de error, simplemente no actualizamos
                });
            }

            // Bloquear más clics lógicos
            apuestaActual = null;
            document.getElementById("mensaje").innerText =
                "Carrera finalizada. Vuelve a la portada para una nueva apuesta.";
            const btn = document.getElementById("btnTurno");
            if(btn){
                btn.disabled = true;
                btn.classList.add("deshabilitado");
                btn.innerText = "Carrera finalizada";
            }

            mostrarOverlayGanador(juego.ganador);
        }
    }, 600);
}

// Función llamada desde el onclick de la carta
function turnoManual(){
    turno();
}

function iniciarJuego(){
    crearMazo();
    barajar();
    crearCaballos();
    crearLineas();
    juego.ganador = null;
    dibujarTablero();
    turno();
}