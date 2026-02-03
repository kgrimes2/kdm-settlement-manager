# Quadrant Focus App

A clean, minimal web application featuring a four-quadrant layout with interactive focus functionality.

## Features

- Four equal quadrants in a 2x2 grid layout
- Click any quadrant to bring it into full-screen focus
- Click again to return to the four-quadrant view
- Clean design using only white, black, and gray colors
- Smooth transitions and hover effects
- Keyboard accessible (Tab + Enter navigation)

## Tech Stack

- React 19 with TypeScript
- Vite for fast development and building
- CSS Grid for layout
- Modern best practices

## Getting Started

### Development

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (typically http://localhost:5173)

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── App.tsx        # Main component with quadrant logic
├── App.css        # Quadrant styles and animations
├── index.css      # Global styles and resets
└── main.tsx       # App entry point
```

## Usage

- Click on any of the four quadrants to focus it
- The focused quadrant expands to fill the entire viewport
- Other quadrants fade out when one is focused
- Click the focused quadrant again to return to the grid view
- Use Tab key to navigate between quadrants and Enter to activate
