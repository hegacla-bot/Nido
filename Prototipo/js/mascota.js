// Nido · animaciones del pollito guía — Web Animations API, sin dependencias.
// Un único sitio con la lógica de movimiento: cada pantalla de onboarding la
// reutiliza en vez de llevar su propio bloque de animación copiado.
//
// Cubre POINT (entrada de la pose al llegar el paso) + IDLE — que para los
// pasos 1-3 es la respiración sintética (WAAPI) sobre una pose estática. El
// paso 4 usa un WebP animado (frames reales del vídeo, fondo quitado por
// diferencia de color, transparencia y timing nativos — sin JS de por
// medio): ese elemento lleva la clase .onboarding-pollito__animated y solo
// se salta la respiración sintética porque ya tiene su propio movimiento.

window.Mascota = (function () {
  const EASE_SIGNATURE = 'cubic-bezier(0.4, 0, 0.2, 1)'; // firma amable/calmada
  const EASE_AMBIENT = 'ease-in-out'; // loop de respiración, tipo seno

  function playEntrance(el) {
    el.getAnimations().forEach((anim) => anim.cancel());
    return el.animate(
      [
        { opacity: 0, transform: 'translateY(26px) scale(0.94)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 600, delay: 80, easing: EASE_SIGNATURE, fill: 'both' }
    );
  }

  // Respiración «de lado» (28-sep, a prueba en el paso 5 del tour: data-respira="lado"): se ensancha como una tripa que se hincha y
  // apenas crece hacia arriba, así no se come el hueco con la burbuja. La normal crece un 3 % hacia arriba desde los pies.
  function startIdle(el, deLado) {
    el.animate(
      deLado ? [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.025, 1.008)' }] : [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }],
      { duration: 4200, easing: EASE_AMBIENT, iterations: Infinity, direction: 'alternate' }
    );
  }

  function enterOnboardingPollito(sectionEl) {
    const visual = sectionEl.querySelector('.onboarding-pollito__visual');
    if (!visual) return;
    const selfAnimating = visual.classList.contains('onboarding-pollito__animated');

    playEntrance(visual)
      .finished.then(() => {
        if (!selfAnimating) startIdle(visual, sectionEl.dataset.respira === 'lado');
      })
      .catch(() => {}); // se cancela si el usuario ya cambió de pantalla
  }

  function exitOnboardingPollito(sectionEl) {
    const visual = sectionEl.querySelector('.onboarding-pollito__visual');
    if (!visual) return;
    visual.getAnimations().forEach((anim) => anim.cancel());
  }

  return { enterOnboardingPollito, exitOnboardingPollito };
})();
