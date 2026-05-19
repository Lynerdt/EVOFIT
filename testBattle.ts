import { readFileSync } from 'fs';
import { executeRound, getEffectiveStats } from './battleEngine.ts';
import type { CreatureState, BattleMove } from './battleEngine.ts';

// Load creatures
const rawCreatures = JSON.parse(readFileSync('./creatures.json', 'utf-8'));

// Setup Pyroshell (Creature 1)
const pyroshellData = rawCreatures[0];
const pyroshell: CreatureState = {
  id: pyroshellData.id,
  name: pyroshellData.name,
  type: pyroshellData.type,
  maxHp: pyroshellData.stats.hp,
  hp: pyroshellData.stats.hp,
  baseAttack: pyroshellData.stats.attack,
  baseDefense: pyroshellData.stats.defense,
  baseSpeed: pyroshellData.stats.speed,
  baseCriticalChance: pyroshellData.stats.criticalChance,
  effects: []
};

// Setup Hydropup (Creature 2)
const hydropupData = rawCreatures[1];
const hydropup: CreatureState = {
  id: hydropupData.id,
  name: hydropupData.name,
  type: hydropupData.type,
  maxHp: hydropupData.stats.hp,
  hp: hydropupData.stats.hp,
  baseAttack: hydropupData.stats.attack,
  baseDefense: hydropupData.stats.defense,
  baseSpeed: hydropupData.stats.speed,
  baseCriticalChance: hydropupData.stats.criticalChance,
  effects: []
};

// 1. Apply Fitness Modifiers
// Let's say user has taken 10,000 steps today -> scales Pyroshell's Attack
const dailySteps = 10000;
const basePyroshellAttack = pyroshell.baseAttack;
// formula: baseValue * (1 + (dailySteps / 10000) * 0.15)
pyroshell.baseAttack = Math.round(basePyroshellAttack * (1 + (dailySteps / 10000) * 0.15));

// Let's say user drank 64oz of water today -> scales Hydropup's HP
const waterOunces = 64;
const baseHydropupHp = hydropup.maxHp;
// formula: baseValue * (1 + (waterOunces / 64) * 0.10)
hydropup.maxHp = Math.round(baseHydropupHp * (1 + (waterOunces / 64) * 0.10));
hydropup.hp = hydropup.maxHp;

// 2. Add an pre-battle buff (e.g. +20% Defense from a 'Clean Meal' check-in)
hydropup.effects.push({
  id: 'clean_meal_buff',
  name: 'Clean Meal Check-in',
  stat: 'defense',
  value: 0.20,
  duration: 3,
  target: 'self'
});

console.log("=== Battle Setup ===");
console.log(`Pyroshell (Daily Steps: ${dailySteps}) -> Attack: ${pyroshell.baseAttack} (Base: ${basePyroshellAttack})`);
console.log(`Hydropup (Water Intake: ${waterOunces}oz, Clean Meal Buff active) -> HP: ${hydropup.hp}/${hydropup.maxHp}, Effective Defense: ${getEffectiveStats(hydropup).defense}`);
console.log("===================\n");

// Select moves
const pyroMove = pyroshellData.moves[2]; // Melt Armour (Flame, power 0.8, inflicts 20% defense debuff)
const hydroMove = hydropupData.moves[2]; // Torrential Bite (Hydro, power 1.5)

console.log(`Pyroshell chooses: ${pyroMove.name}`);
console.log(`Hydropup chooses: ${hydroMove.name}\n`);

// Execute Round 1
const result1 = executeRound({
  creature1: pyroshell,
  move1: pyroMove as BattleMove,
  creature2: hydropup,
  move2: hydroMove as BattleMove
});

console.log("=== Round 1 Results ===");
result1.logs.forEach(log => console.log(log));
console.log("=======================\n");

// Select next moves for Round 2
const pyroMove2 = pyroshellData.moves[1]; // Flame Burst (Flame, power 1.6)
const hydroMove2 = hydropupData.moves[3]; // Tsunami Crash (Hydro, power 2.0)

console.log(`Pyroshell chooses: ${pyroMove2.name}`);
console.log(`Hydropup chooses: ${hydroMove2.name}\n`);

// Execute Round 2 using output state from Round 1
const result2 = executeRound({
  creature1: result1.creature1,
  move1: pyroMove2 as BattleMove,
  creature2: result1.creature2,
  move2: hydroMove2 as BattleMove
});

console.log("=== Round 2 Results ===");
result2.logs.forEach(log => console.log(log));
console.log("=======================\n");
