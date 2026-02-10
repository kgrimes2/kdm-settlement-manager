# Kingdom Death Monster Settlement Manager

A comprehensive web application for managing Kingdom Death Monster survivors and settlements. Track up to 4 active survivors per settlement with full character sheet support, manage survivor pools, and handle multiple settlements.

## Disclaimer

**This is an unofficial, fan-made tool and is not affiliated with, endorsed, sponsored, or specifically approved by Kingdom Death, Kingdom Death LLC, or Adam Poots Games.** Kingdom Death Monster and all associated content are trademarks and copyrights of Kingdom Death LLC. This tool is provided for personal use only to assist players in tracking their game progress.

## Features

### Settlement Management
- Create and manage multiple settlements
- Switch between settlements with dropdown selector
- Rename and delete settlements
- All settlements automatically sync to the cloud

### Survivor Tracking
- Track up to 4 active survivors per settlement in a 4-quadrant grid layout
- Click any quadrant to focus and edit that survivor in full screen
- Comprehensive survivor sheet with all KDM stats and attributes:
  - Name, gender, and Hunt XP tracking (with age milestones)
  - Survival points and survival abilities (Dodge, Encourage, Surge, Dash, Endure)
  - Core stats (Movement, Accuracy, Strength, Evasion, Luck, Speed)
  - Insanity and Brain armor
  - Body location armor and injuries (Light/Heavy for Head, Arms, Body, Waist, Legs)
  - Weapon proficiency with type and level tracking
  - Courage and Understanding attributes with milestones
  - Fighting Arts, Disorders, Abilities & Impairments
  - Once Per Lifetime abilities
  - Various status flags (Skip Next Hunt, Cannot Use Fighting Arts, etc.)

### Survivor Pool Management
- Deactivate survivors to move them to the survivor pool
- Activate survivors from the pool to vacant slots
- Retire survivors permanently
- Mark survivors as deceased
- Separate sections for active, pooled, retired, and deceased survivors
- Create new survivors on-the-fly

### User Experience
- Cloud-synced data (automatic sync to DynamoDB every 2 seconds)
- Persistent storage across devices and browser sessions
- AWS Cognito authentication with email verification
- Responsive design with mobile support
- Keyboard navigation (Arrow keys, Escape, Tab)
- Hover overlays with helpful hints
- Confirmation dialogs for destructive actions
- Success/error notifications
- Clean, minimal black and white design
- User profile display in toolbar

## Tech Stack

- React 19 with TypeScript
- Vite for fast development and building
- CSS Grid and Flexbox for responsive layout
- Vitest for testing
- Docker support for deployment
- **AWS Cloud Services**
  - Cognito for user authentication
  - DynamoDB for data persistence
  - Lambda for serverless backend logic
  - API Gateway for REST API with JWT authorization
  - S3 & AWS Backup for disaster recovery

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to http://localhost:5173

### Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

### Docker Deployment

Build the Docker image:
```bash
docker build -t kdm-app .
```

Run the container:
```bash
docker run -p 8080:80 kdm-app
```

The app will be available at http://localhost:8080

## Usage

### Managing Settlements
1. Use the settlement dropdown in the top toolbar to switch between settlements
2. Click "Manage Settlements..." to create, rename, or delete settlements
3. Each settlement maintains its own survivors and pools

### Managing Survivors
1. Click any quadrant in the 4-grid layout to focus and edit that survivor
2. Click "Manage Survivors" in the toolbar to:
   - View all active survivors
   - Deactivate survivors to move them to the pool
   - Create new survivors
   - View survivor pool, retired, and deceased sections
3. Empty slots can be clicked to open the survivor management panel
4. Click "Return to Overview" or press Escape to return to the grid view

### Survivor Sheets
- All fields auto-save as you type or click
- Checkboxes for tracking XP, abilities, injuries, and milestones
- Numeric inputs for stats and armor (click +/- or type directly)
- Text inputs for Fighting Arts, Disorders, and other text fields
- Age milestones (Hunt XP boxes 2, 6, 10, 15) highlighted in orange
- Weapon proficiency and attribute milestones highlighted

### Keyboard Shortcuts
- `Escape` - Return to grid view / Close drawers
- `Arrow Left` - Previous survivor (when focused)
- `Arrow Right` - Next survivor (when focused)
- `Tab` - Navigate between interactive elements

## Project Structure

```
src/
├── App.tsx                 # Main app with settlement and survivor management
├── App.css                 # App layout and quadrant styles
├── SurvivorSheet.tsx       # Survivor character sheet component
├── SurvivorSheet.css       # Survivor sheet styles
├── NumericInput.tsx        # Custom numeric input component
├── NumericInput.css        # Numeric input styles
├── index.css               # Global styles and resets
├── main.tsx                # App entry point
└── test/
    ├── setup.ts            # Test configuration
    ├── App.test.tsx        # App component tests
    ├── SurvivorSheet.test.tsx  # Survivor sheet tests
    └── NumericInput.test.tsx   # Numeric input tests
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backwards compatible manner
- PATCH version for backwards compatible bug fixes

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Version Management Scripts

Update versions using npm scripts:
```bash
npm run version:major  # 1.0.0 -> 2.0.0
npm run version:minor  # 1.0.0 -> 1.1.0
npm run version:patch  # 1.0.0 -> 1.0.1
```

## Data Storage

Data is stored in two places for reliability and offline access:

1. **Local Storage**: Browser cache for instant offline access
2. **Cloud (DynamoDB)**: AWS backend synced every 2 seconds (when authenticated)

Once you log in, your data automatically syncs to the cloud. Logging in on a different device or browser will pull your latest data from the cloud, so you can pick up where you left off.

## Authentication & Cloud Sync

The application now supports AWS Cognito-based authentication with automatic cloud data synchronization:

### Login & Registration
- Create a new account with email verification
- Secure username/password authentication via AWS Cognito
- User data is isolated per account

### Cloud Data Sync
- All settlement data automatically syncs to AWS DynamoDB every 2 seconds
- Your data persists across browser sessions and devices
- Signed in once, your data follows you anywhere

### Account Management
- Click the user profile icon in the toolbar to see your username
- Click "🚪 Logout" to safely sign out
- Your data remains secure in the cloud

### Infrastructure Details
The backend infrastructure is managed via Terraform and includes:
- AWS Cognito User Pool for secure authentication
- DynamoDB tables for data persistence
- Lambda functions for CRUD operations on your data
- API Gateway with JWT authorization
- Automated backups and disaster recovery

### Environment Setup (Development)

To set up the authentication locally, you need a `.env.local` file:

```bash
# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=<from terraform output cognito_user_pool_id>
VITE_COGNITO_CLIENT_ID=<from terraform output cognito_client_id>
VITE_COGNITO_REGION=us-west-2

# API Gateway Configuration
VITE_API_GATEWAY_URL=<from terraform output api_gateway_invoke_url>
```

**Note:** The `.env.local` file is gitignored for security. Never commit credentials to version control.

See `infrastructure/terraform/README.md` for details on deploying the backend infrastructure.

## Browser Compatibility

- Modern Chrome, Firefox, Safari, Edge
- Mobile browsers on iOS and Android
- Requires JavaScript enabled
- Requires localStorage support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
