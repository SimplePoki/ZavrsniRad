let umUrediId = null;
let umSvi = [];
let umLokacije = [];
let umSobe = [];
let umStranica = 1;
let umPoStranici = 10;
let umSortPolje = 'prezime';
let umSortSmjer = 'asc';

async function renderUmirovljenici(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const [umRez, lokRez] = await Promise.all([
        apiGet('/umirovljenici/index.php'),
        apiGet('/lokacije/index.php')
    ]);

    if (!umRez.ok) {
        content.innerHTML = '<p>Greška: ' + umRez.data.error + '</p>';
        return;
    }

    if (!lokRez.ok) {
        content.innerHTML = '<p>Greška: ' + lokRez.data.error + '</p>';
        return;
    }

    umUrediId = null;
    umStranica = 1;
    umSvi = umRez.data;
    umLokacije = lokRez.data;
    umSobe = umLokacije.filter(function (l) { return l.tip === 4; }).sort(function (a, b) {
        return a.naziv.localeCompare(b.naziv);
    });

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Umirovljenici</h1><p class="page-subtitle">Popis korisnika doma</p></div>';
    html += '<button id="uToggleFormaBtn" class="btn btn-primary">+ Novi umirovljenik</button>';
    html += '</div>';

    html += '<div id="uFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="uFormNaslov">Novi umirovljenik</div>';
    html += '<div class="form-row">';
    html += '<div class="field"><label>Ime</label><input id="uIme" type="text" placeholder="npr. Ivan"></div>';
    html += '<div class="field"><label>Prezime</label><input id="uPrezime" type="text" placeholder="npr. Horvat"></div>';
    html += '<div class="field"><label>Lokacija (soba)</label><select id="uLokacijaId">';
    html += '<option value="">Odaberi sobu&hellip;</option>';
    umSobe.forEach(function (s) {
        html += '<option value="' + s.id + '">' + s.naziv + '</option>';
    });
    html += '</select></div>';
    html += '<button id="uSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="uOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="uPretraga" type="text" placeholder="Ime ili prezime&hellip;"></div>';
    html += '<div class="field"><label>Lokacija</label><select id="uFiltarLokacija"><option value="">Sve lokacije</option>';
    umSobe.forEach(function (s) {
        html += '<option value="' + s.id + '">' + s.naziv + '</option>';
    });
    html += '</select></div>';
    html += '<div class="field"><label>Status</label><select id="uFiltarAktivan">';
    html += '<option value="">Svi</option><option value="1">Aktivni</option><option value="0">Neaktivni</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="uPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="uTablicaWrap"></div>';

    content.innerHTML = html;

    document.getElementById('uSpremiBtn').addEventListener('click', function () {
        spremiUmirovljenika(content);
    });

    document.getElementById('uOdustaniBtn').addEventListener('click', ocistiFormuUmirovljenik);

    document.getElementById('uToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('uFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Novi umirovljenik' : '× Zatvori formu';
    });

    document.getElementById('uPretraga').addEventListener('input', function () {
        umStranica = 1;
        iscrtajTablicuUmirovljenika();
    });
    document.getElementById('uFiltarLokacija').addEventListener('change', function () {
        umStranica = 1;
        iscrtajTablicuUmirovljenika();
    });
    document.getElementById('uFiltarAktivan').addEventListener('change', function () {
        umStranica = 1;
        iscrtajTablicuUmirovljenika();
    });
    document.getElementById('uPoStranici').addEventListener('change', function () {
        umPoStranici = parseInt(this.value, 10);
        umStranica = 1;
        iscrtajTablicuUmirovljenika();
    });

    iscrtajTablicuUmirovljenika();
}

