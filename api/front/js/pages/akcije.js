let akcUrediId = null;
let akcUrediTipId = null;
let akcSve = [];
let akcTipovi = [];
let akcStranica = 1;
let akcPoStranici = 10;
let akcSortPolje = 'tip_id';
let akcSortSmjer = 'asc';

function akcTipNaziv(tipId) {
    const tip = akcTipovi.find(function (t) { return t.id === tipId; });
    return tip ? tip.naziv : ('Tip ' + tipId);
}

async function renderAkcije(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const [akcRez, tipRez] = await Promise.all([
        apiGet('/akcije/index.php'),
        apiGet('/tip_evidencije/index.php')
    ]);

    if (!akcRez.ok) {
        content.innerHTML = '<p>Greška: ' + akcRez.data.error + '</p>';
        return;
    }

    if (!tipRez.ok) {
        content.innerHTML = '<p>Greška: ' + tipRez.data.error + '</p>';
        return;
    }

    akcUrediId = null;
    akcUrediTipId = null;
    akcStranica = 1;
    akcSve = akcRez.data;
    akcTipovi = tipRez.data.slice().sort(function (a, b) { return a.id - b.id; });

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Akcije</h1><p class="page-subtitle">Konkretne radnje njege po tipu evidencije</p></div>';
    html += '<button id="akcToggleFormaBtn" class="btn btn-primary">+ Nova akcija</button>';
    html += '</div>';

    html += '<div id="akcFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="akcFormNaslov">Nova akcija</div>';
    html += '<div class="form-row">';
    html += '<div class="field"><label>Tip evidencije</label><select id="akcTipId">';
    html += '<option value="">Odaberi tip&hellip;</option>';
    akcTipovi.forEach(function (t) {
        html += '<option value="' + t.id + '">' + t.naziv + '</option>';
    });
    html += '</select></div>';
    html += '<div class="field"><label>Naziv</label><input id="akcNaziv" type="text" placeholder="npr. Voda"></div>';
    html += '<div class="field" style="flex:1; min-width:240px;"><label>Opis</label><input id="akcOpis" type="text" placeholder="Kratki opis akcije"></div>';
    html += '<button id="akcSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="akcOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="akcPretraga" type="text" placeholder="Naziv ili opis&hellip;"></div>';
    html += '<div class="field"><label>Tip evidencije</label><select id="akcFiltarTip"><option value="">Svi tipovi</option>';
    akcTipovi.forEach(function (t) {
        html += '<option value="' + t.id + '">' + t.naziv + '</option>';
    });
    html += '</select></div>';
    html += '<div class="field"><label>Status</label><select id="akcFiltarAktivna">';
    html += '<option value="">Svi</option><option value="1">Aktivne</option><option value="0">Neaktivne</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="akcPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="akcTablicaWrap"></div>';

    content.innerHTML = html;

    document.getElementById('akcSpremiBtn').addEventListener('click', function () {
        spremiAkciju(content);
    });

    document.getElementById('akcOdustaniBtn').addEventListener('click', ocistiFormuAkcija);

    document.getElementById('akcToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('akcFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Nova akcija' : '× Zatvori formu';
    });

    document.getElementById('akcPretraga').addEventListener('input', function () {
        akcStranica = 1;
        iscrtajTablicuAkcija();
    });
    document.getElementById('akcFiltarTip').addEventListener('change', function () {
        akcStranica = 1;
        iscrtajTablicuAkcija();
    });
    document.getElementById('akcFiltarAktivna').addEventListener('change', function () {
        akcStranica = 1;
        iscrtajTablicuAkcija();
    });
    document.getElementById('akcPoStranici').addEventListener('change', function () {
        akcPoStranici = parseInt(this.value, 10);
        akcStranica = 1;
        iscrtajTablicuAkcija();
    });

    iscrtajTablicuAkcija();
}

