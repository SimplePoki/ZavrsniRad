let lokUrediId = null;
let lokSve = [];
let lokStranica = 1;
let lokPoStranici = 10;
let lokSortPolje = 'naziv';
let lokSortSmjer = 'asc';

const LOK_TIP_NAZIV = { 1: 'Dom', 2: 'Blok', 3: 'Kat', 4: 'Soba' };

function lokTipNaziv(tip) {
    return LOK_TIP_NAZIV[tip] || ('Tip ' + tip);
}

async function renderLokacije(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const rez = await apiGet('/lokacije/index.php');

    if (!rez.ok) {
        content.innerHTML = '<p>Greška: ' + rez.data.error + '</p>';
        return;
    }

    lokUrediId = null;
    lokStranica = 1;
    lokSve = rez.data;

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Lokacije</h1><p class="page-subtitle">Hijerarhija dom &rarr; blok &rarr; kat &rarr; soba</p></div>';
    html += '<button id="lToggleFormaBtn" class="btn btn-primary">+ Nova lokacija</button>';
    html += '</div>';

    html += '<div id="lFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="lFormNaslov">Nova lokacija</div>';
    html += '<div class="form-row">';
    html += '<div class="field"><label>Tip</label><select id="lTip">';
    html += '<option value="">Odaberi tip&hellip;</option>';
    html += '<option value="1">Dom</option><option value="2">Blok</option><option value="3">Kat</option><option value="4">Soba</option>';
    html += '</select></div>';
    html += '<div class="field" id="lRoditeljWrap" style="display:none;"><label>Roditelj</label><select id="lRoditeljId"><option value="">Bez roditelja</option></select></div>';
    html += '<div class="field"><label>Naziv</label><input id="lNaziv" type="text" placeholder="npr. Blok 1"></div>';
    html += '<button id="lSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="lOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="lPretraga" type="text" placeholder="Naziv&hellip;"></div>';
    html += '<div class="field"><label>Tip</label><select id="lFiltarTip"><option value="">Svi tipovi</option>';
    html += '<option value="1">Dom</option><option value="2">Blok</option><option value="3">Kat</option><option value="4">Soba</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="lPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="lTablicaWrap"></div>';

    content.innerHTML = html;

    document.getElementById('lSpremiBtn').addEventListener('click', function () {
        spremiLokaciju(content);
    });

    document.getElementById('lOdustaniBtn').addEventListener('click', ocistiFormuLokacija);

    document.getElementById('lToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('lFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Nova lokacija' : '× Zatvori formu';
    });

    document.getElementById('lTip').addEventListener('change', function () {
        azurirajRoditeljeIzbor(this.value, null);
    });

    document.getElementById('lPretraga').addEventListener('input', function () {
        lokStranica = 1;
        iscrtajTablicuLokacija();
    });
    document.getElementById('lFiltarTip').addEventListener('change', function () {
        lokStranica = 1;
        iscrtajTablicuLokacija();
    });
    document.getElementById('lPoStranici').addEventListener('change', function () {
        lokPoStranici = parseInt(this.value, 10);
        lokStranica = 1;
        iscrtajTablicuLokacija();
    });

    iscrtajTablicuLokacija();
}

function azurirajRoditeljeIzbor(odabraniTip, odabraniParentId) {
    const wrap = document.getElementById('lRoditeljWrap');
    const select = document.getElementById('lRoditeljId');

    if (odabraniTip === '' || parseInt(odabraniTip, 10) === 1) {
        wrap.style.display = 'none';
        select.innerHTML = '<option value="">Bez roditelja</option>';
        select.value = '';
        return;
    }

    wrap.style.display = '';
    const roditeljskiTip = parseInt(odabraniTip, 10) - 1;
    const kandidati = lokSve.filter(function (l) { return l.tip === roditeljskiTip; }).sort(function (a, b) {
        return a.naziv.localeCompare(b.naziv, 'hr');
    });

    let html = '<option value="">Odaberi ' + lokTipNaziv(roditeljskiTip).toLowerCase() + '&hellip;</option>';
    kandidati.forEach(function (k) {
        html += '<option value="' + k.id + '">' + k.naziv + '</option>';
    });
    select.innerHTML = html;

    if (odabraniParentId !== null && odabraniParentId !== undefined) {
        select.value = odabraniParentId;
    }
}

