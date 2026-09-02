# Instrucciones obligatorias para Cursor

## Fuente de verdad

Antes de realizar cualquier cambio, leer completamente:

1. `docs/QUALITRA_CORE_V1_PLAN_FUNCIONAL_V1.1_CURSOR.md`
2. `docs/QUALITRA_CORE_V1_ESTADO.md`
3. `docs/QUALITRA_CORE_V1_DECISIONES.md`

El plan funcional maestro define el resultado esperado. No debe convertirse en una especificación técnica rígida.

## Módulo autorizado

Sólo puede construirse el módulo marcado como `AUTORIZADO` en el archivo de estado.

Al iniciar el repositorio:

`M00 — Base operativa y propietario inicial`

Todos los demás módulos permanecen bloqueados.

Cursor puede preparar fundamentos técnicos internos necesarios para el futuro, pero no puede exponer, declarar terminadas ni validar funciones visibles de módulos bloqueados.

## Autonomía técnica

Cursor puede decidir:

- arquitectura;
- tecnologías;
- estructura del proyecto;
- persistencia;
- pruebas;
- migraciones;
- seguridad técnica;
- componentes y servicios auxiliares.

Debe detenerse y solicitar una decisión cuando una ambigüedad pueda modificar:

- comportamiento observable;
- alcance;
- integridad histórica;
- permisos;
- seguridad;
- propiedad de datos;
- criterios de aceptación.

## Ciclo de trabajo

1. Revisar el plan completo.
2. Revisar el estado del repositorio.
3. Construir únicamente el módulo autorizado.
4. Ejecutar pruebas internas.
5. Corregir problemas.
6. Ejecutar regresión de módulos aprobados.
7. Entregar recorrido reproducible.
8. Declarar únicamente:

`LISTO PARA VALIDACIÓN HUMANA`

Cursor nunca puede declarar `APROBADO`.

## Prohibiciones

- No cambiar silenciosamente el plan funcional.
- No modificar el documento maestro para registrar progreso.
- No actualizar el estado de un módulo a aprobado sin instrucción humana expresa.
- No sustituir una función solicitada por una simulación.
- No ocultar problemas conocidos.
- No eliminar datos, configuraciones o históricos para resolver una incompatibilidad.
- No introducir secretos en el repositorio.
- No implementar procesos específicos de una norma dentro del Core.

## Entrega por módulo

Debe incluir:

- resultado funcional;
- recorrido de demostración;
- datos de prueba;
- pruebas internas ejecutadas;
- regresión ejecutada;
- migraciones;
- limitaciones conocidas;
- checklist humano;
- estado `LISTO PARA VALIDACIÓN HUMANA`.
