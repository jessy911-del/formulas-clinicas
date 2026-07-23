// =========================================================
// formulas.js
// Solo lógica matemática. Una clase por fórmula.
// Cada clase expone un método calcular() que recibe un objeto
// (destructuring) con los datos necesarios y regresa el resultado.
// No debe tocar el DOM — de eso se encarga app.js.
//
// ¿Por qué clases y no solo funciones sueltas? Porque además de
// calcular(), varias fórmulas (IMC, TFG) también necesitan otros
// métodos relacionados — por ejemplo categoria(), que decide en
// qué categoría clínica cae un resultado. Agrupar todo eso en una
// clase mantiene junto lo que le pertenece a cada fórmula, y hace
// que agregar una fórmula nueva sea copiar el mismo patrón sin
// tocar las que ya existen.
//
// Uso típico desde app.js:
//   const formula = new FormulaRabito();
//   const resultado = formula.calcular({ cb, ca, cp, sexo });
// =========================================================

// Las clases de cada fórmula (FormulaRabito, FormulaIMC, etc.)
// se agregan aquí en los siguientes pasos, una por una,
// conforme se construya la pantalla correspondiente.

// ---------------------------------------------------------
// Rabito — peso estimado para pacientes no ambulatorios/postrados
// Fuente: fórmula proporcionada por Fernando (verificada previamente).
// Peso(kg) = 0.5759×CB + 0.5263×CA + 1.2452×CP − 4.8689×Sexo − 32.9241
// CB = circunferencia de brazo (cm)
// CA = circunferencia abdominal (cm)
// CP = circunferencia de pantorrilla (cm)
// Sexo: 1 = hombre, 2 = mujer
// ---------------------------------------------------------
class FormulaRabito {
  calcular({ cb, ca, cp, sexo }) {
    const peso =
      0.5759 * cb +
      0.5263 * ca +
      1.2452 * cp -
      4.8689 * sexo -
      32.9241;
    return peso;
  }
}

// ---------------------------------------------------------
// PC — peso estimado para niños y adolescentes con parálisis
// cerebral (2 a 19 años), a partir de circunferencia media de
// brazo (CMB), edad y nivel GMFCS.
//
// Fuente: "Calculador de Peso PC" — Ruiz Brunner MdlM, Cieri ME,
// Butler C, Cuestas E. "Development of equations and software
// for estimating weight in children with cerebral palsy."
// Dev Med Child Neurol. 2021;63(7):860-865. Validado en 381
// niños y adolescentes con PC en Argentina (concordancia 0.94
// entre peso estimado y peso real observado).
//
// Dos ecuaciones distintas según el nivel GMFCS (la relación
// entre CMB/edad y peso no es igual en niños que caminan que
// en niños con compromiso motor severo):
// - GMFCS I a III: Peso = 2.52×CMB + 1.19×edad − 32
// - GMFCS IV o V:  Peso = 2.02×CMB + 0.97×edad − 22.5
// (edad en años completos, sin considerar meses; CMB en cm)
//
// Nota clínica de los propios autores: estas ecuaciones son
// adecuadas para trabajar a nivel poblacional; a nivel
// individual deben usarse con precaución y no como único dato
// para decisiones clínicas.
// ---------------------------------------------------------
class FormulaPC {
  calcular({ cmb, edad, gmfcs }) {
    if (gmfcs === 1 || gmfcs === 2 || gmfcs === 3) {
      return 2.52 * cmb + 1.19 * edad - 32;
    }
    return 2.02 * cmb + 0.97 * edad - 22.5;
  }
}

FormulaPC.descripcionesGMFCS = {
  1: 'Camina sin limitaciones',
  2: 'Camina con limitaciones',
  3: 'Camina con dispositivo de movilidad manual',
  4: 'Automovilidad con limitaciones (puede usar silla de ruedas motorizada)',
  5: 'Transportado en silla de ruedas manual, requiere apoyo total',
};

