const SIDEBAR_PERMISSIONS = {
    'umirovljenici': [1, 2, 3, 4],
    'lokacije': [1, 2,  4],
    'evidencije': [1, 2, 3, 4],
    'posjeti': [1, 2, 3, 4],
    'smjene': [1, 2, 3, 4],
    'akcije': [1, 2, 3],
    'korisnici': [1, 2],
    'tip_evidencije': [1]
};

function smijeVidjeti(ruta, uloga) {
    const dozvoljene = SIDEBAR_PERMISSIONS[ruta];
    return dozvoljene ? dozvoljene.includes(uloga) : false;
}
