let teUrediId = null;
let teSvi = [];
let teStranica = 1;
let tePoStranici = 10;
let teSortPolje = 'id';
let teSortSmjer = 'asc';

async function renderTipEvidencije(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const rez = await apiGet('/tip_evidencije/index.php');

    if (!rez.ok) {
        content.innerHTML = '<p>Greška: ' + rez.data.error + '</p>';
        return;
    }

    teUrediId = null;
    teStranica = 1;
    teSvi = rez.data;

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Tipovi evidencije</h1><p class="page-subtitle">Kategorije radnji njege (konfiguracija sustava)</p></div>';
    html += '<button id="teToggleFormaBtn" class="btn btn-primary">+ Novi tip</button>';
    html += '</div>';

    html += '<div id="teFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="teFormNaslov">Novi tip evidencije</div>';
    html += '<div class="form-row">';
    html += '<div class="field" id="teIdWrap"><label>ID</label><input id="teId" type="number" placeholder="npr. 7"></div>';
    html += '<div class="field"><label>Naziv</label><input id="teNaziv" type="text" placeholder="npr. Prehrana i tekućina"></div>';
    html += '<div class="field" style="flex:1; min-width:240px;"><label>Opis</label><input id="teOpis" type="text" placeholder="Kratki opis kategorije"></div>';
    html += '<button id="teSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="teOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="tePretraga" type="text" placeholder="Naziv ili opis&hellip;"></div>';
    html += '<div class="field"><label>Status</label><select id="teFiltarAktivan">';
    html += '<option value="">Svi</option><option value="1">Aktivni</option><option value="0">Neaktivni</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="tePoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="teTablicaWrap"></div>';

    content.innerHTML = html;

    document.getElementById('teSpremiBtn').addEventListener('click', function () {
        spremiTipEvidencije(content);
    });

    document.getElementById('teOdustaniBtn').addEventListener('click', ocistiFormuTipEvidencije);

    document.getElementById('teToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('teFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Novi tip' : '× Zatvori formu';
    });

    document.getElementById('tePretraga').addEventListener('input', function () {
        teStranica = 1;
        iscrtajTablicuTipEvidencije();
    });
    document.getElementById('teFiltarAktivan').addEventListener('change', function () {
        teStranica = 1;
        iscrtajTablicuTipEvidencije();
    });
    document.getElementById('tePoStranici').addEventListener('change', function () {
        tePoStranici = parseInt(this.value, 10);
        teStranica = 1;
        iscrtajTablicuTipEvidencije();
    });

    iscrtajTablicuTipEvidencije();
}

