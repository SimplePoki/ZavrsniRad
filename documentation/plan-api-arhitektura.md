# Plan: Cijela API arhitektura s ulogama (ZavrsniRad)

## Context

Radimo na zavrsnom radu: PHP REST API + PostgreSQL + JS frontend za digitalizaciju evidencije njege u umirovljeničkom domu (stvarni proces dokumentiran u `documentation/SCEN NJEGOVATELJI (2).PDF`, SeneCura Bjelovar). Baza podataka je gotova i testirana (`api/config/database.php` radi, konekcija potvrđena).

Korisnik je definirao viziju sustava s 5 razina uloga (umirovljenici/rodbina → sestre → doktori → admin → superadmin, rastuće ovlasti) i traži da se sad isplanira cijela API arhitektura koja to podržava — ne samo pojedinačni endpoint, nego cijeli obrazac koji će se ponoviti kroz sve entitete. Rad će se nastaviti graditi **jedan file odjednom** (korisnikov ustaljeni stil), ali ovaj plan definira cjelokupnu strukturu prije nego krenemo pisati kod.

## Trenutno stanje (potvrđeno čitanjem)

- `api/config/database.php` — radi, čita kredencijale iz `.env` preko `api/config/Env.php`, postavlja `$conn` (PDO objekt), `ERRMODE_EXCEPTION` uključen
- `api/helpers/response.php` — prazan, dogovoren sadržaj (`jsonResponse($data, $statusCode = 200)`) još nije upisan
- Baza (PostgreSQL, `postgres` baza): `korisnici`, `lokacije`, `umirovljenici`, `posjeti`, `smjene`, `tip_evidencije`, `akcije`, `evidencije` — sve tablice postoje i pune su testnih podataka

## Ključna arhitekturna odluka: veza rodbina ↔ umirovljenik

Trenutna `korisnici` tablica nema način da se account s ulogom "rodbina" poveže s konkretnim `umirovljenik_id` čije podatke smije čitati. Bez toga ne možemo ograničiti rodbinu na "samo svoje podatke" (dio vizije: *"Umirovljenici/rodbina - read only vlastiti povijesni podaci"*).

**Rješenje:** dodati nullable stupac `korisnici.umirovljenik_id integer REFERENCES umirovljenici(id)` — NULL za osoblje (sestre/doktori/admin), postavljen za rodbina-račune. Ovo je mala shema migracija (`ALTER TABLE`) koju napravimo kao prvi korak.

## Uloge — numerička skala

Postojeći seed podaci imaju `uloga` 1/2/3 bez jasne definicije. Predlažem **čistu rastuću skalu** (lakše za `uloga >= X` provjere):

| uloga | Naziv | Ovlasti (kumulativno) |
|---|---|---|
| 1 | Rodbina/umirovljenik | read-only vlastiti podaci (`evidencije`, `posjeti` gdje `umirovljenik_id` = njihov) |
| 2 | Sestra | + upis `evidencije` (izvršavanje radnih zadataka), read na `umirovljenici`/`lokacije`/`smjene`/`akcije` |
| 3 | Doktor | + kreiranje/dodjela `akcije` (radnih zadataka) za umirovljenike |
| 4 | Admin | + CRUD `korisnici`, `umirovljenici`, `lokacije` (administracija doma) |
| 5 | SuperAdmin | sve, uklj. `tip_evidencije` (konfiguracija sustava) |

Postojeći seed red za Ivanu Horvat (trenutno `uloga=1`, lozinka-hash sugerira admina) treba ručno prepraviti na `uloga=4` ili `5` nakon migracije — to napravimo u istom SQL koraku kao dodavanje stupca, s kratkim `UPDATE` naredbama da seed podaci imaju smisla za testiranje svake razine.

## Autentifikacija — pristup

