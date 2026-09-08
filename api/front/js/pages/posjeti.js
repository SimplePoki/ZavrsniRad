let posjetUrediId = null;

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
    const umirovljenici = umirovljeniciRez.data;

    let html = '';
    html += '<h1 class="page-title">Posjeti</h1>';
    html += '<p class="page-subtitle">Evidencija posjeta rodbine korisnicima doma</p>';

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

    if (posjetiRez.data.length === 0) {
        html += '<div class="table-wrap"><div class="empty-state">Još nema evidentiranih posjeta.</div></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Umirovljenik</th><th>Ime</th><th>Prezime</th><th>Datum</th><th></th></tr></thead><tbody>';

        posjetiRez.data.forEach(function (p) {
            const um = umirovljenici.find(function (u) { return u.id === p.umirovljenik_id; });
            const umNaziv = um ? (um.ime + ' ' + um.prezime) : ('ID ' + p.umirovljenik_id);

            html += '<tr data-id="' + p.id + '" data-umirovljenik-id="' + p.umirovljenik_id + '" data-ime="' + p.ime + '" data-prezime="' + p.prezime + '" data-datum="' + p.datum + '">';
            html += '<td>' + umNaziv + '</td><td>' + p.ime + '</td><td>' + p.prezime + '</td><td>' + p.datum + '</td>';
            html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    }

    content.innerHTML = html;

    postaviAutocompleteUmirovljenika(umirovljenici);

    document.getElementById('pSpremiBtn').addEventListener('click', function () {
        spremiPosjet(content);
    });

    document.getElementById('pOdustaniBtn').addEventListener('click', ocistiFormuPosjet);

    content.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');
            const umId = parseInt(red.dataset.umirovljenikId, 10);
            const um = umirovljenici.find(function (u) { return u.id === umId; });

            posjetUrediId = red.dataset.id;
            document.getElementById('pUmirovljenikSearch').value = um ? (um.ime + ' ' + um.prezime) : '';
            document.getElementById('pUmirovljenikId').value = um ? um.id : '';
            document.getElementById('pIme').value = red.dataset.ime;
            document.getElementById('pPrezime').value = red.dataset.prezime;
            document.getElementById('pDatum').value = red.dataset.datum;
            document.getElementById('pFormNaslov').textContent = 'Uređivanje posjete';
            document.getElementById('pSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('pOdustaniBtn').style.display = 'inline-flex';
        });
    });

    content.querySelectorAll('.obrisiBtn').forEach(function (btn) {
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
