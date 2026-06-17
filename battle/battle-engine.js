/*************************************************
 * BATTLE ENGINE
 * Turn-based simulation using character stats.
 * Exposes simulateDuel() for 1v1 and
 * simulateTeamBattle() for team vs team.
 *************************************************/

// Convert a 0-100 raw stat to a 0-10 scale (matches card display)
function s10(raw) {
  return Math.max(0, Math.min(10, Math.round((Number(raw) || 0) / 10)));
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/*************************************************
 * FLAVOR TEXT
 *************************************************/
const STRIKE_VERBS = [
  'lands a powerful strike on', 'slams into', 'unleashes a flurry of blows on',
  'charges and hits', 'overpowers',
];
const TACTICS_VERBS = [
  'outmaneuvers', 'reads the opening and outsmarts',
  'calculates a precise counter against', 'baits a mistake from',
];
const SPEED_VERBS = [
  'darts in and tags', 'blurs past the guard of', 'outpaces and clips',
];
const DEFEND_VERBS = [
  'braces and weathers the assault from', 'grits through the hit from',
  'holds the line against',
];
const WILLPOWER_VERBS = [
  'refuses to fall and pushes back against', 'digs deep and retaliates against',
];
const CRIT_PHRASES = [
  'A devastating blow connects!', 'A lucky opening is exploited perfectly!',
  'The strike lands with brutal precision!',
];
const DODGE_PHRASES = [
  'but the attack is dodged entirely!', 'but the blow whiffs completely!',
  'but it misses by inches!',
];
const GRAZE_PHRASES = [
  'landing only a glancing hit.', 'but the damage is minimal.',
  'barely scraping through.',
];

/*************************************************
 * STAT PROFILE (per single character)
 *************************************************/
function statProfile(c) {
  return {
    strength: s10(c.strength),
    speed: s10(c.speed),
    durability: s10(c.durability),
    intelligence: s10(c.intelligence),
    combat_skill: s10(c.combat_skill),
    willpower: s10(c.willpower),
    luck: s10(c.luck),
  };
}

function maxHpFor(stats) {
  return Math.round(40 + stats.durability * 8 + stats.willpower * 4);
}

/*************************************************
 * RESOLVE ONE ACTION
 * attacker/defender: { name, stats, hp, maxHp }
 *************************************************/
function resolveAction(attacker, defender) {
  const s = attacker.stats;
  const pool = s.strength + s.intelligence + s.speed + s.willpower;
  const roll = Math.random() * pool;

  let actionType, verb, power;
  if (roll < s.strength) {
    actionType = 'strike'; verb = pick(STRIKE_VERBS);
    power = s.strength * 0.6 + s.combat_skill * 0.4;
  } else if (roll < s.strength + s.intelligence) {
    actionType = 'tactics'; verb = pick(TACTICS_VERBS);
    power = s.intelligence * 0.7 + s.combat_skill * 0.3;
  } else if (roll < s.strength + s.intelligence + s.speed) {
    actionType = 'speed'; verb = pick(SPEED_VERBS);
    power = s.speed * 0.6 + s.combat_skill * 0.4;
  } else {
    actionType = 'willpower'; verb = pick(WILLPOWER_VERBS);
    power = s.willpower * 0.5 + s.combat_skill * 0.5;
  }

  const d = defender.stats;
  const dodgeChance = Math.max(0.03, Math.min(0.30,
    (d.speed + d.luck - s.combat_skill) * 0.02 + 0.08
  ));
  const dodged = Math.random() < dodgeChance;

  const critChance = Math.max(0.03, Math.min(0.25, s.luck * 0.02));
  const crit = !dodged && Math.random() < critChance;

  let dmg = 0;
  let suffix = '';
  let eventType = actionType;

  if (dodged) {
    suffix = pick(DODGE_PHRASES);
    eventType = 'miss';
    dmg = 0;
  } else {
    const raw = power * 2.2 - d.durability * 0.8;
    dmg = Math.max(1, Math.round(raw + (Math.random() * 4 - 2)));
    if (crit) {
      dmg = Math.round(dmg * 1.7);
      suffix = pick(CRIT_PHRASES);
      eventType = 'luck';
    } else if (dmg <= 3) {
      suffix = pick(GRAZE_PHRASES);
    }
  }

  defender.hp = Math.max(0, defender.hp - dmg);

  const text = `${attacker.name} ${verb} ${defender.name}. ${suffix}${dmg > 0 ? ` (−${dmg} HP)` : ''}`.trim();

  return { type: eventType, text, dmg };
}

/*************************************************
 * RUN ROUNDS UNTIL ONE SIDE FALLS (or maxRounds)
 * Returns { rounds, winner, loser } where winner/loser
 * reference the original fighterA/fighterB combatant objects
 *************************************************/
function runRounds(fighterA, fighterB, maxRounds = 20) {
  const rounds = [];
  let round = 1;

  while (fighterA.hp > 0 && fighterB.hp > 0 && round <= maxRounds) {
    const sA = fighterA.stats, sB = fighterB.stats;
    const aFirst = Math.random() * (sA.speed + sB.speed) < sA.speed;
    const order = aFirst ? [fighterA, fighterB] : [fighterB, fighterA];

    const events = [];
    for (const attacker of order) {
      const defender = attacker === fighterA ? fighterB : fighterA;
      if (defender.hp <= 0) break;
      events.push(resolveAction(attacker, defender));
    }

    rounds.push({
      round,
      events,
      hpAPct: Math.max(0, Math.round((fighterA.hp / fighterA.maxHp) * 100)),
      hpBPct: Math.max(0, Math.round((fighterB.hp / fighterB.maxHp) * 100)),
    });

    round++;
  }

  let winner, loser;
  if (fighterB.hp <= 0 && fighterA.hp > 0) {
    winner = fighterA; loser = fighterB;
  } else if (fighterA.hp <= 0 && fighterB.hp > 0) {
    winner = fighterB; loser = fighterA;
  } else {
    // Decision by remaining HP percentage
    const aPct = fighterA.hp / fighterA.maxHp;
    const bPct = fighterB.hp / fighterB.maxHp;
    if (aPct >= bPct) { winner = fighterA; loser = fighterB; }
    else { winner = fighterB; loser = fighterA; }
  }

  return { rounds, winner, loser };
}

/*************************************************
 * PUBLIC: SIMULATE 1v1 DUEL
 *************************************************/
export function simulateDuel(charA, charB) {
  const statsA = statProfile(charA);
  const statsB = statProfile(charB);
  const maxHpA = maxHpFor(statsA);
  const maxHpB = maxHpFor(statsB);

  const fighterA = { name: charA.codename, stats: statsA, hp: maxHpA, maxHp: maxHpA };
  const fighterB = { name: charB.codename, stats: statsB, hp: maxHpB, maxHp: maxHpB };

  const { rounds, winner, loser } = runRounds(fighterA, fighterB);

  const winnerChar = winner.name === charA.codename ? charA : charB;
  const loserChar = winnerChar === charA ? charB : charA;

  return {
    charA, charB,
    winner: winnerChar,
    loser: loserChar,
    rounds,
    startHpA: maxHpA,
    startHpB: maxHpB,
  };
}

/*************************************************
 * PUBLIC: SIMULATE TEAM vs TEAM
 * Model: each team's "champion" (highest combat_skill +
 * strength) duels first as the marquee matchup. Then the
 * remaining roster members are paired off randomly into
 * quick skirmishes (single resolved exchange each) to
 * decide additional points. Most total points wins.
 *************************************************/
function pickChampion(members) {
  return [...members].sort((a, b) => {
    const score = (c) => s10(c.combat_skill) + s10(c.strength) + s10(c.willpower);
    return score(b) - score(a);
  })[0];
}

function quickSkirmish(charX, charY) {
  const sX = statProfile(charX), sY = statProfile(charY);
  const fX = { name: charX.codename, stats: sX, hp: maxHpFor(sX), maxHp: maxHpFor(sX) };
  const fY = { name: charY.codename, stats: sY, hp: maxHpFor(sY), maxHp: maxHpFor(sY) };
  const { winner } = runRounds(fX, fY, 8); // short skirmish
  const winnerChar = winner.name === charX.codename ? charX : charY;
  const loserChar = winnerChar === charX ? charY : charX;
  return {
    text: `${winnerChar.codename} defeats ${loserChar.codename} in a squad skirmish.`,
    winner: winnerChar,
    loser: loserChar,
  };
}

export function simulateTeamBattle(teamAName, teamAMembers, teamBName, teamBMembers) {
  const champA = pickChampion(teamAMembers);
  const champB = pickChampion(teamBMembers);

  const champDuelRaw = simulateDuel(champA, champB);
  const champDuel = {
    rounds: champDuelRaw.rounds,
    winner: champDuelRaw.winner,
    loser: champDuelRaw.loser,
  };

  let teamAWins = champDuel.winner.codename === champA.codename ? 1 : 0;
  let teamBWins = champDuel.winner.codename === champB.codename ? 1 : 0;

  // Remaining roster (excluding champions), paired off randomly
  const restA = teamAMembers.filter(c => c.id !== champA.id);
  const restB = teamBMembers.filter(c => c.id !== champB.id);
  const pairCount = Math.min(restA.length, restB.length);

  const shuffledA = [...restA].sort(() => Math.random() - 0.5);
  const shuffledB = [...restB].sort(() => Math.random() - 0.5);

  const skirmishes = [];
  for (let i = 0; i < pairCount; i++) {
    const result = quickSkirmish(shuffledA[i], shuffledB[i]);
    skirmishes.push(result);
    if (teamAMembers.some(c => c.id === result.winner.id)) teamAWins++;
    else teamBWins++;
  }

  // Any leftover unpaired members from the larger roster count as automatic
  // bonus points for that team (numbers advantage)
  if (restA.length > restB.length) teamAWins += (restA.length - restB.length);
  if (restB.length > restA.length) teamBWins += (restB.length - restA.length);

  const teamWinner = teamAWins === teamBWins
    ? (champDuel.winner.codename === champA.codename ? teamAName : teamBName) // tiebreak: champion duel
    : (teamAWins > teamBWins ? teamAName : teamBName);

  return {
    teamAName, teamBName,
    teamAMembers, teamBMembers,
    champA, champB, champDuel,
    skirmishes,
    teamAWins, teamBWins,
    teamWinner,
  };
}