**PHP native sesije** (`session_start()`, `$_SESSION['korisnik_id']`, `$_SESSION['uloga']`), ne JWT — jednostavnije za objasniti u radu, dovoljno za ovaj opseg (server-rendered API, ista domena kao frontend). Lozinke: `password_hash()`/`password_verify()` — trenutni seed podaci imaju plaintext placeholdere (`'test_hash_admin'` i sl.), treba ih zamijeniti stvarnim bcrypt hashevima kao dio istog SQL koraka (generirat ćemo par test lozinki, npr. svima `lozinka123`, hashirano).

## Redoslijed izgradnje (jedan file odjednom)

1. **Dovršiti `api/helpers/response.php`** — `jsonResponse($data, $statusCode = 200)` (već dogovoren sadržaj iz prijašnjeg razgovora, samo upisati)
2. **SQL migracija** (nova `.sql` datoteka ili ručno u pgAdminu): `ALTER TABLE korisnici ADD COLUMN umirovljenik_id integer REFERENCES umirovljenici(id);`, `UPDATE korisnici SET uloga = ...` za sređivanje skale, `UPDATE korisnici SET lozinka = ...` s pravim hashevima
3. **`api/config/roles.php`** — konstante (`ROLE_RODBINA = 1`, ... `ROLE_SUPERADMIN = 5`)
4. **`api/helpers/auth.php`** — `startSession()`, `getCurrentUser()` (čita `$_SESSION`), `requireLogin()`, `requireMinRole($minRole)` (uspoređuje `$_SESSION['uloga'] >= $minRole`, inače `jsonResponse(['error' => '...'], 403)`), `requireOwnUmirovljenikOrRole($umirovljenikId, $minRole)` za rodbina-scoping
5. **`api/auth/login.php`** — POST `email`+`lozinka`, `password_verify`, postavi `$_SESSION`, vrati `jsonResponse(['id'=>..., 'ime'=>..., 'uloga'=>...])`
6. **`api/auth/logout.php`** — `session_destroy()`, `jsonResponse(['message' => 'Odjavljeni ste'])`
7. **`api/umirovljenici/index.php` + `item.php`** — referentni obrazac: GET (lista/pojedinačno, s role-based filtriranjem), POST/PUT (min. `ROLE_ADMIN`), DELETE (min. `ROLE_ADMIN`)
8. **Ponoviti obrazac** za `korisnici`, `lokacije`, `tip_evidencije`, `akcije`, `posjeti`, `smjene`, `evidencije` — svaki folder dobiva `index.php` (GET svi + POST) i `item.php` (GET/PUT/DELETE po `?id=`), s `requireMinRole(...)` pozivom prilagođenim tablici (npr. `evidencije` POST dopušten od `ROLE_SESTRA` naviše; `tip_evidencije` CRUD samo `ROLE_SUPERADMIN`)

Svaki endpoint slijedi identičan kostur:
```php
<?php
require '../config/database.php';
require '../helpers/response.php';
require '../helpers/auth.php';

requireMinRole(ROLE_X);

// GET / POST / PUT / DELETE grana po $_SERVER['REQUEST_METHOD']
// SQL kroz $conn (prepared statements), jsonResponse(...) na kraju svake grane
```

Frontend (`frontend/`) nije dio ovog plana — slijedi kao posebna faza nakon što API bude gotov.

## Verifikacija

- Nakon svakog endpointa: testirati preko `C:\xampp\php\php.exe -S localhost:8000 -t api` + `curl`/Postman poziv, provjeriti JSON odgovor i status kod
- Testirati login s računima svake od 5 razina, provjeriti da `requireMinRole` ispravno vraća 403 kad uloga nije dovoljna
- Provjeriti da rodbina-račun (`uloga=1`, `umirovljenik_id` postavljen) vidi samo svoje podatke, ne tuđe
- Nakon SQL migracije, ručno provjeriti u pgAdminu da `korisnici` ima novi stupac i ispravne `uloga`/`lozinka` vrijednosti
