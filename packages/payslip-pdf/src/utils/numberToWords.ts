/**
 * Utility for converting numeric currency values into official Peruvian Spanish legal text
 * Example: 1823.92 -> "SON: UN MIL OCHOCIENTOS VEINTITRÉS CON 92/100 SOLES"
 */

const UNIDADES = [
  '',
  'UN',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
];

const DECENAS_ESPECIALES: Record<number, string> = {
  10: 'DIEZ',
  11: 'ONCE',
  12: 'DOCE',
  13: 'TRECE',
  14: 'CATORCE',
  15: 'QUINCE',
  16: 'DIECISÉIS',
  17: 'DIECISIETE',
  18: 'DIECIOCHO',
  19: 'DIECINUEVE',
  20: 'VEINTE',
  21: 'VEINTIÚN',
  22: 'VEINTIDÓS',
  23: 'VEINTITRÉS',
  24: 'VEINTICUATRO',
  25: 'VEINTICINCO',
  26: 'VEINTISÉIS',
  27: 'VEINTISIETE',
  28: 'VEINTIOCHO',
  29: 'VEINTINUEVE',
};

const DECENAS = [
  '',
  'DIEZ',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertirCentenas(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'CIEN';

  const c = Math.floor(num / 100);
  const resto = num % 100;

  let texto = CENTENAS[c];

  if (resto > 0) {
    if (texto !== '') texto += ' ';

    if (resto in DECENAS_ESPECIALES) {
      texto += DECENAS_ESPECIALES[resto];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d > 0) {
        texto += DECENAS[d];
        if (u > 0) {
          texto += ' Y ' + UNIDADES[u];
        }
      } else if (u > 0) {
        texto += UNIDADES[u];
      }
    }
  }

  return texto.trim();
}

export function convertirNumeroALetrasSoles(monto: number): string {
  if (monto < 0) {
    return 'CERO CON 00/100 SOLES';
  }

  const parteEntera = Math.floor(monto);
  const centimos = Math.round((monto - parteEntera) * 100);
  const centimosTexto = String(centimos).padStart(2, '0') + '/100 SOLES';

  if (parteEntera === 0) {
    return `SON: CERO CON ${centimosTexto}`;
  }

  let textoEntero = '';

  const miles = Math.floor(parteEntera / 1000);
  const unidades = parteEntera % 1000;

  if (miles > 0) {
    if (miles === 1) {
      textoEntero = 'UN MIL';
    } else {
      textoEntero = `${convertirCentenas(miles)} MIL`;
    }
  }

  if (unidades > 0) {
    const textoUnidades = convertirCentenas(unidades);
    if (textoEntero !== '') {
      textoEntero += ' ' + textoUnidades;
    } else {
      textoEntero = textoUnidades;
    }
  }

  return `SON: ${textoEntero} CON ${centimosTexto}`;
}
