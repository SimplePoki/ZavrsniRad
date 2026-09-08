let smjUrediId = null;
let smjSve = [];
let smjKorisnici = [];
let smjStranica = 1;
let smjPoStranici = 10;
let smjSortPolje = 'datum';
let smjSortSmjer = 'desc';

function smjDatumSamo(iso) {
    return iso ? iso.substring(0, 10) : '';
}

function smjDatumPrikaz(iso) {
    const dio = smjDatumSamo(iso);
    const djelovi = dio.split('-');
    return djelovi.length === 3 ? (djelovi[2] + '.' + djelovi[1] + '.' + djelovi[0] + '.') : dio;
}

function smjKorisnikNaziv(korisnikId) {
    const k = smjKorisnici.find(function (x) { return x.id === korisnikId; });
    return k ? (k.ime + ' ' + k.prezime) : ('ID ' + korisnikId);
}

async function renderSmjene(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const [smjRez, korRez] = await Promise.all([
        apiGet('/smjene/index.php'),
        apiGet('/korisnici/index.php')
    ]);

    if (!smjRez.ok) {
        content.innerHTML = '<p>Greška: ' + smjRez.data.error + '</p>';
        return;
    }

    if (!korRez.ok) {
        content.innerHTML = '<p>Greška: ' + korRez.data.error + '</p>';
        return;
    }

    smjUrediId = null;
    smjStranica = 1;
    smjSve = smjRez.data;
    smjKorisnici = korRez.data.slice().sort(function (a, b) {
        return a.prezime.localeCompare(b.prezime, 'hr');
    });

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Smjene</h1><p class="page-subtitle">Raspored smjena osoblja</p></div>';
    html += '<button id="smjToggleFormaBtn" class="btn btn-primary">+ Nova smjena</button>';
    html += '</div>';

    html += '<div id="smjFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="smjFormNaslov">Nova smjena</div>';
    html += '<div class="form-row">';
    html += '<div class="field"><label>Korisnik</label><select id="smjKorisnikId">';
    html += '<option value="">Odaberi korisnika&hellip;</option>';
    smjKorisnici.forEach(function (k) {
        html += '<option value="' + k.id + '">' + k.ime + ' ' + k.prezime + '</option>';
    });
    html += '</select></div>';
    html += '<div class="field"><label>Datum</label><input id="smjDatum" type="date"></div>';
    html += '<div class="field"><label>Smjena</label><select id="smjSmjena">';
    html += '<option value="">Odaberi smjenu&hellip;</option>';
    html += '<option value="1">1. smjena</option><option value="2">2. smjena</option><option value="3">3. smjena</option>';
    html += '</select></div>';
    html += '<button id="smjSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="smjOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="smjPretraga" type="text" placeholder="Ime ili prezime korisnika&hellip;"></div>';
    html += '<div class="field"><label>Smjena</label><select id="smjFiltarSmjena"><option value="">Sve smjene</option>';
    html += '<option value="1">1. smjena</option><option value="2">2. smjena</option><option value="3">3. smjena</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="smjPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="smjTablicaWrap"></div>';

    content.innerHTML = html;

    document.getElementById('smjSpremiBtn').addEventListener('click', function () {
        spremiSmjenu(content);
    });

    document.getElementById('smjOdustaniBtn').addEventListener('click', ocistiFormuSmjena);

    document.getElementById('smjToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('smjFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Nova smjena' : '× Zatvori formu';
    });

    document.getElementById('smjPretraga').addEventListener('input', function () {
        smjStranica = 1;
        iscrtajTablicuSmjena();
    });
    document.getElementById('smjFiltarSmjena').addEventListener('change', function () {
        smjStranica = 1;
        iscrtajTablicuSmjena();
    });
    document.getElementById('smjPoStranici').addEventListener('change', function () {
        smjPoStranici = parseInt(this.value, 10);
        smjStranica = 1;
        iscrtajTablicuSmjena();
    });

    iscrtajTablicuSmjena();
}

