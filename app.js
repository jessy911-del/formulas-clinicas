// =========================================================
// app.js
// Maneja las pantallas, lee inputs, conecta con formulas.js.
//
// PATRÓN QUE SE REPITE EN CADA PANTALLA (Rabito, IMC, PC, TFG):
// Cada función "renderX" hace siempre lo mismo, en este orden:
//   1. Escribe el HTML de esa pantalla dentro del contenedor
//      (una plantilla de texto con backticks, con ${...} para
//      insertar valores dinámicos — esto es "template literal").
//   2. Guarda en variables las referencias a los elementos que
//      acabamos de crear (los inputs, el resultado, etc.), para
//      no tener que buscarlos en el DOM cada vez que se usan.
//   3. Conecta los "escuchadores" de eventos (addEventListener):
//      qué debe pasar cuando tocas un botón o escribes en un campo.
//   4. Define actualizar(): la función que se ejecuta cada vez
//      que cambia algo — lee los valores actuales, valida que
//      estén completos, calcula con la clase de formulas.js, y
//      actualiza el texto/color/posición en pantalla.
//   5. Regresa una función reiniciar() (para el botón ↻ de la
//      cabecera), que limpia todo y llama a actualizar() para
//      que la pantalla quede como recién abierta.
// =========================================================


// Metadatos de cada fórmula: título mostrado en la cabecera
// de su pantalla, y la función que construye/activa esa pantalla.
// Si una fórmula no tiene "render", se muestra el placeholder genérico.
const FORMULAS = {
  rabito: { titulo: 'Rabito', render: renderRabito },
  imc:    { titulo: 'IMC', render: renderIMC },
  pc:     { titulo: 'PC', render: renderPC },
  tfg:    { titulo: 'Tasa de Filtración Glomerular', render: renderTFG },
};

// Elementos que YA EXISTEN en index.html desde el inicio (no los
// crea este archivo) — el esqueleto fijo de las dos pantallas
// principales: el menú y el "cascarón" de la pantalla de fórmula
// (cabecera con flecha de volver + botón de reinicio, y el
// contenedor vacío donde cada renderX() mete su propio HTML).
const pantallaMenu = document.getElementById('pantalla-menu');
const pantallaFormula = document.getElementById('pantalla-formula');
const tituloFormula = document.getElementById('titulo-formula');
const contenidoFormula = document.getElementById('contenido-formula');
const btnVolver = document.getElementById('btn-volver');
const btnReiniciar = document.getElementById('btn-reiniciar');

// ---------------------------------------------------------
// Helpers geométricos para dibujar arcos (usados por pantallas
// que necesitan zonas de color, como IMC).
//
// ¿Por qué trigonometría? En SVG, un arco se dibuja dando las
// coordenadas (x,y) exactas de su punto de inicio y de fin — no
// se le puede decir "dibújate de 180° a 90°" directamente. Por
// eso puntoEnArco() convierte un ángulo en las coordenadas x,y
// que le corresponden sobre un círculo (con seno y coseno), y
// trazarArco() arma el texto SVG ("M...A...") a partir de esos
// dos puntos.
// ---------------------------------------------------------
function puntoEnArco(cx, cy, radio, angulo) {
  const rad = (angulo * Math.PI) / 180; // SVG/JS trabajan en radianes, no en grados
  return { x: cx + radio * Math.cos(rad), y: cy - radio * Math.sin(rad) };
}
function trazarArco(cx, cy, radio, anguloInicio, anguloFin) {
  const inicio = puntoEnArco(cx, cy, radio, anguloInicio);
  const fin = puntoEnArco(cx, cy, radio, anguloFin);
  // "M x,y" = mover el "lápiz" ahí sin dibujar. "A rx,ry ..." = dibujar
  // un arco hasta el siguiente punto. Los dos 0/1 controlan el sentido
  // y qué tan "grande" se ve el arco — con nuestros ángulos (≤180°)
  // siempre son 0 y 1.
  return `M${inicio.x},${inicio.y} A${radio},${radio} 0 0 1 ${fin.x},${fin.y}`;
}
// Convierte un valor dentro de [min,max] a un ángulo de 180° (izquierda) a 0° (derecha)
function anguloParaValor(valor, min, max) {
  // Math.max/min aquí "encierran" la proporción entre 0 y 1, para que
  // un valor fuera de rango no mande el punto fuera del arco dibujado.
  const proporcion = Math.min(1, Math.max(0, (valor - min) / (max - min)));
  return 180 - proporcion * 180;
}

// Guarda la función de reinicio de la fórmula actualmente abierta,
// para que el botón de la cabecera sepa qué limpiar.
let reiniciarFormularioActual = null;

// Cambia del menú a la pantalla de una fórmula específica.
// La "navegación" aquí es simple: no cambiamos de página real,
// solo movemos la clase CSS "activa" de una <section> a otra
// (mira estilos.css: .pantalla no se ve si no tiene esa clase).
function irAFormula(idFormula) {
  const datos = FORMULAS[idFormula]; // datos.titulo y datos.render, definidos arriba en FORMULAS
  if (!datos) return; // seguridad: si el id no existe en FORMULAS, no hacer nada

  tituloFormula.textContent = datos.titulo;
  reiniciarFormularioActual = null; // se reemplaza abajo si esta fórmula sí tiene pantalla propia

  if (datos.render) {
    // Cada renderX() construye su HTML y devuelve su propia función
    // reiniciar() (ver el patrón explicado al inicio del archivo).
    reiniciarFormularioActual = datos.render(contenidoFormula) || null;
  } else {
    // Fórmulas que aún no tienen pantalla construida (ver hub: "Próximamente")
    contenidoFormula.innerHTML = '<p class="placeholder-formula">Esta pantalla se construye en el siguiente paso.</p>';
  }

  pantallaMenu.classList.remove('activa');
  pantallaFormula.classList.add('activa');
}

