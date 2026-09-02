---
document_id: QUALITRA-CORE-V1-FUNCIONAL
title: Qualitra Core V1 — Plan funcional maestro
version: "1.1"
status: frozen
date: "2026-09-02"
language: es-MX
owner: frank-vcorp
repository: https://github.com/frank-vcorp/Qualitra
target_agent: Cursor
deployment_target: Coolify
document_type: functional-specification
---

# QUALITRA CORE V1

## Plan funcional maestro V1.1 para construcción modular en Cursor

**Estado:** CONGELADO — VERSIÓN FINAL PARA CONSTRUCCIÓN  
**Versión:** 1.1  
**Fecha:** 2 de septiembre de 2026  
**Tipo de documento:** Especificación funcional orientada a resultados  
**Infraestructura objetivo del piloto:** Servidor propio administrado mediante Coolify  
**Propósito:** Servir como plano funcional maestro para construir Qualitra Core V1 módulo por módulo, con autonomía técnica de Cursor y validación humana expresa antes de avanzar.

---

# 0. Control del documento

Este archivo es el documento funcional maestro de Qualitra Core V1.

Una vez iniciada la construcción:

- no debe modificarse para registrar avances cotidianos;
- no debe utilizarse como bitácora;
- no debe cambiarse silenciosamente;
- cualquier cambio funcional debe quedar documentado y autorizado;
- el estado de los módulos debe mantenerse en un archivo independiente;
- las decisiones nuevas deben mantenerse en un registro independiente.

Cursor deberá leer y mantener:

~~~text
docs/QUALITRA_CORE_V1_ESTADO.md
docs/QUALITRA_CORE_V1_DECISIONES.md
~~~

Este documento define el alcance congelado.

El archivo de estado indicará:

- módulo actual;
- módulos aprobados;
- módulos bloqueados;
- validaciones realizadas;
- regresiones detectadas;
- pendientes de validación humana.

El registro de decisiones contendrá únicamente decisiones funcionales posteriores que hayan sido aprobadas expresamente.

Si una decisión nueva contradice este documento, Cursor debe detenerse y pedir autorización antes de aplicarla.

---

# 1. Cómo debe interpretar Cursor este documento

Este documento define:

- qué debe poder hacer Qualitra;
- qué resultado funcional se espera;
- qué reglas de negocio deben cumplirse;
- qué debe poder comprobar una persona;
- qué pertenece y qué no pertenece a Core V1.

Este documento no prescribe cómo debe programarse internamente.

Cursor tiene libertad para:

- elegir la arquitectura y tecnologías adecuadas;
- crear estructuras, componentes, servicios y procesos internos;
- resolver dependencias técnicas;
- implementar mecanismos auxiliares;
- crear pruebas automatizadas;
- crear migraciones;
- establecer mecanismos de seguridad;
- preparar fundamentos internos necesarios para módulos posteriores;
- completar detalles técnicos indispensables para que el resultado sea sólido;
- mejorar la implementación cuando detecte una necesidad técnica no descrita.

Cursor puede construir fundamentos técnicos internos para módulos futuros cuando sean necesarios.

Esto no significa que pueda:

- exponer funciones de módulos todavía bloqueados;
- declarar como terminadas funciones futuras;
- cambiar el comportamiento funcional;
- añadir alcance comercial no autorizado;
- sustituir una capacidad solicitada por una simulación;
- modificar reglas aprobadas;
- declarar un módulo aprobado por sí mismo.

La regla central es:

> El plan define el resultado. Cursor descubre cómo construirlo. El humano determina si realmente funciona.

Cuando exista una ambigüedad que pueda modificar el comportamiento observable, los datos históricos, la seguridad o el alcance, Cursor debe detenerse y solicitar una decisión.

Cuando la ambigüedad sea exclusivamente técnica y no altere el resultado funcional, Cursor debe resolverla autónomamente.

---

# 2. Construcción modular obligatoria

Qualitra Core V1 se construirá de manera secuencial.

Flujo:

1. Cursor lee este plan completo.
2. Cursor revisa el estado actual del proyecto.
3. El humano autoriza un único módulo.
4. Cursor construye únicamente las funciones visibles de ese módulo.
5. Cursor completa los fundamentos técnicos necesarios.
6. Cursor ejecuta pruebas internas.
7. Cursor corrige los problemas detectados.
8. Cursor ejecuta regresión de los módulos anteriormente aprobados.
9. Cursor entrega el módulo como:

~~~text
LISTO PARA VALIDACIÓN HUMANA
~~~

10. Cursor indica los pasos exactos para probarlo.
11. El humano utiliza la interfaz real.
12. El humano emite:

~~~text
APROBADO MXX
~~~

o:

~~~text
RECHAZADO MXX
~~~

13. Si se rechaza, Cursor continúa trabajando exclusivamente en ese módulo.
14. Sólo con aprobación humana se desbloquea el siguiente.

## Regla de regresión

Un módulo no puede aprobarse si rompe una función perteneciente a un módulo anterior.

Antes de entregar cada módulo, Cursor debe comprobar:

- el módulo nuevo;
- los recorridos críticos de los módulos aprobados;
- persistencia de datos;
- permisos;
- navegación;
- migraciones;
- compatibilidad con información existente.

Si un módulo nuevo rompe uno anterior:

- el módulo nuevo queda rechazado;
- Cursor debe corregir la regresión;
- no se desbloquea el siguiente.

## Subentregas internas

Los módulos de mayor tamaño pueden dividirse en subentregas internas.

Especialmente:

~~~text
M02  Tipos de registro, campos, catálogos y cálculos
M03  Constructor de formularios
M10  Automatizaciones, aprobaciones y comunicaciones
M12  Conexión universal, importación y paquetes
~~~

Las subentregas sirven para controlar el trabajo, pero no sustituyen la aprobación completa del módulo.

---

# 3. Qué significa verificable por un humano

Cada requisito debe poder demostrarse mediante una acción real dentro del producto.

No basta con afirmar:

~~~text
El sistema soporta relaciones.
~~~

Debe poder demostrarse:

~~~text
Crear un proveedor.
Crear dos evaluaciones.
Relacionarlas con el proveedor.
Abrir el proveedor.
Comprobar que aparecen ambas evaluaciones.
Navegar desde el proveedor hasta cada evaluación.
~~~

No basta con afirmar:

~~~text
Los formularios son dinámicos.
~~~

Debe poder demostrarse:

~~~text
Crear un formulario desde Qualitra.
Añadir un campo.
Publicarlo.
Usarlo sin modificar código.
~~~

Cada módulo debe terminar con:

- un resultado visible;
- una acción funcional;
- datos de prueba;
- un caso real;
- una prueba humana reproducible;
- evidencia de pruebas internas;
- una prueba de regresión.

