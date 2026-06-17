import { loadData, pickImage, buildCard, STATS } from './cards.js';
import { simulateDuel, simulateTeamBattle } from './battle-engine.js';

let characters = [];
let images = [];
let mode = '1v1'; // '1v1' | 'team'

/*************************************************
 * INIT
 *************************************************/
(async function init() {
  const data = await loadData();
  characters = data.characters;
  images = data.images;

  populateFighterSelects();
  populateTeamSelects();
  attachListeners();
})();

/*************************************************
 * POPULATE SELECTS
 *************************************************/
function populateFighterSelects() {
  const a = document.getElementById('fighterASelect');
  const b = document.getElementById('fighterBSelect');

  const grouped = {};
  characters.forEach(c => {
    const u = c.universe || 'Unknown';
    if (!grouped[u]) grouped[u] = [];
    grouped[u].push(c);
  });

  [a, b].forEach(select => {
    select.innerHTML = '';
    Object.keys(grouped).sort().forEach(universe => {
      const og = document.createElement('optgroup');
      og.label = universe;
      grouped[universe]
        .sort((x, y) => x.codename.localeCompare(y.codename))
        .forEach(c => og.appendChild(new Option(c.codename, c.id)));
      select.appendChild(og);
    });
  });

  // Default to two different random fighters
  if (characters.length >= 2) {
    const shuffled = [...characters].sort(() => Math.random() - 0.5);
    a.value = shuffled[0].id;
    b.value = shuffled[1].id;
  }

  renderPreview();
}

function getTeams() {
  const teams = new Set();
  characters.forEach(c => {
    const t = (c.team_affiliation || '').trim();
    if (t) teams.add(t);
  });
  return [...teams].sort();
}

function populateTeamSelects() {
  const a = document.getElementById('teamASelect');
  const b = document.getElementById('teamBSelect');
  const teams = getTeams();

  [a, b].forEach(select => {
    select.innerHTML = '';
    teams.forEach(t => {
      const count = characters.filter(c => c.team_affiliation === t).length;
      select.appendChild(new Option(`${t} (${count})`, t));
    });
  });

  if (teams.length >= 2) {
    a.value = teams[0];
    b.value = teams[1];
  }
}

/*************************************************
 * EVENT LISTENERS
 *************************************************/
function attachListeners() {
  document.getElementById('mode1v1').addEventListener('click', () => setMode('1v1'));
  document.getElementById('modeTeam').addEventListener('click', () => setMode('team'));

  document.getElementById('fighterASelect').addEventListener('change', renderPreview);
  document.getElementById('fighterBSelect').addEventListener('change', renderPreview);

  document.getElementById('fightBtn').addEventListener('click', runBattle);
}

function setMode(newMode) {
  mode = newMode;
  document.getElementById('mode1v1').classList.toggle('active', mode === '1v1');
  document.getElementById('modeTeam').classList.toggle('active', mode === 'team');
  document.getElementById('duelPicker').style.display = mode === '1v1' ? 'flex' : 'none';
  document.getElementById('teamPicker').style.display = mode === 'team' ? 'flex' : 'none';
  document.getElementById('battleResults').innerHTML = '';
  document.getElementById('battlePreview').innerHTML = '';
  if (mode === '1v1') renderPreview();
}

/*************************************************
 * PREVIEW (1v1 only — shows the two selected cards)
 *************************************************/
function renderPreview() {
  if (mode !== '1v1') return;
  const idA = document.getElementById('fighterASelect').value;
  const idB = document.getElementById('fighterBSelect').value;
  const charA = characters.find(c => c.id == idA);
  const charB = characters.find(c => c.id == idB);

  const preview = document.getElementById('battlePreview');
  preview.innerHTML = '';
  if (!charA || !charB) return;

  const wrap = document.createElement('div');
  wrap.className = 'preview-cards';

  const cardA = buildCard(charA, pickImage(images, charA.id));
  const vsDiv = document.createElement('div');
  vsDiv.className = 'preview-vs';
  vsDiv.textContent = 'VS';
  const cardB = buildCard(charB, pickImage(images, charB.id));

  wrap.appendChild(cardA);
  wrap.appendChild(vsDiv);
  wrap.appendChild(cardB);
  preview.appendChild(wrap);
}

/*************************************************
 * RUN BATTLE
 *************************************************/
