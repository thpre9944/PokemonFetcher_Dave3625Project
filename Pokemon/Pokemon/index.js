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
let currentData = null;
let shiny = false;
let back = false;
const shinyButton = document.getElementById('shinyButton');
const backButton = document.getElementById('backButton');

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

    currentData = data;
    showSprite();

    document.getElementById('name').textContent = data.name;
    document.getElementById('number').textContent = '#' + String(data.id).padStart(3, '0');
    document.getElementById('weight').textContent = `Weight: ${data.weight / 10} kg`;
    document.getElementById('height').textContent = `Height: ${data.height / 10} m`;
    document.getElementById('exp').textContent = `Experience: ${data.base_experience ?? 'unknown'}`;
    document.getElementById('abilities').textContent =
        'Abilities: ' + data.abilities.map(a => a.ability.name.replace(/-/g, ' ')).join(', ');
    renderEntry(data.id);

    const types = data.types.map(t => t.type.name);
    card.style.setProperty('--accent', TYPE_COLORS[types[0]] || '#888');
    renderTypes(types);
    renderStats(data.stats);
    renderMatchups(types, data.id);
    input.value = data.name;
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

const typeCache = new Map(); // damage relations per type, fetched once

async function getTypeRelations(type) {
    if (!typeCache.has(type)) {
        const response = await fetch(`${API}/type/${type}`);
        if (!response.ok) throw new Error('Could not load type data');
        typeCache.set(type, (await response.json()).damage_relations);
    }
    return typeCache.get(type);
}

// Start every attacking type at x1, then multiply for each defending type.
function calcMultipliers(relationsList) {
    const result = {};
    Object.keys(TYPE_COLORS).forEach(type => { result[type] = 1; });
    for (const rel of relationsList) {
        rel.double_damage_from.forEach(t => { if (t.name in result) result[t.name] *= 2; });
        rel.half_damage_from.forEach(t => { if (t.name in result) result[t.name] *= 0.5; });
        rel.no_damage_from.forEach(t => { if (t.name in result) result[t.name] *= 0; });
    }
    return result;
}

async function renderMatchups(types, id) {
    const box = document.getElementById('matchups');
    box.textContent = 'Loading matchups...';
    try {
        const relations = await Promise.all(types.map(getTypeRelations));
        if (currentId !== id) return; // user already moved on
        const multipliers = calcMultipliers(relations);
        const groups = [
            ['Weak to', v => v > 1],
            ['Resists', v => v < 1 && v > 0],
            ['Immune to', v => v === 0]
        ];
        box.replaceChildren();
        for (const [title, test] of groups) {
            const entries = Object.entries(multipliers)
                .filter(([, v]) => test(v))
                .sort((a, b) => b[1] - a[1]);
            if (!entries.length) continue;
            const heading = document.createElement('h2');
            heading.textContent = title;
            const row = document.createElement('div');
            row.className = 'chips';
            entries.forEach(([type, value]) => {
                const chip = document.createElement('span');
                chip.className = 'badge small';
                chip.style.background = TYPE_COLORS[type];
                chip.textContent = `${type} ×${value}`;
                row.append(chip);
            });
            box.append(heading, row);
        }
    } catch {
        if (currentId === id) box.textContent = 'Could not load type matchups.';
    }
}

// Official artwork has no back view, so "Back view" switches to the pixel sprites.
function showSprite() {
    if (!currentData) return;
    const sprites = currentData.sprites;
    const frontKey = shiny ? 'front_shiny' : 'front_default';
    const backKey = shiny ? 'back_shiny' : 'back_default';
    const front = sprites.other['official-artwork'][frontKey] || sprites[frontKey] || sprites.front_default;
    const useBack = back && Boolean(sprites[backKey]);

    img.src = useBack ? sprites[backKey] : front;
    img.alt = `${currentData.name}${shiny ? ' (shiny)' : ''}${useBack ? ', back view' : ''}`;
    img.classList.toggle('pixel', useBack);
    shinyButton.setAttribute('aria-pressed', shiny);
    backButton.setAttribute('aria-pressed', back);
    backButton.disabled = !sprites[backKey];
}

const speciesCache = new Map();

async function renderEntry(id) {
    const box = document.getElementById('entry');
    box.textContent = '';
    try {
        if (!speciesCache.has(id)) {
            const response = await fetch(`${API}/pokemon-species/${id}`);
            if (!response.ok) return; // alternate forms have no species page
            const species = await response.json();
            const english = species.flavor_text_entries.filter(e => e.language.name === 'en');
            const text = english.length ? english[english.length - 1].flavor_text : '';
            speciesCache.set(id, text.replace(/[\n\f]/g, ' '));
        }
        if (currentId === id) box.textContent = speciesCache.get(id);
    } catch {
        // The entry is an extra; the card works without it.
    }
}

function setBackground() {
    const pick = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    const imageBox = document.querySelector('.card-img');
    imageBox.style.background = `url(${pick}.jpg) center / cover`;
}

function reset() {
    latestRequest++; // cancels any search still in flight
    currentId = null;
    currentData = null;
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
shinyButton.addEventListener('click', () => { shiny = !shiny; showSprite(); });
backButton.addEventListener('click', () => { back = !back; showSprite(); });
document.getElementById('cryButton').addEventListener('click', () => {
    const url = currentData?.cries?.latest;
    if (url) new Audio(url).play().catch(() => showMessage('Could not play the cry.', true));
});
prevButton.addEventListener('click', () => {
    if (currentId > 1) { input.value = currentId - 1; lookup(currentId - 1); }
});
nextButton.addEventListener('click', () => {
    if (currentId) { input.value = currentId + 1; lookup(currentId + 1); }
});

loadNames();