Las funciones que sólo pueden demostrarse inspeccionando código no se consideran funcionalmente terminadas.

---

# 4. Glosario funcional obligatorio

## Tipo de registro

Define la estructura persistente de una clase de información.

Ejemplos:

~~~text
Proveedor
Evaluación de proveedor
No conformidad
Equipo
Producto
~~~

El tipo de registro es propietario de:

- campos de datos;
- identificadores estables;
- reglas de validación estructural;
- versiones de su estructura;
- folios cuando correspondan.

## Campo

Elemento de información perteneciente a un tipo de registro.

Cada campo debe tener un identificador interno estable que no cambie al modificar su etiqueta visible.

## Formulario

Interfaz versionada utilizada para capturar o editar registros de un tipo determinado.

Un formulario pertenece a un único tipo de registro.

Un tipo de registro puede disponer de varios formularios.

Ejemplo:

~~~text
Tipo:
Proveedor

Formularios:
- Alta de proveedor
- Edición administrativa
- Evaluación rápida
~~~

## Elemento de presentación

Elemento visible que ayuda a organizar un formulario, pero no representa por sí mismo un dato persistente.

Ejemplos:

- encabezado;
- sección;
- texto informativo;
- instrucciones;
- divisor;
- presentación calculada.

## Versión publicada

Configuración inmutable que fue puesta en uso.

Modificar una configuración publicada debe crear una nueva versión y nunca alterar silenciosamente la anterior.

## Registro

Instancia real creada a partir de un tipo y una versión de formulario.

## Borrador

Registro todavía incompleto o no finalizado.

Puede ignorar temporalmente validaciones que sólo son obligatorias al finalizar.

## Estado técnico

Estado general relacionado con la conservación del registro:

~~~text
BORRADOR
FINALIZADO
ARCHIVADO
~~~

## Estado de negocio

Estado configurable perteneciente a un proceso:

~~~text
ENVIADO
EN REVISIÓN
APROBADO
RECHAZADO
~~~

El estado técnico y el estado de negocio no deben confundirse.

## Catálogo

Lista reutilizable y administrable de opciones.

## Relación

Vínculo estructurado entre registros.

## Vista

Configuración guardada para consultar registros, columnas, filtros y orden.

## Automatización

Regla activa que responde a un evento, condición o fecha y ejecuta acciones.

## Paquete de configuración

Conjunto transportable de configuraciones relacionadas.

No debe incluir datos reales ni secretos salvo selección explícita y validada.

## Implementador Qualitra

Nivel especial autorizado para preparar, transportar y aplicar configuraciones profesionales.

No representa una puerta trasera.

---

# 5. Modelo funcional de datos y formularios

## Propiedad de la información

El tipo de registro define qué información puede almacenarse.

El formulario define:

- qué campos aparecen;
- en qué orden;
- con qué etiqueta visible;
- con qué ayudas;
- cuáles son obligatorios en ese formulario;
- qué condiciones de visibilidad existen;
- cómo se organiza la captura;
- cómo se presenta un resultado.

Los encabezados, textos informativos y secciones pertenecen al formulario y no deben crear columnas o datos innecesarios.

## Identificadores estables

Las expresiones, relaciones, integraciones y paquetes deben utilizar identificadores estables.

Cambiar:

~~~text
Razón social
~~~

por:

~~~text
Nombre o razón social
~~~

no debe romper:

- registros;
- cálculos;
- vistas;
- automatizaciones;
- importaciones;
- integraciones.

## Duplicación

Duplicar un formulario crea una copia independiente de:

- distribución;
- reglas visuales;
- condiciones;
- presentación;
- configuración propia.

Por defecto, la copia continúa vinculada al mismo tipo de registro.

Duplicar también el tipo de registro debe ser una acción separada y explícita.

Los catálogos reutilizables permanecen compartidos salvo que el administrador elija duplicarlos.

---

# 6. Versionado e integridad histórica

## Publicación

La configuración debe manejar al menos:

~~~text
BORRADOR DE CONFIGURACIÓN
PUBLICADO
RETIRADO
~~~

Publicar una modificación crea una nueva versión.

La versión anterior debe conservarse.

## Registros nuevos

Los registros nuevos utilizan la versión publicada vigente.

## Registros finalizados

Un registro finalizado conserva:

- versión del tipo;
- versión del formulario;
- valores capturados;
- versión de los cálculos;
- resultados obtenidos;
- clasificación obtenida;
- usuario;
- fecha y hora.

Cambiar posteriormente una regla no debe recalcular silenciosamente registros finalizados.

## Borradores existentes

Un borrador iniciado con una versión conserva esa versión.

Cuando exista una versión nueva:

- el usuario debe poder continuar con la versión original;
- debe poder conocer que existe una versión más reciente;
- la migración debe ser explícita;
- Qualitra debe validar si la migración es compatible;
- nunca debe migrarse silenciosamente.

## Edición de registros históricos

Editar un registro finalizado debe requerir permiso.

La modificación debe:

- generar una nueva revisión;
- conservar valores anteriores;
- registrar quién la realizó;
- registrar el motivo cuando corresponda;
- recalcular sólo bajo reglas claramente identificadas;
- no destruir la versión histórica.

## Campos retirados

Retirar un campo impide utilizarlo en nuevas capturas, pero no elimina los valores históricos.

## Catálogos

Las opciones de catálogo deben tener identificadores estables.

Una opción utilizada históricamente debe poder:

- desactivarse para nuevas capturas;
- seguir apareciendo en registros antiguos;
- conservarse en auditoría.

No debe eliminarse de manera que los registros antiguos pierdan significado.

## Resultados calculados

Los resultados utilizados para:

- aprobación;
- clasificación;
- automatizaciones;
- reportes;
- exportaciones;

deben validarse de manera autoritativa antes de guardar o finalizar.

Una manipulación de la interfaz no debe permitir registrar un resultado falso.

---

# 7. Ciclo de vida, archivo y eliminación

Qualitra debe diferenciar:

- descartar un borrador;
- archivar un registro;
- restaurar un registro archivado;
- eliminar definitivamente información.

## Regla general

Los usuarios normales no deben eliminar definitivamente registros finalizados.

El comportamiento habitual será archivar.

## Borradores descartados

Descartar un borrador debe:

- pedir confirmación;
- evitar eliminación accidental;
- utilizar una papelera o periodo recuperable;
- registrar la acción cuando el borrador ya fue sincronizado.

## Usuarios desactivados

Desactivar un usuario:

- impide nuevos accesos;
- invalida sus sesiones;
- conserva su nombre en registros e historial;
- no elimina sus tareas, decisiones ni evidencias.

## Relaciones

Archivar un registro no debe eliminar en cascada otros registros.

Qualitra debe advertir cuando una acción afecte referencias existentes.

---

# 8. Principio de simplicidad

Qualitra debe poder utilizarse por personas con distintos niveles de experiencia digital.

