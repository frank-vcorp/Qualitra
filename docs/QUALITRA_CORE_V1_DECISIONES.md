# QUALITRA CORE V1 — Registro de decisiones

**Plan base:** V1.1 congelado  
**Fecha de apertura:** 2 de septiembre de 2026

Este archivo registra exclusivamente decisiones funcionales autorizadas después del congelamiento del plan maestro.

No debe utilizarse para:

- notas técnicas;
- tareas;
- errores;
- progreso diario;
- decisiones internas que no cambien el comportamiento funcional.

## Formato

### DEC-XXX — Título

- **Fecha:**
- **Estado:** PROPUESTA / APROBADA / RECHAZADA / SUSTITUIDA
- **Módulo afectado:**
- **Contexto:**
- **Decisión:**
- **Consecuencias funcionales:**
- **Autorizada por:**

## Decisiones registradas

### DEC-001 — Dos capas: motor (código) vs constructor visual (empresa)

- **Fecha:** 12 de septiembre de 2026
- **Estado:** APROBADA
- **Módulo afectado:** M02, M03, M04 y subsiguientes
- **Contexto:** El plan V1.1 mezclaba “motor de calidad” con “administrador arma todo sin código”. Frank aclara que no debe reconstruirse el motor en cada proyecto ni picarse piedra en UI para entregas Vectoria; pero sí se necesita UI visual para usuarios no técnicos de la empresa cliente.
- **Decisión:** Qualitra se construye en **dos capas separadas**:

  **Capa 1 — Motor de formularios (plataforma base)**  
  Construida por desarrollo/agente en código. Es el runtime estandarizado, reusable en Coolify para cualquier empresa. Incluye: persistencia de tipos y registros, validaciones, cálculos, catálogos, relaciones, permisos, auditoría, versiones, APIs e infra compartida. **No se reimplementa por proyecto.** Las entregas Vectoria configuran el motor vía código/schemas en repo, no armando el motor a mano en pantalla.

  **Capa 2 — Constructor visual (formularios y relaciones)**  
  Interfaz para usuarios **no técnicos del cliente** que crean formularios (arrastrar campos, nombre, tipo) y **relaciones** entre entidades, sin código.

- **Consecuencias funcionales:**
  - M02/M03 actuales avanzan la **Capa 2** (prototipo); falta drag-and-drop, relaciones visuales y pulido.
  - La **Capa 1** debe soportar M04+ (captura, relaciones persistentes, auditoría).

- **Autorizada por:** Frank (`continua` + aclaración del 12-sep-2026)

### DEC-002 — Modelo de entrega: provisión, branding y dos caminos de implementación

- **Fecha:** 12 de septiembre de 2026
- **Estado:** APROBADA
- **Módulo afectado:** M00 (empresa/branding), M02–M05, provisioning
- **Contexto:** Aclaración de Frank sobre cómo se vende y entrega Qualitra (ej. cumplimiento ISO 14000), distinto a “Vectoria siempre configura en código” vs “cliente siempre en UI”.
- **Decisión:**

  **A) Modos de despliegue (mismo producto, distinta comercialización):**

  1. **Self-hosted dedicado** — Cliente contrata (ej. ISO 14000). Vectoria provisiona en servidor X. Branding (logo, colores, datos de empresa) se configura por **UI** (Vectoria hace el servicio de puesta en marcha).
  2. **Multitenancy (SaaS)** — Cliente contrata en internet; se **provisiona al instante** en instancia multitenant. El **mismo cliente** personaliza logo, información y colores por **UI** (self-service de tenant).

  **B) Después de la provisión y branding — implementación de formularios y relaciones (elección del cliente):**

  1. **Contrata a Vectoria** — Vectoria captura/implementa todos sus formularios y relaciones (servicio profesional; agente/código eficiente, no el cliente armando a mano).
  2. **Lo hace solo** — El cliente usa el **constructor visual** de formularios **y relaciones** por sus propios medios.

  Las dos vías conviven sobre el **mismo motor**; no son productos distintos.