function iscrtajTablicuTipEvidencije() {
    const wrap = document.getElementById('teTablicaWrap');
    const upit = document.getElementById('tePretraga').value.trim().toLowerCase();
    const filtarAktivan = document.getElementById('teFiltarAktivan').value;

    const filtrirani = teSvi.filter(function (t) {
        if (upit !== '' && !(t.naziv + ' ' + t.opis).toLowerCase().includes(upit)) {
            return false;
        }
        if (filtarAktivan !== '' && (t.aktivan ? 1 : 0) !== parseInt(filtarAktivan, 10)) {
            return false;
        }
        return true;
    });

    if (filtrirani.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema tipova evidencije koji odgovaraju filteru.</div></div>';
        return;
    }

    filtrirani.sort(function (a, b) {
        if (teSortPolje === 'id') {
            return teSortSmjer === 'asc' ? a.id - b.id : b.id - a.id;
        }
        const cmp = a[teSortPolje].localeCompare(b[teSortPolje], 'hr');
        return teSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirani.length / tePoStranici));
    if (teStranica > ukupnoStranica) { teStranica = ukupnoStranica; }
    if (teStranica < 1) { teStranica = 1; }

    const odIndeksa = (teStranica - 1) * tePoStranici;
    const stranica = filtrirani.slice(odIndeksa, odIndeksa + tePoStranici);

    function strelica(polje) {
        if (teSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (teSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="id">ID ' + strelica('id') + '</th>';
    html += '<th class="th-sortable" data-sort="naziv">Naziv ' + strelica('naziv') + '</th>';
    html += '<th>Opis</th><th>Aktivan</th><th></th></tr></thead><tbody>';

    stranica.forEach(function (t) {
        const badge = t.aktivan
            ? '<span class="badge badge-success">Da</span>'
            : '<span class="badge badge-neutral">Ne</span>';

        html += '<tr data-id="' + t.id + '" data-naziv="' + t.naziv + '" data-opis="' + t.opis + '">';
        html += '<td>' + t.id + '</td><td>' + t.naziv + '</td><td>' + t.opis + '</td><td>' + badge + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="tePrethodnaBtn" class="btn btn-secondary btn-small"' + (teStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaTipEvidencije(teStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === teStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="teSljedecaBtn" class="btn btn-secondary btn-small"' + (teStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + teStranica + ' od ' + ukupnoStranica + ' (' + filtrirani.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('tePrethodnaBtn').addEventListener('click', function () {
        teStranica -= 1;
        iscrtajTablicuTipEvidencije();
    });

    document.getElementById('teSljedecaBtn').addEventListener('click', function () {
        teStranica += 1;
        iscrtajTablicuTipEvidencije();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            teStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuTipEvidencije();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (teSortPolje === polje) {
                teSortSmjer = teSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                teSortPolje = polje;
                teSortSmjer = 'asc';
            }
            iscrtajTablicuTipEvidencije();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');

            teUrediId = red.dataset.id;
            document.getElementById('teId').value = red.dataset.id;
            document.getElementById('teId').disabled = true;
            document.getElementById('teNaziv').value = red.dataset.naziv;
            document.getElementById('teOpis').value = red.dataset.opis;
            document.getElementById('teFormNaslov').textContent = 'Uređivanje tipa evidencije';
            document.getElementById('teSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('teOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('teFormaWrap').style.display = '';
            document.getElementById('teToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Deaktivirati ovaj tip evidencije?')) {
                return;
            }

            const rez = await apiDelete('/tip_evidencije/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderTipEvidencije(content);
        });
    });
}

function brojeviStranicaTipEvidencije(trenutna, ukupno) {
    const brojevi = [];
    const raspon = 2;
    let prethodni = 0;

    for (let i = 1; i <= ukupno; i++) {
        if (i === 1 || i === ukupno || (i >= trenutna - raspon && i <= trenutna + raspon)) {
            if (prethodni && i - prethodni > 1) {
                brojevi.push('...');
            }
            brojevi.push(i);
            prethodni = i;
        }
    }

    return brojevi;
}

function ocistiFormuTipEvidencije() {
    teUrediId = null;
    document.getElementById('teId').value = '';
    document.getElementById('teId').disabled = false;
    document.getElementById('teNaziv').value = '';
    document.getElementById('teOpis').value = '';
    document.getElementById('teFormNaslov').textContent = 'Novi tip evidencije';
    document.getElementById('teSpremiBtn').textContent = 'Dodaj';
    document.getElementById('teOdustaniBtn').style.display = 'none';
    document.getElementById('teFormaWrap').style.display = 'none';
    document.getElementById('teToggleFormaBtn').textContent = '+ Novi tip';
}

async function spremiTipEvidencije(content) {
    const naziv = document.getElementById('teNaziv').value.trim();
    const opis = document.getElementById('teOpis').value.trim();

    if (!naziv || !opis) {
        alert('Naziv i opis su obavezni.');
        return;
    }

    let rez;
    if (teUrediId === null) {
        const id = document.getElementById('teId').value;

        if (!id) {
            alert('ID je obavezan.');
            return;
        }

        rez = await apiPost('/tip_evidencije/index.php', { id: parseInt(id, 10), naziv: naziv, opis: opis });
    } else {
        rez = await apiPut('/tip_evidencije/item.php?id=' + teUrediId, { naziv: naziv, opis: opis });
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderTipEvidencije(content);
}
