/**
 * PDF Field Mapping
 * Maps between SurvivorData structure and actual PDF form field names
 */

import type { SurvivorData } from '../types/survivor'

/**
 * Convert SurvivorData to flat PDF fields object
 * Uses actual field names from fillable.pdf
 */
export function survivorDataToPdfFields(survivor: SurvivorData): Record<string, any> {
  const fields: Record<string, any> = {}

  // Basic fields
  fields['survivor_name_input'] = survivor.name || ''
  fields['survivor_is_male_checkbox'] = survivor.gender === 'M'
  fields['survivor_is_female_checkbox'] = survivor.gender === 'F'

  // Hunt XP - PDF uses hunt_check_-1 through hunt_check_13 (15 boxes, we have 16)
  // Map our indices 0-15 to PDF's -1 to 14
  survivor.huntXP.forEach((checked, i) => {
    fields[`hunt_check_${i - 1}`] = checked
  })

  // Survival
  fields['survival_num_input'] = survivor.survival
  fields['cannot_spend_survival_check'] = survivor.cannotSpendSurvival

  // Survival abilities
  fields['dash_check'] = survivor.survivalAbilities.dash
  fields['encourage_check'] = survivor.survivalAbilities.encourage
  fields['surge_check'] = survivor.survivalAbilities.surge
  fields['fist_pump_check'] = survivor.survivalAbilities.fistPump
  // Note: dodge and endure don't have fields in this PDF

  // Stats
  fields['movement_num_input'] = survivor.stats.movement
  fields['accuracy_num_input'] = survivor.stats.accuracy
  fields['strength_num_input'] = survivor.stats.strength
  fields['evasion_num_input'] = survivor.stats.evasion
  fields['luck_num_input'] = survivor.stats.luck
  fields['speed_num_input'] = survivor.stats.speed

  // Brain/Insanity
  fields['insanity_num_input'] = survivor.brainArmor
  fields['brain_damage_check'] = survivor.insane

  // Body locations
  fields['head_num_input'] = survivor.bodyLocations.head.armor
  fields['head_heavy_check'] = survivor.bodyLocations.head.heavy

  fields['arms_num_input'] = survivor.bodyLocations.arms.armor
  fields['arms_light_check'] = survivor.bodyLocations.arms.light
  fields['arms_heavy_check'] = survivor.bodyLocations.arms.heavy

  fields['body_num_input'] = survivor.bodyLocations.body.armor
  fields['body_light_check'] = survivor.bodyLocations.body.light
  fields['body_heavy_check'] = survivor.bodyLocations.body.heavy

  fields['waist_num_input'] = survivor.bodyLocations.waist.armor
  fields['waist_light_check'] = survivor.bodyLocations.waist.light
  fields['waist_heavy_check'] = survivor.bodyLocations.waist.heavy

  fields['legs_num_input'] = survivor.bodyLocations.legs.armor
  fields['legs_light_check'] = survivor.bodyLocations.legs.light
  fields['legs_heavy_check'] = survivor.bodyLocations.legs.heavy

  // Weapon proficiency
  if (survivor.weaponProficiency.types.length > 0) {
    fields['weapon_profic_input'] = survivor.weaponProficiency.types[0]
  }
  // PDF has weap_prof_check_1 (note the different naming) and weapon_prof_check_2-8
  if (survivor.weaponProficiency.level.length > 0) {
    fields['weap_prof_check_1'] = survivor.weaponProficiency.level[0]
  }
  survivor.weaponProficiency.level.slice(1).forEach((checked, i) => {
    fields[`weapon_prof_check_${i + 2}`] = checked
  })

  // Courage (9 boxes)
  survivor.courage.forEach((checked, i) => {
    fields[`courage_check_${i + 1}`] = checked
  })

  // Understanding (9 boxes)
  survivor.understanding.forEach((checked, i) => {
    fields[`understanding_check_${i + 1}`] = checked
  })

  // Fighting Arts (PDF has fighting_input_1 and fighting_input_2, we have 3)
  const fightingArts = survivor.fightingArts.filter(art => art)
  if (fightingArts.length > 0) fields['fighting_input_1'] = fightingArts[0]
  if (fightingArts.length > 1) fields['fighting_input_2'] = fightingArts[1]
  // Note: 3rd fighting art doesn't fit on this PDF

  // Disorders (PDF has 3 fields)
  const disorders = survivor.disorders.filter(d => d)
  if (disorders.length > 0) fields['disorders_input_1'] = disorders[0]
  if (disorders.length > 1) fields['disorders_input_2'] = disorders[1]
  if (disorders.length > 2) fields['disorders_input_3'] = disorders[2]

  // Abilities & Impairments (PDF has 4 fields)
  const abilities = survivor.abilitiesImpairments.filter(item => item)
  if (abilities.length > 0) fields['abilities_input_1'] = abilities[0]
  if (abilities.length > 1) fields['abilities_input_2'] = abilities[1]
  if (abilities.length > 2) fields['abilities_input_3'] = abilities[2]
  if (abilities.length > 3) fields['abilities_input_4'] = abilities[3]

  // Once Per Lifetime
  const lifetime = survivor.oncePerLifetime.filter(item => item)
  if (lifetime.length > 0) {
    fields['lifetime_input'] = lifetime.join(', ')
  }

  // Next Departure
  if (survivor.nextDeparture) {
    fields['next_departure_input'] = survivor.nextDeparture
  }

  // Additional checkboxes
  fields['skip_next_hunt_check'] = survivor.skipNextHunt
  fields['reroll_used_check'] = survivor.rerollUsed
  fields['no_fighting_arts_check'] = survivor.cannotUseFightingArts

  // Arc expansion fields
  if (survivor.systolicPressure !== undefined) {
    fields['sys_press_num_input'] = survivor.systolicPressure
  }
  if (survivor.torment !== undefined) {
    fields['torment_num_input'] = survivor.torment
  }
  if (survivor.luminosity !== undefined) {
    fields['lumi_num_input'] = survivor.luminosity
  }
  if (survivor.philosophy) {
    fields['phil_input'] = survivor.philosophy
  }
  if (survivor.philosophyRank !== undefined) {
    fields['phil_rank_num_input'] = survivor.philosophyRank
  }

  // Neurosis
  if (survivor.neurosis?.name) fields['neurosis_input'] = survivor.neurosis.name
  if (survivor.neurosis?.rules) fields['neurosis_rules_input'] = survivor.neurosis.rules
  if (survivor.neurosis?.observationConditions) fields['neurosis_obs_cond_input'] = survivor.neurosis.observationConditions
  if (survivor.neurosis?.tenetKnowledge) fields['neurosis_tenet_know_inp'] = survivor.neurosis.tenetKnowledge

  // Knowledge 1
  if (survivor.knowledge1?.name) fields['knowledge1_name_input'] = survivor.knowledge1.name
  if (survivor.knowledge1?.rules) fields['knowledge1_rules_input'] = survivor.knowledge1.rules
  if (survivor.knowledge1?.observationConditions) fields['knowledge1_obs_cond_input'] = survivor.knowledge1.observationConditions
  survivor.knowledge1?.checks?.forEach((checked, i) => {
    fields[`knowledge_check_${i + 1}`] = checked
  })

  // Knowledge 2
  if (survivor.knowledge2?.name) fields['knowledge2_name_input'] = survivor.knowledge2.name
  if (survivor.knowledge2?.rules) fields['knowledge2_rules_input'] = survivor.knowledge2.rules
  if (survivor.knowledge2?.observationConditions) fields['knowledge2_obs_cond_input'] = survivor.knowledge2.observationConditions
  survivor.knowledge2?.checks?.forEach((checked, i) => {
    fields[`knowledge_check_${i + 10}`] = checked
  })

  // Tenet Knowledge checks
  survivor.tenetKnowledgeChecks?.forEach((checked, i) => {
    fields[`tenet_knowledge_check_${i + 1}`] = checked
  })

  // Permanent Injuries - flatten checkboxes to PDF fields
  // Head (5 checkboxes across 4 injuries)
  let checkboxIndex = 1
  survivor.permanentInjuries.head.forEach(injury => {
    injury.checkboxes.forEach(checked => {
      fields[`head_severe_check_${checkboxIndex}`] = checked
      checkboxIndex++
    })
  })

  // Arms (10 checkboxes across 4 injuries)
  checkboxIndex = 1
  survivor.permanentInjuries.arms.forEach(injury => {
    injury.checkboxes.forEach(checked => {
      fields[`arm_severe_check_${checkboxIndex}`] = checked
      checkboxIndex++
    })
  })

  // Body (11 checkboxes across 3 injuries)
  checkboxIndex = 1
  survivor.permanentInjuries.body.forEach(injury => {
    injury.checkboxes.forEach(checked => {
      fields[`body_severe_check_${checkboxIndex}`] = checked
      checkboxIndex++
    })
  })

  // Waist (8 checkboxes across 4 injuries)
  checkboxIndex = 1
  survivor.permanentInjuries.waist.forEach(injury => {
    injury.checkboxes.forEach(checked => {
      fields[`waist_severe_check_${checkboxIndex}`] = checked
      checkboxIndex++
    })
  })

  // Legs (5 checkboxes across 3 injuries)
  checkboxIndex = 1
  survivor.permanentInjuries.legs.forEach(injury => {
    injury.checkboxes.forEach(checked => {
      fields[`legs_severe_check_${checkboxIndex}`] = checked
      checkboxIndex++
    })
  })

  return fields
}

