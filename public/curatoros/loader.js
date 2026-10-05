(() => {
  const app = document.getElementById('app');
  if (!app) return;

  const startedAt = Date.now();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  const showError = (title, detail) => {
    app.innerHTML =
      '<div style="max-width:760px;margin:72px auto;padding:32px;border:1px solid #111;background:#FCFCFA;color:#111;font-family:Arial,sans-serif">' +
      '<div style="font:12px monospace;text-transform:uppercase;letter-spacing:.08em">CuratorOS diagnostics</div>' +
      '<h1 style="font-size:42px;margin:12px 0">' + escapeHtml(title) + '</h1>' +
      '<p style="line-height:1.6">The page shell loaded, but the interactive client did not finish starting.</p>' +
      '<pre style="white-space:pre-wrap;background:#f1f1ed;padding:16px;border:1px solid #111">' + escapeHtml(detail || 'No error detail was provided.') + '</pre>' +
      '<p style="line-height:1.6">Please send a screenshot of this card.</p>' +
      '</div>';
  };

  window.addEventListener('error', (event) => {
    if ((app.textContent || '').includes('Loading CuratorOS interface')) {
      showError('Browser error while starting.', event.message || 'Unknown browser error');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if ((app.textContent || '').includes('Loading CuratorOS interface')) {
      showError('Promise failed while starting.', event.reason?.message || event.reason || 'Unhandled rejection');
    }
  });

  import('/curatoros/app-v2.js?v=20261005-1730')
    .then(() => {
      window.setTimeout(() => {
        if ((app.textContent || '').includes('Loading CuratorOS interface')) {
          showError('Client loaded but did not render.', 'app-v2.js imported successfully, but the loading shell was still present after ' + (Date.now() - startedAt) + ' ms.');
        }
      }, 2500);
    })
    .catch((error) => {
      showError('Client module failed to load.', error?.stack || error?.message || String(error));
    });
})();
