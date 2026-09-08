async function renderUmirovljenici(content) {
    content.innerHTML = '<p>Učitavanje&hellip;</p>';

    const rez = await apiGet('/umirovljenici/index.php');

    if (!rez.ok) {
        content.innerHTML = '<p>Greška: ' + rez.data.error + '</p>';
        return;
    }

    let html = '';
    html += '<h1 class="page-title">Umirovljenici</h1>';
    html += '<p class="page-subtitle">Popis korisnika doma</p>';

    if (rez.data.length === 0) {
        html += '<div class="table-wrap"><div class="empty-state">Nema evidentiranih umirovljenika.</div></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Ime</th><th>Prezime</th><th>Lokacija ID</th><th>Aktivan</th></tr></thead><tbody>';

        rez.data.forEach(function (u) {
            const badge = u.aktivan
                ? '<span class="badge badge-success">Da</span>'
                : '<span class="badge badge-neutral">Ne</span>';
            html += '<tr><td>' + u.ime + '</td><td>' + u.prezime + '</td><td>' + u.lokacija_id + '</td><td>' + badge + '</td></tr>';
        });

        html += '</tbody></table></div>';
    }

    content.innerHTML = html;
}
