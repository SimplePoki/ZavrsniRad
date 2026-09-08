const API_BASE = '..';

async function apiRequest(method, putanja, podaci = null) {
    const options = { method: method, credentials: 'include' };

    if (podaci !== null) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(podaci);
    }

    const response = await fetch(API_BASE + putanja, options);
    const data = await response.json();

    return { ok: response.ok, status: response.status, data: data };
}

function apiGet(putanja) { return apiRequest('GET', putanja); }
function apiPost(putanja, podaci) { return apiRequest('POST', putanja, podaci); }
function apiPut(putanja, podaci) { return apiRequest('PUT', putanja, podaci); }
function apiDelete(putanja) { return apiRequest('DELETE', putanja); }

function trenutniKorisnik() { return apiGet('/auth/me.php'); }
function odjava() { return apiPost('/auth/logout.php', {}); }
