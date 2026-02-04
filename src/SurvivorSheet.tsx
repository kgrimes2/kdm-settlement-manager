import './SurvivorSheet.css'
import NumericInput from './NumericInput'

export interface BodyLocation {
  armor: number
  light: boolean
  heavy: boolean
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
    type: string
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
}

export const initialSurvivorData: SurvivorData = {
  name: '',
  createdAt: new Date().toISOString(),
  gender: '',
  huntXP: Array(15).fill(false),
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
    type: '',
    level: Array(8).fill(false),
  },
  courage: Array(9).fill(false),
  courageMilestone: null,
  understanding: Array(9).fill(false),
  understandingMilestone: null,
  fightingArts: [''],
  disorders: [''],
  abilitiesImpairments: [''],
  oncePerLifetime: [''],
  retired: false,
  skipNextHunt: false,
  cannotUseFightingArts: false,
  rerollUsed: false,
}

interface SurvivorSheetProps {
  survivor: SurvivorData
  onUpdate: (survivor: SurvivorData) => void
}

export default function SurvivorSheet({ survivor, onUpdate }: SurvivorSheetProps) {
  // Generate a unique identifier for this survivor's radio buttons
  const survivorId = survivor.createdAt

  const updateField = <K extends keyof SurvivorData>(field: K, value: SurvivorData[K]) => {
    onUpdate({ ...survivor, [field]: value })
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

  const updateListItem = (field: 'fightingArts' | 'disorders' | 'abilitiesImpairments' | 'oncePerLifetime', index: number, value: string) => {
    const newList = [...survivor[field]]
    newList[index] = value
    updateField(field, newList)
  }

  return (
    <div className="survivor-sheet">
      <div className="sheet-header">
        <div className="name-section">
          <label>Name</label>
          <input
            type="text"
            value={survivor.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="name-input"
          />
        </div>
        <div className="gender-section">
          <label onClick={(e) => e.stopPropagation()}>
            <input
              type="radio"
              name={`gender-${survivorId}`}
              value="M"
              checked={survivor.gender === 'M'}
              onChange={() => updateField('gender', 'M')}
            />
            M
          </label>
          <label onClick={(e) => e.stopPropagation()}>
            <input
              type="radio"
              name={`gender-${survivorId}`}
              value="F"
              checked={survivor.gender === 'F'}
              onChange={() => updateField('gender', 'F')}
            />
            F
          </label>
        </div>
        <div className="hunt-xp-section">
          <span>Hunt XP</span>
          <div className="hunt-xp-boxes">
            {survivor.huntXP.map((checked, i) => {
              const isAgeMilestone = [1, 5, 9, 14].includes(i)
              return (
                <label key={i} className={`checkbox-box ${isAgeMilestone ? 'age-milestone' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleHuntXP(i)}
                  />
                </label>
              )
            })}
          </div>
        </div>
      </div>

      <div className="sheet-content">
        <div className="left-column">
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
              <label className="cannot-spend-survival">
                <span>Cannot spend<br />survival</span>
                <input
                  type="checkbox"
                  checked={survivor.cannotSpendSurvival}
                  onChange={() => updateField('cannotSpendSurvival', !survivor.cannotSpendSurvival)}
                />
              </label>
            </div>
            <div className="survival-abilities">
              {Object.entries(survivor.survivalAbilities).map(([key, checked]) => (
                <label key={key}>
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCheckbox(key as keyof SurvivorData['survivalAbilities'])}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="brain-section">
            <div className="brain-shield-group">
              <div className="shield-icon">
                <NumericInput
                  value={survivor.brainArmor}
                  onChange={(value) => updateField('brainArmor', value)}
                  className="shield-input"
                  min={0}
                />
              </div>
              <span className="insanity-label">Insanity</span>
            </div>
            <span className="brain-label">Brain</span>
            <label className="brain-checkbox">
              <input
                type="checkbox"
                checked={survivor.insane}
                onChange={() => updateField('insane', !survivor.insane)}
              />
            </label>
          </div>

          <div className="body-locations">
            {Object.entries(survivor.bodyLocations).map(([location, boxes]) => (
              <div key={location} className="body-location">
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
            ))}
          </div>
        </div>

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
                  <NumericInput
                    value={survivor.gearBonuses[stat as keyof SurvivorData['gearBonuses']]}
                    onChange={(newValue) => updateGearBonus(stat as keyof SurvivorData['gearBonuses'], newValue)}
                    className="stat-input gear-bonus-input"
                    min={0}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-column">
          <div className="weapon-proficiency">
            <h3>Weapon Proficiency</h3>
            <input
              type="text"
              value={survivor.weaponProficiency.type}
              onChange={(e) => updateField('weaponProficiency', { ...survivor.weaponProficiency, type: e.target.value })}
              placeholder="Type:"
              className="weapon-type-input"
            />
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
            {survivor.fightingArts.map((art, i) => (
              <input
                key={i}
                type="text"
                value={art}
                onChange={(e) => updateListItem('fightingArts', i, e.target.value)}
                className="text-line"
              />
            ))}
          </div>

          <div className="disorders">
            <div className="section-header">
              <h3>Disorders <span className="max-note">(max. 3)</span></h3>
            </div>
            {survivor.disorders.map((disorder, i) => (
              <input
                key={i}
                type="text"
                value={disorder}
                onChange={(e) => updateListItem('disorders', i, e.target.value)}
                className="text-line"
              />
            ))}
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
            {survivor.abilitiesImpairments.map((item, i) => (
              <input
                key={i}
                type="text"
                value={item}
                onChange={(e) => updateListItem('abilitiesImpairments', i, e.target.value)}
                className="text-line"
              />
            ))}
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
            {survivor.oncePerLifetime.map((item, i) => (
              <input
                key={i}
                type="text"
                value={item}
                onChange={(e) => updateListItem('oncePerLifetime', i, e.target.value)}
                className="text-line"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