- **Consecuencias funcionales:**
  - M00 (config empresa, logo) es crítico para **ambos** modos de despliegue.
  - Se necesita flujo de **provisioning** (dedicado y multitenant) además del runtime.
  - El constructor visual incluye **relaciones**, no sólo formularios (M05 integrado en experiencia de Capa 2).
  - Vectoria no está obligada a implementar en UI lo que vende como servicio de implementación; el agente/código es la vía eficiente para ese servicio opcional.

- **Autorizada por:** Frank (12-sep-2026)

### DEC-003 — Alcance comercial: multitenant fuera del plan V1.1

- **Fecha:** 12 de septiembre de 2026
- **Estado:** APROBADA (sustituye §17 plan V1.1 en este punto)
- **Módulo afectado:** Provisioning, comercialización
- **Contexto:** El plan congelado §17 excluye explícitamente «modelo SaaS multiempresa compartido». Frank confirma que **sí** es un modo de entrega deseado (contratación en internet, provisión instantánea).
- **Decisión:** El **multitenant compartido** pasa a ser un **modo de despliegue objetivo** de Qualitra (junto al self-hosted dedicado), a implementar cuando corresponda; no invalida el Core single-tenant actual.
- **Consecuencias funcionales:** Se requiere módulo/flujo de provisioning multitenant además del dedicado (Coolify). M00 branding por UI aplica a ambos.
- **No bloqueante:** El multitenant es un **modo de entrega adicional**, no prerrequisito. Cada empresa puede seguir teniendo **instancia self-hosted dedicada** (servidor X, una BD, un despliegue Coolify) sin compartir datos con otros clientes. Mismo código, distinto `deploy`: dedicado ahora; SaaS cuando exista.
- **Autorizada por:** Frank (12-sep-2026)

---

## Auditoría: plan V1.1 vs intención real (12-sep-2026)

| Tema | Plan V1.1 congelado | Intención Frank (DEC-001/002/003) | Lo construido hoy |
| --- | --- | --- | --- |
| **Producto** | Motor general de calidad, modular M00–M13 | Igual: motor reusable + constructor visual | Motor parcial M00–M03 |
| **Quién configura formularios** | Administrador cliente, todo visual (§11.1), «sin código» (M02) | **Dos caminos:** Vectoria (servicio/código) **o** cliente (constructor visual) | Solo UI tipo admin; sin drag-and-drop ni relaciones visuales |
| **Provisioning** | M00 setup propietario inicial; no describe venta ISO ni servidores | Self-hosted en servidor X **o** SaaS multitenant instantáneo | Coolify dedicado staging; sin multitenant ni flujo comercial |
| **Branding** | M00 logo, empresa, idioma, moneda | Logo, colores, datos empresa por **UI** en ambos modos | M00 ✓ (logo, empresa) — **colores aún no** |
| **Multitenant SaaS** | **Fuera de alcance** (§17) | **Dentro** (DEC-003) | No existe |
| **Relaciones** | M05, visual para admin (§11.1) | Constructor visual **incluye relaciones** | No construido |
| **Captura persistente** | M04 | Imprescindible para valor | No construido |
| **Normas (ISO 14000…)** | Paquetes sectoriales **fuera** de Core V1 (§17) | Cliente contrata plataforma **para** cumplimiento; paquetes pueden ser config/servicio Vectoria | Demo genérico proveedor/evaluación |
| **Implementador** | Export/import entre instalaciones (M12, herramientas M01) | Vectoria implementa por código cuando contratan servicio | Export M02 parcial ✓ |

**Malentendido de origen:** El plan mezclaba «motor reusable» con «todo el admin lo hace a mano en UI» y no distinguía **provisión comercial**, **branding**, **servicio Vectoria** y **self-service del cliente**. DEC-001/002/003 corrigen eso.

---

## Casos de uso (referencia funcional)

### CU-01 — Cliente ISO 14000 self-hosted + implementación Vectoria

**Actor:** Empresa «EcoManufactura» contrata Qualitra a Vectoria para ISO 14000.