El caso de referencia es:

> Una persona encargada de limpieza debe poder recibir una tableta, abrir una tarea, llenar un registro, tomar una fotografía y completarlo sin entender cómo está construido Qualitra.

La complejidad administrativa no debe trasladarse al usuario operativo.

## Experiencia operativa

~~~text
MIS TAREAS

Limpieza baño producción
Pendiente

[ ABRIR ]
~~~

Después:

~~~text
LIMPIEZA DE BAÑO

Turno
[ Matutino ]

Lavabo limpio
[ Sí ]

Piso limpio
[ Sí ]

Sanitarios limpios
[ Sí ]

Evidencia
[ TOMAR FOTO ]

Observaciones
[                  ]

[ COMPLETAR ]
~~~

La interfaz debe priorizar:

- claridad;
- pocos pasos;
- botones táctiles;
- lenguaje sencillo;
- información automática;
- mensajes comprensibles;
- confirmaciones claras;
- estados visibles;
- uso cómodo desde tableta;
- contraste y legibilidad adecuados.

---

# 9. Protección contra pérdida de información

Esta sección se vuelve plenamente funcional en M04 y se amplía para archivos en M07.

## Borradores

El usuario debe poder:

- iniciar un registro;
- capturar parcialmente;
- salir;
- volver;
- continuar desde donde quedó;
- identificar que sigue siendo borrador;
- finalizarlo;
- descartarlo con confirmación.

## Autoguardado

Qualitra debe guardar:

- al abandonar un campo relevante;
- antes de navegar a otra sección cuando sea posible;
- tras un máximo aproximado de cinco segundos de inactividad con cambios;
- al solicitar explícitamente guardar.

Debe mostrar:

~~~text
Guardando...
Guardado 16:42
Sin conexión
Cambios pendientes
Error al guardar
~~~

Un mensaje de Guardado sólo debe mostrarse después de confirmar la conservación correspondiente.

## Recuperación

Al recargar o reabrir el formulario en el mismo dispositivo y navegador, Qualitra debe recuperar el último avance disponible.

## Conectividad inestable

Core V1 debe tolerar interrupciones momentáneas durante una captura ya abierta.

Alcance mínimo:

- conservar cambios pendientes en el mismo dispositivo;
- permitir continuar capturando los campos disponibles;
- informar que no existe conexión;
- reintentar al regresar la conectividad;
- sincronizar sin duplicar el registro;
- mostrar si aún existen elementos pendientes.

Core V1 no requiere operación completamente desconectada para:

- iniciar sesión por primera vez;
- navegar por todo el sistema;
- descargar información todavía no disponible localmente.

## Fotografías pendientes

A partir de M07, una fotografía tomada durante una interrupción debe poder quedar pendiente y cargarse al recuperar la conexión, o indicar claramente que todavía no ha sido transferida.

## Edición simultánea

Si dos sesiones modifican el mismo registro:

- ninguna debe sobrescribir silenciosamente a la otra;
- la segunda operación debe detectar el conflicto;
- los cambios locales deben conservarse temporalmente;
- el usuario debe ver un mensaje comprensible;
- debe poder revisar la versión actual antes de decidir.

Ejemplo:

~~~text
Este registro cambió desde que lo abriste.

Tus cambios no se han perdido.

[ VER CAMBIOS ACTUALES ]
[ CONSERVAR MI CAPTURA ]
[ CANCELAR ]
~~~

Qualitra puede resolver técnicamente el conflicto mediante bloqueo, versiones u otro mecanismo, siempre que cumpla el resultado.

---

# 10. Flexibilidad futura

Un administrador debe poder:

- añadir campos;
- cambiar etiquetas;
- crear opciones;
- retirar opciones;
- desactivar campos para nuevas capturas;
- modificar formularios;
- crear nuevas versiones;
- conservar registros históricos;
- crear relaciones;
- crear vistas;
- añadir automatizaciones;
- duplicar configuraciones.

Antes de programar una función específica debe comprobarse si puede resolverse mediante el Core.

La pregunta de validación es:

> ¿Puedo modificar la estructura desde Qualitra y continuar consultando correctamente registros nuevos e históricos?

---

# 11. Administrador del cliente e Implementador Qualitra

## 11.1 Administrador del cliente

Debe utilizar controles visuales normales para:

- crear tipos;
- crear formularios;
- agregar campos;
- crear catálogos;
- crear relaciones;
- configurar vistas;
- administrar tareas y eventos;
- configurar automatizaciones;
- administrar usuarios;
- administrar integraciones autorizadas.

La configuración habitual será manual y progresiva.

## 11.2 Implementador Qualitra

Debe permitir:

- exportar e importar tipos;
- exportar e importar formularios;
- exportar e importar catálogos;
- exportar e importar relaciones;
- exportar e importar vistas;
- exportar e importar páginas;
- exportar e importar automatizaciones;
- duplicar configuraciones;
- preparar paquetes;
- aplicar configuraciones;
- validar dependencias;
- previsualizar diferencias;
- detectar referencias faltantes;
- transportar configuraciones entre instalaciones.

Cada módulo debe incorporar la exportación e importación de los elementos que le pertenecen.

M12 construirá paquetes compuestos capaces de reunir elementos de varios módulos.

## 11.3 Seguridad del Implementador

El acceso del Implementador:

- debe ser visible para el propietario;
- debe poder concederse;
- debe poder revocarse;
- debe poder tener vencimiento;
- debe invalidarse al vencer o revocarse;
- debe quedar auditado;
- no debe cambiar la propiedad de los datos;
- no debe existir como credencial secreta universal.

## 11.4 Paquetes de configuración

Un paquete debe contener:

- identificador;
- nombre;
- versión;
- versión mínima compatible de Qualitra;
- elementos incluidos;
- dependencias;
- referencias;
- descripción de cambios.

Antes de instalar debe mostrar:

~~~text
Se crearán:
- 2 tipos de registro
- 3 formularios
- 2 catálogos

Se actualizarán:
- 1 vista

Conflictos:
- 1 identificador existente
~~~

## 11.5 Conflictos de importación

Cuando exista un elemento con el mismo identificador, debe permitirse una decisión controlada equivalente a:

- actualizar;
- crear una copia;
- omitir;
- cancelar;
- resolver una referencia manualmente.

## 11.6 Integridad de importación

La aplicación de un paquete debe ser atómica.

Si falla una parte:

- no debe quedar media configuración instalada;
- debe revertirse el conjunto;
- debe explicar el error;
- debe conservarse un registro de la operación fallida.

## 11.7 Contenido excluido

Los paquetes no deben incluir automáticamente:

- contraseñas;
- tokens;
- claves API;
- sesiones de WhatsApp;
- usuarios;
- registros reales;
- archivos reales;
- datos personales.