// ---------------------------------------------------------
// Pantalla: Rabito
// ---------------------------------------------------------
function renderRabito(contenedor) {
  contenedor.innerHTML = `
    <div class="pantalla-formula-int">
      <div class="grupo-resultado">
        <div class="arco-resultado">
          <svg class="arco-svg" viewBox="0 0 200 116" preserveAspectRatio="xMidYMid meet">
            <path class="arco-fondo" d="M20,106 A80,80 0 0,1 180,106" />
            <path class="arco-progreso" id="arco-progreso" d="M20,106 A80,80 0 0,1 180,106" />
          </svg>
          <div class="arco-centro">
            <span class="arco-valor" id="valor-resultado">--</span>
            <span class="arco-unidad">kg</span>
          </div>
        </div>
        <p class="etiqueta-resultado">Peso estimado</p>
        <p class="nota-estimacion">Estimación, no un valor exacto</p>
      </div>

      <div class="campos-medidas">
        <div class="campo">
          <span class="campo-etiqueta">Sexo</span>
          <div class="campo-segmentado" id="selector-sexo">
            <button class="opcion-segmentada" data-sexo="2" type="button" aria-pressed="false">
              <svg viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="6" r="5" fill="currentColor"/>
                <path d="M9 13H15L19.5 35H4.5L9 13Z" fill="currentColor"/>
              </svg>
              Mujer
            </button>
            <button class="opcion-segmentada" data-sexo="1" type="button" aria-pressed="false">
              <svg viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="6" r="5" fill="currentColor"/>
                <rect x="7.5" y="13" width="9" height="13" rx="2" fill="currentColor"/>
                <rect x="8" y="26" width="3" height="14" rx="1" fill="currentColor"/>
                <rect x="13" y="26" width="3" height="14" rx="1" fill="currentColor"/>
              </svg>
              Hombre
            </button>
          </div>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Circunferencia de brazo</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="decimal" id="input-cb" placeholder="0.0" min="0" step="0.1" max="100">
            <span class="campo-unidad">cm</span>
          </div>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Circunferencia abdominal</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="decimal" id="input-ca" placeholder="0.0" min="0" step="0.1" max="250">
            <span class="campo-unidad">cm</span>
          </div>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Circunferencia de pantorrilla</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="decimal" id="input-cp" placeholder="0.0" min="0" step="0.1" max="100">
            <span class="campo-unidad">cm</span>
          </div>
        </label>
      </div>
    </div>
  `;

  const formulaRabito = new FormulaRabito(); // instancia de la clase de formulas.js — .calcular() hace la matemática
  // querySelector busca DENTRO de "contenedor" (no en toda la página),
  // usando los mismos id="..." que acabamos de escribir arriba en el HTML.
  const selectorSexo = contenedor.querySelector('#selector-sexo');
  const inputCB = contenedor.querySelector('#input-cb');
  const inputCA = contenedor.querySelector('#input-ca');
  const inputCP = contenedor.querySelector('#input-cp');
  const valorResultado = contenedor.querySelector('#valor-resultado');
  const arcoProgreso = contenedor.querySelector('#arco-progreso');
  const longitudArco = arcoProgreso.getTotalLength(); // largo real de la línea del arco, en píxeles del SVG

  // Truco para "llenar" el arco poco a poco con puro CSS/SVG:
  // stroke-dasharray = longitudArco crea un solo guion tan largo como
  // toda la línea (o sea, se ve continua). stroke-dashoffset la recorre
  // — en 0 se ve completa, en longitudArco se ve vacía. Por eso abajo,
  // en actualizar(), solo cambiamos ese offset según cuántos campos
  // llevan llenos.
  arcoProgreso.style.strokeDasharray = longitudArco;
  arcoProgreso.style.strokeDashoffset = longitudArco;

  let sexoSeleccionado = null; // no vive en el HTML; lo recordamos aquí en JS

  // "Delegación de eventos": en vez de ponerle un listener a cada
  // botón (Mujer/Hombre), le ponemos UNO solo al contenedor y detectamos
  // cuál botón fue tocado con evento.target.closest(...). Funciona
  // igual con 2 botones que con 20, y es el mismo patrón que se repite
  // en las demás pantallas para sexo y GMFCS.
  selectorSexo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.opcion-segmentada');
    if (!boton) return; // se tocó el contenedor pero no un botón — ignorar
    sexoSeleccionado = Number(boton.dataset.sexo); // dataset.sexo lee el atributo data-sexo="1"/"2" del HTML
    selectorSexo.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    boton.classList.add('activo'); // resalta visualmente el botón elegido (ver estilos.css .opcion-segmentada.activo)
    boton.setAttribute('aria-pressed', 'true');
    actualizar();
  });

  // Cada vez que el usuario escribe en cualquiera de estos 3 campos,
  // se vuelve a calcular todo — así el resultado se actualiza en vivo,
  // sin necesidad de un botón "Calcular".
  [inputCB, inputCA, inputCP].forEach((campo) => {
    campo.addEventListener('input', actualizar);
  });

  function actualizar() {
    // parseFloat convierte el texto del input a número; si el campo
    // está vacío o no es un número válido, da NaN ("Not a Number").
    const cb = parseFloat(inputCB.value);
    const ca = parseFloat(inputCA.value);
    const cp = parseFloat(inputCP.value);

    // Arreglo de "¿está listo este dato?" — true/false por cada uno.
    // Este patrón (camposLlenos + totalLlenos) se repite en las 4
    // pantallas: sirve tanto para saber si ya se puede calcular como
    // para saber qué tan lleno mostrar el arco de progreso.
    const camposLlenos = [sexoSeleccionado !== null, !isNaN(cb) && cb > 0, !isNaN(ca) && ca > 0, !isNaN(cp) && cp > 0];
    const totalLlenos = camposLlenos.filter(Boolean).length; // cuenta los "true" del arreglo

    // Progreso visual del arco según cuántos campos están completos (independiente del resultado)
    const proporcion = totalLlenos / camposLlenos.length;
    arcoProgreso.style.strokeDashoffset = longitudArco * (1 - proporcion);

    if (totalLlenos < camposLlenos.length) {
      valorResultado.textContent = '--'; // todavía falta algo por llenar
      return; // "return" aquí corta la función — no seguimos a calcular
    }

    // Ya están todos los datos: aquí es donde se usa la fórmula real
    // (ver formulas.js → FormulaRabito.calcular).
    const peso = formulaRabito.calcular({ cb, ca, cp, sexo: sexoSeleccionado });
    valorResultado.textContent = peso > 0 ? peso.toFixed(1) : '--'; // toFixed(1) = un decimal
  }

  // Limpia el formulario para volver a usarlo con otro paciente,
  // sin tener que borrar campo por campo. Esta función queda "guardada"
  // (closure) y es la que ejecuta el botón ↻ de la cabecera — ver el
  // final del archivo, donde btnReiniciar llama a reiniciarFormularioActual().
  return function reiniciar() {
    sexoSeleccionado = null;
    selectorSexo.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    inputCB.value = '';
    inputCA.value = '';
    inputCP.value = '';
    actualizar(); // vuelve a dejar el arco y el resultado en "--"
  };
}

