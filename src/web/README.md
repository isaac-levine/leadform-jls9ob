# Lead Capture & SMS Platform Frontend

Next.js web application for lead capture form management and SMS conversation handling with AI-powered automation.

## Key Features

- 🎨 Drag-and-drop form builder with real-time preview
- 🤖 AI-powered SMS conversation management
- 💬 Real-time messaging inbox with human takeover
- 📊 Advanced analytics dashboard
- 🔒 Role-based access control
- 👥 Organization and user management
- 📝 Template management for automated responses
- 📱 Responsive design with dark mode support

## Technologies

- Next.js 14.x with App Router
- React 18.x with Server Components
- TypeScript 5.0+ in strict mode
- Acetunity UI for core design system
- ShadCN for accessible components
- TailwindCSS for styling
- Socket.io Client for real-time features
- Zod for form validation
- React Query for data fetching
- Jest and React Testing Library for testing

## Prerequisites

- Node.js >= 18.x LTS
- npm >= 9.x or yarn >= 1.22
- Git for version control
- VS Code with recommended extensions

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd src/web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration values

### Development

```bash
# Start development server
npm run dev

# Run ESLint
npm run lint

# Run Prettier
npm run format

# Run TypeScript checks
npm run type-check
```

### Build

```bash
# Create production build
npm run build

# Start production server
npm run start
```

### Testing

```bash
# Run unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Project Structure

```
src/
├── app/                # Next.js app router pages and layouts
├── components/         # Reusable React components
├── features/          # Feature-specific components
├── hooks/             # Custom React hooks
├── lib/               # Core utilities and configurations
├── store/             # State management
├── types/             # TypeScript type definitions
├── utils/             # Helper functions
├── styles/            # Global styles and themes
└── public/            # Static assets and images
```

## Development Guidelines

### Code Style

- ESLint with Airbnb configuration
- Prettier with strict rules
- TypeScript in strict mode
- Component naming conventions:
  - Use PascalCase for components
  - Use camelCase for functions and variables
  - Use kebab-case for file names
- File organization:
  - One component per file
  - Group related components in feature folders
  - Keep utilities separate from components
- Import ordering:
  1. React and Next.js imports
  2. Third-party libraries
  3. Internal components and utilities
  4. Styles and assets
- Error handling:
  - Use try/catch blocks for async operations
  - Implement error boundaries for component failures
  - Provide user-friendly error messages

### Testing

- 100% coverage for critical paths
- Unit tests for utilities and hooks
- Integration tests for feature workflows
- E2E tests for critical user journeys
- Snapshot testing for UI components
- Performance testing:
  - Lighthouse scores
  - Core Web Vitals
  - Bundle size analysis

### Performance

- Code splitting:
  - Use dynamic imports for large components
  - Implement route-based splitting
- Image optimization:
  - Use Next.js Image component
  - Implement responsive images
  - Optimize image formats
- Bundle size monitoring:
  - Regular bundle analysis
  - Size budgets enforcement
- Lazy loading:
  - Implement for below-the-fold content
  - Use intersection observer
- Caching strategies:
  - Implement SWR for data fetching
  - Use appropriate cache headers
  - Implement service worker for offline support

## Browser Support

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## License

This project is proprietary and confidential. All rights reserved.

---

For additional information or support, please contact the development team.