// ---------------------------------------------------------
// IMC — índice de masa corporal
// IMC = peso(kg) / altura(m)²
//
// Usa tres tablas de clasificación distintas, elegidas
// automáticamente según la edad:
//
// - Pediátrica (2 a 19 años): tabla de la OMS 2007 (WHO Growth
//   Reference 5-19 years + WHO Child Growth Standards 2-5 years),
//   con puntos de corte específicos por edad Y por sexo — un niño
//   no se compara contra un número fijo, sino contra su propia
//   curva de crecimiento. Por eso esta clasificación requiere
//   sexo, a diferencia de la de adultos. Los cortes de la rama
//   ≥5 años se verificaron idénticos, número por número, contra
//   las tablas de IMC infantil que el propio IMSS publica en
//   imss.gob.mx/sites/all/statics/salud/tablas_imc/ — por eso la
//   categoría más baja se llama "Riesgo de desnutrición" (nombre
//   que usa el IMSS), no "Delgadez".
// - Adultos (20 a 59 años): clasificación estándar de la OMS,
//   con los 3 grados de obesidad diferenciados.
// - Adultos mayores (≥ 60 años — así lo define la Norma Oficial
//   Mexicana): tabla de la Guía de Práctica Clínica IMSS-095-24
//   (2024, "Evaluación y tratamiento nutricional del adulto
//   mayor en el primer nivel de atención", vigente en el
//   Catálogo Maestro de GPC), porque en esta población el rango
//   "normal" de IMC es más amplio que en un adulto joven.
//
// Menores de 2 años no están soportados: a esa edad se usa
// peso-para-talla, no IMC.
// ---------------------------------------------------------
class FormulaIMC {
  calcular({ peso, alturaCm }) {
    const alturaM = alturaCm / 100;
    return peso / (alturaM * alturaM);
  }

  // Arma la tabla de zonas pediátrica para una edad y sexo dados,
  // a partir de los 4 puntos de corte de la OMS (-2DE, +1DE, +2DE, +3DE).
  // Antes de los 5 años el +1DE se llama "riesgo de sobrepeso" (no
  // "sobrepeso") — así lo define la propia OMS para esa etapa.
  zonasPediatricas(edad, sexo) {
    const edadTabla = Math.min(19, Math.max(2, Math.round(edad)));
    const fila = FormulaIMC.tablaPediatrica[edadTabla];
    const [menos2DE, mas1DE, mas2DE, mas3DE] = sexo === 1 ? fila.niños : fila.niñas;
    const { AZUL, VERDE, ROJO } = FormulaIMC.PALETA;

    if (edadTabla < 5) {
      return [
        { hasta: menos2DE, nombre: 'Delgadez', rango: `< ${menos2DE.toFixed(1)}`, color: AZUL },
        { hasta: mas1DE, nombre: 'Normal', rango: `${menos2DE.toFixed(1)} – ${mas1DE.toFixed(1)}`, color: VERDE },
        { hasta: mas2DE, nombre: 'Riesgo de sobrepeso', rango: `${mas1DE.toFixed(1)} – ${mas2DE.toFixed(1)}`, color: ROJO },
        { hasta: mas3DE, nombre: 'Sobrepeso', rango: `${mas2DE.toFixed(1)} – ${mas3DE.toFixed(1)}`, color: ROJO },
        { hasta: Infinity, nombre: 'Obesidad', rango: `≥ ${mas3DE.toFixed(1)}`, color: ROJO },
      ];
    }
    return [
      { hasta: menos2DE, nombre: 'Riesgo de desnutrición', rango: `< ${menos2DE.toFixed(1)}`, color: AZUL },
      { hasta: mas1DE, nombre: 'Normal', rango: `${menos2DE.toFixed(1)} – ${mas1DE.toFixed(1)}`, color: VERDE },
      { hasta: mas2DE, nombre: 'Sobrepeso', rango: `${mas1DE.toFixed(1)} – ${mas2DE.toFixed(1)}`, color: ROJO },
      { hasta: mas3DE, nombre: 'Obesidad', rango: `${mas2DE.toFixed(1)} – ${mas3DE.toFixed(1)}`, color: ROJO },
      { hasta: Infinity, nombre: 'Obesidad intensa', rango: `≥ ${mas3DE.toFixed(1)}`, color: ROJO },
    ];
  }

  // Devuelve la tabla de zonas que corresponde según edad y sexo,
  // o null si todavía no hay suficiente información para clasificar
  // (edad no soportada, o edad pediátrica sin sexo seleccionado).
  zonas(edad, sexo) {
    if (edad === null || edad === undefined) return FormulaIMC.zonasAdulto;
    if (edad < 2) return null;
    if (edad < 20) return sexo === 1 || sexo === 2 ? this.zonasPediatricas(edad, sexo) : null;
    if (edad >= 60) return FormulaIMC.zonasGeriatricas;
    return FormulaIMC.zonasAdulto;
  }

