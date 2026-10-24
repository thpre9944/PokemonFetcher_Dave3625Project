const API = 'https://pokeapi.co/api/v2';

const form = document.getElementById('searchForm');
const input = document.getElementById('pokeName');
const message = document.getElementById('message');
const container = document.querySelector('.container');
const card = document.getElementById('card');
const img = document.getElementById('pokeimg');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');

const cache = new Map();   // remembers lookups so repeat searches are instant
let latestRequest = 0;     // guards against slow responses overwriting newer ones
let currentId = null;

const TYPE_COLORS = {
    normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', electric: '#f7d02c',
    grass: '#7ac74c', ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1',
    ground: '#e2bf65', flying: '#a98ff3', psychic: '#f95587', bug: '#a6b91a',
    rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc', dark: '#705746',
    steel: '#b7b7ce', fairy: '#d685ad'
};

const STAT_LABELS = {
    'hp': 'HP', 'attack': 'Attack', 'defense': 'Defense',
    'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', 'speed': 'Speed'
};

const BACKGROUNDS = ['bilder/pokemon1', 'bilder/pokemon2', 'bilder/pokemon3', 'bilder/pokemon4', 'bilder/pokemon5'];

// Turns "Mr. Mime", "Farfetch'd" or "Nidoran♀" into the format the API expects.
function normalize(raw) {
    return raw.trim().toLowerCase()
        .replace('♀', '-f').replace('♂', '-m')
        .replace(/['’.]/g, '')
        .replace(/\s+/g, '-');
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
}

async function lookup(query) {
    const name = normalize(String(query));
    if (!name) {
        showMessage('Type a Pokémon name or number first.', true);
        return;
    }

    const requestId = ++latestRequest;
    showMessage('Loading...');

    try {
        let data = cache.get(name);
        if (!data) {
            const response = await fetch(`${API}/pokemon/${name}`);
            if (response.status === 404) {
                throw new Error(`No Pokémon found for "${String(query).trim()}". Check the spelling or try its number.`);
            }
            if (!response.ok) {
                throw new Error('The Pokémon service is not responding. Try again in a moment.');
            }
            data = await response.json();
            cache.set(name, data);
        }
        if (requestId !== latestRequest) return; // a newer search has started
        render(data);
        showMessage('');
    } catch (error) {
        if (requestId !== latestRequest) return;
        const offline = error instanceof TypeError;
        showMessage(offline ? 'Network problem. Check your connection and try again.' : error.message, true);
    }
}

function render(data) {
    currentId = data.id;

    const artwork = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    img.src = artwork;
    img.alt = data.name;

    document.getElementById('name').textContent = data.name;
    document.getElementById('number').textContent = '#' + String(data.id).padStart(3, '0');
    document.getElementById('weight').textContent = `Weight: ${data.weight / 10} kg`;
    document.getElementById('height').textContent = `Height: ${data.height / 10} m`;
    document.getElementById('exp').textContent = `Experience: ${data.base_experience ?? 'unknown'}`;

    const types = data.types.map(t => t.type.name);
    card.style.setProperty('--accent', TYPE_COLORS[types[0]] || '#888');
    renderTypes(types);
    renderStats(data.stats);
    setBackground();

    prevButton.disabled = currentId <= 1;
    container.classList.remove('hidden');
}

function renderTypes(types) {
    const box = document.getElementById('types');
    box.replaceChildren(...types.map(type => {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = type;
        badge.style.background = TYPE_COLORS[type] || '#888';
        return badge;
    }));
}

function renderStats(stats) {
    const box = document.getElementById('stats');
    box.replaceChildren(...stats.map(s => {
        const row = document.createElement('div');
        row.className = 'stat';
        const pct = Math.min(100, (s.base_stat / 255) * 100);
        row.innerHTML = `<span class="stat-name"></span>
            <span class="stat-bar"><span class="stat-fill" style="width:${pct}%"></span></span>
            <span class="stat-value"></span>`;
        row.querySelector('.stat-name').textContent = STAT_LABELS[s.stat.name] || s.stat.name;
        row.querySelector('.stat-value').textContent = s.base_stat;
        return row;
    }));
}

function setBackground() {
    const pick = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    const imageBox = document.querySelector('.card-img');
    imageBox.style.background = `url(${pick}.jpg) center / cover`;
}

function reset() {
    latestRequest++; // cancels any search still in flight
    currentId = null;
    img.src = '';
    img.alt = '';
    container.classList.add('hidden');
    input.value = '';
    showMessage('');
    input.focus();
}

// Fill the autocomplete list once, in the background.
async function loadNames() {
    try {
        const response = await fetch(`${API}/pokemon?limit=2000`);
        if (!response.ok) return;
        const { results } = await response.json();
        const list = document.getElementById('pokeList');
        list.replaceChildren(...results.map(p => {
            const option = document.createElement('option');
            option.value = p.name;
            return option;
        }));
    } catch {
        // Autocomplete is a bonus; the app works without it.
    }
}

form.addEventListener('submit', event => {
    event.preventDefault(); // Enter and the button both end up here
    lookup(input.value);
});
document.getElementById('removeButton').addEventListener('click', reset);
prevButton.addEventListener('click', () => {
    if (currentId > 1) { input.value = currentId - 1; lookup(currentId - 1); }
});
nextButton.addEventListener('click', () => {
    if (currentId) { input.value = currentId + 1; lookup(currentId + 1); }
});

loadNames();