function iscrtajTablicuUmirovljenika() {
    const wrap = document.getElementById('uTablicaWrap');
    const upit = document.getElementById('uPretraga').value.trim().toLowerCase();
    const filtarLokacija = document.getElementById('uFiltarLokacija').value;
    const filtarAktivan = document.getElementById('uFiltarAktivan').value;

    const filtrirani = umSvi.filter(function (u) {
        if (upit !== '' && !(u.ime + ' ' + u.prezime).toLowerCase().includes(upit)) {
            return false;
        }
        if (filtarLokacija !== '' && u.lokacija_id !== parseInt(filtarLokacija, 10)) {
            return false;
        }
        if (filtarAktivan !== '' && (u.aktivan ? 1 : 0) !== parseInt(filtarAktivan, 10)) {
            return false;
        }
        return true;
    });

    if (filtrirani.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema umirovljenika koji odgovaraju filteru.</div></div>';
        return;
    }

    filtrirani.sort(function (a, b) {
        const cmp = a[umSortPolje].localeCompare(b[umSortPolje], 'hr');
        return umSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirani.length / umPoStranici));
    if (umStranica > ukupnoStranica) { umStranica = ukupnoStranica; }
    if (umStranica < 1) { umStranica = 1; }

    const odIndeksa = (umStranica - 1) * umPoStranici;
    const stranica = filtrirani.slice(odIndeksa, odIndeksa + umPoStranici);

    function strelica(polje) {
        if (umSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (umSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="ime">Ime ' + strelica('ime') + '</th>';
    html += '<th class="th-sortable" data-sort="prezime">Prezime ' + strelica('prezime') + '</th>';
    html += '<th>Lokacija</th><th>Aktivan</th><th></th></tr></thead><tbody>';

    stranica.forEach(function (u) {
        const lok = umLokacije.find(function (l) { return l.id === u.lokacija_id; });
        const lokNaziv = lok ? lok.naziv : ('ID ' + u.lokacija_id);

        const badge = u.aktivan
            ? '<span class="badge badge-success">Da</span>'
            : '<span class="badge badge-neutral">Ne</span>';

        html += '<tr data-id="' + u.id + '" data-ime="' + u.ime + '" data-prezime="' + u.prezime + '" data-lokacija-id="' + u.lokacija_id + '">';
        html += '<td>' + u.ime + '</td><td>' + u.prezime + '</td><td>' + lokNaziv + '</td><td>' + badge + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="uPrethodnaBtn" class="btn btn-secondary btn-small"' + (umStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaUmirovljenici(umStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === umStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="uSljedecaBtn" class="btn btn-secondary btn-small"' + (umStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + umStranica + ' od ' + ukupnoStranica + ' (' + filtrirani.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('uPrethodnaBtn').addEventListener('click', function () {
        umStranica -= 1;
        iscrtajTablicuUmirovljenika();
    });

    document.getElementById('uSljedecaBtn').addEventListener('click', function () {
        umStranica += 1;
        iscrtajTablicuUmirovljenika();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            umStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuUmirovljenika();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (umSortPolje === polje) {
                umSortSmjer = umSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                umSortPolje = polje;
                umSortSmjer = 'asc';
            }
            iscrtajTablicuUmirovljenika();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');

            umUrediId = red.dataset.id;
            document.getElementById('uIme').value = red.dataset.ime;
            document.getElementById('uPrezime').value = red.dataset.prezime;
            document.getElementById('uLokacijaId').value = red.dataset.lokacijaId;
            document.getElementById('uFormNaslov').textContent = 'Uređivanje umirovljenika';
            document.getElementById('uSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('uOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('uFormaWrap').style.display = '';
            document.getElementById('uToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Deaktivirati ovog umirovljenika?')) {
                return;
            }

            const rez = await apiDelete('/umirovljenici/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderUmirovljenici(content);
        });
    });
}

function brojeviStranicaUmirovljenici(trenutna, ukupno) {
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

function ocistiFormuUmirovljenik() {
    umUrediId = null;
    document.getElementById('uIme').value = '';
    document.getElementById('uPrezime').value = '';
    document.getElementById('uLokacijaId').value = '';
    document.getElementById('uFormNaslov').textContent = 'Novi umirovljenik';
    document.getElementById('uSpremiBtn').textContent = 'Dodaj';
    document.getElementById('uOdustaniBtn').style.display = 'none';
    document.getElementById('uFormaWrap').style.display = 'none';
    document.getElementById('uToggleFormaBtn').textContent = '+ Novi umirovljenik';
}

async function spremiUmirovljenika(content) {
    const ime = document.getElementById('uIme').value.trim();
    const prezime = document.getElementById('uPrezime').value.trim();
    const lokacijaId = document.getElementById('uLokacijaId').value;

    if (!ime || !prezime) {
        alert('Ime i prezime su obavezni.');
        return;
    }

    if (!lokacijaId) {
        alert('Odaberi sobu iz popisa.');
        return;
    }

    const podaci = {
        ime: ime,
        prezime: prezime,
        lokacija_id: parseInt(lokacijaId, 10)
    };

    let rez;
    if (umUrediId === null) {
        rez = await apiPost('/umirovljenici/index.php', podaci);
    } else {
        rez = await apiPut('/umirovljenici/item.php?id=' + umUrediId, podaci);
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderUmirovljenici(content);
}
