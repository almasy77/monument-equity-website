// Monument Equity — form submission helper.
// Wires a form to /api/submit, swaps in a thank-you panel on success.

(function () {
  function wireForm(formId, hideId, thanksId) {
    var form = document.getElementById(formId);
    var hide = document.getElementById(hideId);
    var thanks = document.getElementById(thanksId);
    if (!form || !hide || !thanks) return;

    var btn = form.querySelector('button[type=submit]');
    var originalText = btn ? btn.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form));

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending…';
      }

      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res
            .json()
            .then(function (j) { return { ok: res.ok, json: j }; })
            .catch(function () { return { ok: res.ok, json: {} }; });
        })
        .then(function (result) {
          if (result.ok) {
            hide.style.display = 'none';
            thanks.style.display = 'block';
            if (window.scrollTo) {
              try { thanks.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            }
          } else {
            if (btn) { btn.disabled = false; btn.textContent = originalText; }
            alert((result.json && result.json.error) || 'Something went wrong. Please email us directly.');
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
          alert('Something went wrong. Please email us directly.');
        });
    });
  }

  window.wireForm = wireForm;
})();