function iscrtajTablicuAkcija() {
    const wrap = document.getElementById('akcTablicaWrap');
    const upit = document.getElementById('akcPretraga').value.trim().toLowerCase();
    const filtarTip = document.getElementById('akcFiltarTip').value;
    const filtarAktivna = document.getElementById('akcFiltarAktivna').value;

    const filtrirane = akcSve.filter(function (a) {
        if (upit !== '' && !(a.naziv + ' ' + a.opis).toLowerCase().includes(upit)) {
            return false;
        }
        if (filtarTip !== '' && a.tip_id !== parseInt(filtarTip, 10)) {
            return false;
        }
        if (filtarAktivna !== '' && (a.aktivna ? 1 : 0) !== parseInt(filtarAktivna, 10)) {
            return false;
        }
        return true;
    });

    if (filtrirane.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema akcija koje odgovaraju filteru.</div></div>';
        return;
    }

    filtrirane.sort(function (a, b) {
        if (akcSortPolje === 'tip_id') {
            const cmp = akcSortSmjer === 'asc' ? a.tip_id - b.tip_id : b.tip_id - a.tip_id;
            return cmp !== 0 ? cmp : a.id - b.id;
        }
        const cmp = a.naziv.localeCompare(b.naziv, 'hr');
        return akcSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirane.length / akcPoStranici));
    if (akcStranica > ukupnoStranica) { akcStranica = ukupnoStranica; }
    if (akcStranica < 1) { akcStranica = 1; }

    const odIndeksa = (akcStranica - 1) * akcPoStranici;
    const stranica = filtrirane.slice(odIndeksa, odIndeksa + akcPoStranici);

    function strelica(polje) {
        if (akcSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (akcSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="tip_id">Tip evidencije ' + strelica('tip_id') + '</th>';
    html += '<th class="th-sortable" data-sort="naziv">Naziv ' + strelica('naziv') + '</th>';
    html += '<th>Opis</th><th>Aktivna</th><th></th></tr></thead><tbody>';

    stranica.forEach(function (a) {
        const badge = a.aktivna
            ? '<span class="badge badge-success">Da</span>'
            : '<span class="badge badge-neutral">Ne</span>';

        html += '<tr data-id="' + a.id + '" data-tip-id="' + a.tip_id + '" data-naziv="' + a.naziv + '" data-opis="' + a.opis + '">';
        html += '<td>' + akcTipNaziv(a.tip_id) + '</td><td>' + a.naziv + '</td><td>' + a.opis + '</td><td>' + badge + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="akcPrethodnaBtn" class="btn btn-secondary btn-small"' + (akcStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaAkcije(akcStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === akcStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="akcSljedecaBtn" class="btn btn-secondary btn-small"' + (akcStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + akcStranica + ' od ' + ukupnoStranica + ' (' + filtrirane.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('akcPrethodnaBtn').addEventListener('click', function () {
        akcStranica -= 1;
        iscrtajTablicuAkcija();
    });

    document.getElementById('akcSljedecaBtn').addEventListener('click', function () {
        akcStranica += 1;
        iscrtajTablicuAkcija();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            akcStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuAkcija();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (akcSortPolje === polje) {
                akcSortSmjer = akcSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                akcSortPolje = polje;
                akcSortSmjer = 'asc';
            }
            iscrtajTablicuAkcija();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');

            akcUrediId = red.dataset.id;
            akcUrediTipId = red.dataset.tipId;
            document.getElementById('akcTipId').value = red.dataset.tipId;
            document.getElementById('akcTipId').disabled = true;
            document.getElementById('akcNaziv').value = red.dataset.naziv;
            document.getElementById('akcOpis').value = red.dataset.opis;
            document.getElementById('akcFormNaslov').textContent = 'Uređivanje akcije';
            document.getElementById('akcSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('akcOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('akcFormaWrap').style.display = '';
            document.getElementById('akcToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;
            const tipId = red.dataset.tipId;

            if (!confirm('Deaktivirati ovu akciju?')) {
                return;
            }

            const rez = await apiDelete('/akcije/item.php?id=' + id + '&tip_id=' + tipId);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderAkcije(content);
        });
    });
}

function brojeviStranicaAkcije(trenutna, ukupno) {
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

function ocistiFormuAkcija() {
    akcUrediId = null;
    akcUrediTipId = null;
    document.getElementById('akcTipId').value = '';
    document.getElementById('akcTipId').disabled = false;
    document.getElementById('akcNaziv').value = '';
    document.getElementById('akcOpis').value = '';
    document.getElementById('akcFormNaslov').textContent = 'Nova akcija';
    document.getElementById('akcSpremiBtn').textContent = 'Dodaj';
    document.getElementById('akcOdustaniBtn').style.display = 'none';
    document.getElementById('akcFormaWrap').style.display = 'none';
    document.getElementById('akcToggleFormaBtn').textContent = '+ Nova akcija';
}

async function spremiAkciju(content) {
    const naziv = document.getElementById('akcNaziv').value.trim();
    const opis = document.getElementById('akcOpis').value.trim();

    if (!naziv || !opis) {
        alert('Naziv i opis su obavezni.');
        return;
    }

    let rez;
    if (akcUrediId === null) {
        const tipId = document.getElementById('akcTipId').value;

        if (!tipId) {
            alert('Odaberi tip evidencije.');
            return;
        }

        const tipIdBroj = parseInt(tipId, 10);
        const postojece = akcSve.filter(function (a) { return a.tip_id === tipIdBroj; });
        const noviId = postojece.length > 0
            ? Math.max.apply(null, postojece.map(function (a) { return a.id; })) + 1
            : 1;

        rez = await apiPost('/akcije/index.php', {
            id: noviId,
            tip_id: tipIdBroj,
            naziv: naziv,
            opis: opis
        });
    } else {
        rez = await apiPut('/akcije/item.php?id=' + akcUrediId + '&tip_id=' + akcUrediTipId, { naziv: naziv, opis: opis });
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderAkcije(content);
}
