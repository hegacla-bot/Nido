// Nido · concepto conversacional — quién es la persona que usa la app (no quién sale en las fotos,
// eso lo lleva reconocimiento.js). Se pregunta una sola vez; luego se recuerda en este navegador.
window.NidoUsuarioConcepto = (function () {
  const KEY = 'nido-usuario-v1';

  function obtener() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }

  function guardar(nombre, comoLlamarla) {
    if (!nombre) return;
    try { localStorage.setItem(KEY, JSON.stringify({ nombre, comoLlamarla: comoLlamarla || nombre })); } catch (e) {}
  }

  return { obtener, guardar };
})();