Los datos de ejemplo sólo pueden incluirse mediante selección explícita y previsualización.

Core V1 no requiere actualizaciones automáticas desde un marketplace.

---

# 12. Seguridad funcional global

## Primer propietario

M00 debe permitir crear de forma segura al propietario inicial.

Debe existir:

- acceso autenticado;
- cierre de sesión;
- recuperación segura de acceso;
- invalidación de sesiones;
- protección contra accesos no autorizados.

## Credenciales

Las credenciales de integraciones deben:

- mostrarse ocultas;
- poder reemplazarse;
- no reaparecer completas después de guardarse;
- quedar protegidas;
- no salir en exportaciones;
- no aparecer en registros visibles;
- no copiarse en paquetes.

## Permisos

Las funciones deben comprobar permisos aunque una persona intente acceder mediante una dirección directa o solicitud externa.

Ocultar un botón no sustituye el control real de acceso.

## Contenido enriquecido

El HTML o presentación enriquecida debe:

- impedir scripts;
- impedir ejecución arbitraria;
- impedir acceso a secretos;
- impedir acceso a datos no autorizados;
- impedir enlaces o contenido peligroso;
- sanear la salida antes de mostrarla.

## Contexto para IA

Antes de exportar ejemplos de datos debe mostrarse qué información se incluirá.

El usuario debe poder:

- exportar sólo estructura;
- incluir ejemplos ficticios;
- incluir ejemplos reales mediante confirmación;
- retirar o anonimizar datos sensibles.

La exportación debe quedar auditada cuando incluya datos reales.

## MFA

La autenticación multifactor no es obligatoria para aprobar Core V1, pero la arquitectura funcional no debe impedir incorporarla posteriormente.

---

# 13. Configuración general de la empresa

M00 debe permitir definir:

- nombre de la empresa;
- nombre visible del sistema;
- logotipo;
- idioma;
- zona horaria;
- formato de fecha;
- moneda;
- información de contacto administrativa.

Para el piloto:

~~~text
Idioma:
Español

Zona horaria:
America/Mexico_City

Moneda:
MXN
~~~

La zona horaria debe aplicarse consistentemente en:

- registros;
- tareas;
- eventos;
- vencimientos;
- automatizaciones;
- aprobaciones;
- auditoría;
- exportaciones.

Internamente Cursor puede utilizar la representación técnica que considere adecuada.

---

# 14. Auditoría transversal

La generación de eventos de auditoría comienza en M00.

Cada módulo debe registrar sus acciones relevantes desde el momento en que se construye.

M11 construirá la interfaz completa para consultar y analizar esa información.

Debe registrarse, cuando corresponda:

- usuario;
- fecha y hora;
- acción;
- origen;
- registro afectado;
- valor anterior;
- valor nuevo;
- estado anterior;
- estado nuevo;
- importación;
- automatización;
- conexión externa;
- Implementador;
- error relevante.

La auditoría:

- no debe poder modificarse como un registro normal;
- debe respetar permisos de consulta;
- debe conservar la identidad de usuarios desactivados;
- debe sobrevivir a actualizaciones y restauraciones.

---

# 15. Despliegue y operación self-hosted

Qualitra Core V1 debe operar dentro de infraestructura independiente para cada empresa.

Modelo:

~~~text
Empresa A
└── Servidor propio
    └── Qualitra

Empresa B
└── Servidor propio
    └── Qualitra
~~~

No se requiere multiempresa compartida.

## Coolify

Para el piloto debe poder:

- desplegarse desde Coolify;
- utilizar dominio;
- operar mediante HTTPS;
- reiniciarse;
- actualizarse;
- conservar datos;
- ejecutar migraciones de forma controlada;
- consultar estado básico;
- respaldarse;
- restaurarse.

## Persistencia

Deben sobrevivir:

- datos;
- configuraciones;
- usuarios;
- auditoría;
- archivos;
- tareas;
- automatizaciones;
- páginas;
- relaciones.

## Respaldo

El respaldo debe incluir como mínimo:

- base de datos;
- configuraciones;
- registros;
- catálogos;
- archivos y evidencias;
- historial;
- páginas;
- tareas;
- eventos;
- automatizaciones;
- metadatos de integraciones.

Las credenciales y sesiones sólo deben incluirse cuando puedan protegerse adecuadamente. El comportamiento debe quedar documentado.

Debe ser posible configurar respaldo automático.

Para la prueba piloto se configurará al menos:

~~~text
Frecuencia:
Diaria

Retención mínima:
7 respaldos
~~~

## Restauración

La prueba debe restaurar en una instalación limpia o entorno equivalente.

Después de restaurar deben verificarse:

- acceso;
- usuarios;
- registros;
- relaciones;
- archivos;
- auditoría;
- configuraciones;
- automatizaciones.

## Servicios externos

Los servicios externos no deben ser indispensables para consultar y conservar la información principal.

La falla de SendGrid o WhatsApp no debe impedir operar Qualitra.

---

# 16. Perfil mínimo del piloto

La validación deberá considerar al menos:

~~~text
Usuarios registrados:
50

Usuarios simultáneos:
10

Registros totales:
50,000

Registros consultables en una vista:
10,000

Campos en un formulario de prueba:
100

Elementos en un grupo repetible:
50

Tamaño de archivo individual:
25 MB
~~~

En condiciones normales de la infraestructura del piloto:

- una pantalla operativa común debe responder aproximadamente en tres segundos o menos;
- el guardado normal debe confirmarse aproximadamente en dos segundos o menos;
- las operaciones extensas pueden ejecutarse en segundo plano mostrando progreso;
- una exportación grande no debe bloquear toda la interfaz.

Navegadores mínimos:

- Chrome estable en computadora;
- Edge estable;
- Firefox estable;
- Chrome estable en tableta Android.

---

# 17. Alcance de Core V1

Core V1 es el motor general.

Quedan fuera:

- FSSC 22000;
- ISO 22000;
- ISO 9001;
- HACCP;
- NOM-035;
- NOM-251;
- paquetes sectoriales;
- firma electrónica certificada;
- herramienta BI avanzada;
- WhatsApp entrante;
- marketplace automático;
- aplicación móvil nativa;
- operación completamente desconectada;
- modelo SaaS multiempresa compartido.

Las normas y paquetes futuros utilizarán las capacidades del Core.

---

# 18. Orden congelado y propiedad funcional

~~~text
M00  Base operativa y propietario inicial
 ↓
M01  Usuarios, roles y permisos
 ↓
M02  Tipos de registro, campos, catálogos y cálculos
 ↓
M03  Constructor de formularios
 ↓
M04  Captura y consulta de registros
 ↓
M05  Relaciones entre registros
 ↓
M06  Listados, vistas, filtros, dashboard y reportes
 ↓
M07  Archivos y evidencias
 ↓
