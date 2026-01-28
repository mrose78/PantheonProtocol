const CHARACTERS_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTGfw_4b0iqj-AkMzNQIJdTnr9q6E1O5ugB_XsPPxyt-OHrtHTXENmKgxqVIw9rHcpFGjCymtCbzMKM/pub?gid=0&single=true&output=csv';

const IMAGES_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTGfw_4b0iqj-AkMzNQIJdTnr9q6E1O5ugB_XsPPxyt-OHrtHTXENmKgxqVIw9rHcpFGjCymtCbzMKM/pub?gid=1288957876&single=true&output=csv';

let characters = [];
let images = [];

/*************************************************
 * CSV PARSER (unchanged)
 *************************************************/

function parseCSV(text) {
  const [header, ...rows] = text.trim().split('\n');
  const keys = header.split(',');

  return rows.map(row => {
    const values = row.split(',');
    return Object.fromEntries(
      keys.map((k, i) => [k.trim(), (values[i] || '').trim()])
    );
  });
}

/*************************************************
 * LOAD DATA
 *************************************************/

async function loadData() {
  const [charRes, imgRes] = await Promise.all([
    fetch(CHARACTERS_CSV),
    fetch(IMAGES_CSV)
  ]);

  characters = parseCSV(await charRes.text());
  images = parseCSV(await imgRes.text());

  populateSelector();
}

/*************************************************
 * UI
 *************************************************/

function populateSelector() {
  const select = document.getElementById('characterSelect');
  select.innerHTML = '';

  // Group characters by universe
  const grouped = {};
  characters.forEach(c => {
    const universe = c.universe || 'Unknown';
    if (!grouped[universe]) grouped[universe] = [];
    grouped[universe].push(c);
  });

  // Sort universes
  Object.keys(grouped)
    .sort()
    .forEach(universe => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = universe;

      grouped[universe]
        .sort((a, b) => a.codename.localeCompare(b.codename))
        .forEach(c => {
          optgroup.appendChild(new Option(c.codename, c.id));
        });

      select.appendChild(optgroup);
    });

  // 🔑 IMPORTANT: wire change to existing render logic
  select.addEventListener('change', () => {
    renderCardById(select.value);
  });

  // 🔑 Random button
  document.getElementById('randomBtn').onclick = () => {
    randomPick(select);
  };

  // Initial render
  randomPick(select);
}



function randomPick(select) {
  const r = characters[Math.floor(Math.random() * characters.length)];
  select.value = r.id;
  renderCardById(r.id);
}


/*************************************************
 * RENDERING
 *************************************************/

function renderCardById(id) {
  const c = characters.find(x => x.id == id);

  const charImgs = images.filter(i => i.character_id == id);
  const img = charImgs.length
    ? charImgs[Math.floor(Math.random() * charImgs.length)]
    : images.find(i => i.image_id == '0');

  const target = document.getElementById('cardSlot');
  target.innerHTML = '';
  target.appendChild(buildCard(c, img?.url || ''));
}

function buildCard(c, imgUrl) {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front">
        <img src="${imgUrl}" alt="${c.codename}">
      </div>

      <div class="card-face card-back">
        <div class="card-number">#${c.id}</div>

        <div class="name-row">
          <strong>${c.codename}</strong>
          <span class="info-icon" data-notes="${c.notes || 'No notes'}">ℹ️</span>
        </div>

        ${statBar('Power', c.power)}
        ${statBar('Strength', c.strength)}
        ${statBar('Speed', c.speed)}
        ${statBar('Durability', c.durability)}
        ${statBar('Intelligence', c.intelligence)}
        ${statBar('Combat Skill', c.combat_skill)}
        ${statBar('Willpower', c.willpower)}
        ${statBar('Luck', c.luck)}

        <div class="meta">
          ${c.real_name}<br>
          ${c.alignment} • ${c.universe}<br>
          ${c.team_affiliation}<br>
          ${c.height_cm}cm / ${c.weight_kg}kg<br>
          ${c.species} • ${c.origin}<br>
          Threat: ${c.threat_level}
        </div>
      </div>
    </div>
  `;

  // Notes tooltip (same behavior)
  const tooltip = document.createElement('div');
  tooltip.className = 'notes-tooltip';
  document.body.appendChild(tooltip);

  const icon = card.querySelector('.info-icon');
  icon.addEventListener('mouseenter', e => {
    tooltip.textContent = e.target.dataset.notes || 'No notes';
    tooltip.style.display = 'block';
    tooltip.style.left = e.pageX + 10 + 'px';
    tooltip.style.top = e.pageY + 10 + 'px';
  });
  icon.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  return card;
}

/*************************************************
 * STAT BAR
 *************************************************/

function statBar(label, value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));

  return `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-bar" data-value="${v}">
        <div class="stat-fill" style="width:${v}%;"></div>
      </div>
    </div>
  `;
}

/*************************************************
 * INIT
 *************************************************/

loadData();
