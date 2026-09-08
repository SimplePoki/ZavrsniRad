let evUrediId = null;
let evSelectedTipId = null;
let evSelectedAkcijaId = null;
let evSvi = [];
let evUmirovljenici = [];
let evTipovi = [];
let evAkcije = [];
let evStranica = 1;
let evPoStranici = 10;
let evSortPolje = 'kad';
let evSortSmjer = 'desc';

function evUmirovljenikNaziv(e) {
    const um = evUmirovljenici.find(function (u) { return u.id === e.umirovljenik_id; });
    return um ? (um.ime + ' ' + um.prezime) : (e.lokacija_id ? 'Lokacija #' + e.lokacija_id : '—');
}

function evTipNaziv(e) {
    const tip = evTipovi.find(function (t) { return t.id === e.akcija_tip_id; });
    return tip ? tip.naziv : '—';
}

function evAkcijaNaziv(e) {
    const akc = evAkcije.find(function (a) { return a.id === e.akcija_id && a.tip_id === e.akcija_tip_id; });
    return akc ? akc.naziv : '—';
}

function evVrijednostTekst(e) {
    if (e.vrijednost_num !== null) { return String(e.vrijednost_num); }
    if (e.vrijednost_string !== null) { return e.vrijednost_string; }
    if (e.vrijednost_bool !== null) { return e.vrijednost_bool ? 'Da' : 'Ne'; }
    return '';
}

