/** Municipios Baix Llobregat: 4 anclados + resto alfabético (lumina_nuevos_apartados.md) */

export const MUNICIPIOS_DELEGACION = ['Martorell', 'Abrera', 'Esparreguera', 'Olesa de Montserrat'];

/**
 * CP principal y población por municipio (referencia administrativa).
 * El socio puede editarlos en la ficha si su dirección no coincide.
 */
export const MUNICIPIO_POSTAL_CIUDAD = {
    Martorell: { postalCode: '08760', city: 'Martorell' },
    Abrera: { postalCode: '08630', city: 'Abrera' },
    Esparreguera: { postalCode: '08292', city: 'Esparreguera' },
    'Olesa de Montserrat': { postalCode: '08640', city: 'Olesa de Montserrat' },
    Begues: { postalCode: '08859', city: 'Begues' },
    Castelldefels: { postalCode: '08860', city: 'Castelldefels' },
    'Castellví de Rosanes': { postalCode: '08769', city: 'Castellví de Rosanes' },
    Cervelló: { postalCode: '08758', city: 'Cervelló' },
    Collbató: { postalCode: '08293', city: 'Collbató' },
    'Corbera de Llobregat': { postalCode: '08757', city: 'Corbera de Llobregat' },
    "Cornellà de Llobregat": { postalCode: '08940', city: "Cornellà de Llobregat" },
    'El Papiol': { postalCode: '08754', city: 'El Papiol' },
    'El Prat de Llobregat': { postalCode: '08820', city: 'El Prat de Llobregat' },
    Gavà: { postalCode: '08850', city: 'Gavà' },
    Gelida: { postalCode: '08790', city: 'Gelida' },
    "L'Hospitalet de Llobregat": { postalCode: '08901', city: "L'Hospitalet de Llobregat" },
    'Molins de Rei': { postalCode: '08750', city: 'Molins de Rei' },
    Pallejà: { postalCode: '08780', city: 'Pallejà' },
    'Sant Andreu de la Barca': { postalCode: '08740', city: 'Sant Andreu de la Barca' },
    'Sant Boi de Llobregat': { postalCode: '08830', city: 'Sant Boi de Llobregat' },
    'Sant Climent de Llobregat': { postalCode: '08849', city: 'Sant Climent de Llobregat' },
    'Sant Esteve Sesrovires': { postalCode: '08635', city: 'Sant Esteve Sesrovires' },
    'Sant Feliu de Llobregat': { postalCode: '08980', city: 'Sant Feliu de Llobregat' },
    'Sant Joan Despí': { postalCode: '08970', city: 'Sant Joan Despí' },
    'Sant Just Desvern': { postalCode: '08960', city: 'Sant Just Desvern' },
    'Sant Vicenç dels Horts': { postalCode: '08620', city: 'Sant Vicenç dels Horts' },
    'Santa Coloma de Cervelló': { postalCode: '08690', city: 'Santa Coloma de Cervelló' },
    'Torrelles de Llobregat': { postalCode: '08736', city: 'Torrelles de Llobregat' },
    Vallirana: { postalCode: '08759', city: 'Vallirana' },
    Viladecans: { postalCode: '08840', city: 'Viladecans' },
};

/** @param {string} municipioNombre Nombre exacto como en el desplegable */
export function getDefaultPostalYciudad(municipioNombre) {
    const key = municipioNombre && String(municipioNombre).trim();
    if (!key) return { postalCode: '', city: '' };
    const row = MUNICIPIO_POSTAL_CIUDAD[key];
    if (!row) return { postalCode: '', city: '' };
    return { postalCode: row.postalCode, city: row.city };
}

export const MUNICIPIOS_RESTO_ALFABETICO = [
    'Begues',
    'Castelldefels',
    'Castellví de Rosanes',
    'Cervelló',
    'Collbató',
    'Corbera de Llobregat',
    'Cornellà de Llobregat',
    'El Papiol',
    'El Prat de Llobregat',
    'Gavà',
    'Gelida',
    "L'Hospitalet de Llobregat",
    'Molins de Rei',
    'Pallejà',
    'Sant Andreu de la Barca',
    'Sant Boi de Llobregat',
    'Sant Climent de Llobregat',
    'Sant Esteve Sesrovires',
    'Sant Feliu de Llobregat',
    'Sant Joan Despí',
    'Sant Just Desvern',
    'Sant Vicenç dels Horts',
    'Santa Coloma de Cervelló',
    'Torrelles de Llobregat',
    'Vallirana',
    'Viladecans',
];

export const TODOS_MUNICIPIOS = [...MUNICIPIOS_DELEGACION, ...MUNICIPIOS_RESTO_ALFABETICO];

if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    const missing = TODOS_MUNICIPIOS.filter((m) => !MUNICIPIO_POSTAL_CIUDAD[m]);
    if (missing.length) {
        console.warn('[baixLlobregatMunicipios] Falta CP/ciudad para:', missing.join(', '));
    }
}