// Regresa del cascarón de fórmula al menú principal, quitando/poniendo
// la clase "activa" al revés de como lo hace irAFormula().
function volverAlMenu() {
  pantallaFormula.classList.remove('activa');
  pantallaMenu.classList.add('activa');
}

// ---------------------------------------------------------
// Helpers genéricos para pantallas con categorías clínicas
// reales (IMC, TFG): arco dividido en 3 tercios VISUALMENTE
// IGUALES, sin importar qué tan ancho sea cada rango numérico
// en la tabla real. El marcador se posiciona con precisión
// dentro de su tercio, según dónde cae el valor real entre los
// límites de esa categoría.
// ---------------------------------------------------------

// Dibuja el arco de fondo como 3 tercios iguales (180°, 120°, 60°, 0°),
// con los colores recibidos en orden de izquierda a derecha.
function construirTresZonasSvg(colores) {
  const angulos = [180, 120, 60, 0];
  return colores
    .map((color, i) => {
      const d = trazarArco(100, 106, 80, angulos[i], angulos[i + 1]);
      return `<path class="arco-zona" d="${d}" stroke="${color}" />`;
    })
    .join('');
}

// A partir de una tabla de zonas ordenada (que puede tener varias
// subcategorías por color), encuentra los dos límites numéricos
// donde cambia el color — sin asumir cuál color va en cada tercio.
// Ejemplo con la tabla de adultos de IMC (8 categorías, pero solo
// 3 colores): esta función no necesita saber que hay 8 categorías,
// solo detecta en qué "hasta" empieza el segundo color y en cuál
// empieza el tercero.
function limitesDeTresZonas(zonas) {
  const colorInicial = zonas[0].color;
  const indiceSegundo = zonas.findIndex((z) => z.color !== colorInicial); // primera zona de un color distinto
  const colorSegundo = zonas[indiceSegundo].color;
  const indiceTercero = zonas.findIndex((z) => z.color !== colorInicial && z.color !== colorSegundo);
  return {
    limite1: zonas[indiceSegundo - 1].hasta, // el "hasta" justo antes de cambiar de color
    limite2: zonas[indiceTercero - 1].hasta,
    colores: [colorInicial, colorSegundo, zonas[indiceTercero].color],
  };
}

// Posiciona el marcador dentro de su tercio (60° cada uno),
// según qué tan avanzado está el valor dentro del rango de su
// propia categoría — no del rango numérico completo. Por eso hay
// 3 casos (if / else if / else): uno por cada tercio del arco,
// cada uno recalculando su propia proporción de 0 a 1 dentro de
// ESE tercio antes de convertirla a ángulo.
function anguloParaCategoria(valor, limite1, limite2, escalaMin, escalaMax) {
  if (valor < limite1) {
    const p = Math.min(1, Math.max(0, (valor - escalaMin) / (limite1 - escalaMin)));
    return 180 - p * 60; // primer tercio: de 180° a 120°
  }
  if (valor < limite2) {
    const p = Math.min(1, Math.max(0, (valor - limite1) / (limite2 - limite1)));
    return 120 - p * 60; // segundo tercio: de 120° a 60°
  }
  const p = Math.min(1, Math.max(0, (valor - limite2) / (escalaMax - limite2)));
  return 60 - p * 60; // tercer tercio: de 60° a 0°
}

