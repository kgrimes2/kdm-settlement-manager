# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-02-05

### Added
- Temporary marker system with red circle indicators:
  - "Add Marker" button in toolbar (positioned left of settlement selector)
  - Click button to show overlay on available quadrants
  - Click overlay to add red circle marker to quadrant center
  - Click red circle to remove marker
  - Marker mode auto-deactivates after adding a marker
  - Markers are temporary (not persisted, reset on refresh)
  - Markers auto-clear when survivors are deactivated
- Tutorial step explaining marker functionality

### Removed
- "Click to edit" hover overlays on quadrants
- Hover overlay CSS and related state management

### Changed
- Settlement selector moved to right side of toolbar
- Removed spent/marker functionality from v1.0.4 (replaced with new temporary marker system)
- Reverted data version from 8 back to 7
- Tutorial improvements:
  - Updated welcome step to reference "×" button instead of non-existent "Skip Tutorial" button
  - Fixed step highlighting for "Managing Survivors", "Multiple Settlements", and "Auto-Save" steps
  - Centered dialog position for key tutorial steps
  - Export and Import buttons now highlighted together in Auto-Save step

### Technical
- Added marker state management (Set-based, component-level only)
- Removed hover overlay logic and event handlers
- Simplified quadrant interaction model
- Added wrapper div for export/import buttons to enable grouped highlighting in tutorial

## [1.0.4] - 2026-02-05

### Added
- Interactive tutorial system for new users:
  - Step-by-step walkthrough of all major features
  - Highlights UI elements during tutorial
  - Spacebar navigation to advance through steps
  - Tutorial styled to match app's Kingdom Death parchment theme
  - Auto-shows on first launch (can be skipped)
  - 🎓 Tutorial button in toolbar to reopen tutorial anytime
- Mobile survivor cycling with swipe gestures (left/right swipe in focus mode)
- Age milestone tracking on Hunt XP track:
  - 16th Hunt XP box with red background for retirement age
  - Condensed age milestone label: "x1 - x4 ■ Age"
  - "(retired)" label next to retirement box
  - Yellow milestone markers matching milestone checkbox colors

### Changed
- Narrowed name input width from 200px to 120px for better layout
- Unfocused quadrants now darken (brightness 30%) instead of fading out
- Removed all focus/unfocus zoom animations for instant transitions
- Removed hover zoom effect on quadrants
- Spacebar in focus mode now cycles through survivors

### Fixed
- Checkbox color inconsistency: injury checkboxes now match stat box colors (30% white)

### Technical
- Data version bumped to v8
- Migration system updated to extend huntXP arrays from 15 to 16 boxes
- Added Tutorial component with keyboard and touch event handling
- Added swipe gesture detection for mobile devices

## [1.0.2] - 2026-02-05

### Added
- Pill/bubble UI for text input fields:
  - Weapon Proficiency type (limit: 1)
  - Fighting Arts (limit: 3)
  - Disorders (limit: 3)
  - Abilities & Impairments (unlimited)
  - Once Per Lifetime abilities (unlimited)
- Users press Enter to create pills, click X to remove them
- Input fields automatically hide when limits are reached
- Max limit indicators shown in section headers
- **Interactive KDM Glossary**:
  - Searchable glossary modal with 650+ Kingdom Death terms
  - Keyboard navigation (↑↓ arrows, Enter, Esc)
  - Clickable pills automatically open glossary with search
  - Visual indicator (📖 book icon) on pills matching glossary entries
  - Auto-capitalize pill text to match official glossary terms
  - Last updated date and link to official KDM living glossary
  - Fuzzy search with real-time results

### Changed
- Weapon Proficiency section now displays on one line (heading, type pill, checkboxes, and milestone labels)
- Increment/decrement buttons always visible with disabled state (instead of hiding when at limits)
- Weapon Proficiency specialist and master labels hidden on tablets and mobile in focus mode for better space utilization
- Gear bonus inputs now accept negative values
- Toolbar buttons now include emojis for consistent height and visual clarity:
  - 📖 Glossary (new)
  - ⬆️ Export
  - ⬇️ Import
  - 👥 Manage Survivors
  - ↩️ Return to Overview

