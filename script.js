const palos = ["♥", "♦", "♣", "♠"];

const juego = {
    meta: 6,
    caballos: [],
    mazo: [],
    lineas: [],
    ganador: null
};

function mostrarJuego(){
    document.getElementById("portada").style.display = "none";
    document.getElementById("juego").classList.remove("oculto");
    iniciarJuego();
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

        juego.caballos.forEach(c => {
            let celda = document.createElement("div");
            celda.className = "celda";

            if(c.posicion === i){
                celda.innerHTML = "🐎<br>"+c.palo;
                celda.classList.add("caballo");
            }

            fila.appendChild(celda);
        });

        tablero.appendChild(fila);
    }
}

function turno(){
    if(juego.ganador) return;

    let carta = juego.mazo.pop();

    document.getElementById("cartaGrande").innerText =
        carta.valor + carta.palo;

    avanzarCaballo(carta.palo);
    dibujarTablero();

    setTimeout(() => {
        verificarLineas();
        dibujarTablero();

        if(juego.ganador){
            document.getElementById("ganador").innerText =
                "🏆 GANADOR: Caballo " + juego.ganador;
        } else {
            setTimeout(turno, 1500);
        }
    }, 1500);
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