// ---------------------------------------------------------
// Pantalla: IMC
// A diferencia de Rabito, el IMC sí tiene categorías clínicas
// estándar, así que el arco muestra zonas de color reales en
// vez de solo progreso de campos llenados. Las zonas cambian
// automáticamente entre pediátrica, adulto y geriátrica según
// la edad ingresada — ver formulas.js para las tablas y la
// fuente de cada una.
// ---------------------------------------------------------
const IMC_MIN = 10;
const IMC_MAX = 45;
const IMC_COLORES = [FormulaIMC.PALETA.AZUL, FormulaIMC.PALETA.VERDE, FormulaIMC.PALETA.ROJO];

function renderIMC(contenedor) {
  const zonasSvgInicial = construirTresZonasSvg(IMC_COLORES);

  contenedor.innerHTML = `
    <div class="pantalla-formula-int pantalla-formula-int--imc">
      <div class="grupo-resultado">
        <div class="arco-resultado">
          <svg class="arco-svg" viewBox="0 0 200 116" preserveAspectRatio="xMidYMid meet">
            <g id="grupo-zonas-imc">${zonasSvgInicial}</g>
            <circle class="arco-marcador" id="marcador-imc" r="6" cx="20" cy="106" fill="var(--color-texto-suave)" />
          </svg>
          <div class="arco-centro">
            <span class="arco-valor" id="valor-imc">--</span>
          </div>
        </div>
        <p class="etiqueta-resultado">IMC</p>
        <p class="categoria-imc" id="categoria-imc">Completa los datos</p>
        <p class="nota-metodo" id="nota-metodo-imc"></p>
        <p class="peso-ideal" id="peso-ideal-imc"></p>
        <p class="diferencia-peso" id="diferencia-peso-imc"></p>
      </div>

      <div class="campos-medidas">
        <div class="campo">
          <span class="campo-etiqueta">Sexo</span>
          <div class="campo-segmentado" id="selector-sexo">
            <button class="opcion-segmentada" data-sexo="2" type="button" aria-pressed="false">
              <svg viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="6" r="5" fill="currentColor"/>
                <path d="M9 13H15L19.5 35H4.5L9 13Z" fill="currentColor"/>
              </svg>
              Mujer
            </button>
            <button class="opcion-segmentada" data-sexo="1" type="button" aria-pressed="false">
              <svg viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="6" r="5" fill="currentColor"/>
                <rect x="7.5" y="13" width="9" height="13" rx="2" fill="currentColor"/>
                <rect x="8" y="26" width="3" height="14" rx="1" fill="currentColor"/>
                <rect x="13" y="26" width="3" height="14" rx="1" fill="currentColor"/>
              </svg>
              Hombre
            </button>
          </div>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Edad</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="numeric" id="input-edad" placeholder="0" min="0" step="1" max="120">
            <span class="campo-unidad">años</span>
          </div>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Altura</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="numeric" id="input-altura" placeholder="0" min="0" step="1" max="272">
            <span class="campo-unidad">cm</span>
          </div>
          <span class="aviso-campo" id="aviso-altura"></span>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Peso</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="decimal" id="input-peso" placeholder="0.0" min="0" step="0.1" max="400">
            <span class="campo-unidad">kg</span>
          </div>
        </label>
      </div>
    </div>
  `;

  const selectorSexo = contenedor.querySelector('#selector-sexo');
  const inputEdad = contenedor.querySelector('#input-edad');
  const inputAltura = contenedor.querySelector('#input-altura');
  const avisoAltura = contenedor.querySelector('#aviso-altura');
  const inputPeso = contenedor.querySelector('#input-peso');
  const valorIMC = contenedor.querySelector('#valor-imc');
  const categoriaIMC = contenedor.querySelector('#categoria-imc');
  const notaMetodo = contenedor.querySelector('#nota-metodo-imc');
  const pesoIdeal = contenedor.querySelector('#peso-ideal-imc');
  const diferenciaPeso = contenedor.querySelector('#diferencia-peso-imc');
  const marcador = contenedor.querySelector('#marcador-imc');
  const grupoZonas = contenedor.querySelector('#grupo-zonas-imc');

  let sexoSeleccionado = null;

  // Corrige el bug que encontró Fable: sin esto, cuando el resultado
  // se invalida (borras un campo, o pulsas reiniciar), el número vuelve
  // a "--" pero el puntito de color se quedaba pegado en la posición y
  // color de la última medición válida — podía verse "zona roja" del
  // paciente anterior aunque ya no hubiera datos. Esta función lo
  // regresa a su posición inicial (extremo izquierdo, gris neutro).
  function resetMarcador() {
    marcador.setAttribute('cx', 20);
    marcador.setAttribute('cy', 106);
    marcador.setAttribute('fill', 'var(--color-texto-suave)');
  }

  selectorSexo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.opcion-segmentada');
    if (!boton) return;
    sexoSeleccionado = Number(boton.dataset.sexo);
    selectorSexo.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    boton.classList.add('activo');
    boton.setAttribute('aria-pressed', 'true');
    actualizar();
  });

  [inputEdad, inputAltura, inputPeso].forEach((campo) => {
    campo.addEventListener('input', actualizar);
  });

  function actualizar() {
    const edadNum = parseFloat(inputEdad.value);
    // "edad" queda en null (no en NaN) cuando el campo está vacío —
    // así abajo se puede distinguir "no escribió nada" de "escribió
    // algo inválido", y formulaIMC.zonas() sabe usar la tabla de
    // adultos por default cuando edad es null.
    const edad = !isNaN(edadNum) ? edadNum : null;

    // Detección del error típico "1.72" en vez de "172" (ver más abajo
    // en el mensaje): ninguna estatura real en cm puede ser menor a 3,
    // así que si alguien mete algo tan chico, es casi seguro que la
    // escribió en metros por costumbre.
    const alturaCmCruda = parseFloat(inputAltura.value);
    const alturaPareceEnMetros = !isNaN(alturaCmCruda) && alturaCmCruda > 0 && alturaCmCruda < 3;
    const alturaCm = alturaPareceEnMetros ? NaN : alturaCmCruda; // si parece error, la tratamos como inválida
    avisoAltura.textContent = alturaPareceEnMetros
      ? 'Parece que la escribiste en metros. Va en centímetros, sin punto (ej. 172).'
      : '';
    const peso = parseFloat(inputPeso.value);
    const datosBasicos = !isNaN(alturaCm) && alturaCm > 0 && !isNaN(peso) && peso > 0;

    const formulaIMC = new FormulaIMC();
    // zonas() decide sola, según la edad y el sexo, cuál de las 3 tablas
    // usar (pediátrica/adulto/geriátrica) — ver formulas.js.
    const zonas = formulaIMC.zonas(edad, sexoSeleccionado);

    // De aquí para abajo hay 3 validaciones EN CASCADA, cada una con su
    // propio "return" — la primera que aplica corta la función ahí
    // mismo y ninguna de las de abajo se ejecuta:

    // 1) Edad fuera de lo que cualquier tabla puede clasificar.
    if (edad !== null && edad < 2) {
      valorIMC.textContent = '--';
      categoriaIMC.textContent = 'No aplica para menores de 2 años';
      categoriaIMC.style.color = 'var(--color-texto-suave)';
      notaMetodo.textContent = '';
      pesoIdeal.textContent = '';
      diferenciaPeso.textContent = '';
      resetMarcador();
      return;
    }

    // 2) Es un caso pediátrico (2-19 años) pero todavía no eligió sexo:
    // la tabla pediátrica SÍ depende del sexo, así que no se puede
    // clasificar todavía — pero igual mostramos el número del IMC
    // (con formulaIMC.calcular) para que no se vea "muerta" la pantalla.
    if (edad !== null && edad < 20 && sexoSeleccionado === null) {
      valorIMC.textContent = datosBasicos ? formulaIMC.calcular({ peso, alturaCm }).toFixed(1) : '--';
      categoriaIMC.textContent = 'Selecciona el sexo para clasificar';
      categoriaIMC.style.color = 'var(--color-texto-suave)';
      notaMetodo.textContent = '';
      pesoIdeal.textContent = '';
      diferenciaPeso.textContent = '';
      resetMarcador();
      return;
    }

    // 3) Todavía falta llenar altura o peso.
    if (!datosBasicos) {
      valorIMC.textContent = '--';
      categoriaIMC.textContent = 'Completa los datos';
      categoriaIMC.style.color = 'var(--color-texto-suave)';
      notaMetodo.textContent = '';
      pesoIdeal.textContent = '';
      diferenciaPeso.textContent = '';
      resetMarcador();
      return;
    }

    // Si llegamos hasta aquí, ya hay datos suficientes para calcular de verdad.
    const imc = formulaIMC.calcular({ peso, alturaCm });
    const zona = formulaIMC.categoria(imc, edad, sexoSeleccionado);
    const { limite1, limite2 } = limitesDeTresZonas(zonas);

    valorIMC.textContent = imc.toFixed(1);
    categoriaIMC.textContent = `${zona.nombre} (${zona.rango})`;
    categoriaIMC.style.color = zona.color;

    // Avisa cuando NO se está usando la tabla estándar de adultos,
    // para que quede claro por qué el resultado puede diferir de
    // otra app que solo conozca la escala general.
    if (edad !== null && edad < 20) {
      notaMetodo.textContent = 'Evaluado con la escala pediátrica del IMSS para su edad y sexo — el rango normal es distinto al de un adulto.';
    } else if (edad !== null && edad >= 60) {
      notaMetodo.textContent = 'Evaluado con la escala geriátrica del IMSS para 60 años o más — el rango normal es distinto al de un adulto joven.';
    } else {
      notaMetodo.textContent = '';
    }

    // Peso normal para su estatura: convierte los límites de IMC
    // "normal" (limite1–limite2, los mismos que dividen el arco)
    // a kilos usando altura² — así el rango se ajusta a la persona.
    // Es la fórmula del IMC despejada al revés: si IMC = peso/altura²,
    // entonces peso = IMC × altura².
    const alturaM = alturaCm / 100;
    const pesoNormalMin = limite1 * alturaM * alturaM;
    const pesoNormalMax = limite2 * alturaM * alturaM;
    pesoIdeal.textContent = `Peso normal: ${pesoNormalMin.toFixed(1)} – ${pesoNormalMax.toFixed(1)} kg`;

    if (peso > pesoNormalMax) {
      diferenciaPeso.textContent = `${(peso - pesoNormalMax).toFixed(1)} kg por encima del rango normal`;
    } else if (peso < pesoNormalMin) {
      diferenciaPeso.textContent = `${(pesoNormalMin - peso).toFixed(1)} kg por debajo del rango normal`;
    } else {
      diferenciaPeso.textContent = 'Dentro del rango normal';
    }

    // Mueve el puntito (marcador) del arco a la posición exacta que le
    // corresponde a este IMC, y lo pinta del color de su categoría.
    const angulo = anguloParaCategoria(imc, limite1, limite2, IMC_MIN, IMC_MAX);
    const punto = puntoEnArco(100, 106, 80, angulo);
    marcador.setAttribute('cx', punto.x);
    marcador.setAttribute('cy', punto.y);
    marcador.setAttribute('fill', zona.color);
  }

  // Limpia el formulario para volver a usarlo con otra persona,
  // sin tener que borrar campo por campo.
  return function reiniciar() {
    sexoSeleccionado = null;
    selectorSexo.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    inputEdad.value = '';
    inputAltura.value = '';
    inputPeso.value = '';
    avisoAltura.textContent = '';
    actualizar();
  };
}

