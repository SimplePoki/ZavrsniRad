let posjetUrediId = null;
let posSvi = [];
let posUmirovljenici = [];
let posStranica = 1;
let posPoStranici = 10;
let posSortPolje = 'datum';
let posSortSmjer = 'desc';

function posDatumSamo(iso) {
    return iso ? iso.substring(0, 10) : '';
}

function posDatumPrikaz(iso) {
    const dio = posDatumSamo(iso);
    const djelovi = dio.split('-');
    return djelovi.length === 3 ? (djelovi[2] + '.' + djelovi[1] + '.' + djelovi[0] + '.') : dio;
}

async function renderPosjeti(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const [posjetiRez, umirovljeniciRez] = await Promise.all([
        apiGet('/posjeti/index.php'),
        apiGet('/umirovljenici/index.php')
    ]);

    if (!posjetiRez.ok) {
        content.innerHTML = '<p>Greška: ' + posjetiRez.data.error + '</p>';
        return;
    }

    if (!umirovljeniciRez.ok) {
        content.innerHTML = '<p>Greška: ' + umirovljeniciRez.data.error + '</p>';
        return;
    }

    posjetUrediId = null;
    posStranica = 1;
    posSvi = posjetiRez.data;
    posUmirovljenici = umirovljeniciRez.data;

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Posjeti</h1><p class="page-subtitle">Evidencija posjeta rodbine korisnicima doma</p></div>';
    html += '<button id="pToggleFormaBtn" class="btn btn-primary">+ Nova posjeta</button>';
    html += '</div>';

    html += '<div id="pFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="pFormNaslov">Nova posjeta</div>';
    html += '<div class="form-row">';
    html += '<div class="field autocomplete-wrap"><label>Umirovljenik</label>';
    html += '<input id="pUmirovljenikSearch" type="text" placeholder="Upiši ime za pretragu&hellip;" autocomplete="off">';
    html += '<input type="hidden" id="pUmirovljenikId">';
    html += '<div id="pUmirovljenikSuggestions" class="autocomplete-list"></div>';
    html += '</div>';
    html += '<div class="field"><label>Ime posjetitelja</label><input id="pIme" type="text" placeholder="npr. Ivan"></div>';
    html += '<div class="field"><label>Prezime posjetitelja</label><input id="pPrezime" type="text" placeholder="npr. Horvat"></div>';
    html += '<div class="field"><label>Datum</label><input id="pDatum" type="date"></div>';
    html += '<button id="pSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="pOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="pPretraga" type="text" placeholder="Umirovljenik ili posjetitelj&hellip;"></div>';
    html += '<div class="field"><label>Po stranici</label><select id="pPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="pTablicaWrap"></div>';

    content.innerHTML = html;

    postaviAutocompleteUmirovljenika(posUmirovljenici);

    document.getElementById('pSpremiBtn').addEventListener('click', function () {
        spremiPosjet(content);
    });

    document.getElementById('pOdustaniBtn').addEventListener('click', ocistiFormuPosjet);

    document.getElementById('pToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('pFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Nova posjeta' : '× Zatvori formu';
    });

    document.getElementById('pPretraga').addEventListener('input', function () {
        posStranica = 1;
        iscrtajTablicuPosjeta();
    });
    document.getElementById('pPoStranici').addEventListener('change', function () {
        posPoStranici = parseInt(this.value, 10);
        posStranica = 1;
        iscrtajTablicuPosjeta();
    });

    iscrtajTablicuPosjeta();
}

function posUmirovljenikNaziv(umirovljenikId) {
    const um = posUmirovljenici.find(function (u) { return u.id === umirovljenikId; });
    return um ? (um.ime + ' ' + um.prezime) : ('ID ' + umirovljenikId);
}

