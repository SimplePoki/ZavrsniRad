let korUrediId = null;
let korSvi = [];
let korStranica = 1;
let korPoStranici = 10;
let korSortPolje = 'prezime';
let korSortSmjer = 'asc';

const KOR_ULOGA_NAZIV = { 1: 'SuperAdmin', 2: 'Admin', 3: 'Doktor', 4: 'Sestra' };

function korUlogaNaziv(uloga) {
    return KOR_ULOGA_NAZIV[uloga] || ('Uloga ' + uloga);
}

async function renderKorisnici(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const rez = await apiGet('/korisnici/index.php');

    if (!rez.ok) {
        content.innerHTML = '<p>Greška: ' + rez.data.error + '</p>';
        return;
    }

    korUrediId = null;
    korStranica = 1;
    korSvi = rez.data;

    let html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">';
    html += '<div><h1 class="page-title">Korisnici</h1><p class="page-subtitle">Osoblje doma s pristupom sustavu</p></div>';
    html += '<button id="korToggleFormaBtn" class="btn btn-primary">+ Novi korisnik</button>';
    html += '</div>';

    html += '<div id="korFormaWrap" style="display:none;">';
    html += '<div class="form-card">';
    html += '<div class="form-card-title" id="korFormNaslov">Novi korisnik</div>';
    html += '<div class="form-row">';
    html += '<div class="field"><label>Ime</label><input id="korIme" type="text" placeholder="npr. Ivan"></div>';
    html += '<div class="field"><label>Prezime</label><input id="korPrezime" type="text" placeholder="npr. Horvat"></div>';
    html += '<div class="field"><label>Email</label><input id="korEmail" type="email" placeholder="ime.prezime@dom.test"></div>';
    html += '<div class="field"><label>Uloga</label><select id="korUloga">';
    html += '<option value="">Odaberi ulogu&hellip;</option>';
    html += '<option value="1">SuperAdmin</option><option value="2">Admin</option><option value="3">Doktor</option><option value="4">Sestra</option>';
    html += '</select></div>';
    html += '<div class="field"><label id="korLozinkaLabel">Lozinka</label><input id="korLozinka" type="password" placeholder="min. 6 znakova"></div>';
    html += '<button id="korSpremiBtn" class="btn btn-primary">Dodaj</button>';
    html += '<button id="korOdustaniBtn" class="btn btn-secondary" style="display:none;">Odustani</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-section-label" style="margin-top:4px;">Filtriraj popis</div>';
    html += '<div class="form-row" style="margin-bottom:16px;">';
    html += '<div class="field"><label>Pretraga</label><input id="korPretraga" type="text" placeholder="Ime, prezime ili email&hellip;"></div>';
    html += '<div class="field"><label>Uloga</label><select id="korFiltarUloga"><option value="">Sve uloge</option>';
    html += '<option value="1">SuperAdmin</option><option value="2">Admin</option><option value="3">Doktor</option><option value="4">Sestra</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Status</label><select id="korFiltarAktivan">';
    html += '<option value="">Svi</option><option value="1">Aktivni</option><option value="0">Neaktivni</option>';
    html += '</select></div>';
    html += '<div class="field"><label>Po stranici</label><select id="korPoStranici">';
    html += '<option value="10">10</option><option value="25">25</option><option value="50">50</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<div id="korTablicaWrap"></div>';

    content.innerHTML = html;

    document.getElementById('korSpremiBtn').addEventListener('click', function () {
        spremiKorisnika(content);
    });

    document.getElementById('korOdustaniBtn').addEventListener('click', ocistiFormuKorisnik);

    document.getElementById('korToggleFormaBtn').addEventListener('click', function () {
        const formaWrap = document.getElementById('korFormaWrap');
        const otvorena = formaWrap.style.display !== 'none';
        formaWrap.style.display = otvorena ? 'none' : '';
        this.textContent = otvorena ? '+ Novi korisnik' : '× Zatvori formu';
    });

    document.getElementById('korPretraga').addEventListener('input', function () {
        korStranica = 1;
        iscrtajTablicuKorisnika();
    });
    document.getElementById('korFiltarUloga').addEventListener('change', function () {
        korStranica = 1;
        iscrtajTablicuKorisnika();
    });
    document.getElementById('korFiltarAktivan').addEventListener('change', function () {
        korStranica = 1;
        iscrtajTablicuKorisnika();
    });
    document.getElementById('korPoStranici').addEventListener('change', function () {
        korPoStranici = parseInt(this.value, 10);
        korStranica = 1;
        iscrtajTablicuKorisnika();
    });

    iscrtajTablicuKorisnika();
}

