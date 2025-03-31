# RieckerRep Legal Quiz App

## Project Overview
A comprehensive legal quiz application developed for RieckerRep, featuring various question types, user progression, rewards, and social features. The app is built with React and TypeScript, using Supabase as the backend.

## Tech Stack
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **State Management**: React Context + Custom Hooks
- **Animations**: Framer Motion
- **Drag & Drop**: react-dnd

## Project Structure
```
src/
├── assets/           # Static assets (images, sounds)
├── hooks/            # Custom React hooks
├── sql/             # Database queries and migrations
├── types/           # TypeScript type definitions
├── App.tsx          # Main application component
├── QuizContainer.tsx # Core quiz functionality
├── components/      # Reusable UI components
└── screens/         # Main application screens
```

## Core Features

### 1. Quiz System
- Multiple question types:
  - Multiple Choice
  - True/False
  - Open Questions
  - Drag & Drop
  - Case Studies
  - Fill-in-the-blank
- Progressive difficulty levels
- Joker system for assistance
- Immediate feedback and explanations

### 2. User Progression
- Experience points (XP) system
- Level progression
- Achievement system
- Medal rewards
- Skill tree development

### 3. Social Features
- Leaderboards:
  - Player rankings
  - University rankings
  - League system
- Profile customization
- Achievement sharing

### 4. Shop System
- Avatar customization
- Profile enhancements
- Premium features
- Virtual currency system

## Database Structure

### Main Tables
- `users`: User profiles and authentication
- `questions`: Quiz questions and answers
- `user_stats`: User progress and achievements
- `quiz_events`: Quiz session tracking
- `leaderboard`: Rankings and scores
- `shop_items`: Available items in the shop
- `user_inventory`: User-owned items

## Key Components

### QuizContainer
- Manages quiz flow and state
- Handles question transitions
- Processes user answers
- Manages rewards and progression

### Question Components
- MultipleChoiceQuestion
- TrueFalseQuestion
- OpenQuestion
- DragDropQuestion
- CasesQuestion
- LueckentextQuestion

### UI Components
- QuizHeadline
- JokerPanel
- ProgressBar
- QuestionNavigation
- RewardAnimation

## State Management
- QuizContext: Global quiz state
- Custom hooks for specific features:
  - useUserStats
  - useQuizAwards
  - useQuestions
  - useJokerLogic

## API Integration
- Supabase client setup
- Real-time updates
- Authentication
- Data persistence

## Mobile Responsiveness
- Responsive design for all screen sizes
- Touch-friendly interactions
- Optimized layout for mobile devices
- Adaptive UI components

## Development Guidelines

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Consistent naming conventions
- Component-based architecture

### Performance Considerations
- Lazy loading of components
- Optimized asset loading
- Efficient state updates
- Caching strategies

### Testing
- Component testing
- State management testing
- API integration testing
- User interaction testing

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start development server: `npm run dev`

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment
- Build: `npm run build`
- Preview: `npm run preview`
- Deploy to hosting service

## Future Enhancements
- Mobile app version
- Additional question types
- Enhanced social features
- Advanced analytics
- Performance optimizations

## Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License
Proprietary - All rights reserved
