# Verne en varios equipos (sin nube de nadie)

Un proyecto Verne es **una carpeta de archivos de texto normales**. Eso significa que
no necesitas ningún servicio de Verne para llevarlo a otro equipo: cualquier
herramienta que sincronice carpetas funciona. Estas son las dos que recomendamos y
cómo configurarlas bien.

## Opción A — Syncthing (automática, entre tus equipos)

[Syncthing](https://syncthing.net) es libre y gratuito, y sincroniza carpetas
directamente entre tus dispositivos, sin servidores de terceros.

1. Instala Syncthing en ambos equipos y vincúlalos (se muestran un ID mutuamente).
2. Comparte la carpeta del proyecto (o la carpeta madre con todos tus proyectos).
3. **Recomendado:** en la carpeta compartida crea un archivo `.stignore` con:

   ```text
   .verne
   ```

   La carpeta `.verne/` es estado interno regenerable (índice, snapshots): excluirla
   evita tráfico inútil y falsos conflictos. Verne la reconstruye solo al abrir.

4. Escribe siempre con la tranquilidad de que Verne guarda solo (autosave); aún así,
   evita editar el **mismo documento** en dos equipos *a la vez*: si ocurre,
   Syncthing conserva ambas versiones (crea un archivo `*.sync-conflict-*`) y no se
   pierde nada, pero tendrás que elegir a mano.

## Opción B — git (historial completo, para quien ya lo usa)

Si sabes git, un proyecto VPF es un repositorio perfecto: todo es texto plano y los
diffs de tus capítulos son legibles.

```sh
cd mi-proyecto
git init
git add .
git commit -m "Mi proyecto"
```

- El `.gitignore` recomendado es una sola línea: `.verne/`
- `papelera/` puedes versionarla o no, a tu gusto.
- Sincroniza con cualquier remoto (GitHub privado, Gitea, un disco): `git push` /
  `git pull` al empezar y terminar la sesión de escritura.

## Lo que NO debes hacer

- **No uses la papelera de un equipo como respaldo único.** La papelera es local al
  proyecto; el respaldo real es tu herramienta de sincronización o copia.
- **OneDrive/Dropbox/iCloud funcionan**, pero vigila dos cosas: que la carpeta esté
  siempre "disponible sin conexión" (los archivos placeholder confunden a cualquier
  editor) y que no estés editando en dos equipos a la vez sin dejar sincronizar.

## ¿Y la sincronización propia de Verne?

Está diseñada (RFC-0001 §8: CRDT, cifrado de extremo a extremo, autoalojable) pero
deliberadamente aplazada: se construirá cuando exista colaboración real entre
personas (RFC-0002 §8). Para una sola persona con varios equipos, las opciones de
esta guía son más simples y igual de fiables.
