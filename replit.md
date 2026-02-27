# Scientific Calculator

## Overview
A full-featured scientific calculator web application built with React and TypeScript.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS (single page app)
- **Backend**: Express.js (serves static files only, no API endpoints needed)
- **Routing**: wouter

## Key Features
- Basic arithmetic: +, -, ×, ÷, %, +/−
- Trigonometric: sin, cos, tan, arcsin, arccos, arctan
- Logarithmic: log (base 10), ln (natural log)
- Powers & Roots: x², x³, xʸ, √x, ∛x, ˣ√y
- Constants: π, e
- Factorial, Reciprocal, Absolute value, EXP
- Memory: MC, MR, M+, M−, MS
- DEG/RAD angle mode toggle
- Keyboard support
- Error handling for invalid operations
- Responsive dark theme design

## File Structure
- `client/src/pages/calculator.tsx` - Main calculator component with all logic
- `client/src/App.tsx` - Router setup pointing to calculator page
- `client/index.html` - HTML entry with SEO meta tags

## Running
`npm run dev` starts the Express + Vite dev server on port 5000.
