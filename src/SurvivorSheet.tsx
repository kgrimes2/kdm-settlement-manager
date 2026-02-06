import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import './SurvivorSheet.css'
import NumericInput from './NumericInput'
import type { GlossaryTerm } from './types/glossary'

export interface BodyLocation {
  armor: number
  light: boolean
  heavy: boolean
}

export interface PermanentInjury {
  name: string
  checkboxes: boolean[]
}

export type BodyLocationKey = 'head' | 'arms' | 'body' | 'waist' | 'legs'

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
  auxiliaryNotes: string
  permanentInjuries: {
    head: PermanentInjury[]
    arms: PermanentInjury[]
    body: PermanentInjury[]
    waist: PermanentInjury[]
    legs: PermanentInjury[]
  }
  image?: string
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
  },
  stats: {
    movement: 5,
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
  auxiliaryNotes: '',
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
}

interface SurvivorSheetProps {
  survivor: SurvivorData
  onUpdate: (survivor: SurvivorData) => void
  onOpenGlossary: (searchTerm: string) => void
  glossaryTerms: GlossaryTerm[]
}

export default function SurvivorSheet({ survivor, onUpdate, onOpenGlossary, glossaryTerms }: SurvivorSheetProps) {
  // Generate a unique identifier for this survivor's radio buttons
  const survivorId = survivor.createdAt
  const [weaponTypeInput, setWeaponTypeInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLTextAreaElement>(null)
  const [nameFontSize, setNameFontSize] = useState(0.8)
  const [nameEditing, setNameEditing] = useState(false)

  const fitNameText = useCallback(() => {
    const el = nameRef.current
    if (!el) return
    let size = 0.8
    el.style.fontSize = size + 'rem'
    while (el.scrollWidth > el.clientWidth && size > 0.3) {
      size -= 0.05
      el.style.fontSize = size + 'rem'
    }
    setNameFontSize(size)
  }, [])

  useEffect(() => {
    fitNameText()
  }, [survivor.name, fitNameText])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Resize to max 128x128 while maintaining aspect ratio
        if (width > height) {
          if (width > 128) {
            height = (height * 128) / width
            width = 128
          }
        } else {
          if (height > 128) {
            width = (width * 128) / height
            height = 128
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const resizedImage = canvas.toDataURL('image/jpeg', 0.8)
        updateField('image', resizedImage)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Create a set of normalized glossary terms for fast lookup
  const glossaryTermsSet = useMemo(() => {
    return new Set(glossaryTerms.map(term => term.term.toLowerCase().trim()))
  }, [glossaryTerms])

  // Create a map for normalizing term casing
  const glossaryTermsMap = useMemo(() => {
    const map = new Map<string, string>()
    glossaryTerms.forEach(term => {
      map.set(term.term.toLowerCase().trim(), term.term)
    })
    return map
  }, [glossaryTerms])

  // Helper function to check if a term is in the glossary
  const isInGlossary = (text: string): boolean => {
    return glossaryTermsSet.has(text.toLowerCase().trim())
  }

  // Helper function to normalize text to match glossary casing
  const normalizeToGlossary = (text: string): string => {
    const normalized = text.toLowerCase().trim()
    return glossaryTermsMap.get(normalized) || text.trim()
  }

  const updateField = <K extends keyof SurvivorData>(field: K, value: SurvivorData[K]) => {
    onUpdate({ ...survivor, [field]: value })
  }

  const addWeaponType = (type: string) => {
    if (type.trim() && survivor.weaponProficiency.types.length < 1) {
      const normalizedType = normalizeToGlossary(type)
      updateField('weaponProficiency', {
        ...survivor.weaponProficiency,
        types: [...survivor.weaponProficiency.types, normalizedType]
      })
      setWeaponTypeInput('')
    }
  }

  const removeWeaponType = (index: number) => {
    updateField('weaponProficiency', {
      ...survivor.weaponProficiency,
      types: survivor.weaponProficiency.types.filter((_, i) => i !== index)
    })
  }

  const addToList = (field: 'fightingArts' | 'disorders' | 'abilitiesImpairments' | 'oncePerLifetime', value: string) => {
    if (value.trim()) {
      const currentItems = survivor[field].filter(item => item !== '')
      const limits = {
        fightingArts: 3,
        disorders: 3,
        abilitiesImpairments: Infinity,
        oncePerLifetime: Infinity
      }

      if (currentItems.length < limits[field]) {
        const normalizedValue = normalizeToGlossary(value)
        updateField(field, [...currentItems, normalizedValue, ''])
      }
    }
  }

  const removeFromList = (field: 'fightingArts' | 'disorders' | 'abilitiesImpairments' | 'oncePerLifetime', index: number) => {
    const newList = survivor[field].filter((_, i) => i !== index)
    updateField(field, newList.length === 0 ? [''] : newList)
  }

  const toggleHuntXP = (index: number) => {
    const newHuntXP = [...survivor.huntXP]
    newHuntXP[index] = !newHuntXP[index]
    updateField('huntXP', newHuntXP)
  }

  const toggleCheckbox = (field: keyof SurvivorData['survivalAbilities']) => {
    updateField('survivalAbilities', {
      ...survivor.survivalAbilities,
      [field]: !survivor.survivalAbilities[field],
    })
  }

  const updateStat = (stat: keyof SurvivorData['stats'], value: number) => {
    updateField('stats', { ...survivor.stats, [stat]: value })
  }

  const updateGearBonus = (stat: keyof SurvivorData['gearBonuses'], value: number) => {
    updateField('gearBonuses', { ...survivor.gearBonuses, [stat]: value })
  }

  const updateSurvivalLimit = (newLimit: number) => {
    // If the new limit is lower than current survival, cap survival at the new limit
    if (survivor.survival > newLimit) {
      onUpdate({ ...survivor, survivalLimit: newLimit, survival: newLimit })
    } else {
      updateField('survivalLimit', newLimit)
    }
  }

  const toggleBodyLocation = (location: keyof SurvivorData['bodyLocations'], type: 'light' | 'heavy') => {
    updateField('bodyLocations', {
      ...survivor.bodyLocations,
      [location]: {
        ...survivor.bodyLocations[location],
        [type]: !survivor.bodyLocations[location][type],
      },
    })
  }

  const updateBodyArmor = (location: keyof SurvivorData['bodyLocations'], value: number) => {
    updateField('bodyLocations', {
      ...survivor.bodyLocations,
      [location]: {
        ...survivor.bodyLocations[location],
        armor: value,
      },
    })
  }

  const toggleWeaponLevel = (index: number) => {
    const newLevel = [...survivor.weaponProficiency.level]
    newLevel[index] = !newLevel[index]
    updateField('weaponProficiency', { ...survivor.weaponProficiency, level: newLevel })
  }

  const toggleCourage = (index: number) => {
    const newCourage = [...survivor.courage]
    newCourage[index] = !newCourage[index]
    updateField('courage', newCourage)
  }

  const toggleUnderstanding = (index: number) => {
    const newUnderstanding = [...survivor.understanding]
    newUnderstanding[index] = !newUnderstanding[index]
    updateField('understanding', newUnderstanding)
  }

  const toggleCourageMilestone = (index: number) => {
    updateField('courageMilestone', survivor.courageMilestone === index ? null : index)
  }

  const toggleUnderstandingMilestone = (index: number) => {
    updateField('understandingMilestone', survivor.understandingMilestone === index ? null : index)
  }

  return (
    <div className="survivor-sheet">
      <div className="sheet-content">
        <div className="left-column">
          <div className="image-name-container">
            <div className="name-gender-column">
              <div className="name-wrapper" onClick={() => setNameEditing(true)}>
                {nameEditing ? (
                  <input
                    type="text"
                    value={survivor.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    onBlur={() => setNameEditing(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setNameEditing(false) }}
                    className="survivor-name-edit"
                    placeholder="Name"
                    autoFocus
                  />
                ) : (
                  <textarea
                    ref={nameRef}
                    value={survivor.name}
                    readOnly
                    className="survivor-name"
                    placeholder="Name"
                    rows={2}
                    style={{ fontSize: nameFontSize + 'rem' }}
                  />
                )}
              </div>
              <div
                className={`gender-toggle ${survivor.gender === 'M' ? 'male' : 'female'}`}
                onClick={() => updateField('gender', survivor.gender === 'M' ? 'F' : 'M')}
              >
                {survivor.gender === 'F' ? '♀' : '♂'}
              </div>
            </div>
            <div className="camera-section" onClick={() => fileInputRef.current?.click()}>
              {survivor.image ? (
                <img src={survivor.image} alt="Survivor" className="survivor-image" />
              ) : (
                '📷'
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <div className="survival-section">
            <div className="survival-header">
              <h3>Survival</h3>
              <span className="survival-limit-label">
                (max.{' '}
                <NumericInput
                  value={survivor.survivalLimit}
                  onChange={updateSurvivalLimit}
                  className="survival-limit-input"
                  min={0}
                />
                )
              </span>
            </div>
            <div className="survival-top">
              <NumericInput
                value={survivor.survival}
                onChange={(value) => updateField('survival', value)}
                className="survival-input large-box"
                min={0}
                max={survivor.survivalLimit}
              />
              <div className="survival-right">
                <label className="cannot-spend-survival">
                  <span>Cannot spend survival</span>
                  <input
                    type="checkbox"
                    checked={survivor.cannotSpendSurvival}
                    onChange={() => updateField('cannotSpendSurvival', !survivor.cannotSpendSurvival)}
                  />
                </label>
                <div className="survival-abilities">
                  {Object.entries(survivor.survivalAbilities).map(([key, checked]) => (
                    <div
                      key={key}
                      className={`survival-ability-label ${checked ? 'active' : ''}`}
                      onClick={() => toggleCheckbox(key as keyof SurvivorData['survivalAbilities'])}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="body-locations">
            {Object.entries(survivor.bodyLocations).map(([location, boxes]) => (
              <div key={location} className="body-location-group">
                {location === 'head' && (
                  <div className="brain-section">
                    <div className="brain-shield-group">
                      <div className={`shield-icon ${survivor.brainArmor >= 3 ? 'insane-shield' : ''}`}>
                        <NumericInput
                          value={survivor.brainArmor}
                          onChange={(value) => updateField('brainArmor', value)}
                          className="shield-input"
                          min={0}
                        />
                      </div>
                    </div>
                    <span className="brain-label">
                      Brain (insanity)
                      <span className="brain-note">insane on 3+</span>
                    </span>
                    <label className="brain-checkbox">
                      <input
                        type="checkbox"
                        checked={survivor.insane}
                        onChange={() => updateField('insane', !survivor.insane)}
                      />
                    </label>
                  </div>
                )}
                <div className="body-location">
                  <div className="shield-icon">
                    <NumericInput
                      value={boxes.armor}
                      onChange={(value) => updateBodyArmor(location as keyof SurvivorData['bodyLocations'], value)}
                      className="shield-input"
                      min={0}
                    />
                  </div>
                  <span>{location.charAt(0).toUpperCase() + location.slice(1)}</span>
                  {location !== 'head' && (
                    <label>
                      <input
                        type="checkbox"
                        checked={boxes.light}
                        onChange={() => toggleBodyLocation(location as keyof SurvivorData['bodyLocations'], 'light')}
                      />
                      L
                    </label>
                  )}
                  <label>
                    <input
                      type="checkbox"
                      checked={boxes.heavy}
                      onChange={() => toggleBodyLocation(location as keyof SurvivorData['bodyLocations'], 'heavy')}
                      className="heavy-injury-checkbox"
                    />
                    H
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-columns-container">
          <div className="hunt-xp-section">
            <span>Hunt XP</span>
            <div className="hunt-xp-boxes">
              {[...survivor.huntXP, ...(survivor.huntXP.length < 16 ? [false] : [])].map((checked, i) => {
                const isAgeMilestone = [1, 5, 9, 14].includes(i)
                const isRetirementAge = i === 15
                return (
                  <label key={i} className={`checkbox-box ${isAgeMilestone ? 'age-milestone' : ''} ${isRetirementAge ? 'retirement-age' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHuntXP(i)}
                    />
                  </label>
                )
              })}
            </div>
            <div className="milestones">
              <div className="milestone-label">x1 - x4 <span className="milestone-marker">■</span> Age</div>
            </div>
          </div>

          <div className="columns-wrapper">
            <div className="middle-column">
          <div className="stats-section">
            {Object.entries(survivor.stats).map(([stat, value]) => (
              <div key={stat} className="stat-box">
                <span className="stat-label">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                <div className="stat-inputs">
                  <NumericInput
                    value={value}
                    onChange={(newValue) => updateStat(stat as keyof SurvivorData['stats'], newValue)}
                    className="stat-input"
                    min={0}
                  />
                  <span className="stat-plus">+</span>
                  <NumericInput
                    value={survivor.gearBonuses[stat as keyof SurvivorData['gearBonuses']]}
                    onChange={(newValue) => updateGearBonus(stat as keyof SurvivorData['gearBonuses'], newValue)}
                    className="stat-input gear-bonus-input"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-column">
          <div className="weapon-proficiency">
            <div className="weapon-proficiency-inline">
              <h3>Weapon Proficiency</h3>
              <div className="pill-container">
                {survivor.weaponProficiency.types.map((type, index) => (
                  <div key={index} className={`pill ${isInGlossary(type) ? 'pill-in-glossary' : ''}`}>
                    <span
                      className="pill-text"
                      onClick={() => onOpenGlossary(type)}
                    >
                      {type}
                    </span>
                    <button
                      className="pill-remove"
                      onClick={() => removeWeaponType(index)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {survivor.weaponProficiency.types.length < 1 && (
                  <input
                    type="text"
                    value={weaponTypeInput}
                    onChange={(e) => setWeaponTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addWeaponType(weaponTypeInput)
                      }
                    }}
                    placeholder="Type..."
                    className="pill-input"
                  />
                )}
              </div>
              <div className="proficiency-row">
                <div className="proficiency-boxes">
                  {survivor.weaponProficiency.level.map((checked, i) => {
                    const isMilestone = i === 2 || i === 7
                    return (
                      <label key={i} className={`checkbox-box ${isMilestone ? 'proficiency-milestone' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWeaponLevel(i)}
                        />
                      </label>
                    )
                  })}
                </div>
                <div className="proficiency-milestones">
                  <div className="milestone-label"><span className="milestone-marker">■</span> Specialist</div>
                  <div className="milestone-label"><span className="milestone-marker">■ ■</span> Master</div>
                </div>
              </div>
            </div>
          </div>

          <div className="attributes-section">
            <div className="courage-section">
              <h4>Courage</h4>
              <div className="attribute-boxes">
                {survivor.courage.map((checked, i) => {
                  const isMilestone = i === 2 || i === 8
                  return (
                    <label key={i} className={`checkbox-box ${isMilestone ? 'attribute-milestone' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCourage(i)}
                      />
                    </label>
                  )
                })}
              </div>
              <div className="milestones">
                <div className="milestone-label"><span className="milestone-marker">■</span> Bold</div>
                <div className="milestone-label"><span className="milestone-marker">■ ■</span> See the Truth</div>
              </div>
              <div className="milestone-abilities">
                <div className="milestone-ability">
                  <input
                    type="checkbox"
                    checked={survivor.courageMilestone === 0}
                    onChange={() => toggleCourageMilestone(0)}
                  />
                  <div className="milestone-text">
                    <strong>Stalwart:</strong> can't be knocked down by brain trauma or intimidate.
                  </div>
                </div>
                <div className="milestone-ability">
                  <input
                    type="checkbox"
                    checked={survivor.courageMilestone === 1}
                    onChange={() => toggleCourageMilestone(1)}
                  />
                  <div className="milestone-text">
                    <strong>Prepared:</strong> Add Hunt XP to your roll when determining a straggler.
                  </div>
                </div>
                <div className="milestone-ability">
                  <input
                    type="checkbox"
                    checked={survivor.courageMilestone === 2}
                    onChange={() => toggleCourageMilestone(2)}
                  />
                  <div className="milestone-text">
                    <strong>Matchmaker:</strong> Spend 1 endeavor to trigger intimacy story event.
                  </div>
                </div>
              </div>
            </div>

            <div className="understanding-section">
              <h4>Understanding</h4>
              <div className="attribute-boxes">
                {survivor.understanding.map((checked, i) => {
                  const isMilestone = i === 2 || i === 8
                  return (
                    <label key={i} className={`checkbox-box ${isMilestone ? 'attribute-milestone' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUnderstanding(i)}
                      />
                    </label>
                  )
                })}
              </div>
              <div className="milestones">
                <div className="milestone-label"><span className="milestone-marker">■</span> Insight</div>
                <div className="milestone-label"><span className="milestone-marker">■ ■</span> White Secret</div>
              </div>
              <div className="milestone-abilities">
                <div className="milestone-ability">
                  <input
                    type="checkbox"
                    checked={survivor.understandingMilestone === 0}
                    onChange={() => toggleUnderstandingMilestone(0)}
                  />
                  <div className="milestone-text">
                    <strong>Analyze:</strong> Look at top AI card and return it to the top of the deck.
                  </div>
                </div>
                <div className="milestone-ability">
                  <input
                    type="checkbox"
                    checked={survivor.understandingMilestone === 1}
                    onChange={() => toggleUnderstandingMilestone(1)}
                  />
                  <div className="milestone-text">
                    <strong>Explore:</strong> Add +2 to your <strong>investigate</strong> roll results.
                  </div>
                </div>
                <div className="milestone-ability">
                  <input
                    type="checkbox"
                    checked={survivor.understandingMilestone === 2}
                    onChange={() => toggleUnderstandingMilestone(2)}
                  />
                  <div className="milestone-text">
                    <strong>Tinker:</strong> +1 endeavor when a returning survivor.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fighting-arts">
            <div className="section-header">
              <h3>Fighting Arts <span className="max-note">(max. 3)</span></h3>
              <label className="section-checkbox">
                <input
                  type="checkbox"
                  checked={survivor.cannotUseFightingArts}
                  onChange={() => updateField('cannotUseFightingArts', !survivor.cannotUseFightingArts)}
                />
                Cannot use Fighting Arts
              </label>
            </div>
            <div className="pill-container">
              {survivor.fightingArts.filter(art => art).map((art, i) => (
                <div key={i} className={`pill ${isInGlossary(art) ? 'pill-in-glossary' : ''}`}>
                  <span
                    className="pill-text"
                    onClick={() => onOpenGlossary(art)}
                  >
                    {art}
                  </span>
                  <button
                    className="pill-remove"
                    onClick={() => removeFromList('fightingArts', survivor.fightingArts.indexOf(art))}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              {survivor.fightingArts.filter(art => art).length < 3 && (
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToList('fightingArts', e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  placeholder="Add fighting art..."
                  className="pill-input"
                />
              )}
            </div>
          </div>

          <div className="disorders">
            <div className="section-header">
              <h3>Disorders <span className="max-note">(max. 3)</span></h3>
            </div>
            <div className="pill-container">
              {survivor.disorders.filter(d => d).map((disorder, i) => (
                <div key={i} className={`pill ${isInGlossary(disorder) ? 'pill-in-glossary' : ''}`}>
                  <span
                    className="pill-text"
                    onClick={() => onOpenGlossary(disorder)}
                  >
                    {disorder}
                  </span>
                  <button
                    className="pill-remove"
                    onClick={() => removeFromList('disorders', survivor.disorders.indexOf(disorder))}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              {survivor.disorders.filter(d => d).length < 3 && (
                <input
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToList('disorders', e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  placeholder="Add disorder..."
                  className="pill-input"
                />
              )}
            </div>
          </div>

          <div className="abilities-impairments">
            <div className="section-header">
              <h3>Abilities & Impairments</h3>
              <label className="section-checkbox">
                <input
                  type="checkbox"
                  checked={survivor.skipNextHunt}
                  onChange={() => updateField('skipNextHunt', !survivor.skipNextHunt)}
                />
                Skip Next Hunt
              </label>
            </div>
            <div className="pill-container">
              {survivor.abilitiesImpairments.filter(item => item).map((item, i) => (
                <div key={i} className={`pill ${isInGlossary(item) ? 'pill-in-glossary' : ''}`}>
                  <span
                    className="pill-text"
                    onClick={() => onOpenGlossary(item)}
                  >
                    {item}
                  </span>
                  <button
                    className="pill-remove"
                    onClick={() => removeFromList('abilitiesImpairments', survivor.abilitiesImpairments.indexOf(item))}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addToList('abilitiesImpairments', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
                placeholder="Add ability or impairment..."
                className="pill-input"
              />
            </div>
          </div>

          <div className="once-per-lifetime">
            <div className="section-header">
              <h3>Once Per Lifetime</h3>
              <label className="section-checkbox">
                <input
                  type="checkbox"
                  checked={survivor.rerollUsed}
                  onChange={() => updateField('rerollUsed', !survivor.rerollUsed)}
                />
                Reroll Used
              </label>
            </div>
            <div className="pill-container">
              {survivor.oncePerLifetime.filter(item => item).map((item, i) => (
                <div key={i} className={`pill ${isInGlossary(item) ? 'pill-in-glossary' : ''}`}>
                  <span
                    className="pill-text"
                    onClick={() => onOpenGlossary(item)}
                  >
                    {item}
                  </span>
                  <button
                    className="pill-remove"
                    onClick={() => removeFromList('oncePerLifetime', survivor.oncePerLifetime.indexOf(item))}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addToList('oncePerLifetime', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
                placeholder="Add once per lifetime..."
                className="pill-input"
              />
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