async function renderEvidencije(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const [evRez, umRez, tipRez, akcRez] = await Promise.all([
        apiGet('/evidencije/index.php'),
        apiGet('/umirovljenici/index.php'),
        apiGet('/tip_evidencije/index.php'),
        apiGet('/akcije/index.php')
    ]);

    if (!evRez.ok) { content.innerHTML = '<p>Greška: ' + evRez.data.error + '</p>'; return; }
    if (!umRez.ok) { content.innerHTML = '<p>Greška: ' + umRez.data.error + '</p>'; return; }
    if (!tipRez.ok) { content.innerHTML = '<p>Greška: ' + tipRez.data.error + '</p>'; return; }
    if (!akcRez.ok) { content.innerHTML = '<p>Greška: ' + akcRez.data.error + '</p>'; return; }

    evUrediId = null;
    evStranica = 1;
    evSvi = evRez.data;
    evUmirovljenici = umRez.data;
    evTipovi = tipRez.data;
    evAkcije = akcRez.data;
    evSelectedTipId = null;
    evSelectedAkcijaId = null;

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Evidencije</h1><p class="page-subtitle">Bilježenje izvršenih radnji njege</p></div>';
    html += '<button id="evToggleFormaBtn" class="btn btn-primary">+ Nova evidencija</button>';
    html += '</div>';

    html += '<div id="evFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="evFormNaslov">Nova evidencija</div>';

    html += '<div id="evOdabirWrap">';
    html += '<div class="form-row" style="margin-bottom:18px;">';
    html += '<div class="field autocomplete-wrap"><label>Umirovljenik</label>';
    html += '<input id="evUmirovljenikSearch" type="text" placeholder="Upiši ime za pretragu&hellip;" autocomplete="off">';
    html += '<input type="hidden" id="evUmirovljenikId">';
    html += '<div id="evUmirovljenikSuggestions" class="autocomplete-list"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div style="margin-bottom:16px;">';
    html += '<label class="form-section-label">Tip evidencije</label>';
    html += '<div class="pill-row" id="evTipoviPills">';
    if (evTipovi.length === 0) {
        html += '<span class="empty-hint">Nema definiranih tipova evidencije</span>';
    } else {
        evTipovi.forEach(function (t) {
            html += '<button type="button" class="pill" data-tip-id="' + t.id + '">' + t.naziv + '</button>';
        });
    }
    html += '</div>';
    html += '</div>';

    html += '<div style="margin-bottom:18px;">';
    html += '<label class="form-section-label">Akcija</label>';
    html += '<div class="pill-row" id="evAkcijePills"><span class="empty-hint">Prvo odaberi tip evidencije</span></div>';
    html += '</div>';
    html += '</div>';

    html += '<div id="evUredSummary" style="display:none; margin-bottom:16px; font-size:13.5px; color:var(--text-secondary);"></div>';

    html += '<div class="form-row">';
    html += '<div class="field"><label>Vrijednost</label><input id="evVrijednost" type="text" placeholder="npr. 200, 36.6, Da&hellip;"></div>';
    html += '<div class="field" style="flex:1; min-width:240px;"><label>Napomena</label><input id="evOpis" type="text" placeholder="neobavezno"></div>';
    html += '<button id="evSpremiBtn" class="btn btn-primary">Spremi evidenciju</button>';
    html += '<button id="evOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';

    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="evPretraga" type="text" placeholder="Umirovljenik, akcija, napomena&hellip;"></div>';
    html += '<div class="field"><label>Tip evidencije</label><select id="evFiltarTip"><option value="">Svi tipovi</option>';
    evTipovi.forEach(function (t) {
        html += '<option value="' + t.id + '">' + t.naziv + '</option>';
    });
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="evPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="evTablicaWrap"></div>';

    content.innerHTML = html;

    postaviAutocompleteUmirovljenikaEvidencija();

    document.getElementById('evTipoviPills').addEventListener('click', function (e) {
        const pill = e.target.closest('.pill');
        if (!pill || !pill.dataset.tipId) {
            return;
        }

        evSelectedTipId = parseInt(pill.dataset.tipId, 10);
        evSelectedAkcijaId = null;

        document.querySelectorAll('#evTipoviPills .pill').forEach(function (p) {
            p.classList.remove('pill-active');
        });
        pill.classList.add('pill-active');

        prikaziAkcijeZaTip(evSelectedTipId);
    });

    document.getElementById('evSpremiBtn').addEventListener('click', function () {
        spremiEvidenciju(content);
    });

    document.getElementById('evOdustaniBtn').addEventListener('click', ocistiFormuEvidencija);

    document.getElementById('evToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('evFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Nova evidencija' : '× Zatvori formu';
    });

    document.getElementById('evPretraga').addEventListener('input', function () {
        evStranica = 1;
        iscrtajTablicuEvidencija();
    });
    document.getElementById('evFiltarTip').addEventListener('change', function () {
        evStranica = 1;
        iscrtajTablicuEvidencija();
    });
    document.getElementById('evPoStranici').addEventListener('change', function () {
        evPoStranici = parseInt(this.value, 10);
        evStranica = 1;
        iscrtajTablicuEvidencija();
    });

    iscrtajTablicuEvidencija();
}

