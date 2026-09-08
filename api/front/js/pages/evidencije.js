let evSelectedTipId = null;
let evSelectedAkcijaId = null;
let evUmirovljenici = [];
let evTipovi = [];
let evAkcije = [];

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

    evUmirovljenici = umRez.data;
    evTipovi = tipRez.data;
    evAkcije = akcRez.data;
    evSelectedTipId = null;
    evSelectedAkcijaId = null;

    let html = '';
    html += '<h1 class="page-title">Evidencije</h1>';
    html += '<p class="page-subtitle">Bilježenje izvršenih radnji njege</p>';

    html += '<div class="form-card">';
    html += '<div class="form-card-title">Nova evidencija</div>';

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

    html += '<div class="form-row">';
    html += '<div class="field"><label>Vrijednost</label><input id="evVrijednost" type="text" placeholder="npr. 200, 36.6, Da&hellip;"></div>';
    html += '<div class="field" style="flex:1; min-width:240px;"><label>Napomena</label><input id="evOpis" type="text" placeholder="neobavezno"></div>';
    html += '<button id="evSpremiBtn" class="btn btn-primary">Spremi evidenciju</button>';
    html += '</div>';

    html += '</div>';

    if (evRez.data.length === 0) {
        html += '<div class="table-wrap"><div class="empty-state">Još nema evidentiranih radnji.</div></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Umirovljenik</th><th>Tip</th><th>Akcija</th><th>Vrijednost</th><th>Kad</th></tr></thead><tbody>';

        evRez.data.forEach(function (e) {
            const um = evUmirovljenici.find(function (u) { return u.id === e.umirovljenik_id; });
            const umNaziv = um ? (um.ime + ' ' + um.prezime) : (e.lokacija_id ? 'Lokacija #' + e.lokacija_id : '—');

            const tip = evTipovi.find(function (t) { return t.id === e.akcija_tip_id; });
            const akc = evAkcije.find(function (a) { return a.id === e.akcija_id && a.tip_id === e.akcija_tip_id; });

            let vrijednostPrikaz = '';
            if (e.vrijednost_num !== null) {
                vrijednostPrikaz = e.vrijednost_num;
            } else if (e.vrijednost_string !== null) {
                vrijednostPrikaz = e.vrijednost_string;
            } else if (e.vrijednost_bool !== null) {
                vrijednostPrikaz = e.vrijednost_bool ? 'Da' : 'Ne';
            }
            if (e.opis) {
                vrijednostPrikaz += (vrijednostPrikaz !== '' ? ' ' : '') + '<span style="color:var(--text-muted);">(' + e.opis + ')</span>';
            }

            const kad = new Date(e.datum_vrijeme).toLocaleString('hr-HR');

            html += '<tr>';
            html += '<td>' + umNaziv + '</td>';
            html += '<td>' + (tip ? tip.naziv : '—') + '</td>';
            html += '<td>' + (akc ? akc.naziv : '—') + '</td>';
            html += '<td>' + vrijednostPrikaz + '</td>';
            html += '<td>' + kad + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    }

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

async function spremiEvidenciju(content) {
    const umirovljenikId = document.getElementById('evUmirovljenikId').value;
    const vrijednost = document.getElementById('evVrijednost').value.trim();
    const opis = document.getElementById('evOpis').value.trim();

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

    if (vrijednost === '' && opis === '') {
        alert('Upiši vrijednost ili napomenu.');
        return;
    }

    const podaci = {
        umirovljenik_id: parseInt(umirovljenikId, 10),
        akcija_tip_id: evSelectedTipId,
        akcija_id: evSelectedAkcijaId,
        vrijednost_string: vrijednost !== '' ? vrijednost : null,
        opis: opis !== '' ? opis : null
    };

    const rez = await apiPost('/evidencije/index.php', podaci);

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderEvidencije(content);
}
