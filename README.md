# Qualitra

Qualitra es un motor modular y self-hosted para construir sistemas de gestión de calidad sin programar cada proceso de negocio como un módulo independiente.

El proyecto se encuentra en la etapa de construcción de **Qualitra Core V1**.

## Estado actual

- Plan funcional maestro: **V1.1 congelado**
- Infraestructura objetivo: **servidor propio administrado mediante Coolify**
- Modalidad de construcción: **módulo por módulo**
- Módulo autorizado: **M00 — Base operativa y propietario inicial**
- Módulos posteriores: **bloqueados hasta validación humana**

## Documentos principales

| Documento | Propósito |
| --- | --- |
| [CURSOR.md](CURSOR.md) | Instrucciones obligatorias para trabajar con Cursor |
| [Plan funcional maestro](docs/QUALITRA_CORE_V1_PLAN_FUNCIONAL_V1.1_CURSOR.md) | Alcance, reglas, módulos y criterios de aceptación |
| [Estado de módulos](docs/QUALITRA_CORE_V1_ESTADO.md) | Avance operativo y puertas de aprobación |
| [Registro de decisiones](docs/QUALITRA_CORE_V1_DECISIONES.md) | Decisiones funcionales autorizadas después del congelamiento |

## Regla central

> El plan define el resultado. Cursor descubre cómo construirlo. El humano determina si realmente funciona.

Cursor puede tomar decisiones técnicas autónomas, pero no puede cambiar el comportamiento funcional aprobado, adelantar funciones visibles de módulos bloqueados ni aprobar módulos por sí mismo.

## Alcance de Core V1

Core V1 debe permitir configurar sin modificar código:

- usuarios, roles y permisos;
- tipos de registro, campos y catálogos;
- formularios versionados;
- cálculos y presentaciones avanzadas;
- grupos compuestos, anidados y repetibles;
- borradores, autoguardado y recuperación;
- relaciones, vistas, dashboard y reportes;
- archivos y evidencias;
- tareas, eventos y automatizaciones;
- aprobaciones y auditoría;
- SendGrid y WhatsApp mediante Baileys;
- API, webhooks e importaciones;
- paquetes transportables de configuración;
- respaldo y restauración.

Las normas y paquetes sectoriales se construirán después sobre este Core.

## Piloto

Configuración inicial prevista:

- idioma: Español;
- zona horaria: America/Mexico_City;
- moneda: MXN;
- despliegue: Coolify;
- correo: SendGrid;
- WhatsApp saliente: Baileys mediante QR.

## Licencia

Este repositorio todavía no declara una licencia de uso. No debe asumirse que el código o la documentación pueden reutilizarse fuera del proyecto sin autorización del propietario.
