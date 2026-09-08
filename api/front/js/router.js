const routes = {
    'umirovljenici': renderUmirovljenici,
    'lokacije': renderLokacije,
    'korisnici': renderKorisnici,
    'tip_evidencije': renderTipEvidencije,
    'akcije': renderAkcije,
    'posjeti': renderPosjeti,
    'smjene': renderSmjene,
    'evidencije': renderEvidencije
};

function trenutnaRuta() {
    return window.location.hash.replace('#', '') || 'umirovljenici';
}

function prikaziStranicu() {
    const ruta = trenutnaRuta();
    const content = document.getElementById('content');

    document.querySelectorAll('.nav-item').forEach(function (el) {
        el.classList.toggle('active', el.dataset.route === ruta);
    });

    const renderFunkcija = routes[ruta];
    if (renderFunkcija) {
        renderFunkcija(content);
    } else {
        content.innerHTML = '<p>Stranica nije pronađena.</p>';
    }
}

window.addEventListener('hashchange', prikaziStranicu);