function iscrtajTablicuKorisnika() {
    const wrap = document.getElementById('korTablicaWrap');
    const upit = document.getElementById('korPretraga').value.trim().toLowerCase();
    const filtarUloga = document.getElementById('korFiltarUloga').value;
    const filtarAktivan = document.getElementById('korFiltarAktivan').value;

    const filtrirani = korSvi.filter(function (k) {
        if (upit !== '' && !(k.ime + ' ' + k.prezime + ' ' + k.email).toLowerCase().includes(upit)) {
            return false;
        }
        if (filtarUloga !== '' && k.uloga !== parseInt(filtarUloga, 10)) {
            return false;
        }
        if (filtarAktivan !== '' && (k.aktivan ? 1 : 0) !== parseInt(filtarAktivan, 10)) {
            return false;
        }
        return true;
    });

    if (filtrirani.length === 0) {
        wrap.innerHTML = '<div class="table-wrap"><div class="empty-state">Nema korisnika koji odgovaraju filteru.</div></div>';
        return;
    }

    filtrirani.sort(function (a, b) {
        if (korSortPolje === 'uloga') {
            return korSortSmjer === 'asc' ? a.uloga - b.uloga : b.uloga - a.uloga;
        }
        const cmp = a[korSortPolje].localeCompare(b[korSortPolje], 'hr');
        return korSortSmjer === 'asc' ? cmp : -cmp;
    });

    const ukupnoStranica = Math.max(1, Math.ceil(filtrirani.length / korPoStranici));
    if (korStranica > ukupnoStranica) { korStranica = ukupnoStranica; }
    if (korStranica < 1) { korStranica = 1; }

    const odIndeksa = (korStranica - 1) * korPoStranici;
    const stranica = filtrirani.slice(odIndeksa, odIndeksa + korPoStranici);

    function strelica(polje) {
        if (korSortPolje !== polje) { return '<span class="sort-arrow">&#8645;</span>'; }
        return '<span class="sort-arrow sort-arrow-active">' + (korSortSmjer === 'asc' ? '&#8593;' : '&#8595;') + '</span>';
    }

    let html = '<div class="table-wrap"><table><thead><tr>';
    html += '<th class="th-sortable" data-sort="ime">Ime ' + strelica('ime') + '</th>';
    html += '<th class="th-sortable" data-sort="prezime">Prezime ' + strelica('prezime') + '</th>';
    html += '<th>Email</th>';
    html += '<th class="th-sortable" data-sort="uloga">Uloga ' + strelica('uloga') + '</th>';
    html += '<th>Aktivan</th><th></th></tr></thead><tbody>';

    stranica.forEach(function (k) {
        const badge = k.aktivan
            ? '<span class="badge badge-success">Da</span>'
            : '<span class="badge badge-neutral">Ne</span>';

        html += '<tr data-id="' + k.id + '" data-ime="' + k.ime + '" data-prezime="' + k.prezime + '" data-email="' + k.email + '" data-uloga="' + k.uloga + '">';
        html += '<td>' + k.ime + '</td><td>' + k.prezime + '</td><td>' + k.email + '</td><td>' + korUlogaNaziv(k.uloga) + '</td><td>' + badge + '</td>';
        html += '<td><div class="actions-cell"><button class="btn btn-secondary btn-small urediBtn">Uredi</button><button class="btn btn-ghost btn-small obrisiBtn">Obriši</button></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="pagination">';
    html += '<button id="korPrethodnaBtn" class="btn btn-secondary btn-small"' + (korStranica <= 1 ? ' disabled' : '') + '>Prethodna</button>';
    html += '<div class="pagination-numbers">';
    brojeviStranicaKorisnici(korStranica, ukupnoStranica).forEach(function (n) {
        if (n === '...') {
            html += '<span class="pagination-ellipsis">&hellip;</span>';
        } else {
            html += '<button class="pagination-num' + (n === korStranica ? ' pagination-num-active' : '') + '" data-page="' + n + '">' + n + '</button>';
        }
    });
    html += '</div>';
    html += '<button id="korSljedecaBtn" class="btn btn-secondary btn-small"' + (korStranica >= ukupnoStranica ? ' disabled' : '') + '>Sljedeća</button>';
    html += '</div>';
    html += '<div class="pagination-info">Stranica ' + korStranica + ' od ' + ukupnoStranica + ' (' + filtrirani.length + ' rezultata)</div>';

    wrap.innerHTML = html;

    const content = wrap.closest('.content');

    document.getElementById('korPrethodnaBtn').addEventListener('click', function () {
        korStranica -= 1;
        iscrtajTablicuKorisnika();
    });

    document.getElementById('korSljedecaBtn').addEventListener('click', function () {
        korStranica += 1;
        iscrtajTablicuKorisnika();
    });

    wrap.querySelectorAll('.pagination-num').forEach(function (btn) {
        btn.addEventListener('click', function () {
            korStranica = parseInt(this.dataset.page, 10);
            iscrtajTablicuKorisnika();
        });
    });

    wrap.querySelectorAll('.th-sortable').forEach(function (th) {
        th.addEventListener('click', function () {
            const polje = th.dataset.sort;
            if (korSortPolje === polje) {
                korSortSmjer = korSortSmjer === 'asc' ? 'desc' : 'asc';
            } else {
                korSortPolje = polje;
                korSortSmjer = 'asc';
            }
            iscrtajTablicuKorisnika();
        });
    });

    wrap.querySelectorAll('.urediBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const red = btn.closest('tr');

            korUrediId = red.dataset.id;
            document.getElementById('korIme').value = red.dataset.ime;
            document.getElementById('korPrezime').value = red.dataset.prezime;
            document.getElementById('korEmail').value = red.dataset.email;
            document.getElementById('korUloga').value = red.dataset.uloga;
            document.getElementById('korLozinka').value = '';
            document.getElementById('korLozinka').placeholder = 'ostavi prazno za bez izmjene';
            document.getElementById('korFormNaslov').textContent = 'Uređivanje korisnika';
            document.getElementById('korSpremiBtn').textContent = 'Spremi izmjenu';
            document.getElementById('korOdustaniBtn').style.display = 'inline-flex';
            document.getElementById('korFormaWrap').style.display = '';
            document.getElementById('korToggleFormaBtn').textContent = '× Zatvori formu';
        });
    });

    wrap.querySelectorAll('.obrisiBtn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const red = btn.closest('tr');
            const id = red.dataset.id;

            if (!confirm('Deaktivirati ovog korisnika?')) {
                return;
            }

            const rez = await apiDelete('/korisnici/item.php?id=' + id);

            if (!rez.ok) {
                alert('Greška: ' + rez.data.error);
                return;
            }

            renderKorisnici(content);
        });
    });
}

