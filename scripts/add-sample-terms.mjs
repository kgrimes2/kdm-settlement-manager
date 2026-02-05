#!/usr/bin/env node

/**
 * Adds sample glossary terms for testing
 * Run with: node scripts/add-sample-terms.mjs
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT_PATH = join(__dirname, '../src/data/glossary.json')

const sampleTerms = [
  {
    term: "Action",
    definition: "An action is something a survivor can do during their turn. Actions include moving, activating gear, attacking, and using survival actions.",
    category: "Core Rules"
  },
  {
    term: "Survival",
    definition: "A resource that represents a survivor's will to live. Survivors can spend survival to perform survival actions like Dodge, Encourage, Surge, Dash, and Endure.",
    category: "Core Rules",
    relatedTerms: ["Dodge", "Surge", "Dash", "Encourage", "Endure"]
  },
  {
    term: "Surge",
    definition: "A survival action. Spend 1 survival to move up to your full movement value. This movement must be in a straight line and does not trigger reactions.",
    category: "Survival Action",
    relatedTerms: ["Survival", "Dash", "Movement"]
  },
  {
    term: "Dodge",
    definition: "A survival action. Spend 1 survival when a monster attacks you to move 1-2 spaces in any direction, potentially getting out of the monster's range and negating the attack.",
    category: "Survival Action",
    relatedTerms: ["Survival", "Evasion"]
  },
  {
    term: "Dash",
    definition: "A survival action. Spend 1 survival to move 1 space in any direction. This movement can be performed at any time and does not trigger reactions.",
    category: "Survival Action",
    relatedTerms: ["Survival", "Surge", "Movement"]
  },
  {
    term: "Encourage",
    definition: "A survival action. Spend 1 survival to give all other survivors +1 speed token until the end of the round.",
    category: "Survival Action",
    relatedTerms: ["Survival", "Speed"]
  },
  {
    term: "Endure",
    definition: "A survival action. Spend 1 survival when you suffer damage or a severe injury to ignore that damage or injury.",
    category: "Survival Action",
    relatedTerms: ["Survival", "Damage"]
  },
  {
    term: "Insanity",
    definition: "A measure of a survivor's mental state. Survivors gain insanity from various sources and can suffer negative effects at high insanity levels. At 3+ insanity, survivors are considered insane.",
    category: "Core Rules",
    relatedTerms: ["Brain", "Courage", "Understanding"]
  },
  {
    term: "Hunt XP",
    definition: "Experience points gained from participating in hunts. Survivors gain Hunt XP at various milestones which unlock age abilities and weapon proficiency bonuses.",
    category: "Core Rules"
  },
  {
    term: "Weapon Proficiency",
    definition: "Mastery of a specific weapon type. As survivors gain proficiency levels, they unlock bonuses when using that weapon type.",
    category: "Core Rules"
  }
]

const glossaryData = {
  terms: sampleTerms,
  lastUpdated: new Date().toISOString(),
  version: "0.1.0-sample"
}

console.log(`Adding ${sampleTerms.length} sample terms to glossary...`)
writeFileSync(OUTPUT_PATH, JSON.stringify(glossaryData, null, 2))
console.log('Sample glossary data written to:', OUTPUT_PATH)
console.log('\nYou can now test the glossary feature!')
console.log('Try searching for: action, survival, surge, dodge, insanity')