function runBattle() {
  if (mode === '1v1') runDuel();
  else runTeamBattle();
}

function runDuel() {
  const idA = document.getElementById('fighterASelect').value;
  const idB = document.getElementById('fighterBSelect').value;
  const charA = characters.find(c => c.id == idA);
  const charB = characters.find(c => c.id == idB);
  if (!charA || !charB) return;

  if (charA.id === charB.id) {
    alert('Choose two different fighters.');
    return;
  }

  const result = simulateDuel(charA, charB);
  renderDuelResult(result);
}

function runTeamBattle() {
  const teamAName = document.getElementById('teamASelect').value;
  const teamBName = document.getElementById('teamBSelect').value;
  if (!teamAName || !teamBName || teamAName === teamBName) {
    alert('Choose two different teams.');
    return;
  }

  const teamAMembers = characters.filter(c => c.team_affiliation === teamAName);
  const teamBMembers = characters.filter(c => c.team_affiliation === teamBName);

  if (!teamAMembers.length || !teamBMembers.length) {
    alert('One of the selected teams has no members.');
    return;
  }

  const result = simulateTeamBattle(teamAName, teamAMembers, teamBName, teamBMembers);
  renderTeamResult(result);
}

/*************************************************
 * RENDER: 1v1 RESULT
 *************************************************/
function actionIcon(type) {
  return {
    strike: '👊', speed: '💨', tactics: '🧠',
    defend: '🛡', willpower: '🔥', luck: '🍀', miss: '💤'
  }[type] || '⚔';
}

