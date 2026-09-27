// Nido · v3 — Aviso de eliminar foto: la primera vez (por sesión) sale el
// pollito con la burbuja grande (687:8416); a partir de la segunda, el
// aviso pasa a la tarjeta compacta de siempre (692:2470, mismas clases que
// el modal "Ayúdanos" de Registro) — ya no hace falta la explicación
// grande una vez el gesto es conocido.
//
// "Cancelar"/"Volver" de cualquiera de los dos solo cierran su propio
// velo. "Eliminar"/"Eliminar foto" usan data-nav="back" tal cual — el
// manejador genérico de app.js ya navega solo, no hace falta lógica de
// "confirmar" aparte. showScreen() cierra ambos velos al salir de
// detalle-foto, igual que ya hace con el de seleccionar persona.

(function () {
  const pollitoOverlay = document.querySelector('[data-eliminar-foto-overlay]');
  const confirmOverlay = document.querySelector('[data-eliminar-confirm-overlay]');
  if (!pollitoOverlay || !confirmOverlay) return;

  let hasShownPollito = false;

  window.EliminarFoto = {
    close() {
      pollitoOverlay.classList.remove('is-visible');
      confirmOverlay.classList.remove('is-visible');
    },
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-eliminar-foto-action]');
    if (!trigger) return;

    const action = trigger.dataset.eliminarFotoAction;

    if (action === 'abrir') {
      if (!hasShownPollito) {
        hasShownPollito = true;
        pollitoOverlay.classList.add('is-visible');
      } else {
        confirmOverlay.classList.add('is-visible');
      }
      return;
    }

    if (action === 'cerrar') pollitoOverlay.classList.remove('is-visible');
    if (action === 'cerrar-confirm') confirmOverlay.classList.remove('is-visible');
  });
})();
