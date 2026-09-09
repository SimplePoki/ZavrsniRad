async function renderStatistika(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const [umRez, evRez, korRez, lokRez, tipRez, posRez] = await Promise.all([
        apiGet('/umirovljenici/index.php'),
        apiGet('/evidencije/index.php'),
        apiGet('/korisnici/index.php'),
        apiGet('/lokacije/index.php'),
        apiGet('/tip_evidencije/index.php'),
        apiGet('/posjeti/index.php')
    ]);

    const rezultati = [umRez, evRez, korRez, lokRez, tipRez, posRez];
    for (let i = 0; i < rezultati.length; i++) {
        if (!rezultati[i].ok) {
            content.innerHTML = '<p>Greška: ' + rezultati[i].data.error + '</p>';
            return;
        }
    }

    const umirovljenici = umRez.data;
    const evidencije = evRez.data;
    const korisnici = korRez.data;
    const lokacije = lokRez.data;
    const tipovi = tipRez.data;
    const posjeti = posRez.data;

    let html = '';
    html += '<h1 class="page-title">Statistika</h1>';
    html += '<p class="page-subtitle">Presjek stanja i aktivnosti u sustavu</p>';

    // --- KPI row ---
    const danas = new Date().toISOString().substring(0, 10);
    const aktivniUmirovljenici = umirovljenici.filter(function (u) { return u.aktivan; }).length;
    const aktivnoOsoblje = korisnici.filter(function (k) { return k.aktivan; }).length;
    const evidencijaDanas = evidencije.filter(function (e) { return e.datum_vrijeme.substring(0, 10) === danas; }).length;

    html += '<div class="kpi-row">';
    html += statKpi('Aktivni umirovljenici', aktivniUmirovljenici, umirovljenici.length + ' ukupno u sustavu');
    html += statKpi('Aktivno osoblje', aktivnoOsoblje, korisnici.length + ' ukupno računa');
    html += statKpi('Evidencije ukupno', evidencije.length, 'svih zabilježenih radnji njege');
    html += statKpi('Evidencije danas', evidencijaDanas, danas.split('-').reverse().join('.') + '.');
    html += statKpi('Posjeta ukupno', posjeti.length, 'zabilježenih posjeta rodbine');
    html += '</div>';

    // --- Evidencije po tipu / Najaktivniji korisnici ---
    const poTipu = groupCount(evidencije, function (e) { return e.akcija_tip_id; });
    const tipRedovi = tipovi.map(function (t) {
        return { label: t.naziv, value: poTipu.get(t.id) || 0 };
    }).sort(function (a, b) { return b.value - a.value; });

    const poKorisniku = groupCount(evidencije, function (e) { return e.izvrsio_id; });
    const korisniciRedovi = Array.from(poKorisniku.entries()).map(function (par) {
        const k = korisnici.find(function (x) { return x.id === par[0]; });
        return { label: k ? (k.ime + ' ' + k.prezime) : ('ID ' + par[0]), value: par[1] };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, 5);

    html += '<div class="stat-grid-2">';
    html += statCard('evTipChart', 'Evidencije po tipu', 'Broj unosa po kategoriji njege, sve vrijeme');
    html += statCard('korChart', 'Najaktivniji korisnici', 'Top 5 po broju unesenih evidencija');
    html += '</div>';

    // --- Trend ---
    const poDanu = groupCount(evidencije, function (e) { return e.datum_vrijeme.substring(0, 10); });
    const dani = Array.from(poDanu.keys()).sort().slice(-30);
    const trendPodaci = dani.map(function (d) { return { datum: d, value: poDanu.get(d) }; });

    html += '<div class="stat-card">';
    html += '<div class="stat-card-title">Evidencije po danu</div>';
    html += '<div class="stat-card-sub">Posljednjih ' + trendPodaci.length + ' dana s barem jednim unosom</div>';
    html += '<div class="trend-chart" id="trendChart"></div>';
    html += '</div>';

    // --- Popunjenost po bloku ---
    const lokacijeById = new Map(lokacije.map(function (l) { return [l.id, l]; }));
    const poBloku = groupCount(umirovljenici.filter(function (u) { return u.aktivan; }), function (u) {
        const blok = pronadiBlok(u.lokacija_id, lokacijeById);
        return blok ? blok.naziv : 'Nepoznato';
    });
    const blokRedovi = Array.from(poBloku.entries()).map(function (par) {
        return { label: par[0], value: par[1] };
    }).sort(function (a, b) { return b.value - a.value; });

    html += statCard('blokChart', 'Popunjenost po bloku', 'Broj aktivnih umirovljenika po bloku doma');

    content.innerHTML = html;

    iscrtajBarChart('evTipChart', tipRedovi);
    iscrtajBarChart('korChart', korisniciRedovi);
    iscrtajBarChart('blokChart', blokRedovi);
    iscrtajTrendChart('trendChart', trendPodaci);
}

function statKpi(label, value, sub) {
    return '<div class="kpi-tile"><div class="kpi-label">' + label + '</div>'
        + '<div class="kpi-value">' + value + '</div>'
        + '<div class="kpi-sub">' + sub + '</div></div>';
}

function statCard(id, title, sub) {
    return '<div class="stat-card"><div class="stat-card-title">' + title + '</div>'
        + '<div class="stat-card-sub">' + sub + '</div>'
        + '<div id="' + id + '"></div></div>';
}

function groupCount(niz, kljucFn) {
    const mapa = new Map();
    niz.forEach(function (stavka) {
        const kljuc = kljucFn(stavka);
        mapa.set(kljuc, (mapa.get(kljuc) || 0) + 1);
    });
    return mapa;
}

function pronadiBlok(lokacijaId, lokacijeById) {
    let trenutna = lokacijeById.get(lokacijaId);
    let sigurnosniBrojac = 0;
    while (trenutna && trenutna.tip !== 2 && sigurnosniBrojac < 10) {
        trenutna = lokacijeById.get(trenutna.parent_id);
        sigurnosniBrojac += 1;
    }
    return trenutna && trenutna.tip === 2 ? trenutna : null;
}

function iscrtajBarChart(containerId, redovi) {
    const wrap = document.getElementById(containerId);
    if (!wrap) { return; }

    if (redovi.length === 0 || redovi.every(function (r) { return r.value === 0; })) {
        wrap.innerHTML = '<div class="bar-empty">Nema podataka za prikaz.</div>';
        return;
    }

    const max = Math.max.apply(null, redovi.map(function (r) { return r.value; }));

    let html = '<div class="bar-chart">';
    redovi.forEach(function (r) {
        const posto = max > 0 ? Math.max((r.value / max) * 100, 2) : 0;
        const puna = posto >= 99.5 ? ' full' : '';
        html += '<div class="bar-row">';
        html += '<div class="bar-row-label">' + escHtml(r.label) + '</div>';
        html += '<div class="bar-row-track"><div class="bar-row-fill' + puna + '" style="width:' + posto + '%" tabindex="0" title="' + escHtml(r.label) + ': ' + r.value + '"></div></div>';
        html += '<div class="bar-row-value">' + r.value + '</div>';
        html += '</div>';
    });
    html += '</div>';

    wrap.innerHTML = html;
}

function iscrtajTrendChart(containerId, podaci) {
    const wrap = document.getElementById(containerId);
    if (!wrap) { return; }

    if (podaci.length === 0) {
        wrap.innerHTML = '<div class="trend-empty">Nema evidentiranih dana.</div>';
        return;
    }

    const W = 760, H = 200, PAD_L = 8, PAD_R = 8, PAD_T = 16, PAD_B = 28;
    const max = Math.max.apply(null, podaci.map(function (p) { return p.value; })) || 1;
    const brojTocaka = podaci.length;
    const korakX = brojTocaka > 1 ? (W - PAD_L - PAD_R) / (brojTocaka - 1) : 0;

    function tockaX(i) { return PAD_L + i * korakX; }
    function tockaY(v) { return PAD_T + (H - PAD_T - PAD_B) * (1 - v / max); }

    const tocke = podaci.map(function (p, i) { return [tockaX(i), tockaY(p.value)]; });

    const linija = tocke.map(function (t, i) { return (i === 0 ? 'M' : 'L') + t[0].toFixed(1) + ',' + t[1].toFixed(1); }).join(' ');
    const baznaY = H - PAD_B;
    const podrucje = linija + ' L' + tocke[tocke.length - 1][0].toFixed(1) + ',' + baznaY
        + ' L' + tocke[0][0].toFixed(1) + ',' + baznaY + ' Z';

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    svg += '<line x1="' + PAD_L + '" y1="' + baznaY + '" x2="' + (W - PAD_R) + '" y2="' + baznaY + '" stroke="var(--border)" stroke-width="1"></line>';
    svg += '<path d="' + podrucje + '" fill="var(--accent)" opacity="0.1" stroke="none"></path>';
    svg += '<path d="' + linija + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>';

    tocke.forEach(function (t, i) {
        const opis = formatDatumKratko(podaci[i].datum) + ': ' + podaci[i].value + (podaci[i].value === 1 ? ' unos' : ' unosa');
        svg += '<circle class="trend-dot" cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" r="3.5"></circle>';
        svg += '<circle class="trend-hit" role="img" aria-label="' + escHtml(opis) + '" data-i="' + i + '" cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" r="12"></circle>';
    });

    const prviDatum = formatDatumKratko(podaci[0].datum);
    const zadnjiDatum = formatDatumKratko(podaci[podaci.length - 1].datum);
    svg += '<text x="' + PAD_L + '" y="' + (H - 6) + '" font-size="11" fill="var(--text-muted)">' + prviDatum + '</text>';
    svg += '<text x="' + (W - PAD_R) + '" y="' + (H - 6) + '" font-size="11" fill="var(--text-muted)" text-anchor="end">' + zadnjiDatum + '</text>';

    svg += '</svg>';

    wrap.innerHTML = svg + '<div class="trend-tooltip" id="' + containerId + 'Tooltip"></div>';

    const tooltip = document.getElementById(containerId + 'Tooltip');
    wrap.querySelectorAll('.trend-hit').forEach(function (hit) {
        function prikaziTooltip() {
            const i = parseInt(hit.dataset.i, 10);
            const p = podaci[i];
            tooltip.textContent = formatDatumKratko(p.datum) + ' — ' + p.value + (p.value === 1 ? ' unos' : ' unosa');
            const cx = parseFloat(hit.getAttribute('cx'));
            const cy = parseFloat(hit.getAttribute('cy'));
            tooltip.style.left = (cx / W * 100) + '%';
            tooltip.style.top = (cy / H * 100) + '%';
            tooltip.style.display = 'block';
        }
        hit.addEventListener('pointerenter', prikaziTooltip);
        hit.addEventListener('focus', prikaziTooltip);
        hit.addEventListener('pointerleave', function () { tooltip.style.display = 'none'; });
        hit.addEventListener('blur', function () { tooltip.style.display = 'none'; });
        hit.setAttribute('tabindex', '0');
    });
}

function formatDatumKratko(iso) {
    const djelovi = iso.substring(0, 10).split('-');
    return djelovi.length === 3 ? (djelovi[2] + '.' + djelovi[1] + '.') : iso;
}

function escHtml(tekst) {
    const div = document.createElement('div');
    div.textContent = tekst;
    return div.innerHTML;
}