/**
 * Convert PDF fields back to SurvivorData
 * Merges PDF field values into the base survivor data
 */
export function pdfFieldsToSurvivorData(
  fields: Record<string, any>,
  baseSurvivor: SurvivorData
): SurvivorData {
  const survivor = { ...baseSurvivor }

  // Basic fields
  if (fields['survivor_name_input'] !== undefined) survivor.name = String(fields['survivor_name_input'])

  // Gender
  if (fields['survivor_is_male_checkbox']) survivor.gender = 'M'
  else if (fields['survivor_is_female_checkbox']) survivor.gender = 'F'
  else survivor.gender = ''

  // Hunt XP - PDF uses hunt_check_-1 through hunt_check_13
  for (let i = 0; i < 16; i++) {
    const fieldName = `hunt_check_${i - 1}`
    if (fields[fieldName] !== undefined) {
      survivor.huntXP[i] = Boolean(fields[fieldName])
    }
  }

  // Survival
  if (fields['survival_num_input'] !== undefined) survivor.survival = Number(fields['survival_num_input']) || 0
  if (fields['cannot_spend_survival_check'] !== undefined) survivor.cannotSpendSurvival = Boolean(fields['cannot_spend_survival_check'])

  // Survival abilities
  if (fields['dash_check'] !== undefined) survivor.survivalAbilities.dash = Boolean(fields['dash_check'])
  if (fields['encourage_check'] !== undefined) survivor.survivalAbilities.encourage = Boolean(fields['encourage_check'])
  if (fields['surge_check'] !== undefined) survivor.survivalAbilities.surge = Boolean(fields['surge_check'])
  if (fields['fist_pump_check'] !== undefined) survivor.survivalAbilities.fistPump = Boolean(fields['fist_pump_check'])

  // Stats
  if (fields['movement_num_input'] !== undefined) survivor.stats.movement = Number(fields['movement_num_input']) || 0
  if (fields['accuracy_num_input'] !== undefined) survivor.stats.accuracy = Number(fields['accuracy_num_input']) || 0
  if (fields['strength_num_input'] !== undefined) survivor.stats.strength = Number(fields['strength_num_input']) || 0
  if (fields['evasion_num_input'] !== undefined) survivor.stats.evasion = Number(fields['evasion_num_input']) || 0
  if (fields['luck_num_input'] !== undefined) survivor.stats.luck = Number(fields['luck_num_input']) || 0
  if (fields['speed_num_input'] !== undefined) survivor.stats.speed = Number(fields['speed_num_input']) || 0

  // Brain/Insanity
  if (fields['insanity_num_input'] !== undefined) survivor.brainArmor = Number(fields['insanity_num_input']) || 0
  if (fields['brain_damage_check'] !== undefined) survivor.insane = Boolean(fields['brain_damage_check'])

  // Body locations
  if (fields['head_num_input'] !== undefined) survivor.bodyLocations.head.armor = Number(fields['head_num_input']) || 0
  if (fields['head_heavy_check'] !== undefined) survivor.bodyLocations.head.heavy = Boolean(fields['head_heavy_check'])

  if (fields['arms_num_input'] !== undefined) survivor.bodyLocations.arms.armor = Number(fields['arms_num_input']) || 0
  if (fields['arms_light_check'] !== undefined) survivor.bodyLocations.arms.light = Boolean(fields['arms_light_check'])
  if (fields['arms_heavy_check'] !== undefined) survivor.bodyLocations.arms.heavy = Boolean(fields['arms_heavy_check'])

  if (fields['body_num_input'] !== undefined) survivor.bodyLocations.body.armor = Number(fields['body_num_input']) || 0
  if (fields['body_light_check'] !== undefined) survivor.bodyLocations.body.light = Boolean(fields['body_light_check'])
  if (fields['body_heavy_check'] !== undefined) survivor.bodyLocations.body.heavy = Boolean(fields['body_heavy_check'])

  if (fields['waist_num_input'] !== undefined) survivor.bodyLocations.waist.armor = Number(fields['waist_num_input']) || 0
  if (fields['waist_light_check'] !== undefined) survivor.bodyLocations.waist.light = Boolean(fields['waist_light_check'])
  if (fields['waist_heavy_check'] !== undefined) survivor.bodyLocations.waist.heavy = Boolean(fields['waist_heavy_check'])

  if (fields['legs_num_input'] !== undefined) survivor.bodyLocations.legs.armor = Number(fields['legs_num_input']) || 0
  if (fields['legs_light_check'] !== undefined) survivor.bodyLocations.legs.light = Boolean(fields['legs_light_check'])
  if (fields['legs_heavy_check'] !== undefined) survivor.bodyLocations.legs.heavy = Boolean(fields['legs_heavy_check'])

  // Weapon proficiency
  if (fields['weapon_profic_input'] !== undefined) {
    const value = String(fields['weapon_profic_input'])
    survivor.weaponProficiency.types = value ? [value] : []
  }
  if (fields['weap_prof_check_1'] !== undefined) {
    survivor.weaponProficiency.level[0] = Boolean(fields['weap_prof_check_1'])
  }
  for (let i = 2; i <= 8; i++) {
    if (fields[`weapon_prof_check_${i}`] !== undefined) {
      survivor.weaponProficiency.level[i - 1] = Boolean(fields[`weapon_prof_check_${i}`])
    }
  }

  // Courage
  for (let i = 1; i <= 9; i++) {
    if (fields[`courage_check_${i}`] !== undefined) {
      survivor.courage[i - 1] = Boolean(fields[`courage_check_${i}`])
    }
  }

  // Understanding
  for (let i = 1; i <= 9; i++) {
    if (fields[`understanding_check_${i}`] !== undefined) {
      survivor.understanding[i - 1] = Boolean(fields[`understanding_check_${i}`])
    }
  }

  // Fighting Arts
  if (fields['fighting_input_1'] !== undefined || fields['fighting_input_2'] !== undefined) {
    const fightingArts: string[] = []
    if (fields['fighting_input_1']) fightingArts.push(String(fields['fighting_input_1']))
    if (fields['fighting_input_2']) fightingArts.push(String(fields['fighting_input_2']))
    survivor.fightingArts = fightingArts.length > 0 ? [...fightingArts, ''] : ['']
  }

  // Disorders
  if (fields['disorders_input_1'] !== undefined || fields['disorders_input_2'] !== undefined || fields['disorders_input_3'] !== undefined) {
    const disorders: string[] = []
    if (fields['disorders_input_1']) disorders.push(String(fields['disorders_input_1']))
    if (fields['disorders_input_2']) disorders.push(String(fields['disorders_input_2']))
    if (fields['disorders_input_3']) disorders.push(String(fields['disorders_input_3']))
    survivor.disorders = disorders.length > 0 ? [...disorders, ''] : ['']
  }

  // Abilities & Impairments
  if (fields['abilities_input_1'] !== undefined || fields['abilities_input_2'] !== undefined || fields['abilities_input_3'] !== undefined || fields['abilities_input_4'] !== undefined) {
    const abilities: string[] = []
    if (fields['abilities_input_1']) abilities.push(String(fields['abilities_input_1']))
    if (fields['abilities_input_2']) abilities.push(String(fields['abilities_input_2']))
    if (fields['abilities_input_3']) abilities.push(String(fields['abilities_input_3']))
    if (fields['abilities_input_4']) abilities.push(String(fields['abilities_input_4']))
    survivor.abilitiesImpairments = abilities.length > 0 ? [...abilities, ''] : ['', '']
  }

  // Once Per Lifetime
  if (fields['lifetime_input']) {
    const items = String(fields['lifetime_input']).split(',').map(s => s.trim()).filter(s => s)
    if (items.length > 0) {
      survivor.oncePerLifetime = [...items, '']
    }
  }

  // Next Departure
  if (fields['next_departure_input'] !== undefined) {
    survivor.nextDeparture = String(fields['next_departure_input'])
  }

  // Additional checkboxes
  if (fields['skip_next_hunt_check'] !== undefined) survivor.skipNextHunt = Boolean(fields['skip_next_hunt_check'])
  if (fields['reroll_used_check'] !== undefined) survivor.rerollUsed = Boolean(fields['reroll_used_check'])
  if (fields['no_fighting_arts_check'] !== undefined) survivor.cannotUseFightingArts = Boolean(fields['no_fighting_arts_check'])

  // Arc expansion fields
  if (fields['sys_press_num_input'] !== undefined) {
    survivor.systolicPressure = Number(fields['sys_press_num_input']) || 0
  }
  if (fields['torment_num_input'] !== undefined) {
    survivor.torment = Number(fields['torment_num_input']) || 0
  }
  if (fields['lumi_num_input'] !== undefined) {
    survivor.luminosity = Number(fields['lumi_num_input']) || 0
  }
  if (fields['phil_input'] !== undefined) {
    survivor.philosophy = String(fields['phil_input'])
  }
  if (fields['phil_rank_num_input'] !== undefined) {
    survivor.philosophyRank = Number(fields['phil_rank_num_input']) || 0
  }

  // Neurosis
  if (!survivor.neurosis) survivor.neurosis = {}
  if (fields['neurosis_input'] !== undefined) survivor.neurosis.name = String(fields['neurosis_input'])
  if (fields['neurosis_rules_input'] !== undefined) survivor.neurosis.rules = String(fields['neurosis_rules_input'])
  if (fields['neurosis_obs_cond_input'] !== undefined) survivor.neurosis.observationConditions = String(fields['neurosis_obs_cond_input'])
  if (fields['neurosis_tenet_know_inp'] !== undefined) survivor.neurosis.tenetKnowledge = String(fields['neurosis_tenet_know_inp'])

  // Knowledge 1
  if (!survivor.knowledge1) survivor.knowledge1 = { name: '', rules: '', observationConditions: '', checks: Array(9).fill(false) }
  if (fields['knowledge1_name_input'] !== undefined) survivor.knowledge1.name = String(fields['knowledge1_name_input'])
  if (fields['knowledge1_rules_input'] !== undefined) survivor.knowledge1.rules = String(fields['knowledge1_rules_input'])
  if (fields['knowledge1_obs_cond_input'] !== undefined) survivor.knowledge1.observationConditions = String(fields['knowledge1_obs_cond_input'])
  for (let i = 1; i <= 9; i++) {
    if (fields[`knowledge_check_${i}`] !== undefined && survivor.knowledge1.checks) {
      survivor.knowledge1.checks[i - 1] = Boolean(fields[`knowledge_check_${i}`])
    }
  }

  // Knowledge 2
  if (!survivor.knowledge2) survivor.knowledge2 = { name: '', rules: '', observationConditions: '', checks: Array(9).fill(false) }
  if (fields['knowledge2_name_input'] !== undefined) survivor.knowledge2.name = String(fields['knowledge2_name_input'])
  if (fields['knowledge2_rules_input'] !== undefined) survivor.knowledge2.rules = String(fields['knowledge2_rules_input'])
  if (fields['knowledge2_obs_cond_input'] !== undefined) survivor.knowledge2.observationConditions = String(fields['knowledge2_obs_cond_input'])
  for (let i = 10; i <= 18; i++) {
    if (fields[`knowledge_check_${i}`] !== undefined && survivor.knowledge2.checks) {
      survivor.knowledge2.checks[i - 10] = Boolean(fields[`knowledge_check_${i}`])
    }
  }

  // Tenet Knowledge checks
  if (!survivor.tenetKnowledgeChecks) survivor.tenetKnowledgeChecks = Array(9).fill(false)
  for (let i = 1; i <= 9; i++) {
    if (fields[`tenet_knowledge_check_${i}`] !== undefined) {
      survivor.tenetKnowledgeChecks[i - 1] = Boolean(fields[`tenet_knowledge_check_${i}`])
    }
  }

  // Permanent Injuries - unflatten PDF checkboxes back to injury structure
  // Head (5 checkboxes: 1, 1, 2, 1)
  let checkboxIndex = 1
  survivor.permanentInjuries.head.forEach(injury => {
    for (let i = 0; i < injury.checkboxes.length; i++) {
      if (fields[`head_severe_check_${checkboxIndex}`] !== undefined) {
        injury.checkboxes[i] = Boolean(fields[`head_severe_check_${checkboxIndex}`])
      }
      checkboxIndex++
    }
  })

  // Arms (10 checkboxes: 2, 2, 1, 5)
  checkboxIndex = 1
  survivor.permanentInjuries.arms.forEach(injury => {
    for (let i = 0; i < injury.checkboxes.length; i++) {
      if (fields[`arm_severe_check_${checkboxIndex}`] !== undefined) {
        injury.checkboxes[i] = Boolean(fields[`arm_severe_check_${checkboxIndex}`])
      }
      checkboxIndex++
    }
  })

  // Body (11 checkboxes: 5, 1, 5)
  checkboxIndex = 1
  survivor.permanentInjuries.body.forEach(injury => {
    for (let i = 0; i < injury.checkboxes.length; i++) {
      if (fields[`body_severe_check_${checkboxIndex}`] !== undefined) {
        injury.checkboxes[i] = Boolean(fields[`body_severe_check_${checkboxIndex}`])
      }
      checkboxIndex++
    }
  })

  // Waist (8 checkboxes: 1, 5, 1, 1)
  checkboxIndex = 1
  survivor.permanentInjuries.waist.forEach(injury => {
    for (let i = 0; i < injury.checkboxes.length; i++) {
      if (fields[`waist_severe_check_${checkboxIndex}`] !== undefined) {
        injury.checkboxes[i] = Boolean(fields[`waist_severe_check_${checkboxIndex}`])
      }
      checkboxIndex++
    }
  })

  // Legs (5 checkboxes: 2, 1, 2)
  checkboxIndex = 1
  survivor.permanentInjuries.legs.forEach(injury => {
    for (let i = 0; i < injury.checkboxes.length; i++) {
      if (fields[`legs_severe_check_${checkboxIndex}`] !== undefined) {
        injury.checkboxes[i] = Boolean(fields[`legs_severe_check_${checkboxIndex}`])
      }
      checkboxIndex++
    }
  })

  return survivor
}

/**
 * Get PDF field name for a given survivor data path
 * Used for programmatic field lookup
 */
export function getPdfFieldName(survivorDataPath: string): string {
  const pathMap: Record<string, string> = {
    'name': 'survivor_name_input',
    'survival': 'survival_num_input',
    'stats.movement': 'movement_num_input',
    'stats.accuracy': 'accuracy_num_input',
    'stats.strength': 'strength_num_input',
    'stats.evasion': 'evasion_num_input',
    'stats.luck': 'luck_num_input',
    'stats.speed': 'speed_num_input',
    'brainArmor': 'insanity_num_input',
    'insane': 'brain_damage_check',
  }

  return pathMap[survivorDataPath] || survivorDataPath
}
