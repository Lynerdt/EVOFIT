# EVOFIT

**A fitness RPG engine where real-world activity powers your creatures.**

EVOFIT is a turn-based battle engine written in TypeScript. Each creature's stats scale with the player's real fitness data (steps, active minutes, water intake, sleep, workouts, and calories), and creatures evolve as cumulative activity milestones are reached. The project combines exercise-physiology domain knowledge with game design.

> **Status:** Phase 1, the core battle engine and creature data. A player-facing interface and fitness-data integrations come in later phases.

---

## What's here

| File | Purpose |
|---|---|
| `battleEngine.ts` | The combat engine: typed models, stat calculation, and round resolution |
| `creatures.json` | Data for five starter creatures: stats, moves, fitness multipliers, evolution trees |
| `testBattle.ts` | A simulation harness that loads two creatures, applies fitness modifiers, and runs two rounds |
| `tsconfig.json` | Strict TypeScript config (ES2022, NodeNext modules) |

## How a round works

`executeRound()` takes two creatures and their chosen moves, and returns new creature states plus a battle log. It never mutates its inputs.

1. **Turn order.** Each creature's effective speed is multiplied by a random factor between 0.9 and 1.1, and the faster creature acts first.
2. **Hit check.** Move accuracy is scaled by the attacker-to-defender speed ratio, clamped between 0.5× and 1.5×.
3. **Critical hits.** Each creature has a critical chance; a crit multiplies damage by 1.5×.
4. **Damage.** `max(1, attack × movePower × critMultiplier − defense)`
5. **Effects.** Buff and debuff moves (for example, −20% defense for 2 turns) are applied to the target. Effects stack, and their durations count down at the end of each round.
6. **Knockout.** When a creature's HP reaches 0, the round ends and the winner's ID is returned.

`getEffectiveStats()` computes a creature's current attack, defense, speed, and crit chance after all active effects.

## Fitness multipliers

Every creature has two stats tied to real activity. For example, Pyroshell's attack scales with daily steps:

```
attack = baseAttack × (1 + (dailySteps / 10000) × 0.15)
```

That is +15% attack per 10,000 steps taken today.

| Creature | Type | Driven by |
|---|---|---|
| Pyroshell | Flame | Daily steps, active minutes |
| Hydropup | Hydro | Water intake, sleep hours |
| Terracliff | Terra | Completed workouts, daily steps |
| Aerowing | Aero | Active minutes, calories burned |
| Sparkmouse | Spark | Sleep hours, daily steps |

Each creature has three evolution stages, unlocked by cumulative steps and completed workouts. Pyroshell, for example, becomes Pyroclast at 50,000 steps plus 5 workouts, and Pyrosaur at 150,000 steps plus 15 workouts.

## Getting started

**Requirements:** Node.js 22.6 or newer, which can run TypeScript files directly.

```bash
git clone https://github.com/Lynerdt/evofit.git
cd evofit
npm install
npm test
```

`npm test` runs `testBattle.ts`, which:

- loads Pyroshell and Hydropup from `creatures.json`
- applies fitness modifiers (10,000 steps boosts Pyroshell's attack; 64 oz of water boosts Hydropup's HP)
- adds a pre-battle "Clean Meal Check-in" defense buff
- runs two rounds and prints the battle log

Example output:

```
=== Round 1 Results ===
[Round Turn] Pyroshell prepares to use Melt Armour.
Pyroshell uses Melt Armour! It hits Hydropup for 1 damage.
Hydropup is affected by Melt Armour! DEFENSE is modified by -20% for 2 turns.
[Round Turn] Hydropup prepares to use Torrential Bite.
Hydropup uses Torrential Bite! It hits Pyroshell for 12 damage.
```

Turn order, hits, and crits involve randomness, so each run plays out differently.

## Using the engine

```ts
import { executeRound } from './battleEngine.ts';

const result = executeRound({
  creature1, move1,
  creature2, move2,
});

result.logs.forEach(line => console.log(line));
// Pass result.creature1 and result.creature2 into the next round
if (result.winnerId) console.log(`Winner: ${result.winnerId}`);
```

## Roadmap

- Automated tests with assertions and seeded randomness
- Type-effectiveness matchups (Flame vs. Hydro, and so on)
- Evolution logic driven by stored fitness history
- Fitness data integrations (step counters, wearables)
- A playable front end

## Background

EVOFIT grew out of an earlier interactive HTML/JS prototype with creature-card collection and turn-based combat. This version rebuilds the engine in strict TypeScript with a modular structure so it can support persistence, integrations, and a UI.