### Technical
- Data version bumped to v7
- Migration system updated to convert `weaponProficiency.type` (string) to `weaponProficiency.types` (array)
- Added comprehensive test coverage for pill UI functionality
- Updated NumericInput tests to check for disabled state instead of element removal
- Enhanced migration system to merge survivor data with defaults for missing fields
- Added GlossaryModal component with fuzzy search functionality
- Added glossary data (3,014 lines of term definitions)
- Created search utilities with case-insensitive matching
- Updated SurvivorSheet tests to include new glossary props

## [1.0.1] - 2026-02-04

### Added
- Gear bonuses: separate tracking for stat bonuses from equipment (displayed as base + gear)
- Editable survival limit with (max. X) next to survival value
- Bulk survivor actions panel (collapsible, collapsed by default):
  - Heal All Wounds: clears all injury checkboxes for all survivors
  - Set Max Survival: sets survival limit for all survivors with custom dialog
  - Clear Gear Bonuses: resets all gear bonuses to 0
- Second row for Abilities & Impairments text input
- Plus symbol (+) between base stats and gear bonuses for clarity
- "insane on 3+" note under Brain label as helpful reminder
- Visual indicator: Brain shield turns orange when insanity reaches 3+
- Disclaimer banner at bottom of page on all devices
- MIT License file and license information in package.json
- Clickable version number in toolbar linking to changelog
- Disclaimer stating this is an unofficial, fan-made tool (in README and app footer)

### Changed
- Survivor sheets now use 3-column layout (stats, body, text sections)
- Brain section label updated from "Brain" to "Brain (insanity)" for clarity
- Removed redundant "Insanity" label from brain shield
- Numeric inputs are now read-only; users must use +1/-1 buttons only
- Increment/decrement buttons only appear when allowed (respect min/max constraints)
- Survival value automatically capped when max survival is lowered
- Numbers displayed larger for better visibility
- Margins and padding reduced throughout for more compact layout
- Toolbar, buttons, and quadrants have tighter spacing
- Stats arranged vertically in left column with even spacing
- All three columns in survivor sheet evenly spaced
- Active Survivors section is now collapsible (open by default)
- Clear All Data button moved to Settlement Management panel
- localStorage saves now debounced (1000ms) for better performance

### Fixed
- Brain section "Insane" checkbox now persists correctly

### Technical
- Data version bumped to v3
- Migration system updated to handle:
  - Addition of `gearBonuses` field to all survivors
  - Addition of `insane` field for brain checkbox
  - Expansion of `abilitiesImpairments` to 2 default rows
- Test suite updated for new features and UI changes
- Import validation improved to reject truly invalid data before migration

## [1.0.0] - 2026-02-03

### Added
- Complete Kingdom Death Monster survivor sheet tracking
- Multiple settlement management system
- Survivor pool management (active, pooled, retired, deceased)
- Import/export functionality for settlement data
- Auto-save to localStorage
- Comprehensive survivor stats tracking:
  - Hunt XP with age milestones
  - Survival points and abilities (Dodge, Encourage, Surge, Dash, Endure)
  - Core stats (Movement, Accuracy, Strength, Evasion, Luck, Speed)
  - Insanity and Brain armor
  - Body location armor and injuries (Light/Heavy)
  - Weapon proficiency with type and level tracking
  - Courage and Understanding attributes with milestones
  - Fighting Arts, Disorders, Abilities & Impairments
  - Once Per Lifetime abilities
- Responsive 4-quadrant grid layout with focus mode
- Keyboard navigation (Arrow keys, Escape, Tab)
- Hover overlays with helpful hints
- Confirmation dialogs for destructive actions
- Success/error notifications
- Testing infrastructure with Vitest
- Docker support for deployment
- Comprehensive README documentation

### Changed
- Migrated from simple quadrant focus app to full KDM Settlement Manager

### Technical
- React 19 with TypeScript
- Vite build system
- CSS Grid and Flexbox layouts
- localStorage persistence
- Migration system for data structure updates

## [0.0.0] - Initial Development

### Added
- Basic quadrant focus functionality
- Initial project structure
