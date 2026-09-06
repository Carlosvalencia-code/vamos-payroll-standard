/**
 * Official SUNAT Catalogs for PDT-PLAME (Version 4.5)
 * Source: SUNAT - Tablas Paramétricas del PDT-PLAME (R.S. 204-2025/SUNAT)
 */

export const SUNAT_DOC_TYPES = {
  DNI: '01',
  CARNET_EXTRANJERIA: '04',
  PASAPORTE: '07',
} as const;

export type SunatDocTypeCode = typeof SUNAT_DOC_TYPES[keyof typeof SUNAT_DOC_TYPES];

export const SUNAT_SUSPENSION_TYPES = {
  SANCIÓN_DISCIPLINARIA: '01',
  LICENCIA_SIN_GOCE: '05',
  FALTA_INJUSTIFICADA: '07',
  INCAPACIDAD_TEMPORAL_SUBSIDIADA: '21',
  MATERNIDAD_SUBSIDIADA: '22',
  DESCANSO_MEDICO_EMPLEADOR: '23',
} as const;

export type SunatSuspensionTypeCode = typeof SUNAT_SUSPENSION_TYPES[keyof typeof SUNAT_SUSPENSION_TYPES];

export const SUNAT_CONCEPT_CODES = {
  // Ingresos (0100 - 0500)
  HORAS_EXTRAS_25: '0105',
  HORAS_EXTRAS_35: '0106',
  SOBRETASA_NOCTURNA: '0107',
  REMUNERACION_BASICA: '0121',
  ASIGNACION_FAMILIAR: '0201',
  
  // Descuentos (0700)
  DESCUENTO_TARDANZAS_ADELANTOS: '0701',
  DESCUENTO_FALTAS_INJUSTIFICADAS: '0706',

  // Tributos y Aportes del Trabajador (0600)
  COMISION_AFP: '0601',
  RENTA_5TA_CATEGORIA: '0605',
  PRIMA_SEGURO_AFP: '0606',
  ONP_SNP: '0607',
  FONDO_PENSIONES_AFP: '0608',

  // Aportes del Empleador (0800)
  ESSALUD_REGULAR: '0804',
} as const;

export type SunatConceptCode = typeof SUNAT_CONCEPT_CODES[keyof typeof SUNAT_CONCEPT_CODES];