function iscrtajTablicuSmjena() {
    const wrap = document.getElementById('smjTablicaWrap');
    const upit = document.getElementById('smjPretraga').value.trim().toLowerCase();
    const filtarSmjena = document.getElementById('smjFiltarSmjena').value;

    const filtrirane = smjSve.filter(function (s) {
        if (upit !== '' && !smjKorisnikNaziv(s.korisnik_id).toLowerCase().includes(upit)) {
            return false;
        }
        if (filtarSmjena !== '' && s.smjena !== parseInt(filtarSmjena, 10)) {
            return false;
        }
        return true;
    });

    if (filtrirane.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema smjena koje odgovaraju filteru.</div></div>';
        return;
    }

    filtrirane.sort(function (a, b) {
        let cmp;
        if (smjSortPolje === 'korisnik') {
            cmp = smjKorisnikNaziv(a.korisnik_id).localeCompare(smjKorisnikNaziv(b.korisnik_id), 'hr');
        } else if (smjSortPolje === 'smjena') {
            cmp = a.smjena - b.smjena;
        } else {
            cmp = smjDatumSamo(a.datum).localeCompare(smjDatumSamo(b.datum));
        }
        return smjSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirane.length / smjPoStranici));
    if (smjStranica > ukupnoStranica) { smjStranica = ukupnoStranica; }
    if (smjStranica < 1) { smjStranica = 1; }

    const odIndeksa = (smjStranica - 1) * smjPoStranici;
    const stranica = filtrirane.slice(odIndeksa, odIndeksa + smjPoStranici);

    function strelica(polje) {
        if (smjSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (smjSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="korisnik">Korisnik ' + strelica('korisnik') + '</th>';
    html += '<th class="th-sortable" data-sort="datum">Datum ' + strelica('datum') + '</th>';
    html += '<th class="th-sortable" data-sort="smjena">Smjena ' + strelica('smjena') + '</th>';
    html += '<th></th></tr></thead><tbody>';

    stranica.forEach(function (s) {
        html += '<tr data-id="' + s.id + '" data-korisnik-id="' + s.korisnik_id + '" data-datum="' + smjDatumSamo(s.datum) + '" data-smjena="' + s.smjena + '">';
        html += '<td>' + smjKorisnikNaziv(s.korisnik_id) + '</td><td>' + smjDatumPrikaz(s.datum) + '</td><td>' + s.smjena + '. smjena</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="smjPrethodnaBtn" class="btn btn-secondary btn-small"' + (smjStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaSmjene(smjStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === smjStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="smjSljedecaBtn" class="btn btn-secondary btn-small"' + (smjStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + smjStranica + ' od ' + ukupnoStranica + ' (' + filtrirane.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('smjPrethodnaBtn').addEventListener('click', function () {
        smjStranica -= 1;
        iscrtajTablicuSmjena();
    });

    document.getElementById('smjSljedecaBtn').addEventListener('click', function () {
        smjStranica += 1;
        iscrtajTablicuSmjena();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            smjStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuSmjena();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (smjSortPolje === polje) {
                smjSortSmjer = smjSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                smjSortPolje = polje;
                smjSortSmjer = 'asc';
            }
            iscrtajTablicuSmjena();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');

            smjUrediId = red.dataset.id;
            document.getElementById('smjKorisnikId').value = red.dataset.korisnikId;
            document.getElementById('smjDatum').value = red.dataset.datum;
            document.getElementById('smjSmjena').value = red.dataset.smjena;
            document.getElementById('smjFormNaslov').textContent = 'Uređivanje smjene';
            document.getElementById('smjSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('smjOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('smjFormaWrap').style.display = '';
            document.getElementById('smjToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Obrisati ovu smjenu?')) {
                return;
            }

            const rez = await apiDelete('/smjene/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderSmjene(content);
        });
    });
}

function brojeviStranicaSmjene(trenutna, ukupno) {
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

function ocistiFormuSmjena() {
    smjUrediId = null;
    document.getElementById('smjKorisnikId').value = '';
    document.getElementById('smjDatum').value = '';
    document.getElementById('smjSmjena').value = '';
    document.getElementById('smjFormNaslov').textContent = 'Nova smjena';
    document.getElementById('smjSpremiBtn').textContent = 'Dodaj';
    document.getElementById('smjOdustaniBtn').style.display = 'none';
    document.getElementById('smjFormaWrap').style.display = 'none';
    document.getElementById('smjToggleFormaBtn').textContent = '+ Nova smjena';
}

async function spremiSmjenu(content) {
    const korisnikId = document.getElementById('smjKorisnikId').value;
    const datum = document.getElementById('smjDatum').value;
    const smjena = document.getElementById('smjSmjena').value;

    if (!korisnikId) {
        alert('Odaberi korisnika.');
        return;
    }

    if (!datum) {
        alert('Odaberi datum.');
        return;
    }

    if (!smjena) {
        alert('Odaberi smjenu.');
        return;
    }

    const podaci = {
        korisnik_id: parseInt(korisnikId, 10),
        datum: datum,
        smjena: parseInt(smjena, 10)
    };

    let rez;
    if (smjUrediId === null) {
        rez = await apiPost('/smjene/index.php', podaci);
    } else {
        rez = await apiPut('/smjene/item.php?id=' + smjUrediId, podaci);
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderSmjene(content);
}