M08  Páginas informativas
 ↓
M09  Eventos y tareas
 ↓
M10  Automatizaciones, aprobaciones y comunicaciones
 ↓
M11  Consulta integral de historial y auditoría
 ↓
M12  Conexión universal, importación y paquetes
 ↓
M13  Validación integral
~~~

## Asignación de funciones transversales

| Función | Módulo propietario |
| --- | --- |
| Propietario inicial, configuración empresarial y auditoría base | M00 |
| Usuarios, roles, sesiones y acceso del Implementador | M01 |
| Estructura de datos, catálogos, validaciones y motor de cálculos | M02 |
| Distribución, condiciones, presentación, versiones y contexto para IA | M03 |
| Registros, borradores, autoguardado, folios y concurrencia | M04 |
| Campos de relación y navegación relacionada | M05 |
| Vistas, dashboard, exportaciones y reportes | M06 |
| Campos de archivo e imagen | M07 |
| Contenido institucional y menús | M08 |
| Tareas, eventos, calendario y recurrencia | M09 |
| Automatizaciones, aprobaciones, SendGrid y WhatsApp | M10 |
| Interfaz consolidada de auditoría | M11 |
| API, webhooks, importación masiva y paquetes compuestos | M12 |
| Prueba integral y despliegue final | M13 |

---

# M00 — Base operativa y propietario inicial

## Resultado esperado

Existirá una primera versión desplegable, autenticada y persistente.

## El humano debe poder

- desplegar Qualitra desde Coolify;
- acceder mediante dominio y HTTPS;
- crear al propietario inicial;
- iniciar y cerrar sesión;
- recuperar acceso mediante el mecanismo seguro disponible;
- configurar empresa;
- configurar nombre del sistema;
- configurar logotipo;
- configurar idioma, zona horaria y moneda;
- navegar desde computadora y tableta;
- consultar versión y estado básico;
- reiniciar sin perder configuración;
- comprobar que las acciones relevantes generan auditoría base.

## Caso

~~~text
Empresa:
ALSA

Sistema:
Qualitra

Idioma:
Español

Zona horaria:
America/Mexico_City

Moneda:
MXN
~~~

Reiniciar desde Coolify y volver a entrar.

## Puerta

~~~text
APROBADO M00
~~~

---

# M01 — Usuarios, roles y permisos

## Resultado esperado

Varias personas pueden utilizar Qualitra con acceso controlado.

## El humano debe poder

- crear usuario;
- definir nombre;
- definir correo;
- definir teléfono cuando corresponda;
- activar;
- desactivar;
- crear rol;
- asignar roles;
- revocar sesiones;
- controlar acciones;
- controlar alcance;
- conceder acceso de Implementador;
- establecer vencimiento;
- revocar acceso de Implementador.

## Acciones mínimas

- ver;
- crear;
- editar;
- archivar;
- exportar;
- aprobar;
- configurar;
- consultar auditoría;
- administrar integraciones.

## Alcances mínimos

- propios;
- asignados;
- permitidos por tipo;
- todos los autorizados.

## Caso

Crear:

~~~text
Administrador
Supervisor
Capturista
Consulta
Implementador temporal
~~~

Comprobar:

- Capturista puede capturar.
- Consulta no puede modificar.
- Supervisor puede revisar lo autorizado.
- Administrador configura.
- Implementador ve herramientas profesionales.
- Al revocar Implementador, su sesión deja de funcionar.

## Puerta

~~~text
APROBADO M01
~~~

---

# M02 — Tipos de registro, campos, catálogos y cálculos

## Resultado esperado

Un administrador puede definir estructuras de información sin solicitar código.

## Tipos funcionales de datos

- texto corto;
- texto largo;
- entero;
- decimal;
- moneda;
- porcentaje;
- fecha;
- fecha y hora;
- hora;
- correo;
- teléfono;
- URL;
- sí/no;
- selección simple;
- selección múltiple;
- opciones;
- checkbox;
- usuario;
- resultado calculado;
- grupo compuesto;
- grupo repetible;
- tabla estructurada.

Los siguientes tipos se activan posteriormente:

~~~text
Relación:
M05

Archivo e imagen:
M07
~~~

Los componentes de presentación pertenecen a M03.

## Validaciones

Debe poder configurarse, cuando aplique:

- obligatorio al finalizar;
- valor mínimo;
- valor máximo;
- longitud;
- precisión;
- formato;
- patrón;
- valor predeterminado;
- unicidad;
- cantidad mínima y máxima de elementos repetidos;
- mensaje comprensible.

Un borrador puede permanecer incompleto.

La finalización debe aplicar todas las validaciones obligatorias.

## Catálogos

Debe poder:

- crear;
- ordenar;
- añadir opción;
- cambiar etiqueta;
- desactivar opción;
- reutilizar;
- conservar opciones históricas.

## Grupos

Ejemplo:

~~~text
Criterio

- Concepto
- Calificación
- Peso
- Observación
~~~

Debe poder repetirse:

~~~text
[ AGREGAR CRITERIO ]
~~~

## Cálculos visuales

Debe permitir:

~~~text
Calificación final =
suma(calificación × peso)
~~~

y:

~~~text
SI calificación >= 90:
APROBADO

SI calificación >= 70 y < 90:
A PRUEBA

SI calificación < 70:
RECHAZADO
~~~

## Motor avanzado

El Implementador debe poder definir expresiones avanzadas que:

- lean campos autorizados;
- operen grupos;
- operen elementos repetibles;
- ejecuten condiciones;
- generen un valor;
- reporten errores;
- puedan probarse con datos simulados;
- no requieran modificar código;
- se ejecuten en un entorno seguro.

En M02 se valida el motor con datos de prueba.

La presentación enriquecida y uso dentro del formulario se validan en M03.

La persistencia dentro de registros se valida en M04.

## Exportación e importación

El Implementador debe poder exportar e importar:

- tipos;
- campos;
- catálogos;
- expresiones;
- validaciones.

## Caso

Crear:

~~~text
Proveedor
Evaluación de proveedor
~~~

Construir un grupo repetible de criterios y un cálculo ponderado.

Probar tres resultados:

~~~text
APROBADO
A PRUEBA
RECHAZADO
~~~

Publicar una nueva versión del tipo y comprobar que la anterior se conserva.

## Puerta

~~~text
APROBADO M02
~~~

---

# M03 — Constructor de formularios

## Resultado esperado

Un administrador puede construir y publicar interfaces de captura para los tipos definidos.

## El humano debe poder

- crear formulario;
- seleccionar tipo de registro;
- duplicar formulario;
- añadir campos existentes;
- crear un nuevo campo desde el constructor;
- ordenar;
- agrupar;
- añadir sección;
- añadir encabezado;
- añadir texto informativo;
- modificar etiqueta visible;
- añadir ayuda;
- marcar obligatorio;
- configurar condiciones;
- previsualizar;
- probar con datos simulados;
- guardar borrador de configuración;
- publicar;
- retirar;
- crear nueva versión.

