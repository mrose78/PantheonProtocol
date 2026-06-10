const CHARACTERS_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTGfw_4b0iqj-AkMzNQIJdTnr9q6E1O5ugB_XsPPxyt-OHrtHTXENmKgxqVIw9rHcpFGjCymtCbzMKM/pub?gid=0&single=true&output=csv';

const IMAGES_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTGfw_4b0iqj-AkMzNQIJdTnr9q6E1O5ugB_XsPPxyt-OHrtHTXENmKgxqVIw9rHcpFGjCymtCbzMKM/pub?gid=1288957876&single=true&output=csv';

let characters = [];
let images = [];

/*************************************************
 * CSV PARSER
 *************************************************/

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const keys = lines[0].split(',');
  return lines.slice(1).map(row => {
    // Handle quoted fields with commas
    const values = [];
    let cur = '';
    let inQ = false;
    for (const ch of row) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return Object.fromEntries(keys.map((k, i) => [k.trim(), (values[i] || '').trim()]));
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
  images     = parseCSV(await imgRes.text());
  populateSelector();
}

/*************************************************
 * UI
 *************************************************/

function populateSelector() {
  const select = document.getElementById('characterSelect');
  select.innerHTML = '';

  const grouped = {};
  characters.forEach(c => {
    const u = c.universe || 'Unknown';
    if (!grouped[u]) grouped[u] = [];
    grouped[u].push(c);
  });

  Object.keys(grouped).sort().forEach(universe => {
    const og = document.createElement('optgroup');
    og.label = universe;
    grouped[universe]
      .sort((a, b) => a.codename.localeCompare(b.codename))
      .forEach(c => og.appendChild(new Option(c.codename, c.id)));
    select.appendChild(og);
  });

  select.addEventListener('change', () => renderCardById(select.value));
  document.getElementById('randomBtn').onclick = () => randomPick(select);
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
  if (!c) return;

  const charImgs = images.filter(i => i.character_id == id);
  const img = charImgs.length
    ? charImgs[Math.floor(Math.random() * charImgs.length)]
    : images.find(i => i.image_id == '0');

  const target = document.getElementById('cardSlot');
  target.innerHTML = '';
  target.appendChild(buildCard(c, img?.url || ''));
}

/*************************************************
 * CARD BUILDER
 *************************************************/

// Stat config: label, key, icon emoji, pip CSS class
const STATS = [
  { label: 'Strength',     key: 'strength',     icon: '✊', pipClass: 'strength',     iconBg: '#7f1d1d' },
  { label: 'Speed',        key: 'speed',         icon: '⚡', pipClass: 'speed',        iconBg: '#78350f' },
  { label: 'Durability',   key: 'durability',    icon: '🛡', pipClass: 'durability',   iconBg: '#14532d' },
  { label: 'Intelligence', key: 'intelligence',  icon: '🧠', pipClass: 'intelligence', iconBg: '#1e3a5f' },
  { label: 'Combat Skill', key: 'combat_skill',  icon: '⚔', pipClass: 'combat',       iconBg: '#4c1d95' },
  { label: 'Willpower',    key: 'willpower',     icon: '🔮', pipClass: 'willpower',    iconBg: '#3b0764' },
  { label: 'Luck',         key: 'luck',          icon: '🍀', pipClass: 'luck',         iconBg: '#14532d' },
];

function pipRow(stat, rawValue) {
  // Scale: value is 0–100 → convert to /10
  const v100 = Math.max(0, Math.min(100, Number(rawValue) || 0));
  const v10  = Math.round(v100 / 10);
  const pips = Array.from({ length: 10 }, (_, i) =>
    `<div class="pip ${i < v10 ? stat.pipClass + ' filled' : ''}"></div>`
  ).join('');

  return `
    <div class="attr-row">
      <div class="attr-icon" style="background:${stat.iconBg};">${stat.icon}</div>
      <div class="attr-label">${stat.label}</div>
      <div class="attr-pips">${pips}</div>
      <div class="attr-score">${v10}<span class="denom">/10</span></div>
    </div>
  `;
}

function threatSkulls(threatLevel) {
  // Threat level text → skull count (map common strings or try to parse)
  const tlMap = {
    'low': 1, 'moderate': 2, 'medium': 2, 'high': 3,
    'very high': 4, 'extreme': 5, 'omega': 6
  };
  const key = (threatLevel || '').toLowerCase();
  let count = tlMap[key];
  if (!count) count = Math.max(1, Math.min(6, parseInt(threatLevel) || 3));

  return Array.from({ length: 6 }, (_, i) =>
    `<span style="opacity:${i < count ? '1' : '0.2'}">${i < count ? '💀' : '☠️'}</span>`
  ).join('');
}

function alignmentIcon(alignment) {
  const a = (alignment || '').toLowerCase();
  if (a.includes('hero'))      return '🦸';
  if (a.includes('villain'))   return '🦹';
  if (a.includes('anti'))      return '⚔️';
  if (a.includes('neutral'))   return '⚖️';
  return '👤';
}

function factionSymbol(universe) {
  // Simple deterministic emoji per universe; fallback to moon
  const u = (universe || '').toLowerCase();
  if (u.includes('eclipse'))  return '🌙';
  if (u.includes('solar'))    return '☀️';
  if (u.includes('void'))     return '🌀';
  if (u.includes('titan'))    return '⚡';
  if (u.includes('nova'))     return '💫';
  return '🌙';
}

function buildCard(c, imgUrl) {
  const card = document.createElement('div');
  card.className = 'card';

  const sym = factionSymbol(c.universe);

  // ── FRONT ──
  const front = document.createElement('div');
  front.className = 'card-face card-front';
  front.innerHTML = `
    <div class="card-art">
      <img src="${imgUrl}" alt="${c.codename}" loading="lazy">
    </div>

    <div class="front-top">
      <div class="faction-badge">${sym}</div>
      <div class="front-card-number">#${String(c.id).padStart(3, '0')}</div>
    </div>

    <div class="front-bottom">
      <div class="front-name">${c.codename}</div>
      <div class="front-real-name">Real Name: ${c.real_name || '—'}</div>

      <div class="front-info-bar">
        <div class="front-info-col">
          <div class="front-info-icon">${alignmentIcon(c.alignment)}</div>
          <div class="front-info-label">Alignment</div>
          <div class="front-info-value">${c.alignment || '—'}</div>
        </div>
        <div class="front-info-divider"></div>
        <div class="front-info-col">
          <div class="front-info-icon">🪐</div>
          <div class="front-info-label">Universe</div>
          <div class="front-info-value">${c.universe || '—'}</div>
        </div>
        <div class="front-info-divider"></div>
        <div class="front-info-col">
          <div class="front-info-icon">🤝</div>
          <div class="front-info-label">Team</div>
          <div class="front-info-value">${c.team_affiliation || '—'}</div>
        </div>
      </div>

      <div class="front-power">
        <div class="power-text">
          <div class="power-name"><span>Power:</span>${c.power_name || 'Unknown Ability'}</div>
          <div class="power-desc">${c.power_desc || c.notes || ''}</div>
        </div>
        <div class="power-gem">💠</div>
      </div>
    </div>
  `;

  // ── BACK ──
  const back = document.createElement('div');
  back.className = 'card-face card-back';

  const statsHTML = STATS.map(s => pipRow(s, c[s.key])).join('');
  const threatHTML = threatSkulls(c.threat_level);

  back.innerHTML = `
    <div class="back-header">
      <div class="back-header-left">
        <div class="back-name">${c.codename}</div>
        <div class="back-number">#${String(c.id).padStart(3, '0')}</div>
      </div>
      <div class="back-header-right">
        <div class="back-faction-badge">${sym}</div>
      </div>
    </div>

    <div class="back-info-row">
      <div class="back-info-table">
        <div class="info-row"><span class="info-key">Real Name:</span><span class="info-val">${c.real_name || '—'}</span></div>
        <div class="info-row"><span class="info-key">Alignment:</span><span class="info-val">${c.alignment || '—'}</span></div>
        <div class="info-row"><span class="info-key">Universe:</span><span class="info-val">${c.universe || '—'}</span></div>
        <div class="info-row"><span class="info-key">Team Affil.:</span><span class="info-val">${c.team_affiliation || '—'}</span></div>
        <div class="info-row"><span class="info-key">Species:</span><span class="info-val">${c.species || '—'}</span></div>
        <div class="info-row"><span class="info-key">Origin:</span><span class="info-val">${c.origin || '—'}</span></div>
        <div class="info-row double">
          <span class="info-key">Height:</span><span class="info-val">${c.height_cm ? c.height_cm + ' cm' : '—'}</span>
          <span class="info-key">Weight:</span><span class="info-val">${c.weight_kg ? c.weight_kg + ' kg' : '—'}</span>
        </div>
      </div>
      <div class="back-portrait">
        <img src="${imgUrl}" alt="${c.codename}">
      </div>
    </div>

    <div class="back-attributes">
      <div class="attributes-header">Attributes</div>
      ${statsHTML}
    </div>

    <div class="back-threat">
      <div class="threat-band">
        <div class="threat-label">Threat Level</div>
        <div class="threat-skulls">${threatHTML}</div>
      </div>
    </div>

    <div class="back-notes">
      <div class="notes-label">Notes</div>
      <div class="notes-text">${c.notes || 'No additional information available.'}</div>
    </div>

    <div class="back-footer">
      <div class="back-footer-text">
        © Pantheon Protocol &nbsp;|&nbsp; ${c.universe || ''} &nbsp;|&nbsp; ID-${String(c.id).padStart(3, '0')}
      </div>
    </div>
  `;

  card.appendChild(front);
  card.appendChild(back);
  card.innerHTML = `<div class="card-inner"></div>`;
  const inner = card.querySelector('.card-inner');
  inner.appendChild(front);
  inner.appendChild(back);

  // Notes tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'notes-tooltip';
  document.body.appendChild(tooltip);

  const infoIcon = back.querySelector('.notes-label');
  if (infoIcon) {
    infoIcon.style.cursor = 'help';
    infoIcon.title = c.notes || 'No notes';
  }

  return card;
}

/*************************************************
 * INIT
 *************************************************/
loadData();