function renderDuelResult(result) {
  const { charA, charB, winner, loser, rounds, startHpA, startHpB } = result;
  const container = document.getElementById('battleResults');
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'battle-result';

  // Winner banner
  const banner = document.createElement('div');
  banner.className = 'winner-banner';
  banner.innerHTML = `
    <div class="winner-banner-label">Victory</div>
    <div class="winner-banner-name">${winner.codename}</div>
    <div class="winner-banner-sub">defeats ${loser.codename} after ${rounds.length} round${rounds.length !== 1 ? 's' : ''}</div>
  `;
  wrap.appendChild(banner);

  // HP bars (live state, final values)
  const hpRow = document.createElement('div');
  hpRow.className = 'hp-row';
  const lastRound = rounds[rounds.length - 1];
  hpRow.innerHTML = `
    <div class="hp-block">
      <div class="hp-name">${charA.codename}</div>
      <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${lastRound.hpAPct}%"></div></div>
      <div class="hp-pct">${lastRound.hpAPct}%</div>
    </div>
    <div class="hp-block">
      <div class="hp-name">${charB.codename}</div>
      <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${lastRound.hpBPct}%"></div></div>
      <div class="hp-pct">${lastRound.hpBPct}%</div>
    </div>
  `;
  wrap.appendChild(hpRow);

  // Round-by-round log
  const log = document.createElement('div');
  log.className = 'battle-log';
  rounds.forEach(r => {
    const roundDiv = document.createElement('div');
    roundDiv.className = 'battle-round';
    const eventsHtml = r.events.map(e => `
      <div class="battle-event battle-event-${e.type}">
        <span class="event-icon">${actionIcon(e.type)}</span>
        <span class="event-text">${e.text}</span>
      </div>
    `).join('');
    roundDiv.innerHTML = `
      <div class="round-label">Round ${r.round}</div>
      ${eventsHtml}
      <div class="round-hp-snapshot">
        ${charA.codename}: ${r.hpAPct}% &nbsp;|&nbsp; ${charB.codename}: ${r.hpBPct}%
      </div>
    `;
    log.appendChild(roundDiv);
  });
  wrap.appendChild(log);

  // Stat comparison table
  wrap.appendChild(buildStatComparison(charA, charB));

  container.appendChild(wrap);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/*************************************************
 * STAT COMPARISON TABLE
 *************************************************/
function buildStatComparison(charA, charB) {
  const div = document.createElement('div');
  div.className = 'stat-compare';
  div.innerHTML = `<div class="stat-compare-header">Stat Comparison</div>`;

  STATS.forEach(s => {
    const vA = Math.max(0, Math.min(100, Number(charA[s.key]) || 0));
    const vB = Math.max(0, Math.min(100, Number(charB[s.key]) || 0));
    const aWins = vA > vB;
    const bWins = vB > vA;

    const row = document.createElement('div');
    row.className = 'stat-compare-row';
    row.innerHTML = `
      <div class="sc-val ${aWins ? 'sc-win' : ''}">${Math.round(vA / 10)}</div>
      <div class="sc-bar-wrap">
        <div class="sc-bar-track sc-bar-left"><div class="sc-bar-fill ${s.pipClass}" style="width:${vA}%"></div></div>
        <div class="sc-label">${s.icon} ${s.label}</div>
        <div class="sc-bar-track sc-bar-right"><div class="sc-bar-fill ${s.pipClass}" style="width:${vB}%"></div></div>
      </div>
      <div class="sc-val ${bWins ? 'sc-win' : ''}">${Math.round(vB / 10)}</div>
    `;
    div.appendChild(row);
  });

  return div;
}

/*************************************************
 * RENDER: TEAM RESULT
 *************************************************/
function renderTeamResult(result) {
  const {
    teamAName, teamBName, teamAMembers, teamBMembers,
    champA, champB, champDuel, skirmishes,
    teamAWins, teamBWins, teamWinner
  } = result;

  const container = document.getElementById('battleResults');
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'battle-result';

  // Winner banner
  const banner = document.createElement('div');
  banner.className = 'winner-banner';
  banner.innerHTML = `
    <div class="winner-banner-label">Victory</div>
    <div class="winner-banner-name">${teamWinner}</div>
    <div class="winner-banner-sub">${teamAName} ${teamAWins} — ${teamBWins} ${teamBName}</div>
  `;
  wrap.appendChild(banner);

  // Champion duel callout
  if (champDuel) {
    const champSection = document.createElement('div');
    champSection.className = 'champion-section';
    champSection.innerHTML = `<div class="round-label">⭐ Champion Duel: ${champA.codename} vs ${champB.codename}</div>`;
    wrap.appendChild(champSection);

    const log = document.createElement('div');
    log.className = 'battle-log';
    champDuel.rounds.forEach(r => {
      const roundDiv = document.createElement('div');
      roundDiv.className = 'battle-round';
      const eventsHtml = r.events.map(e => `
        <div class="battle-event battle-event-${e.type}">
          <span class="event-icon">${actionIcon(e.type)}</span>
          <span class="event-text">${e.text}</span>
        </div>
      `).join('');
      roundDiv.innerHTML = `
        <div class="round-label">Round ${r.round}</div>
        ${eventsHtml}
      `;
      log.appendChild(roundDiv);
    });
    wrap.appendChild(log);

    const champBanner = document.createElement('div');
    champBanner.className = 'mini-winner';
    champBanner.textContent = `🏆 ${champDuel.winner.codename} wins the champion duel`;
    wrap.appendChild(champBanner);
  }

  // Skirmish results
  if (skirmishes.length) {
    const skSection = document.createElement('div');
    skSection.className = 'champion-section';
    skSection.innerHTML = `<div class="round-label">⚔ Squad Skirmishes</div>`;
    wrap.appendChild(skSection);

    const skLog = document.createElement('div');
    skLog.className = 'battle-log';
    skirmishes.forEach(s => {
      const div = document.createElement('div');
      div.className = 'battle-round';
      div.innerHTML = `
        <div class="battle-event battle-event-strike">
          <span class="event-icon">⚔</span>
          <span class="event-text">${s.text}</span>
        </div>
      `;
      skLog.appendChild(div);
    });
    wrap.appendChild(skLog);
  }

  // Roster grids
  const rosterSection = document.createElement('div');
  rosterSection.className = 'roster-section';
  rosterSection.innerHTML = `
    <div class="roster-col">
      <div class="round-label">${teamAName} Roster</div>
      <div class="card-grid roster-grid" id="rosterA"></div>
    </div>
    <div class="roster-col">
      <div class="round-label">${teamBName} Roster</div>
      <div class="card-grid roster-grid" id="rosterB"></div>
    </div>
  `;
  wrap.appendChild(rosterSection);

  container.appendChild(wrap);

  const rosterA = wrap.querySelector('#rosterA');
  const rosterB = wrap.querySelector('#rosterB');
  teamAMembers.forEach(c => rosterA.appendChild(buildCard(c, pickImage(images, c.id))));
  teamBMembers.forEach(c => rosterB.appendChild(buildCard(c, pickImage(images, c.id))));

  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