Crear un campo desde el formulario debe añadirlo de forma controlada al tipo correspondiente.

## Condiciones

Ejemplo:

~~~text
Resultado:
Conforme / No conforme

Si:
No conforme

Mostrar:
Motivo de rechazo
~~~

Las condiciones circulares deben rechazarse con un mensaje comprensible.

## Presentación calculada avanzada

Debe combinar:

- datos;
- condiciones;
- operaciones;
- texto;
- indicadores;
- tablas;
- etiquetas;
- enlaces internos autorizados;
- estilos seguros.

Ejemplo:

~~~text
RESULTADO DE EVALUACIÓN

84 puntos

A PRUEBA

El proveedor deberá ser reevaluado en 90 días.
~~~

No debe permitir scripts ni contenido inseguro.

## Contexto para IA

Debe exportarse un paquete que describa:

- formulario;
- versión;
- campos;
- identificadores;
- tipos;
- grupos;
- repetibles;
- relaciones disponibles;
- funciones permitidas;
- formato de respuesta;
- datos de prueba seleccionados.

Flujo:

~~~text
Exportar contexto
↓
Pedir expresión a una IA
↓
Pegar expresión
↓
Validar
↓
Previsualizar
↓
Publicar
~~~

Un error no debe romper el formulario.

## Límite de M03

M03 valida el constructor y la previsualización.

La creación persistente de registros, borradores operativos, autoguardado y concurrencia pertenecen a M04.

## Caso

Construir Evaluación de proveedor con:

- 10 campos;
- sección;
- condición;
- grupo repetible;
- cálculo;
- clasificación;
- presentación enriquecida;
- contexto para IA;
- versión publicada.

## Puerta

~~~text
APROBADO M03
~~~

---

# M04 — Captura y consulta de registros

## Resultado esperado

Los formularios publicados generan registros persistentes y consultables.

## El humano debe poder

- crear;
- guardar;
- dejar borrador;
- recuperar;
- finalizar;
- abrir;
- editar con permiso;
- archivar;
- restaurar;
- consultar autor;
- consultar fecha;
- consultar versión;
- consultar estado;
- recuperar tras recarga;
- continuar después de navegar;
- tolerar interrupción;
- detectar conflicto simultáneo.

## Folios

Debe configurarse:

- prefijo;
- segmento temporal;
- consecutivo;
- longitud;
- reinicio temporal cuando corresponda.

Ejemplo:

~~~text
EQ-2026-0001
~~~

No deben duplicarse aunque existan capturas simultáneas.

## Cálculos

Al guardar o finalizar:

- deben validarse;
- deben generarse autoritativamente;
- deben conservar versión;
- deben poder usarse en módulos posteriores.

## Caso

Crear evaluaciones, cambiar la versión del formulario y crear nuevas.

Comprobar:

- históricos;
- registros nuevos;
- cálculos;
- grupos;
- folios;
- borradores;
- autoguardado;
- interrupción;
- conflicto entre sesiones.

## Puerta

~~~text
APROBADO M04
~~~

---

# M05 — Relaciones entre registros

## Resultado esperado

Los registros pueden conectarse de manera estructurada.

## Cardinalidades mínimas

- uno a uno;
- uno a varios;
- varios a varios;
- relación opcional;
- relación obligatoria.

## El humano debe poder

- crear relación;
- seleccionar registro relacionado;
- buscarlo;
- navegar en ambos sentidos;
- consultar relacionados;
- retirar relación;
- conservar historial.

## Integridad

Por defecto:

- archivar no elimina relacionados;
- no existe eliminación en cascada silenciosa;
- una referencia utilizada no debe quedar rota;
- los permisos se aplican al navegar.

## Cálculos relacionados

Cuando se configure, un cálculo puede utilizar:

- valor de un registro relacionado;
- cantidad;
- suma;
- promedio;
- mínimo;
- máximo.

Un cambio relacionado no debe alterar silenciosamente resultados históricos finalizados.

## Caso

~~~text
Proveedor
├── Evaluación 001
├── Evaluación 002
└── No conformidad NC-014
~~~

## Puerta

~~~text
APROBADO M05
~~~

---

# M06 — Listados, vistas, filtros, dashboard y reportes

## Resultado esperado

Los usuarios pueden encontrar y analizar información.

## Funciones

- seleccionar columnas;
- ordenar;
- buscar;
- filtrar;
- combinar filtros;
- filtrar cálculos;
- representar relaciones;
- representar repetibles;
- guardar vista;
- definir vista privada o compartida;
- seleccionar vista predeterminada;
- exportar el resultado filtrado.

## Permisos

Una vista o exportación nunca debe revelar campos o registros sin autorización.

## Dashboard

Bloques mínimos:

- mis tareas;
- tareas vencidas;
- próximos eventos;
- últimos registros;
- registros del mes;
- conteos;
- accesos directos.

## Salidas

- XLSX;
- CSV;
- PDF;
- impresión.

Las exportaciones deben indicar filtros y fecha cuando corresponda.

## Caso

Crear:

~~~text
Evaluaciones de proveedores reprobadas del último trimestre
~~~

Guardar, compartir con un rol autorizado y exportar.

## Puerta

~~~text
APROBADO M06
~~~

---

# M07 — Archivos y evidencias

## Resultado esperado

Los registros pueden conservar evidencia documental y fotográfica.

## El humano debe poder

- adjuntar;
- tomar fotografía;
- ver;
- descargar;
- conocer autor;
- conocer fecha;
- conocer registro;
- eliminar o archivar con permiso;
- recuperar tras reinicio;
- cargar fotografía pendiente después de una interrupción.

## Permisos

Los archivos heredan los permisos del registro.

Una URL directa no debe permitir acceso no autorizado.

## Límites

El administrador debe poder definir tipos y tamaños permitidos.

Valor inicial del piloto:

~~~text
25 MB por archivo
~~~

Los errores deben ser comprensibles.

## Persistencia

Los archivos deben incluirse en respaldo y restauración.

No deben quedar archivos huérfanos tras operaciones fallidas.

## Caso

Adjuntar:

- fotografía;
- PDF;
- hoja de cálculo.

Probar acceso autorizado y no autorizado.

## Puerta

~~~text
APROBADO M07
~~~

---

# M08 — Páginas informativas

## Resultado esperado

Qualitra puede mostrar contenido institucional sin convertirse en un CMS complejo.

## Funciones

- crear;
- duplicar;
- editar;
- versionar;
- publicar;
- retirar;
- enlazar;
- crear menús;
- crear submenús;
- controlar visibilidad por rol.

Contenido:

- texto;
- títulos;
- listas;
- tablas;
- imágenes;
- enlaces;
- archivos.