function iscrtajTablicuLokacija() {
    const wrap = document.getElementById('lTablicaWrap');
    const upit = document.getElementById('lPretraga').value.trim().toLowerCase();
    const filtarTip = document.getElementById('lFiltarTip').value;

    const filtrirane = lokSve.filter(function (l) {
        if (upit !== '' && !l.naziv.toLowerCase().includes(upit)) {
            return false;
        }
        if (filtarTip !== '' && l.tip !== parseInt(filtarTip, 10)) {
            return false;
        }
        return true;
    });

    if (filtrirane.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema lokacija koje odgovaraju filteru.</div></div>';
        return;
    }

    filtrirane.sort(function (a, b) {
        if (lokSortPolje === 'tip') {
            return lokSortSmjer === 'asc' ? a.tip - b.tip : b.tip - a.tip;
        }
        const cmp = a.naziv.localeCompare(b.naziv, 'hr');
        return lokSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirane.length / lokPoStranici));
    if (lokStranica > ukupnoStranica) { lokStranica = ukupnoStranica; }
    if (lokStranica < 1) { lokStranica = 1; }

    const odIndeksa = (lokStranica - 1) * lokPoStranici;
    const stranica = filtrirane.slice(odIndeksa, odIndeksa + lokPoStranici);

    function strelica(polje) {
        if (lokSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (lokSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="naziv">Naziv ' + strelica('naziv') + '</th>';
    html += '<th class="th-sortable" data-sort="tip">Tip ' + strelica('tip') + '</th>';
    html += '<th>Roditelj</th><th></th></tr></thead><tbody>';

    stranica.forEach(function (l) {
        const roditelj = lokSve.find(function (r) { return r.id === l.parent_id; });
        const roditeljNaziv = roditelj ? roditelj.naziv : '—';

        html += '<tr data-id="' + l.id + '" data-naziv="' + l.naziv + '" data-tip="' + l.tip + '" data-parent-id="' + (l.parent_id === null ? '' : l.parent_id) + '">';
        html += '<td>' + l.naziv + '</td><td>' + lokTipNaziv(l.tip) + '</td><td>' + roditeljNaziv + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="lPrethodnaBtn" class="btn btn-secondary btn-small"' + (lokStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaLokacije(lokStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === lokStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="lSljedecaBtn" class="btn btn-secondary btn-small"' + (lokStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + lokStranica + ' od ' + ukupnoStranica + ' (' + filtrirane.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('lPrethodnaBtn').addEventListener('click', function () {
        lokStranica -= 1;
        iscrtajTablicuLokacija();
    });

    document.getElementById('lSljedecaBtn').addEventListener('click', function () {
        lokStranica += 1;
        iscrtajTablicuLokacija();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            lokStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuLokacija();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (lokSortPolje === polje) {
                lokSortSmjer = lokSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                lokSortPolje = polje;
                lokSortSmjer = 'asc';
            }
            iscrtajTablicuLokacija();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');

            lokUrediId = red.dataset.id;
            document.getElementById('lNaziv').value = red.dataset.naziv;
            document.getElementById('lTip').value = red.dataset.tip;
            azurirajRoditeljeIzbor(red.dataset.tip, red.dataset.parentId === '' ? null : red.dataset.parentId);
            document.getElementById('lFormNaslov').textContent = 'Uređivanje lokacije';
            document.getElementById('lSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('lOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('lFormaWrap').style.display = '';
            document.getElementById('lToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Obrisati ovu lokaciju?')) {
                return;
            }

            const rez = await apiDelete('/lokacije/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderLokacije(content);
        });
    });
}

function brojeviStranicaLokacije(trenutna, ukupno) {
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

function ocistiFormuLokacija() {
    lokUrediId = null;
    document.getElementById('lNaziv').value = '';
    document.getElementById('lTip').value = '';
    azurirajRoditeljeIzbor('', null);
    document.getElementById('lFormNaslov').textContent = 'Nova lokacija';
    document.getElementById('lSpremiBtn').textContent = 'Dodaj';
    document.getElementById('lOdustaniBtn').style.display = 'none';
    document.getElementById('lFormaWrap').style.display = 'none';
    document.getElementById('lToggleFormaBtn').textContent = '+ Nova lokacija';
}

async function spremiLokaciju(content) {
    const naziv = document.getElementById('lNaziv').value.trim();
    const tip = document.getElementById('lTip').value;
    const roditeljId = document.getElementById('lRoditeljId').value;

    if (!naziv) {
        alert('Naziv je obavezan.');
        return;
    }

    if (!tip) {
        alert('Odaberi tip lokacije.');
        return;
    }

    if (parseInt(tip, 10) !== 1 && !roditeljId) {
        alert('Odaberi roditeljsku lokaciju.');
        return;
    }

    const podaci = {
        naziv: naziv,
        tip: parseInt(tip, 10),
        parent_id: roditeljId ? parseInt(roditeljId, 10) : null
    };

    let rez;
    if (lokUrediId === null) {
        rez = await apiPost('/lokacije/index.php', podaci);
    } else {
        rez = await apiPut('/lokacije/item.php?id=' + lokUrediId, podaci);
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderLokacije(content);
}