1. Vectoria provisiona instancia dedicada en servidor X (Coolify).
2. Vectoria entra como propietario/implementador: configura logo, colores, nombre, zona horaria (UI M00 ampliada).
3. EcoManufactura **contrata servicio de implementación**: Vectoria (agente/código) define tipos, formularios, relaciones (aspectos ambientales, no conformidades, auditorías…).
4. Vectoria publica formularios; capacita usuarios (M01).
5. Operadores de EcoManufactura **capturan** registros (M04), consultan y auditan — **sin tocar código**.
6. Cambios futuros de estructura: Vectoria por contrato o admin cliente en constructor visual si se habilita.

**Resultado:** Plataforma dedicada, marca del cliente, contenido implementado por Vectoria.

---

### CU-02 — Cliente self-hosted + autoservicio (constructor visual)

**Actor:** Empresa «Alimentos del Norte» contrata instancia dedicada; **no** contrata implementación.

1. Vectoria provisiona servidor dedicado y deja propietario inicial + branding (UI).
2. Administrador de Alimentos del Norte usa **constructor visual**: crea tipos, formularios (arrastrar campos), **relaciones** (proveedor → evaluación).
3. Publica formularios; usuarios capturan y consultan registros.
4. Vectoria no interviene en contenido salvo soporte.

**Resultado:** Mismo motor; el cliente es dueño de su modelado funcional.

---

### CU-03 — Alta SaaS multitenant + personalización inmediata

**Actor:** PYME «Consultores Verdes» se registra en web Vectoria.

1. Sistema **provisiona tenant al instante** (multitenant).
2. Propietario entra, completa branding (logo, colores, razón social) por UI.
3. Elige: plantilla vacía **o** paquete inicial (futuro M12); o contrata implementación Vectoria (CU-01).
4. Si autoservicio: arma formularios y relaciones en constructor visual (CU-02).
5. Usuarios del tenant operan en aislamiento de datos respecto a otros clientes.

**Resultado:** Mismo producto que CU-01/02; comercialización y aislamiento multitenant.

**Nota:** CU-03 requiere trabajo no presente en Core V1.1 original (DEC-003).

### DEC-004 — Identidad de producto: «Webform orientado a calidad y cumplimiento»

- **Fecha:** 14 de septiembre de 2026
- **Estado:** APROBADA
- **Módulo afectado:** Visión global del Core V1
- **Contexto:** La construcción M02/M03 y la discusión motor vs UI generaron confusión. Frank define la referencia funcional única del producto.
- **Decisión:** **Qualitra es «Drupal Webform orientado a calidad y cumplimiento».**

  No significa usar Drupal ni clonar su código. Significa:

  | Referencia (Webform/Drupal) | Qualitra (calidad y cumplimiento) |
  | --- | --- |
  | Formularios dinámicos, campos, condiciones | Igual — núcleo del producto |
  | Envíos / submissions | Registros auditables con estado (borrador, finalizado) |
  | Permisos Drupal | RBAC calidad (capturista, supervisor, admin…) |
  | Content types genéricos | Tipos orientados a SGCalidad (proveedor, NC, auditoría…) |
  | — | Relaciones entre registros (proveedor ↔ evaluaciones) |
  | — | Trazabilidad, folios, versiones de formulario y registro |
  | — | Paquetes/implementación para ISO 14000, 9001, etc. (futuro) |
  | — | Self-hosted por empresa y, opcionalmente, SaaS multitenant |

  **Lo que NO es Qualitra:** un motor abstracto de «estructuras» desconectado de captura; un experimento de schemas JSON; reinventar Webform sin submissions ni uso real.

  **Prioridad de construcción:** flujo Webform-like completo primero (definir formulario → publicar → **capturar** → consultar), luego capas de cumplimiento (relaciones, listados, automatizaciones).

- **Consecuencias funcionales:**
  - M04 (captura/consulta) pasa a ser el centro del producto, no un módulo tardío.
  - M02/M03 se reinterpretan como el equivalente a Webform UI + tipos de campo, no como producto separado «estructuras vs formularios».
  - La implementación Vectoria por código es transporte de configuración Webform-like, no sustituto del runtime.
  - Evaluar simplificar UX: menos jerga «tipo de registro / catálogo / versión de schema», más «formulario / campo / envío».

- **Autorizada por:** Frank (14-sep-2026)
