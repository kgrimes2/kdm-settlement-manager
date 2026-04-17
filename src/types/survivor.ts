/**
 * Survivor data types
 * Moved from SurvivorSheet.tsx to be used across the app
 */

export interface BodyLocation {
  armor: number
  light: boolean
  heavy: boolean
}

export type BodyLocationKey = 'head' | 'arms' | 'body' | 'waist' | 'legs'

export interface PermanentInjury {
  name: string
  checkboxes: boolean[]
}

export interface SurvivorLogEntry {
  timestamp: string
  attribute: string
  oldValue: string
  newValue: string
  count: number
}

export interface SurvivorData {
  name: string
  createdAt: string
  gender: 'M' | 'F' | ''
  huntXP: boolean[]
  survival: number
  survivalLimit: number
  cannotSpendSurvival: boolean
  survivalAbilities: {
    dodge: boolean
    encourage: boolean
    surge: boolean
    dash: boolean
    endure: boolean
    fistPump: boolean
  }
  stats: {
    movement: number
    accuracy: number
    strength: number
    evasion: number
    luck: number
    speed: number
  }
  gearBonuses: {
    movement: number
    accuracy: number
    strength: number
    evasion: number
    luck: number
    speed: number
  }
  insanity: number
  brainArmor: number
  insane: boolean
  bodyLocations: {
    head: BodyLocation
    arms: BodyLocation
    body: BodyLocation
    waist: BodyLocation
    legs: BodyLocation
  }
  weaponProficiency: {
    types: string[]
    level: boolean[]
  }
  courage: boolean[]
  courageMilestone: number | null
  understanding: boolean[]
  understandingMilestone: number | null
  fightingArts: string[]
  disorders: string[]
  abilitiesImpairments: string[]
  oncePerLifetime: string[]
  retired: boolean
  skipNextHunt: boolean
  cannotUseFightingArts: boolean
  rerollUsed: boolean
  nextDeparture: string
  auxiliaryNotes: string
  permanentInjuries: {
    head: PermanentInjury[]
    arms: PermanentInjury[]
    body: PermanentInjury[]
    waist: PermanentInjury[]
    legs: PermanentInjury[]
  }
  image?: string
  survivorLog: SurvivorLogEntry[]
  // Arc expansion fields
  systolicPressure?: number
  torment?: number
  luminosity?: number
  philosophy?: string
  philosophyRank?: number
  neurosis?: {
    name?: string
    rules?: string
    observationConditions?: string
    tenetKnowledge?: string
  }
  knowledge1?: {
    name?: string
    rules?: string
    observationConditions?: string
    checks?: boolean[]
  }
  knowledge2?: {
    name?: string
    rules?: string
    observationConditions?: string
    checks?: boolean[]
  }
  tenetKnowledgeChecks?: boolean[]
}

export const initialSurvivorData: SurvivorData = {
  name: '',
  createdAt: new Date().toISOString(),
  gender: '',
  huntXP: Array(16).fill(false),
  survival: 0,
  survivalLimit: 0,
  cannotSpendSurvival: false,
  survivalAbilities: {
    dodge: false,
    encourage: false,
    surge: false,
    dash: false,
    endure: false,
    fistPump: false,
  },
  stats: {
    movement: 0,
    accuracy: 0,
    strength: 0,
    evasion: 0,
    luck: 0,
    speed: 0,
  },
  gearBonuses: {
    movement: 0,
    accuracy: 0,
    strength: 0,
    evasion: 0,
    luck: 0,
    speed: 0,
  },
  insanity: 0,
  brainArmor: 0,
  insane: false,
  bodyLocations: {
    head: { armor: 0, light: false, heavy: false },
    arms: { armor: 0, light: false, heavy: false },
    body: { armor: 0, light: false, heavy: false },
    waist: { armor: 0, light: false, heavy: false },
    legs: { armor: 0, light: false, heavy: false },
  },
  weaponProficiency: {
    types: [],
    level: Array(8).fill(false),
  },
  courage: Array(9).fill(false),
  courageMilestone: null,
  understanding: Array(9).fill(false),
  understandingMilestone: null,
  fightingArts: [''],
  disorders: [''],
  abilitiesImpairments: ['', ''],
  oncePerLifetime: [''],
  retired: false,
  skipNextHunt: false,
  cannotUseFightingArts: false,
  rerollUsed: false,
  nextDeparture: '',
  auxiliaryNotes: '',
  // Arc expansion fields (optional)
  systolicPressure: 0,
  torment: 0,
  luminosity: 0,
  philosophy: '',
  philosophyRank: 0,
  neurosis: {
    name: '',
    rules: '',
    observationConditions: '',
    tenetKnowledge: ''
  },
  knowledge1: {
    name: '',
    rules: '',
    observationConditions: '',
    checks: Array(9).fill(false)
  },
  knowledge2: {
    name: '',
    rules: '',
    observationConditions: '',
    checks: Array(9).fill(false)
  },
  tenetKnowledgeChecks: Array(9).fill(false),
  permanentInjuries: {
    head: [
      { name: 'Intracranial Hemorrhage', checkboxes: [false] },
      { name: 'Deaf', checkboxes: [false] },
      { name: 'Blind', checkboxes: [false, false] },
      { name: 'Shattered Jaw', checkboxes: [false] },
    ],
    arms: [
      { name: 'Broken Arm', checkboxes: [false, false] },
      { name: 'Dismembered Arm', checkboxes: [false, false] },
      { name: 'Ruptured Muscle', checkboxes: [false] },
      { name: 'Contracture', checkboxes: [false, false, false, false, false] },
    ],
    body: [
      { name: 'Gaping Chest Wound', checkboxes: [false, false, false, false, false] },
      { name: 'Destroyed Back', checkboxes: [false] },
      { name: 'Broken Rib', checkboxes: [false, false, false, false, false] },
    ],
    waist: [
      { name: 'Intestinal Prolapse', checkboxes: [false] },
      { name: 'Warped Pelvis', checkboxes: [false, false, false, false, false] },
      { name: 'Destroyed Genitals', checkboxes: [false] },
      { name: 'Broken Hip', checkboxes: [false] },
    ],
    legs: [
      { name: 'Dismembered Leg', checkboxes: [false, false] },
      { name: 'Hamstrung', checkboxes: [false] },
      { name: 'Broken Leg', checkboxes: [false, false] },
    ],
  },
  survivorLog: [],
}