El contenido debe sanearse y no permitir scripts.

## Caso

Crear y publicar:

~~~text
Política de Calidad
Instrucciones de Limpieza
Procedimiento de Producción
~~~

## Puerta

~~~text
APROBADO M08
~~~

---

# M09 — Eventos y tareas

## Resultado esperado

Qualitra organiza trabajo relacionado con registros.

## Tareas

- título;
- descripción;
- responsable;
- fecha límite;
- prioridad;
- estado;
- subtareas;
- registro relacionado;
- comentarios;
- finalización;
- reasignación.

## Eventos

- inicio;
- fin;
- participantes;
- ubicación;
- relación;
- recurrencia.

## Recurrencia

Debe poder:

- definir repetición;
- generar ocurrencias;
- modificar una ocurrencia;
- modificar futuras;
- cancelar sin duplicar.

## Agenda

- mis tareas;
- pendientes;
- vencidas;
- completadas;
- calendario;
- equipo autorizado.

## Caso

Desde una No Conformidad crear:

~~~text
Realizar análisis de causa
Responsable: Calidad
Vence: +3 días
~~~

## Puerta

~~~text
APROBADO M09
~~~

---

# M10 — Automatizaciones, aprobaciones y comunicaciones

## Resultado esperado

Qualitra ejecuta acciones confiables ante eventos, condiciones y fechas.

## Disparadores mínimos

- creación;
- modificación;
- cambio de estado;
- fecha próxima;
- vencimiento;
- resultado calculado;
- finalización de tarea.

## Acciones mínimas

- crear tarea;
- crear evento;
- notificar internamente;
- enviar correo;
- enviar WhatsApp;
- cambiar estado.

## Control de automatizaciones

Debe poder:

- crear;
- probar;
- activar;
- desactivar;
- versionar;
- consultar ejecución;
- consultar error;
- reintentar;
- evitar ciclos;
- evitar duplicados.

Cada ejecución debe tener identificador y estado:

~~~text
PENDIENTE
EJECUTANDO
COMPLETADA
FALLIDA
CANCELADA
~~~

## Aprobaciones

Debe permitir:

~~~text
BORRADOR
↓
ENVIADO
↓
APROBADO / RECHAZADO
~~~

Configurar:

- quién envía;
- quién aprueba;
- quién rechaza;
- motivo de rechazo;
- bloqueo de edición;
- comportamiento posterior.

## Conformidad simple

Debe registrar:

- usuario autenticado;
- fecha y hora;
- acción;
- registro;
- comentario.

No sustituye una firma electrónica certificada.

## Notificaciones internas

Debe existir una bandeja con:

- no leídas;
- leídas;
- enlace al origen;
- fecha;
- estado.

## SendGrid

Core V1 soportará una configuración SendGrid por instalación.

Debe permitir:

- guardar credencial;
- definir remitente;
- probar;
- consultar estado;
- reemplazar credencial;
- ver errores;
- ejecutar envíos desde automatizaciones.

## WhatsApp mediante Baileys

Core V1 soportará una cuenta conectada por instalación.

Flujo:

~~~text
Administración
↓
WhatsApp
↓
Conectar
↓
Mostrar QR
↓
Escanear
↓
Cuenta conectada
~~~

Debe permitir:

- estado;
- cuenta identificable;
- nuevo QR;
- desconectar;
- prueba;
- persistencia tras reinicio cuando la sesión continúe válida;
- error visible;
- cola;
- reintento;
- protección contra duplicados.

Alcance de V1:

- mensajes salientes;
- texto;
- enlaces autorizados a Qualitra.

Los mensajes entrantes quedan fuera.

Si WhatsApp está desconectado:

- Qualitra sigue funcionando;
- el error es visible;
- el mensaje no se marca como enviado;
- puede reintentarse;
- no debe duplicarse.

Baileys debe ser reemplazable por otro proveedor sin reconstruir el motor de notificaciones.

## Caso

Demostrar:

- aprobación;
- rechazo con motivo;
- notificación interna;
- correo SendGrid;
- WhatsApp;
- error visible;
- reintento sin duplicado.

## Puerta

~~~text
APROBADO M10
~~~

---

# M11 — Consulta integral de historial y auditoría

## Resultado esperado

Un usuario autorizado puede reconstruir qué ocurrió.

## Debe mostrar

- quién;
- cuándo;
- qué acción;
- valor anterior;
- valor nuevo;
- estado anterior;
- estado nuevo;
- origen;
- automatización;
- integración;
- paquete;
- Implementador.

## Funciones

- filtrar;
- buscar;
- ordenar;
- abrir registro relacionado;
- exportar con permiso.

Debe mostrar eventos generados desde M00.

## Caso

Modificar una No Conformidad con dos usuarios, ejecutar una automatización y aplicar una configuración.

Un tercero autorizado debe reconstruir la secuencia.

## Puerta

~~~text
APROBADO M11
~~~

---

# M12 — Conexión universal, importación y paquetes

## Resultado esperado

Qualitra intercambia datos y configuraciones de forma controlada.

## Conexiones

El administrador debe poder:

- crear credencial;
- asignar nombre;
- definir permisos;
- definir alcance;
- revocar;
- establecer vencimiento;
- consultar última actividad.

## Operaciones externas

- consultar estructura;
- leer;
- crear;
- actualizar;
- relacionar;
- enviar archivos;
- crear tareas;
- crear eventos.

Eliminar no debe habilitarse por defecto.

## Idempotencia

Una solicitud repetida por recuperación o reintento no debe crear duplicados cuando incluya el identificador correspondiente.

## Identidad externa

Debe mantenerse equivalencia por conexión:

~~~text
Proveedor Qualitra:
SUP-023

Proveedor ERP:
8271
~~~

El identificador externo debe ser único dentro de esa conexión y tipo.

## Consulta de colecciones

Debe soportar:

- filtros;
- paginación;
- orden;
- errores estructurados;
- límites comprensibles.

## Salidas

- JSON;
- Markdown;
- CSV;
- XLSX.

## Webhooks

Debe poder avisar:

- registro creado;
- registro modificado;
- estado cambiado;
- tarea completada;
- evidencia adjuntada.

Debe incluir:

- autenticidad verificable;
- reintentos;
- protección contra duplicados;
- historial de entregas;
- error;
- reenvío manual.

## Importación masiva

Debe aceptar:

- CSV;
- XLSX.

Flujo:

~~~text
Seleccionar archivo
↓
Seleccionar tipo
↓
Mapear columnas
↓
Previsualizar
↓
Validar
↓
Importar
↓
Mostrar resultado
~~~

Debe permitir:

- crear;
- actualizar por folio o identificador externo;
- detectar duplicados;
- validar catálogos;
- reportar filas con error;
- descargar reporte;
- evitar importación parcial silenciosa;
- auditar.