  categoria(imc, edad, sexo) {
    const zonas = this.zonas(edad, sexo);
    if (!zonas) return null;
    return zonas.find((zona) => imc < zona.hasta) || zonas[zonas.length - 1];
  }
}

// Paleta de solo 3 colores para el arco: azul (delgadez), verde
// (normal), rojo (sobrepeso u obesidad, cualquier grado). Antes
// había un color distinto por cada grado, pero se veía saturado.
FormulaIMC.PALETA = {
  AZUL: '#7fa8c9',
  VERDE: '#4a9b6e',
  ROJO: '#c9634a',
};

FormulaIMC.zonasAdulto = [
  { hasta: 16.0, nombre: 'Delgadez muy extrema', rango: '≤ 15.9', color: FormulaIMC.PALETA.AZUL },
  { hasta: 17.0, nombre: 'Delgadez extrema', rango: '16.0 – 16.9', color: FormulaIMC.PALETA.AZUL },
  { hasta: 18.5, nombre: 'Delgadez', rango: '17.0 – 18.4', color: FormulaIMC.PALETA.AZUL },
  { hasta: 25.0, nombre: 'Normal', rango: '18.5 – 24.9', color: FormulaIMC.PALETA.VERDE },
  { hasta: 30.0, nombre: 'Sobrepeso', rango: '25.0 – 29.9', color: FormulaIMC.PALETA.ROJO },
  { hasta: 35.0, nombre: 'Obesidad grado I', rango: '30.0 – 34.9', color: FormulaIMC.PALETA.ROJO },
  { hasta: 40.0, nombre: 'Obesidad grado II', rango: '35.0 – 39.9', color: FormulaIMC.PALETA.ROJO },
  { hasta: Infinity, nombre: 'Obesidad grado III', rango: '≥ 40.0', color: FormulaIMC.PALETA.ROJO },
];

// Clasificación geriátrica: Guía de Práctica Clínica IMSS-095-24
// (actualización 2024) "Evaluación y tratamiento nutricional del
// adulto mayor en el primer nivel de atención", Catálogo Maestro
// de GPC / CENETEC. Sección "Detección", recomendación clave
// (grado PBP - Punto de Buena Práctica), Algoritmo 1:
// "Se recomienda evaluar el estado nutricional de adultos
// mayores de 60 años con IMC y los siguientes puntos de corte:
// Normal: 18.5–27.9 kg/m², Sobrepeso: 28.0–31.9 kg/m²,
// Obesidad: ≥32.0 kg/m²." (Desnutrición ≤18.4, según el mismo
// algoritmo). Reemplaza la tabla usada antes (Definiciones
// Operativas de la versión 2010 de esta misma guía, 22–24) por
// ser la actualización vigente más reciente del catálogo oficial.
FormulaIMC.zonasGeriatricas = [
  { hasta: 18.5, nombre: 'Desnutrición', rango: '< 18.5', color: FormulaIMC.PALETA.AZUL },
  { hasta: 28.0, nombre: 'Normal', rango: '18.5 – 27.9', color: FormulaIMC.PALETA.VERDE },
  { hasta: 32.0, nombre: 'Sobrepeso', rango: '28.0 – 31.9', color: FormulaIMC.PALETA.ROJO },
  { hasta: Infinity, nombre: 'Obesidad', rango: '≥ 32.0', color: FormulaIMC.PALETA.ROJO },
];

