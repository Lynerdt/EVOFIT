export interface StatModifiers {
  attack: number; // e.g. 0.20 for +20%
  defense: number;
  speed: number;
  criticalChance: number;
}

export interface ActiveEffect {
  id: string;
  name: string;
  stat: keyof StatModifiers;
  value: number; // e.g. -0.20 or 0.30
  duration: number; // turns remaining
  target: 'self' | 'opponent';
}

export interface CreatureState {
  id: string;
  name: string;
  type: string;
  maxHp: number;
  hp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseCriticalChance: number;
  effects: ActiveEffect[];
}

export interface BattleMove {
  id: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  effect: {
    type: 'buff' | 'debuff';
    stat: keyof StatModifiers;
    value: number;
    duration: number;
    target: 'self' | 'opponent';
  } | null;
  description: string;
}

export interface RoundInput {
  creature1: CreatureState;
  move1: BattleMove;
  creature2: CreatureState;
  move2: BattleMove;
}

export interface RoundOutput {
  creature1: CreatureState;
  creature2: CreatureState;
  logs: string[];
  winnerId: string | null;
}

/**
 * Calculates the effective stats of a creature after applying current active effects (buffs/debuffs).
 */
export function getEffectiveStats(creature: CreatureState) {
  let attackMod = 0;
  let defenseMod = 0;
  let speedMod = 0;
  let critMod = 0;

  for (const fx of creature.effects) {
    if (fx.stat === 'attack') attackMod += fx.value;
    if (fx.stat === 'defense') defenseMod += fx.value;
    if (fx.stat === 'speed') speedMod += fx.value;
    if (fx.stat === 'criticalChance') critMod += fx.value;
  }

  return {
    attack: Math.max(1, Math.round(creature.baseAttack * (1 + attackMod))),
    defense: Math.max(1, Math.round(creature.baseDefense * (1 + defenseMod))),
    speed: Math.max(1, Math.round(creature.baseSpeed * (1 + speedMod))),
    criticalChance: Math.max(0, Math.min(1.0, creature.baseCriticalChance + critMod)),
  };
}

/**
 * Executes a single turn-based combat round between two creatures.
 */
export function executeRound(input: RoundInput): RoundOutput {
  // Clone creature states to avoid mutating inputs directly
  const c1: CreatureState = JSON.parse(JSON.stringify(input.creature1));
  const c2: CreatureState = JSON.parse(JSON.stringify(input.creature2));
  const logs: string[] = [];

  // 1. Calculate turn priority (Speed stat with a small random modifier +/- 10%)
  const stats1 = getEffectiveStats(c1);
  const stats2 = getEffectiveStats(c2);

  const randomFactor1 = 0.9 + Math.random() * 0.2; // [0.9, 1.1]
  const randomFactor2 = 0.9 + Math.random() * 0.2;

  const priority1 = stats1.speed * randomFactor1;
  const priority2 = stats2.speed * randomFactor2;

  const queue: Array<{ attacker: CreatureState; defender: CreatureState; move: BattleMove }> = [];

  if (priority1 >= priority2) {
    queue.push({ attacker: c1, defender: c2, move: input.move1 });
    queue.push({ attacker: c2, defender: c1, move: input.move2 });
  } else {
    queue.push({ attacker: c2, defender: c1, move: input.move2 });
    queue.push({ attacker: c1, defender: c2, move: input.move1 });
  }

  let winnerId: string | null = null;

  // 2. Process each turn in order of priority
  for (const turn of queue) {
    // If someone won during the previous turn, the round ends immediately
    if (c1.hp <= 0 || c2.hp <= 0) {
      break;
    }

    const { attacker, defender, move } = turn;
    const attackerStats = getEffectiveStats(attacker);
    const defenderStats = getEffectiveStats(defender);

    logs.push(`[Round Turn] ${attacker.name} prepares to use ${move.name}.`);

    // Calculate accuracy and avoidance based on Speed differentials
    // base_hit_chance scales up or down slightly based on speed ratio
    const speedRatio = attackerStats.speed / defenderStats.speed;
    const evasionFactor = Math.min(1.5, Math.max(0.5, speedRatio));
    const hitChance = Math.min(1.0, move.accuracy * evasionFactor);
    const hitRoll = Math.random();

    if (hitRoll <= hitChance) {
      // Hit lands! Calculate Critical Hit
      const critRoll = Math.random();
      const isCrit = critRoll <= attackerStats.criticalChance;
      const critMultiplier = isCrit ? 1.5 : 1.0;

      // Damage Calculation: Math.max(1, (Attacker_Attack * Move_Power * Critical_Multiplier) - Target_Defense)
      let damage = Math.round((attackerStats.attack * move.power * critMultiplier) - defenderStats.defense);
      damage = Math.max(1, damage);

      // Deduct damage from defender
      defender.hp = Math.max(0, defender.hp - damage);

      const critText = isCrit ? " CRITICAL HIT!" : "";
      logs.push(`${attacker.name} uses ${move.name}! It hits ${defender.name} for ${damage} damage.${critText}`);
      logs.push(`${defender.name} has ${defender.hp}/${defender.maxHp} HP remaining.`);

      // Apply move effects (buff/debuff) if they exist
      if (move.effect && defender.hp > 0) {
        const effectTarget = move.effect.target === 'self' ? attacker : defender;
        
        // Add effect to list
        const effectId = `${move.id}_effect_${Date.now()}`;
        const newEffect: ActiveEffect = {
          id: effectId,
          name: move.name,
          stat: move.effect.stat,
          value: move.effect.value,
          duration: move.effect.duration,
          target: move.effect.target,
        };

        effectTarget.effects.push(newEffect);
        
        const sign = newEffect.value >= 0 ? '+' : '';
        const percent = Math.round(newEffect.value * 100);
        logs.push(
          `${effectTarget.name} is affected by ${newEffect.name}! ${newEffect.stat.toUpperCase()} is modified by ${sign}${percent}% for ${newEffect.duration} turns.`
        );
      }
    } else {
      // Attack missed
      logs.push(`${attacker.name} uses ${move.name}, but the attack missed! ${defender.name} evaded it smoothly.`);
    }

    // Check defeat
    if (defender.hp <= 0) {
      winnerId = attacker.id;
      logs.push(`${defender.name} has fainted! ${attacker.name} wins the match!`);
      break;
    }
  }

  // 3. Decrement active effects duration at the end of the round for both creatures
  const decrementEffects = (creature: CreatureState) => {
    creature.effects = creature.effects
      .map(fx => {
        return { ...fx, duration: fx.duration - 1 };
      })
      .filter(fx => {
        if (fx.duration <= 0) {
          logs.push(`[Effect Expired] The effect of ${fx.name} on ${creature.name} has expired.`);
          return false;
        }
        return true;
      });
  };

  decrementEffects(c1);
  decrementEffects(c2);

  return {
    creature1: c1,
    creature2: c2,
    logs,
    winnerId,
  };
}
