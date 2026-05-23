document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('version-badge').textContent = window.sunatAPI.getVersion();
  document.getElementById('status-msg').textContent = 'App corriendo en modo desarrollo. Listo para Semana 1.';
});