function brojeviStranicaKorisnici(trenutna, ukupno) {
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

function ocistiFormuKorisnik() {
    korUrediId = null;
    document.getElementById('korIme').value = '';
    document.getElementById('korPrezime').value = '';
    document.getElementById('korEmail').value = '';
    document.getElementById('korUloga').value = '';
    document.getElementById('korLozinka').value = '';
    document.getElementById('korLozinka').placeholder = 'min. 6 znakova';
    document.getElementById('korFormNaslov').textContent = 'Novi korisnik';
    document.getElementById('korSpremiBtn').textContent = 'Dodaj';
    document.getElementById('korOdustaniBtn').style.display = 'none';
    document.getElementById('korFormaWrap').style.display = 'none';
    document.getElementById('korToggleFormaBtn').textContent = '+ Novi korisnik';
}

async function spremiKorisnika(content) {
    const ime = document.getElementById('korIme').value.trim();
    const prezime = document.getElementById('korPrezime').value.trim();
    const email = document.getElementById('korEmail').value.trim();
    const uloga = document.getElementById('korUloga').value;
    const lozinka = document.getElementById('korLozinka').value;

    if (!ime || !prezime || !email) {
        alert('Ime, prezime i email su obavezni.');
        return;
    }

    if (!uloga) {
        alert('Odaberi ulogu.');
        return;
    }

    if (korUrediId === null && !lozinka) {
        alert('Lozinka je obavezna za novog korisnika.');
        return;
    }

    const podaci = {
        ime: ime,
        prezime: prezime,
        email: email,
        uloga: parseInt(uloga, 10)
    };

    if (lozinka) {
        podaci.lozinka = lozinka;
    }

    let rez;
    if (korUrediId === null) {
        rez = await apiPost('/korisnici/index.php', podaci);
    } else {
        rez = await apiPut('/korisnici/item.php?id=' + korUrediId, podaci);
    }

    if (!rez.ok) {
        alert('Greška: ' + rez.data.error);
        return;
    }

    renderKorisnici(content);
}
