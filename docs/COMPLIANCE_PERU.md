# REGISTRO TÉCNICO-REGULATORIO DEL MVP PERÚ (V1.0)
**Proyecto:** SaaS de Nómina Localizada y Control de Asistencia  
**Jurisdicción:** Perú  
**Fecha de corte:** 29 de agosto de 2026  
**Propósito:** Trazabilidad estricta de fuentes oficiales, normas vigentes, supuestos técnicos y matriz de claims permitidos vs. prohibidos.

---

## 1. MATRIZ DE FUENTES OFICIALES Y ESTADO DE VERIFICACIÓN

| Dominio | Afirmación Segura / Hecho Normativo | Fuente Oficial | Estado de Verificación | Prueba / Brecha Pendiente (P0) |
| :--- | :--- | :--- | :---: | :--- |
| **PDT-PLAME** | Segundo componente de la Planilla Electrónica. Incluye ingresos, descuentos, días laborados/no laborados, horas ordinarias y sobretiempo. Se elabora obligatoriamente a partir del **T-Registro**. | [SUNAT — Concepto PDT-PLAME](https://orientacion.sunat.gob.pe/pdt-plame) | **Verificado** | Obtener y probar manualmente los layouts de importación y validar contra validador oficial. |
| **Versión PLAME** | La versión 4.5 figura como la vigente para el período septiembre 2025 en adelante en la documentación oficial de SUNAT. | [SUNAT — Concepto PDT-PLAME](https://orientacion.sunat.gob.pe/pdt-plame) | **Verificado** | Monitorear actualizaciones de versión antes de cada release. |
| **Estructuras (.rem, .jor, .snl, .per)** | Mencionadas en prácticas de software como archivos de importación masiva. | Documentación técnica / Manuales de importación SUNAT | **No verificado formalmente** | Confirmar catálogo exacto de campos, tipos de datos, orden, delimitadores y codificación (ASCII/UTF-8). |
| **AFPnet** | Plataforma oficial de recaudación previsional. Prepara planillas de aportes para las 4 AFPs a partir de archivo de carga masiva. | [Manual Empleador AFPnet](https://www.afpnet.com.pe/files/ManualUsuarioEmpleador.pdf) y [Modelo de Archivo de Aportes](https://www.afpnet.com.pe/files/planilla_nuevo_formato_ejemplo.xlsx) | **Parcialmente verificado** | Probar estructura de carga en cuenta de prueba autorizada y definir manejo de errores. |
| **Registro de Asistencia** | El MTPE emite lineamientos y obligaciones sobre el registro de jornada, refrigerio y conservación de registros. | [MTPE — Guía de Registro de Asistencia (07/08/2024)](https://www.gob.pe/institucion/mtpe/informes-publicaciones/5851774-registro-de-asistencia) | **Verificado** | Convertir la guía en matriz de evidencia laboral auditable por especialista. |
| **"Metadatos SUNAFIL"** | No existe un layout técnico oficial de metadatos GPS dictado por SUNAFIL. | Guía MTPE y normatividad laboral general | **No demostrado / Falsado** | Tratar el GPS como evidencia operacional interna, no como estándar obligatorio estatal. |
| **GPS por Evento** | Captura de coordenadas exclusivamente en el instante del check-in/out. | Diseño de producto / Scope Lock v1.1 | **Hipótesis de producto** | Diseñar política de minimización, avisos claros al trabajador y flujo de excepciones. |
| **Mock Location** | Android provee `Location.isMock()` como señal técnica de ubicación simulada. | [Android Developers Location API](https://developer.android.com/reference/android/location/Location) | **Verificado técnicamente** | Tratar `isMock()` como bandera de excepción para revisión humana; nunca como sanción automática. |
| **Protección de Datos** | La geolocalización y datos laborales están sujetos a principios de finalidad, proporcionalidad, seguridad y consentimiento/información. | [Reglamento Ley N.° 29733 — D.S. 016-2024-JUS](https://www.smv.gob.pe/ConsultasP8/temp/Reglamento%20de%20la%20Ley%20de%20Datos%20Personales.pdf) | **Marco identificado** | Redactar Política de Privacidad y Cláusula Informativa Laboral antes de activar pilotos. |

---

## 2. GOBERNANZA DE CLAIMS COMERCIALES (PERMITIDOS VS. PROHIBIDOS)

Para proteger la integridad legal y evitar objeciones de desconfianza, rige la siguiente matriz de comunicación:

```
===================================================================================================
MATRIZ DE COMUNICACIÓN Y CLAIMS COMERCIALES
===================================================================================================
```

| 🛑 CLAIMS ESTRICTAMENTE PROHIBIDOS (SIN EVIDENCIA) | 🟢 CLAIMS PERMITIDOS Y DEFENDIBLES |
| :--- | :--- |
| ❌ *"El primer sistema de nómina y asistencia para distribuidoras en Perú"* (Afirmación de liderazgo no probada). | ✅ *"Estamos validando una herramienta peruana para registrar asistencia por evento en ruta y almacén, revisar incidencias y preparar información de nómina para que el contador la valide."* |
| ❌ *"Genera automáticamente tu declaración de PLAME y AFPnet ante SUNAT"* (Falsa promesa de presentación directa). | ✅ *"Prepara archivos de exportación revisables compatibles con el flujo del PDT-PLAME y AFPnet para validación del contador."* |
| ❌ *"Software 100% certificado por SUNAFIL"* (SUNAFIL no certifica software privado). | ✅ *"Diseñado bajo los lineamientos oficiales de la Guía de Registro de Asistencia del MTPE (2024)."* |
| ❌ *"Tecnología GPS 100% anti-fraude que elimina el engaño de choferes"* (Técnicamente imposible de garantizar). | ✅ *"Detección de señales de ubicación simulada y registro por evento para auditoría y aprobación de horas extras."* |
| ❌ *"Cumple automáticamente la Ley de Protección de Datos"* (El software no exime de las obligaciones del empleador). | ✅ *"Desarrollado bajo el principio de minimización de datos del D.S. 016-2024-JUS (sin rastreo continuo 24/7)."* |

---

## 3. GAPS TÉCNICOS P0 (PRIORIDAD CERO)

Antes de autorizar la programación del motor de nómina (Gate 1):
1. **Layouts Oficiales SUNAT:** Confirmar la especificación de campos de importación de la versión 4.5 del PDT-PLAME.
2. **Formato AFPnet:** Descargar y mapear el Excel oficial de aportes previsionales.
3. **Auditoría de Reglas Laborales:** Obtener la revisión y visto bueno de un contador o abogado laboralista peruano sobre el catálogo de conceptos mínimos (MYPE/General).
4. **Política Informativa de Privacidad:** Redactar el texto de consentimiento y aviso de privacidad para choferes bajo el D.S. 016-2024-JUS.