function iscrtajTablicuPosjeta() {
    const wrap = document.getElementById('pTablicaWrap');
    const upit = document.getElementById('pPretraga').value.trim().toLowerCase();

    const filtrirani = posSvi.filter(function (p) {
        if (upit === '') { return true; }
        const tekst = (posUmirovljenikNaziv(p.umirovljenik_id) + ' ' + p.ime + ' ' + p.prezime).toLowerCase();
        return tekst.includes(upit);
    });

    if (filtrirani.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema posjeta koje odgovaraju filteru.</div></div>';
        return;
    }

    filtrirani.sort(function (a, b) {
        let cmp;
        if (posSortPolje === 'umirovljenik') {
            cmp = posUmirovljenikNaziv(a.umirovljenik_id).localeCompare(posUmirovljenikNaziv(b.umirovljenik_id), 'hr');
        } else {
            cmp = posDatumSamo(a.datum).localeCompare(posDatumSamo(b.datum));
        }
        return posSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirani.length / posPoStranici));
    if (posStranica > ukupnoStranica) { posStranica = ukupnoStranica; }
    if (posStranica < 1) { posStranica = 1; }

    const odIndeksa = (posStranica - 1) * posPoStranici;
    const stranica = filtrirani.slice(odIndeksa, odIndeksa + posPoStranici);

    function strelica(polje) {
        if (posSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (posSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="umirovljenik">Umirovljenik ' + strelica('umirovljenik') + '</th>';
    html += '<th>Ime</th><th>Prezime</th>';
    html += '<th class="th-sortable" data-sort="datum">Datum ' + strelica('datum') + '</th>';
    html += '<th></th></tr></thead><tbody>';

    stranica.forEach(function (p) {
        html += '<tr data-id="' + p.id + '" data-umirovljenik-id="' + p.umirovljenik_id + '" data-ime="' + p.ime + '" data-prezime="' + p.prezime + '" data-datum="' + posDatumSamo(p.datum) + '">';
        html += '<td>' + posUmirovljenikNaziv(p.umirovljenik_id) + '</td><td>' + p.ime + '</td><td>' + p.prezime + '</td><td>' + posDatumPrikaz(p.datum) + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="pPrethodnaBtn" class="btn btn-secondary btn-small"' + (posStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaPosjeti(posStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === posStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="pSljedecaBtn" class="btn btn-secondary btn-small"' + (posStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + posStranica + ' od ' + ukupnoStranica + ' (' + filtrirani.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('pPrethodnaBtn').addEventListener('click', function () {
        posStranica -= 1;
        iscrtajTablicuPosjeta();
    });

    document.getElementById('pSljedecaBtn').addEventListener('click', function () {
        posStranica += 1;
        iscrtajTablicuPosjeta();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            posStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuPosjeta();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (posSortPolje === polje) {
                posSortSmjer = posSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                posSortPolje = polje;
                posSortSmjer = 'asc';
            }
            iscrtajTablicuPosjeta();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');
            const umId = parseInt(red.dataset.umirovljenikId, 10);
            const um = posUmirovljenici.find(function (u) { return u.id === umId; });

            posjetUrediId = red.dataset.id;
            document.getElementById('pUmirovljenikSearch').value = um ? (um.ime + ' ' + um.prezime) : '';
            document.getElementById('pUmirovljenikId').value = um ? um.id : '';
            document.getElementById('pIme').value = red.dataset.ime;
            document.getElementById('pPrezime').value = red.dataset.prezime;
            document.getElementById('pDatum').value = red.dataset.datum;
            document.getElementById('pFormNaslov').textContent = 'Uređivanje posjete';
            document.getElementById('pSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('pOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('pFormaWrap').style.display = '';
            document.getElementById('pToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Obrisati ovu posjetu?')) {
                return;
            }

            const rez = await apiDelete('/posjeti/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderPosjeti(content);
        });
    });
}

function brojeviStranicaPosjeti(trenutna, ukupno) {
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

function postaviAutocompleteUmirovljenika(umirovljenici) {
    const searchInput = document.getElementById('pUmirovljenikSearch');
    const hiddenInput = document.getElementById('pUmirovljenikId');
    const lista = document.getElementById('pUmirovljenikSuggestions');

    function prikaziPrijedloge(tekst) {
        const upit = tekst.trim().toLowerCase();

        if (upit === '') {
            lista.classList.remove('open');
            lista.innerHTML = '';
            return;
        }

        const rezultati = umirovljenici.filter(function (u) {
            return (u.ime + ' ' + u.prezime).toLowerCase().includes(upit);
        });

        if (rezultati.length === 0) {
            lista.innerHTML = '<div class="autocomplete-empty">Nema rezultata</div>';
        } else {
            lista.innerHTML = rezultati.map(function (u) {
                return '<div class="autocomplete-item" data-id="' + u.id + '" data-naziv="' + u.ime + ' ' + u.prezime + '">' + u.ime + ' ' + u.prezime + '</div>';
            }).join('');
        }

        lista.classList.add('open');
    }

    searchInput.addEventListener('input', function () {
        hiddenInput.value = '';
        prikaziPrijedloge(searchInput.value);
    });

    searchInput.addEventListener('focus', function () {
        if (searchInput.value.trim() !== '') {
            prikaziPrijedloge(searchInput.value);
        }
    });

    lista.addEventListener('click', function (e) {
        const stavka = e.target.closest('.autocomplete-item');
        if (!stavka || !stavka.dataset.id) {
            return;
        }

        searchInput.value = stavka.dataset.naziv;
        hiddenInput.value = stavka.dataset.id;
        lista.classList.remove('open');
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.autocomplete-wrap')) {
            lista.classList.remove('open');
        }
    });
}

function ocistiFormuPosjet() {
    posjetUrediId = null;
    document.getElementById('pUmirovljenikSearch').value = '';
    document.getElementById('pUmirovljenikId').value = '';
    document.getElementById('pIme').value = '';
    document.getElementById('pPrezime').value = '';
    document.getElementById('pDatum').value = '';
    document.getElementById('pFormNaslov').textContent = 'Nova posjeta';
    document.getElementById('pSpremiBtn').textContent = 'Dodaj';
    document.getElementById('pOdustaniBtn').style.display = 'none';
    document.getElementById('pFormaWrap').style.display = 'none';
    document.getElementById('pToggleFormaBtn').textContent = '+ Nova posjeta';
}

async function spremiPosjet(content) {
    const umirovljenikId = document.getElementById('pUmirovljenikId').value;

    if (!umirovljenikId) {
        alert('Odaberi umirovljenika s popisa (počni tipkati ime, pa klikni ponuđenu stavku).');
        return;
    }

    const podaci = {
        umirovljenik_id: parseInt(umirovljenikId, 10),
        ime: document.getElementById('pIme').value,
        prezime: document.getElementById('pPrezime').value,
        datum: document.getElementById('pDatum').value
    };

    let rez;
    if (posjetUrediId === null) {
        rez = await apiPost('/posjeti/index.php', podaci);
    } else {
        rez = await apiPut('/posjeti/item.php?id=' + posjetUrediId, podaci);
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderPosjeti(content);
}
