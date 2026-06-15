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
  populateTeamSelector();
})();

/*************************************************
 * TEAM SELECTOR
 *************************************************/
function getTeams() {
  const teams = new Set();
  characters.forEach(c => {
    const t = (c.team_affiliation || '').trim();
    if (t) teams.add(t);
  });
  return [...teams].sort();
}

function populateTeamSelector() {
  const select = document.getElementById('teamSelect');
  select.innerHTML = '';

  const teams = getTeams();
  teams.forEach(team => {
    const count = characters.filter(c => c.team_affiliation === team).length;
    select.appendChild(new Option(`${team} (${count})`, team));
  });

  select.addEventListener('change', () => renderTeam(select.value));
  document.getElementById('randomBtn').onclick = () => {
    const pick = teams[Math.floor(Math.random() * teams.length)];
    select.value = pick;
    renderTeam(pick);
  };

  // Render first team on load
  if (teams.length) renderTeam(teams[0]);
}

/*************************************************
 * TEAM RENDER
 *************************************************/
function renderTeam(teamName) {
  const members = characters.filter(c => c.team_affiliation === teamName);

  // Header
  const header = document.getElementById('teamHeader');
  header.innerHTML = `
    <h2>${teamName}</h2>
    <p>${members.length} member${members.length !== 1 ? 's' : ''}</p>
  `;

  // Cards
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  members
    .sort((a, b) => a.codename.localeCompare(b.codename))
    .forEach(c => {
      const imgUrl = pickImage(images, c.id);
      grid.appendChild(buildCard(c, imgUrl));
    });
}