// ---------------------------------------------------------
// Pantalla: PC (parálisis cerebral)
// Igual que Rabito, es una estimación sin categorías clínicas,
// así que el arco solo muestra progreso de campos llenados
// (no zonas de color). Requiere elegir el nivel GMFCS, que
// determina cuál de las dos ecuaciones se usa — ver formulas.js.
// ---------------------------------------------------------
function renderPC(contenedor) {
  contenedor.innerHTML = `
    <div class="pantalla-formula-int">
      <div class="grupo-resultado">
        <div class="arco-resultado">
          <svg class="arco-svg" viewBox="0 0 200 116" preserveAspectRatio="xMidYMid meet">
            <path class="arco-fondo" d="M20,106 A80,80 0 0,1 180,106" />
            <path class="arco-progreso" id="arco-progreso-pc" d="M20,106 A80,80 0 0,1 180,106" />
          </svg>
          <div class="arco-centro">
            <span class="arco-valor" id="valor-pc">--</span>
            <span class="arco-unidad">kg</span>
          </div>
        </div>
        <p class="etiqueta-resultado">Peso estimado</p>
        <p class="nota-estimacion">Estimación poblacional, no un valor exacto individual</p>
      </div>

      <div class="campos-medidas">
        <div class="campo">
          <span class="campo-etiqueta">Nivel GMFCS</span>
          <div class="campo-segmentado" id="selector-gmfcs">
            <button class="opcion-segmentada" data-gmfcs="1" type="button" aria-pressed="false">I</button>
            <button class="opcion-segmentada" data-gmfcs="2" type="button" aria-pressed="false">II</button>
            <button class="opcion-segmentada" data-gmfcs="3" type="button" aria-pressed="false">III</button>
            <button class="opcion-segmentada" data-gmfcs="4" type="button" aria-pressed="false">IV</button>
            <button class="opcion-segmentada" data-gmfcs="5" type="button" aria-pressed="false">V</button>
          </div>
          <p class="descripcion-gmfcs" id="descripcion-gmfcs">Toca un nivel para ver su descripción</p>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Edad</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="numeric" id="input-edad-pc" placeholder="0" min="0" step="1" max="19">
            <span class="campo-unidad">años</span>
          </div>
          <span class="aviso-campo" id="aviso-edad-pc"></span>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Circunferencia de brazo</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="decimal" id="input-cmb" placeholder="0.0" min="0" step="0.1" max="60">
            <span class="campo-unidad">cm</span>
          </div>
        </label>
      </div>
    </div>
  `;

  const formulaPC = new FormulaPC();
  const selectorGmfcs = contenedor.querySelector('#selector-gmfcs');
  const descripcionGmfcs = contenedor.querySelector('#descripcion-gmfcs');
  const inputEdad = contenedor.querySelector('#input-edad-pc');
  const avisoEdad = contenedor.querySelector('#aviso-edad-pc');
  const inputCMB = contenedor.querySelector('#input-cmb');
  const valorPC = contenedor.querySelector('#valor-pc');
  const arcoProgreso = contenedor.querySelector('#arco-progreso-pc');
  const longitudArco = arcoProgreso.getTotalLength();

  arcoProgreso.style.strokeDasharray = longitudArco;
  arcoProgreso.style.strokeDashoffset = longitudArco;

  let gmfcsSeleccionado = null;

  selectorGmfcs.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.opcion-segmentada');
    if (!boton) return;
    gmfcsSeleccionado = Number(boton.dataset.gmfcs);
    selectorGmfcs.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    boton.classList.add('activo');
    boton.setAttribute('aria-pressed', 'true');
    // FormulaPC.descripcionesGMFCS es un objeto {1: '...', 2: '...', ...}
    // en formulas.js — aquí solo lo consultamos para mostrar el texto.
    descripcionGmfcs.textContent = FormulaPC.descripcionesGMFCS[gmfcsSeleccionado];
    actualizar();
  });

  [inputEdad, inputCMB].forEach((campo) => {
    campo.addEventListener('input', actualizar);
  });

  function actualizar() {
    const edad = parseFloat(inputEdad.value);
    // Aquí NO se bloquea el cálculo si la edad se sale de 2-19 (a
    // diferencia de TFG, que si bloquea) — solo se avisa, porque la
    // fórmula igual da un número; es al usuario a quien le toca decidir
    // si lo usa sabiendo que ya no está validado para esa edad.
    const edadFueraDeRango = !isNaN(edad) && edad > 0 && (edad < 2 || edad > 19);
    avisoEdad.textContent = edadFueraDeRango
      ? 'Esta fórmula está validada para 2 a 19 años.'
      : '';

    const cmb = parseFloat(inputCMB.value);
    const camposLlenos = [
      gmfcsSeleccionado !== null,
      !isNaN(edad) && edad >= 2 && edad <= 19,
      !isNaN(cmb) && cmb > 0,
    ];
    const totalLlenos = camposLlenos.filter(Boolean).length;
    const proporcion = totalLlenos / camposLlenos.length;
    arcoProgreso.style.strokeDashoffset = longitudArco * (1 - proporcion);

    if (totalLlenos < camposLlenos.length) {
      valorPC.textContent = '--';
      return;
    }

    const peso = formulaPC.calcular({ cmb, edad, gmfcs: gmfcsSeleccionado });
    valorPC.textContent = peso > 0 ? peso.toFixed(1) : '--';
  }

  // Limpia el formulario para volver a usarlo con otra persona,
  // sin tener que borrar campo por campo.
  return function reiniciar() {
    gmfcsSeleccionado = null;
    selectorGmfcs.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    descripcionGmfcs.textContent = 'Toca un nivel para ver su descripción';
    inputEdad.value = '';
    inputCMB.value = '';
    avisoEdad.textContent = '';
    actualizar();
  };
}

