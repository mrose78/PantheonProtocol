import { loadData, pickImage, buildCard } from './cards.js';

let characters = [];
let images = [];

/*************************************************
 * INIT
 *************************************************/
(async function init() {
  const data = await loadData();
  characters = data.characters;
  images = data.images;

  populateFilterOptions();
  attachListeners();

  // Start with everything loaded/shown
  applyFilters();
})();

/*************************************************
 * POPULATE FILTER DROPDOWNS
 *************************************************/
function uniqueSorted(key) {
  const set = new Set();
  characters.forEach(c => {
    const v = (c[key] || '').trim();
    if (v) set.add(v);
  });
  return [...set].sort();
}

function populateFilterOptions() {
  const fill = (id, values) => {
    const select = document.getElementById(id);
    values.forEach(v => select.appendChild(new Option(v, v)));
  };

  fill('universeFilter', uniqueSorted('universe'));
  fill('alignmentFilter', uniqueSorted('alignment'));
  fill('teamFilter', uniqueSorted('team_affiliation'));
  fill('speciesFilter', uniqueSorted('species'));
  fill('threatFilter', uniqueSorted('threat_level'));
}

/*************************************************
 * EVENT LISTENERS
 *************************************************/
function attachListeners() {
  const debouncedFilter = debounce(applyFilters, 150);

  document.getElementById('searchInput').addEventListener('input', debouncedFilter);
  document.getElementById('universeFilter').addEventListener('change', applyFilters);
  document.getElementById('alignmentFilter').addEventListener('change', applyFilters);
  document.getElementById('teamFilter').addEventListener('change', applyFilters);
  document.getElementById('speciesFilter').addEventListener('change', applyFilters);
  document.getElementById('threatFilter').addEventListener('change', applyFilters);
  document.getElementById('sortFilter').addEventListener('change', applyFilters);

  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    ['universeFilter', 'alignmentFilter', 'teamFilter', 'speciesFilter', 'threatFilter', 'sortFilter']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('sortFilter').value = 'name';
    applyFilters();
  });
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/*************************************************
 * FILTER + SORT + RENDER
 *************************************************/
const THREAT_ORDER = {
  'low': 1, 'moderate': 2, 'medium': 2, 'high': 3,
  'very high': 4, 'extreme': 5, 'omega': 6
};

function threatRank(c) {
  const key = (c.threat_level || '').toLowerCase();
  return THREAT_ORDER[key] || parseInt(c.threat_level) || 0;
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const universe = document.getElementById('universeFilter').value;
  const alignment = document.getElementById('alignmentFilter').value;
  const team = document.getElementById('teamFilter').value;
  const species = document.getElementById('speciesFilter').value;
  const threat = document.getElementById('threatFilter').value;
  const sort = document.getElementById('sortFilter').value;

  let results = characters.filter(c => {
    if (universe && c.universe !== universe) return false;
    if (alignment && c.alignment !== alignment) return false;
    if (team && c.team_affiliation !== team) return false;
    if (species && c.species !== species) return false;
    if (threat && c.threat_level !== threat) return false;

    if (q) {
      const haystack = [
        c.codename, c.real_name, c.power_name, c.power_desc,
        c.notes, c.universe, c.team_affiliation, c.alignment,
        c.species, c.origin
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  // Sort
  if (sort === 'id') {
    results.sort((a, b) => Number(a.id) - Number(b.id));
  } else if (sort === 'threat') {
    results.sort((a, b) => threatRank(b) - threatRank(a));
  } else {
    results.sort((a, b) => a.codename.localeCompare(b.codename));
  }

  renderResults(results);
}

/*************************************************
 * RENDER
 *************************************************/
function renderResults(results) {
  const header = document.getElementById('resultsHeader');
  const grid = document.getElementById('cardGrid');
  const noResults = document.getElementById('noResults');

  header.innerHTML = `
    <h2>All Characters</h2>
    <p>${results.length} of ${characters.length} shown</p>
  `;

  grid.innerHTML = '';

  if (!results.length) {
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  results.forEach(c => {
    const imgUrl = pickImage(images, c.id);
    grid.appendChild(buildCard(c, imgUrl));
  });
}