// Tabla de puntos de corte de IMC-para-la-edad de la OMS (2 a 19 años).
// Cada fila: [-2DE, +1DE, +2DE, +3DE], separado por sexo.
// Fuente: WHO Child Growth Standards 2006 (2-5 años) y
// WHO Growth Reference 2007 (5-19 años).
FormulaIMC.tablaPediatrica = {
  2:  { niñas: [13.3, 17.1, 18.7, 20.6], niños: [13.8, 17.3, 18.9, 20.6] },
  3:  { niñas: [13.1, 16.8, 18.4, 20.3], niños: [13.4, 16.9, 18.4, 20.0] },
  4:  { niñas: [12.8, 16.8, 18.5, 20.6], niños: [13.1, 16.7, 18.2, 19.9] },
  5:  { niñas: [12.7, 16.9, 18.9, 21.3], niños: [13.0, 16.6, 18.3, 20.2] },
  6:  { niñas: [12.7, 17.0, 19.2, 22.1], niños: [13.0, 16.8, 18.5, 20.7] },
  7:  { niñas: [12.7, 17.3, 19.8, 23.3], niños: [13.1, 17.0, 19.0, 21.6] },
  8:  { niñas: [12.9, 17.7, 20.6, 24.8], niños: [13.3, 17.4, 19.7, 22.8] },
  9:  { niñas: [13.1, 18.3, 21.5, 26.5], niños: [13.5, 17.9, 20.5, 24.3] },
  10: { niñas: [13.5, 19.0, 22.6, 28.4], niños: [13.7, 18.5, 21.4, 26.1] },
  11: { niñas: [13.9, 19.9, 23.7, 30.2], niños: [14.1, 19.2, 22.5, 28.0] },
  12: { niñas: [14.4, 20.8, 25.0, 31.9], niños: [14.5, 19.9, 23.6, 30.0] },
  13: { niñas: [14.9, 21.8, 26.2, 33.4], niños: [14.9, 20.8, 24.8, 31.7] },
  14: { niñas: [15.4, 22.7, 27.3, 34.7], niños: [15.5, 21.8, 25.9, 33.1] },
  15: { niñas: [15.9, 23.5, 28.2, 35.5], niños: [16.0, 22.7, 27.0, 34.1] },
  16: { niñas: [16.2, 24.1, 28.9, 36.1], niños: [16.5, 23.5, 27.9, 34.8] },
  17: { niñas: [16.4, 24.5, 29.3, 36.3], niños: [16.9, 24.3, 28.6, 35.2] },
  18: { niñas: [16.4, 24.8, 29.5, 36.3], niños: [17.3, 24.9, 29.2, 35.4] },
  19: { niñas: [16.5, 25.0, 29.7, 36.2], niños: [17.6, 25.4, 29.7, 35.5] },
};

// ---------------------------------------------------------
// TFG — tasa de filtración glomerular estimada (eGFR), adultos
// (≥ 18 años). Requiere creatinina sérica en mg/dL, edad y sexo.
//
// Fuente: ecuación CKD-EPI 2021 (sin coeficiente de raza),
// desarrollada por Chronic Kidney Disease Epidemiology
// Collaboration, publicada en Inker LA et al., N Engl J Med
// 2021. Es la ecuación recomendada actualmente por KDIGO y la
// National Kidney Foundation para estimar la función renal en
// adultos, y reemplazó a la versión anterior (2009) que sí
// usaba raza como variable.
//
// eGFR = 142 × min(Scr/K, 1)^α × max(Scr/K, 1)^-1.200 × 0.9938^edad × 1.012 (si mujer)
// K = 0.7 (mujer) / 0.9 (hombre)
// α = -0.241 (mujer) / -0.302 (hombre)
// Scr = creatinina sérica en mg/dL
// Resultado en mL/min/1.73m²
//
// Clasificación de estadios: KDIGO 2024 (categorías G1 a G5).
// ---------------------------------------------------------
class FormulaTFG {
  calcular({ creatinina, edad, sexo }) {
    const K = sexo === 2 ? 0.7 : 0.9;
    const alpha = sexo === 2 ? -0.241 : -0.302;
    const ratio = creatinina / K;
    const parteMin = Math.pow(Math.min(ratio, 1), alpha);
    const parteMax = Math.pow(Math.max(ratio, 1), -1.2);
    let tfg = 142 * parteMin * parteMax * Math.pow(0.9938, edad);
    if (sexo === 2) tfg *= 1.012;
    return tfg;
  }

  categoria(tfg) {
    const zonas = FormulaTFG.zonas;
    return zonas.find((zona) => tfg < zona.hasta) || zonas[zonas.length - 1];
  }
}

FormulaTFG.zonas = [
  { hasta: 15, nombre: 'G5 — Insuficiencia renal', rango: '< 15', color: '#c9634a' },
  { hasta: 30, nombre: 'G4 — Gravemente disminuida', rango: '15 – 29', color: '#c9634a' },
  { hasta: 45, nombre: 'G3b — Moderada a gravemente disminuida', rango: '30 – 44', color: '#d4914a' },
  { hasta: 60, nombre: 'G3a — Leve a moderadamente disminuida', rango: '45 – 59', color: '#d4914a' },
  { hasta: 90, nombre: 'G2 — Levemente disminuida', rango: '60 – 89', color: '#4a9b6e' },
  { hasta: Infinity, nombre: 'G1 — Normal o alta', rango: '≥ 90', color: '#4a9b6e' },
];