## Paquetes compuestos

El Implementador debe poder reunir:

~~~text
Proveedor
+
Evaluación
+
Relación
+
Vista
+
Automatización
~~~

Exportar y aplicar en otra instalación.

Debe cumplir las reglas de:

- dependencias;
- previsualización;
- conflictos;
- atomicidad;
- compatibilidad;
- exclusión de secretos;
- auditoría.

## Caso integral

Con herramienta externa:

1. consultar estructura;
2. crear registro;
3. verlo en Qualitra;
4. modificarlo;
5. exportarlo;
6. adjuntar archivo;
7. recibir webhook;
8. repetir solicitud sin duplicar;
9. importar una hoja;
10. aplicar un paquete compuesto.

## Puerta

~~~text
APROBADO M12
~~~

---

# M13 — Validación integral

## Caso genérico

Construir sin código específico:

~~~text
Proveedor
↓
Evaluación
↓
No conformidad
↓
Tarea
↓
Evidencia
↓
Vista
↓
Exportación
↓
Conexión externa
~~~

## Tableta

~~~text
Abrir tarea
↓
Llenar checklist
↓
Tomar fotografía
↓
Completar
~~~

## Potencia del constructor

Construir:

~~~text
Datos generales
+
criterios repetibles
+
ponderaciones
+
cálculo
+
clasificación
+
presentación enriquecida
~~~

## IA

~~~text
Exportar contexto
↓
Solicitar expresión
↓
Pegar
↓
Validar
↓
Previsualizar
↓
Publicar
↓
Comprobar resultado
~~~

## Versionado

- publicar nueva versión;
- crear registro nuevo;
- consultar históricos;
- comprobar que los resultados antiguos no cambiaron.

## Concurrencia

- abrir en dos sesiones;
- editar;
- detectar conflicto;
- comprobar que ninguna captura se pierde.

## Importador

- importar archivo válido;
- importar archivo con errores;
- descargar reporte;
- repetir sin duplicar.

## Implementador

- exportar paquete;
- aplicar en instalación limpia;
- comprobar equivalencia;
- editar después como administrador normal.

## Comunicaciones

- SendGrid;
- Baileys;
- persistencia;
- desconexión;
- error;
- reintento;
- ausencia de duplicados.

## Recuperación

- respaldo;
- restauración limpia;
- acceso;
- registros;
- archivos;
- auditoría;
- configuraciones.

## Regresión

Ejecutar recorridos críticos de M00 a M12.

## Puerta final

~~~text
QUALITRA CORE V1 APROBADO
~~~

---

# 19. Regla de evolución

Ante una necesidad nueva debe intentarse resolver mediante:

1. tipo;
2. campo;
3. formulario;
4. relación;
5. vista;
6. tarea;
7. evento;
8. automatización;
9. conexión externa.

Si el Core puede resolverla, no debe programarse un módulo específico.

Si no puede resolverla, debe registrarse como propuesta posterior a Core V1.

---

# 20. Entrega obligatoria de Cursor por módulo

Cursor debe entregar:

## Resultado funcional

Qué puede hacer ahora el usuario.

## Recorrido

Pasos exactos.

## Datos de prueba

Usuarios, registros y configuraciones necesarios.

## Pruebas internas

- unitarias cuando correspondan;
- integración;
- permisos;
- persistencia;
- migraciones;
- errores;
- seguridad;
- regresión.

## Cambios de datos

Explicar cualquier migración o cambio que pueda afectar información existente.

## Problemas conocidos

Toda limitación real.

## Checklist humano

Lista reproducible.

## Estado

Cursor sólo puede declarar:

~~~text
LISTO PARA VALIDACIÓN HUMANA
~~~

Nunca:

~~~text
APROBADO
~~~

---

# 21. Formato de validación humana

~~~text
MÓDULO:
MXX - Nombre

RESULTADO:
APROBADO / RECHAZADO

Pruebas:
[x] Función principal
[x] Permisos
[x] Persistencia
[x] Errores
[x] Regresión

Tableta:
APROBADA / NO APLICA / RECHAZADA

Observaciones:
...

Evidencias:
...

DECISIÓN:
APROBADO MXX
~~~

---

# 22. Criterios globales de rechazo

Debe rechazarse si:

- la interfaz es confusa;
- existen demasiados pasos;
- falla en tableta;
- se pierde información;
- el autoguardado afirma algo falso;
- se sobrescriben cambios;
- los permisos fallan;
- una URL directa evade permisos;
- los históricos cambian silenciosamente;
- una actualización daña datos;
- una importación deja configuración parcial;
- una automatización duplica acciones;
- un error de mensajería desaparece;
- una expresión avanzada ejecuta contenido inseguro;
- una exportación revela información no autorizada;
- una función sólo puede comprobarse en código;
- se requiere modificar código para configurar algo prometido;
- aparece una regresión;
- no existe una demostración reproducible.

---

# 23. Estado inicial

El estado operativo se conservará en:

~~~text
docs/QUALITRA_CORE_V1_ESTADO.md
~~~

Contenido inicial:

~~~text
M00  AUTORIZADO
M01  BLOQUEADO
M02  BLOQUEADO
M03  BLOQUEADO
M04  BLOQUEADO
M05  BLOQUEADO
M06  BLOQUEADO
M07  BLOQUEADO
M08  BLOQUEADO
M09  BLOQUEADO
M10  BLOQUEADO
M11  BLOQUEADO
M12  BLOQUEADO
M13  BLOQUEADO
~~~

El único módulo autorizado inicialmente es:

~~~text
M00 — Base operativa y propietario inicial
~~~

---

# 24. Resultado final esperado

Una empresa debe poder configurar y operar sin modificar código:

- usuarios;
- roles;
- permisos;
- tipos;
- campos;
- catálogos;
- formularios;
- versiones;
- registros;
- borradores;
- folios;
- cálculos;
- grupos;
- repetibles;
- presentaciones avanzadas;
- asistencia mediante IA;
- relaciones;
- vistas;
- dashboard;
- exportaciones;
- archivos;
- páginas;
- tareas;
- eventos;
- automatizaciones;
- aprobaciones;
- conformidades;
- notificaciones;
- auditoría;
- API;
- webhooks;
- importaciones;
- paquetes;
- SendGrid;
- WhatsApp;
- respaldos;
- restauraciones.

El equipo de implementación debe poder preparar y transportar configuraciones con mayor productividad que un administrador normal.

Después de aprobar Core V1 podrán construirse:

~~~text
FSSC 22000
ISO 9001
ISO 22000
HACCP
NOM-035
NOM-251
otros
~~~

El Core resuelve el funcionamiento general.

Las normas aportan:

- procesos;
- controles;
- requisitos;
- contenido;
- plantillas;
- configuraciones sectoriales.