function iscrtajTablicuEvidencija() {
    const wrap = document.getElementById('evTablicaWrap');
    const upit = document.getElementById('evPretraga').value.trim().toLowerCase();
    const filtarTip = document.getElementById('evFiltarTip').value;

    const filtrirane = evSvi.filter(function (e) {
        if (filtarTip !== '' && e.akcija_tip_id !== parseInt(filtarTip, 10)) {
            return false;
        }
        if (upit !== '') {
            const tekst = (evUmirovljenikNaziv(e) + ' ' + evTipNaziv(e) + ' ' + evAkcijaNaziv(e) + ' ' + (e.opis || '')).toLowerCase();
            if (!tekst.includes(upit)) {
                return false;
            }
        }
        return true;
    });

    if (filtrirane.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema evidencija koje odgovaraju filteru.</div></div>';
        return;
    }

    filtrirane.sort(function (a, b) {
        let cmp;
        if (evSortPolje === 'umirovljenik') {
            cmp = evUmirovljenikNaziv(a).localeCompare(evUmirovljenikNaziv(b), 'hr');
        } else if (evSortPolje === 'tip') {
            cmp = evTipNaziv(a).localeCompare(evTipNaziv(b), 'hr');
        } else {
            cmp = a.datum_vrijeme < b.datum_vrijeme ? -1 : (a.datum_vrijeme > b.datum_vrijeme ? 1 : 0);
        }
        return evSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirane.length / evPoStranici));
    if (evStranica > ukupnoStranica) { evStranica = ukupnoStranica; }
    if (evStranica < 1) { evStranica = 1; }

    const odIndeksa = (evStranica - 1) * evPoStranici;
    const stranica = filtrirane.slice(odIndeksa, odIndeksa + evPoStranici);

    function strelica(polje) {
        if (evSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (evSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="umirovljenik">Umirovljenik ' + strelica('umirovljenik') + '</th>';
    html += '<th class="th-sortable" data-sort="tip">Tip ' + strelica('tip') + '</th>';
    html += '<th>Akcija</th><th>Vrijednost</th>';
    html += '<th class="th-sortable" data-sort="kad">Kad ' + strelica('kad') + '</th>';
    html += '<th></th></tr></thead><tbody>';

    stranica.forEach(function (e) {
        let vrijednostPrikaz = evVrijednostTekst(e);
        if (e.opis) {
            vrijednostPrikaz += (vrijednostPrikaz !== '' ? ' ' : '') + '<span style="color:var(--text-muted);">(' + e.opis + ')</span>';
        }

        const kad = new Date(e.datum_vrijeme).toLocaleString('hr-HR');

        html += '<tr data-id="' + e.id + '" data-vrijednost="' + evVrijednostTekst(e).replace(/"/g, '&quot;') + '" data-opis="' + (e.opis || '') + '">';
        html += '<td>' + evUmirovljenikNaziv(e) + '</td>';
        html += '<td>' + evTipNaziv(e) + '</td>';
        html += '<td>' + evAkcijaNaziv(e) + '</td>';
        html += '<td>' + vrijednostPrikaz + '</td>';
        html += '<td>' + kad + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="evPrethodnaBtn" class="btn btn-secondary btn-small"' + (evStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaEvidencije(evStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === evStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="evSljedecaBtn" class="btn btn-secondary btn-small"' + (evStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + evStranica + ' od ' + ukupnoStranica + ' (' + filtrirane.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('evPrethodnaBtn').addEventListener('click', function () {
        evStranica -= 1;
        iscrtajTablicuEvidencija();
    });

    document.getElementById('evSljedecaBtn').addEventListener('click', function () {
        evStranica += 1;
        iscrtajTablicuEvidencija();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            evStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuEvidencija();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (evSortPolje === polje) {
                evSortSmjer = evSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                evSortPolje = polje;
                evSortSmjer = 'asc';
            }
            iscrtajTablicuEvidencija();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');
            const e = evSvi.find(function (x) { return String(x.id) === red.dataset.id; });

            evUrediId = red.dataset.id;
            document.getElementById('evVrijednost').value = red.dataset.vrijednost;
            document.getElementById('evOpis').value = red.dataset.opis;

            document.getElementById('evOdabirWrap').style.display = 'none';
            const summary = document.getElementById('evUredSummary');
            summary.innerHTML = '<strong>Umirovljenik:</strong> ' + evUmirovljenikNaziv(e)
                + ' &middot; <strong>Tip:</strong> ' + evTipNaziv(e)
                + ' &middot; <strong>Akcija:</strong> ' + evAkcijaNaziv(e);
            summary.style.display = '';

            document.getElementById('evFormNaslov').textContent = 'Uređivanje evidencije';
            document.getElementById('evSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('evOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('evFormaWrap').style.display = '';
            document.getElementById('evToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Obrisati ovu evidenciju?')) {
                return;
            }

            const rez = await apiDelete('/evidencije/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderEvidencije(content);
        });
    });
}

function brojeviStranicaEvidencije(trenutna, ukupno) {
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

function prikaziAkcijeZaTip(tipId) {
    const wrap = document.getElementById('evAkcijePills');
    const filtrirane = evAkcije.filter(function (a) { return a.tip_id === tipId; });

    if (filtrirane.length === 0) {
        wrap.innerHTML = '<span class="empty-hint">Nema definiranih akcija za ovaj tip</span>';
        return;
    }

    wrap.innerHTML = filtrirane.map(function (a) {
        return '<button type="button" class="pill" data-akcija-id="' + a.id + '">' + a.naziv + '</button>';
    }).join('');

    wrap.querySelectorAll('.pill').forEach(function (p) {
        p.addEventListener('click', function () {
            evSelectedAkcijaId = parseInt(p.dataset.akcijaId, 10);
            wrap.querySelectorAll('.pill').forEach(function (x) { x.classList.remove('pill-active'); });
            p.classList.add('pill-active');
        });
    });
}

function postaviAutocompleteUmirovljenikaEvidencija() {
    const searchInput = document.getElementById('evUmirovljenikSearch');
    const hiddenInput = document.getElementById('evUmirovljenikId');
    const lista = document.getElementById('evUmirovljenikSuggestions');

    function prikaziPrijedloge(tekst) {
        const upit = tekst.trim().toLowerCase();

        if (upit === '') {
            lista.classList.remove('open');
            lista.innerHTML = '';
            return;
        }

        const rezultati = evUmirovljenici.filter(function (u) {
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

function ocistiFormuEvidencija() {
    evUrediId = null;
    evSelectedTipId = null;
    evSelectedAkcijaId = null;

    document.getElementById('evUmirovljenikSearch').value = '';
    document.getElementById('evUmirovljenikId').value = '';
    document.getElementById('evVrijednost').value = '';
    document.getElementById('evOpis').value = '';

    document.querySelectorAll('#evTipoviPills .pill').forEach(function (p) {
        p.classList.remove('pill-active');
    });
    document.getElementById('evAkcijePills').innerHTML = '<span class="empty-hint">Prvo odaberi tip evidencije</span>';

    document.getElementById('evOdabirWrap').style.display = '';
    document.getElementById('evUredSummary').style.display = 'none';

    document.getElementById('evFormNaslov').textContent = 'Nova evidencija';
    document.getElementById('evSpremiBtn').textContent = 'Spremi evidenciju';
    document.getElementById('evOdustaniBtn').style.display = 'none';
    document.getElementById('evFormaWrap').style.display = 'none';
    document.getElementById('evToggleFormaBtn').textContent = '+ Nova evidencija';
}

async function spremiEvidenciju(content) {
    const vrijednost = document.getElementById('evVrijednost').value.trim();
    const opis = document.getElementById('evOpis').value.trim();

    if (vrijednost === '' && opis === '') {
        alert('Upiši vrijednost ili napomenu.');
        return;
    }

    let rez;

    if (evUrediId === null) {
        const umirovljenikId = document.getElementById('evUmirovljenikId').value;

        if (!umirovljenikId) {
            alert('Odaberi umirovljenika s popisa (počni tipkati ime, pa klikni ponuđenu stavku).');
            return;
        }

        if (evSelectedTipId === null) {
            alert('Odaberi tip evidencije.');
            return;
        }

        if (evSelectedAkcijaId === null) {
            alert('Odaberi akciju.');
            return;
        }

        rez = await apiPost('/evidencije/index.php', {
            umirovljenik_id: parseInt(umirovljenikId, 10),
            akcija_tip_id: evSelectedTipId,
            akcija_id: evSelectedAkcijaId,
            vrijednost_string: vrijednost !== '' ? vrijednost : null,
            opis: opis !== '' ? opis : null
        });
    } else {
        rez = await apiPut('/evidencije/item.php?id=' + evUrediId, {
            vrijednost_string: vrijednost !== '' ? vrijednost : null,
            opis: opis !== '' ? opis : null
        });
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderEvidencije(content);
}
