# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MIT License file and license information in package.json
- Clickable version number in toolbar linking to changelog

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
