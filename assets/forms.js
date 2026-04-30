// Monument Equity — form submission helper + mobile nav toggle.
// Wires a form to /api/submit, swaps in a thank-you panel on success.

(function () {
  // Mobile nav toggle — runs on every page that loads this script
  function initNavToggle() {
    var btn = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (!btn || !links) return;
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when any nav link is clicked
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }
  // Scrollspy — light up About / Contact nav links when their sections
  // are in view on the homepage. Bails on sub-pages (sections won't exist).
  function initScrollSpy() {
    var spy = [
      { id: 'about-bryan', hash: '#about-bryan' },
      { id: 'about-firm',  hash: '#about-bryan' }, // about-firm also activates About
      { id: 'contact',     hash: '#contact' },
    ];
    var sections = spy
      .map(function (s) { s.el = document.getElementById(s.id); return s; })
      .filter(function (s) { return s.el; });
    if (!sections.length) return;

    var navLinks = Array.from(document.querySelectorAll('.nav-links a'));
    function getHash(href) {
      if (!href) return null;
      var i = href.indexOf('#');
      return i === -1 ? null : href.substring(i);
    }

    function update() {
      var midY = window.scrollY + window.innerHeight * 0.35;
      var activeHash = null;
      sections.forEach(function (s) {
        var rect = s.el.getBoundingClientRect();
        var top = rect.top + window.scrollY;
        var bottom = top + s.el.offsetHeight;
        if (top <= midY && bottom > midY) activeHash = s.hash;
      });
      navLinks.forEach(function (a) {
        var hash = getHash(a.getAttribute('href'));
        if (!hash) return; // don't touch page-to-page links (preserves static .active)
        if (hash === activeHash) a.classList.add('active');
        else a.classList.remove('active');
      });
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  function initAll() {
    initNavToggle();
    initScrollSpy();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

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
