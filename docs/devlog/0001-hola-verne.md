---
title: "Hola, Verne: construí la app de escritura que quería usar"
estado: borrador
tags: [verne, devlog, open-source]
---

Escribo dos cosas: entradas de blog y cuentos. Y durante años las escribí en una mezcla incómoda de herramientas — el editor del CMS, archivos sueltos, Word, Google Docs, Keep.

Ninguna app entendía las dos cosas a la vez. Las apps de escritores serias son cerradas, caras y guardan tu obra en formatos que envejecen mal. Las apps de notas son abiertas pero no son cómodas ni ayudan con su formato plano. Y las que viven en la nube tienen mi trabajo… en la nube de alguien más.

Así que construí **Verne**. Hoy publico la v0.1.

## ¿Qué es?

Verne es una app de escritura libre y open source para Windows, con una idea central: **cada tipo de proyecto adapta la aplicación a lo que escribes**.

* Mi proyecto de **blog** tiene estados editoriales (idea → borrador → publicada) y un botón que copia HTML limpio para pegarlo en el CMS. Nada más — ahí no hay fichas de personajes ni nada que no necesite.
* Mi proyecto de **cuentos** tiene otros estados (hasta *enviado*), un registro de envíos que por fin jubiló mi hoja de cálculo, y exportación a DOCX en formato de manuscrito estándar: Times 12, doble espacio, encabezado con apellido y página, "Fin" al cierre. Tal como lo piden algunas revistas o editoriales en concursos de cuentos. Al menos basado en mi experiencia.

Y debajo de todo, el principio que no negocio: **tus palabras son archivos Markdown en una carpeta normal**. Sin base de datos cautiva, sin cuenta, sin nube obligatoria. Si Verne desaparece mañana, tu obra se abre con cualquier editor de texto. Hay hasta un test automático que verifica, en cada cambio del código, que borrar la carpeta interna de la app no pierde ni una palabra tuya.

## Qué tiene la v0.1

Un editor de texto rico que guarda Markdown (con barra de formato, modo enfoque, autosave y snapshots de seguridad), organización con etiquetas, filtros y búsqueda que ignora acentos, papelera reversible, y las exportaciones que ya conté. Todo funciona sin Internet, siempre.

También hay una lista honesta de lo que **no** tiene: sincronización propia (uso Syncthing sobre las carpetas y funciona hoy; hay una guía en el repositorio), plugins, IA, móvil. Parte está diseñada para el futuro, parte quizá nunca llegue. La regla del proyecto es construir las cosas cuando su necesidad es real, no cuando suenan bien en una lista de funciones. Y una postura fija desde el primer día: si algún día hay IA en Verne, analizará y sugerirá — **jamás escribirá por ti**.

## Cómo está hecho (para quien le interese)

Verne es un proyecto personal: lo construyo para mí, en pareja con una IA como asistente de código, y lo comparto por si a alguien más le sirve. El código es AGPL, las decisiones grandes están documentadas en RFCs públicos dentro del propio repositorio — incluido el mapa a diez años y sus autocríticas — y el formato de proyecto tiene especificación abierta para que cualquier otra herramienta pueda leerlo. Tecnología: TypeScript, ProseMirror y Tauri; una app de escritorio ligera, no un navegador disfrazado.

## Pruébala

El instalador está en la página de releases del repositorio: **github.com/DanMartinezMx/Verne**. Aviso honesto: el binario aún no está firmado, así que Windows te pedirá confirmación la primera vez.

Si escribes — un blog, cuentos, lo que sea — y la pruebas, me interesa una sola cosa: **en qué te trabaste**. Eso vale más que cualquier estrella en GitHub.

Esta entrada, por cierto, está escrita en Verne y exportada con su botón de "Copiar HTML". El ciclo se cerró.

