# Plan faza do dovršetka aplikacije

Stanje na dan pisanja: gotovo su `auth` (login/logout/me), `umirovljenici` (backend + frontend), `posjeti` (backend + frontend), SPA ljuska (`index.html`, `api.js`, `router.js`, `permissions.js`), te `testing/postman/` s kolekcijom za dosad gotove entitete.

Postman kolekcija i checklist za testiranje ažuriraju se **na kraju svake faze**, kad ti endpointi stvarno postoje u kodu — ne unaprijed.

---

## Faza 1 — Backend: `lokacije`, `tip_evidencije`, `akcije`

**Cilj:** izgraditi tri "pomoćna" entiteta bez kojih `evidencije` ne može funkcionirati.

- `lokacije` — hijerarhija dom → blok → kat → soba, pravi `DELETE` s hvatanjem greške (`try/catch`) ako je lokacija u upotrebi
- `tip_evidencije` — 6 fiksnih kategorija iz papirnatih obrazaca, ručno dodijeljen `id` (nije auto-increment), CRUD ograničen na `ROLE_SUPERADMIN`, meko brisanje (`aktivan = false`)
- `akcije` — kompozitni primarni ključ `(id, tip_id)`, CRUD ograničen na `ROLE_SUPERADMIN`, meko brisanje (`aktivna = false`)

**Test na kraju faze:**
- Postman zahtjevi za sve tri tablice: GET lista, GET pojedinačno, POST, PUT, DELETE
- Provjera da Doktor/Sestra dobiju `403` na pisanje (POST/PUT/DELETE)
- Provjera da DELETE stvarno samo deaktivira redak (meko brisanje), ne briše ga fizički
- Provjera `try/catch` na `lokacije` DELETE (pokušaj obrisati lokaciju koja ima umirovljenika)

## Faza 2 — Backend: `evidencije`

**Cilj:** sad kad postoje `akcije` i `lokacije`, izgraditi srž sustava — tablicu koja bilježi stvarne radnje njege.

**Test na kraju faze:**
- POST s postavljenim `umirovljenik_id`
- POST s postavljenim `lokacija_id` umjesto `umirovljenik_id`
- POST bez ijednog od ta dva → očekuje se `400`
- POST bez ijedne vrijednosti (`vrijednost_num`/`vrijednost_string`/`vrijednost_bool`/`opis`) → očekuje se `400`
- GET lista, GET pojedinačno
- PUT/DELETE kao Admin (uspjeh) i kao Sestra (`403`)

## Faza 3 — Backend: `korisnici`, `smjene`

**Cilj:** dovršiti preostala dva entiteta — nisu preduvjet za `evidencije`, ali trebaju za potpunost aplikacije.

**Test na kraju faze:**
- Kreiranje novog korisnika preko API-ja, pa provjera da se stvarno može ulogirati s tom lozinkom (potvrda da `password_hash`/`password_verify` rade ispravno kroz cijeli lanac)
- Test duplikata emaila → očekuje se `409`
- Test da samo `ROLE_SUPERADMIN` smije deaktivirati korisnika (`403` za Admin)
- Osnovni CRUD test za `smjene`

## Faza 4 — Frontend: prava `evidencije` stranica

**Cilj:** zamijeniti trenutni placeholder ("Sadržaj dolazi uskoro") pravom formom — odaberi umirovljenika/lokaciju → tip evidencije → konkretnu akciju → upiši vrijednost → spremi. Ovo je glavna, "hero" funkcija cijele aplikacije.

**Test na kraju faze:**
- Ručni test u pregledniku: kreiraj evidenciju kroz sučelje za nekoliko različitih tipova evidencije
- Provjera da se novi zapis pojavi u listi odmah nakon spremanja
- Provjera da se poruke greške (nedostaje vrijednost, nedostaje umirovljenik/lokacija) prikazuju razumljivo korisniku, ne kao sirova JSON greška

## Faza 5 — Frontend: preostale stranice

**Cilj:** funkcionalan CRUD za `lokacije`, `korisnici`, `tip_evidencije`, `akcije`, `smjene` — isti obrazac kao već gotov `posjeti.js` (forma za dodavanje/uređivanje + tablica + gumbi Uredi/Obriši).

**Test na kraju faze:**
- Ručni CRUD test kroz sučelje za svaku od 5 stranica (dodaj, uredi, obriši, provjeri prikaz liste)

## Faza 6 — Responzivni dizajn (tableti)

**Cilj:** budući da će se aplikacija najvjerojatnije koristiti na tabletima, prilagoditi CSS media queryjima — sidebar koji se sažima na uskim ekranima, veći dodirni ciljevi za gumbe, tablice koje se horizontalno skroluju umjesto da lome cijeli layout.

**Test na kraju faze:**
- Chrome DevTools "Device toolbar" simulacija tableta (npr. iPad ~820px, manji Android tablet ~768px)
- Provjera da nijedan element ne izlazi izvan ekrana i da je sve dohvatljivo dodirom

## Faza 7 — Sigurnosno i UX poliranje (završna faza)

**Cilj:** dodati `try/catch` gdje trenutno nedostaje (npr. `posjeti` POST — nema zaštite od nepostojećeg `umirovljenik_id` ako se zaobiđe frontend autocomplete), dodati favikonu, ujednačiti validaciju ulaza kroz sve endpointe.

**Test na kraju faze:**
- Namjerno slati neispravne podatke (nepostojeći strani ključevi, krivi tipovi podataka) izravno kroz Postman (zaobilazeći frontend) na sve endpointe
- Provjeriti da svugdje vraćaju uredan JSON odgovor s razumljivom porukom, nikad sirovu PHP grešku ili stack trace