// ---------------------------------------------------------
// Pantalla: TFG (tasa de filtración glomerular)
// Igual que IMC, sí tiene categorías clínicas reales (estadios
// KDIGO), así que usa el mismo arco de 3 tercios iguales. Aquí
// el orden de color es al revés que en IMC: rojo (peor función
// renal) queda a la izquierda y verde (normal) a la derecha,
// porque un valor MÁS ALTO de TFG es mejor — mientras que en
// IMC un valor más alto no necesariamente lo es.
// Solo válida para adultos (≥ 18 años) — ver formulas.js.
// ---------------------------------------------------------
const TFG_MIN = 0;
const TFG_MAX = 120;
const TFG_COLORES = ['#c9634a', '#d4914a', '#4a9b6e'];

function renderTFG(contenedor) {
  const zonasSvgInicial = construirTresZonasSvg(TFG_COLORES);

  contenedor.innerHTML = `
    <div class="pantalla-formula-int">
      <div class="grupo-resultado">
        <div class="arco-resultado">
          <svg class="arco-svg" viewBox="0 0 200 116" preserveAspectRatio="xMidYMid meet">
            <g>${zonasSvgInicial}</g>
            <circle class="arco-marcador" id="marcador-tfg" r="6" cx="180" cy="106" fill="var(--color-texto-suave)" />
          </svg>
          <div class="arco-centro">
            <span class="arco-valor" id="valor-tfg">--</span>
          </div>
        </div>
        <p class="etiqueta-resultado">Tasa de Filtración Glomerular</p>
        <p class="categoria-imc" id="categoria-tfg">Completa los datos</p>
        <p class="diferencia-peso" id="diferencia-tfg"></p>
      </div>

      <div class="campos-medidas">
        <div class="campo">
          <span class="campo-etiqueta">Sexo</span>
          <div class="campo-segmentado" id="selector-sexo">
            <button class="opcion-segmentada" data-sexo="2" type="button" aria-pressed="false">
              <svg viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="6" r="5" fill="currentColor"/>
                <path d="M9 13H15L19.5 35H4.5L9 13Z" fill="currentColor"/>
              </svg>
              Mujer
            </button>
            <button class="opcion-segmentada" data-sexo="1" type="button" aria-pressed="false">
              <svg viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="6" r="5" fill="currentColor"/>
                <rect x="7.5" y="13" width="9" height="13" rx="2" fill="currentColor"/>
                <rect x="8" y="26" width="3" height="14" rx="1" fill="currentColor"/>
                <rect x="13" y="26" width="3" height="14" rx="1" fill="currentColor"/>
              </svg>
              Hombre
            </button>
          </div>
        </div>
        <label class="campo">
          <span class="campo-etiqueta">Edad</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="numeric" id="input-edad-tfg" placeholder="0" min="0" step="1" max="120">
            <span class="campo-unidad">años</span>
          </div>
          <span class="aviso-campo" id="aviso-edad-tfg"></span>
        </label>
        <label class="campo">
          <span class="campo-etiqueta">Creatinina sérica</span>
          <div class="campo-input-wrap">
            <input type="number" inputmode="decimal" id="input-creatinina" placeholder="0.00" min="0" step="0.01" max="25">
            <span class="campo-unidad">mg/dL</span>
          </div>
        </label>
      </div>
    </div>
  `;

  const formulaTFG = new FormulaTFG();
  const selectorSexo = contenedor.querySelector('#selector-sexo');
  const inputEdad = contenedor.querySelector('#input-edad-tfg');
  const avisoEdad = contenedor.querySelector('#aviso-edad-tfg');
  const inputCreatinina = contenedor.querySelector('#input-creatinina');
  const valorTFG = contenedor.querySelector('#valor-tfg');
  const categoriaTFG = contenedor.querySelector('#categoria-tfg');
  const diferenciaTFG = contenedor.querySelector('#diferencia-tfg');
  const marcador = contenedor.querySelector('#marcador-tfg');

  let sexoSeleccionado = null;

  // Mismo arreglo que en IMC (bug encontrado por Fable): al invalidar
  // el resultado, el marcador debe volver a su posición neutral inicial
  // (extremo derecho, gris) en vez de quedarse pegado en la última zona.
  function resetMarcador() {
    marcador.setAttribute('cx', 180);
    marcador.setAttribute('cy', 106);
    marcador.setAttribute('fill', 'var(--color-texto-suave)');
  }

  selectorSexo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.opcion-segmentada');
    if (!boton) return;
    sexoSeleccionado = Number(boton.dataset.sexo);
    selectorSexo.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    boton.classList.add('activo');
    boton.setAttribute('aria-pressed', 'true');
    actualizar();
  });

  [inputEdad, inputCreatinina].forEach((campo) => {
    campo.addEventListener('input', actualizar);
  });

  function actualizar() {
    const edad = parseFloat(inputEdad.value);
    // A diferencia de PC (que solo avisa), aquí SÍ se bloquea el
    // resultado si es menor de edad (ver más abajo, datosCompletos
    // exige edad >= 18) — porque la ecuación CKD-EPI que usamos fue
    // desarrollada y validada solo en adultos; en niños la función
    // renal se calcula distinto (fórmula de Schwartz, que no
    // implementamos aquí).
    const edadNoSoportada = !isNaN(edad) && edad > 0 && edad < 18;
    avisoEdad.textContent = edadNoSoportada
      ? 'Esta fórmula está validada solo para adultos (18 años o más).'
      : '';

    const creatinina = parseFloat(inputCreatinina.value);
    const datosCompletos =
      sexoSeleccionado !== null &&
      !isNaN(edad) && edad >= 18 &&
      !isNaN(creatinina) && creatinina > 0;

    if (!datosCompletos) {
      valorTFG.textContent = '--';
      categoriaTFG.textContent = edadNoSoportada ? '' : 'Completa los datos';
      categoriaTFG.style.color = 'var(--color-texto-suave)';
      diferenciaTFG.textContent = '';
      resetMarcador();
      return;
    }

    const tfg = formulaTFG.calcular({ creatinina, edad, sexo: sexoSeleccionado });
    const zona = formulaTFG.categoria(tfg);
    const { limite1, limite2 } = limitesDeTresZonas(FormulaTFG.zonas);

    valorTFG.textContent = tfg.toFixed(0);
    categoriaTFG.textContent = `${zona.nombre} (${zona.rango})`;
    categoriaTFG.style.color = zona.color;

    // A diferencia del IMC, la TFG no tiene techo — un valor alto nunca
    // es un problema — así que solo se avisa cuando está por DEBAJO
    // del umbral que separa verde de ámbar en el arco (60, según KDIGO).
    // Se evita decir "dentro del rango normal" a secas: en G2 (60-89)
    // la categoría misma ya dice "levemente disminuida", y las dos
    // frases juntas se contradecían (hallazgo de la revisión con Fable).
    if (tfg < limite2) {
      diferenciaTFG.textContent = `${(limite2 - tfg).toFixed(0)} mL/min por debajo del rango normal`;
    } else {
      diferenciaTFG.textContent = 'Sin descenso relevante de la función renal';
    }

    const angulo = anguloParaCategoria(tfg, limite1, limite2, TFG_MIN, TFG_MAX);
    const punto = puntoEnArco(100, 106, 80, angulo);
    marcador.setAttribute('cx', punto.x);
    marcador.setAttribute('cy', punto.y);
    marcador.setAttribute('fill', zona.color);
  }

  // Limpia el formulario para volver a usarlo con otra persona,
  // sin tener que borrar campo por campo.
  return function reiniciar() {
    sexoSeleccionado = null;
    selectorSexo.querySelectorAll('.opcion-segmentada').forEach((b) => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    inputEdad.value = '';
    inputCreatinina.value = '';
    avisoEdad.textContent = '';
    actualizar();
  };
}

// A partir de aquí ya no estamos dentro de ninguna función renderX —
// esto se ejecuta UNA sola vez, apenas carga la página, y conecta los
// controles que viven fuera de las pantallas de fórmula:

// Le pone un click a cada tarjeta del hub (Rabito, IMC, PC, TFG).
// querySelectorAll busca en TODA la página esta vez (no en un
// contenedor), porque las tarjetas son parte del menú principal,
// que ya existe desde que abrió la app.
document.querySelectorAll('.tarjeta-formula[data-formula]').forEach((tarjeta) => {
  tarjeta.addEventListener('click', () => {
    if (tarjeta.disabled) return; // tarjetas "Próximamente" no hacen nada
    irAFormula(tarjeta.dataset.formula); // dataset.formula lee data-formula="rabito", etc.
  });
});

btnVolver.addEventListener('click', volverAlMenu);

// El botón ↻ de la cabecera no sabe nada de sexo/edad/circunferencias
// — solo llama a la función que la pantalla actualmente abierta dejó
// guardada en reiniciarFormularioActual (ver irAFormula, arriba).
btnReiniciar.addEventListener('click', () => {
  if (reiniciarFormularioActual) reiniciarFormularioActual();
});
