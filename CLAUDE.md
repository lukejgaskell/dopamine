# Dopamine Project Structure

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **State Management**: Zustand with persist middleware
- **Routing**: React Router DOM
- **Styling**: CSS with CSS Variables for theming

## Theming System
All colors are defined in `src/theme.css` using CSS variables:
- Light/dark mode support via `@media (prefers-color-scheme: dark)`
- Variables: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--border-color`, `--primary-bg`, `--status-*`, etc.
- Components use `var(--variable-name)` for all colors
- Imported first in `main.tsx` to ensure global availability

## Database Structure (Supabase)

### Tables
1. **scrolls**
   - id, created_at, user_id, name, type, key, status
   - RLS: Authenticated users CRUD their own; anon users SELECT active scrolls

2. **ideas**
   - id, created_at, text, scroll_id, votes
   - RLS: Anon users can INSERT and SELECT

### Realtime Channels
- Presence: `scroll:{id}` for tracking active users
- Changes: `ideas:{id}` for real-time idea updates (INSERT/UPDATE/DELETE)

## State Management (Zustand)

### userStore (`src/store/userStore.ts`)
- Stores anonymous user's name in localStorage
- Persists across sessions and different scrolls
- Actions: `setName()`, `clearName()`

## Routing Structure
- `/` - Dashboard (authenticated) or Auth (public)
- `/scroll/:id?key=xxx` - Public scroll view (anonymous access)

## Key Patterns

### Authentication Flow
1. Dashboard requires Supabase auth session
2. Public scrolls accessible to anonymous users with valid id+key+status=active
3. Auth component handles login/signup

### Public Scroll Flow
1. User enters name (stored in Zustand, persists in localStorage)
2. Joins Realtime presence channel `scroll:{id}`
3. Subscribes to ideas changes via `postgres_changes`
4. Can create ideas (fixed floating form at bottom)
5. Views randomly positioned idea cards in canvas

### Component Organization
- `/components` - All React components
- `/types` - TypeScript interfaces (Scroll, Idea)
- `/store` - Zustand stores
- `/lib` - Supabase client setup

### Styling Patterns
- Component-specific CSS files (e.g., `ComponentName.css`)
- Use theme variables for all colors
- Common patterns:
  - Cards: `var(--bg-card)` with `var(--border-color)` border
  - Fixed elements: z-index 100 (UI) / 900 (modals) / 1000 (overlays)
  - Transitions: 0.2s for interactive elements
  - Border radius: 4px (inputs), 8px (cards), 12px (special UI), 20px (pills)

### Layout Philosophy
- Public scroll: Canvas-based layout with absolute positioning
- Ideas positioned using hash of ID for consistency across clients
- Fixed floating input at bottom
- Compact top bar header
- Sidebar elements for metadata (users, etc.)

## File Structure
```
src/
├── components/
│   ├── Auth.tsx/css - Login/signup
│   ├── Scrolls.tsx/css - Scroll list (authenticated)
│   ├── ScrollCard.tsx/css - Individual scroll card
│   ├── PublicScroll.tsx/css - Public scroll view
│   ├── ActiveUsers.tsx/css - Realtime presence display
│   ├── IdeaCard.tsx/css - Individual idea card
│   ├── NewIdeaForm.tsx/css - Create idea form
│   ├── NamePrompt.tsx/css - Name entry modal
│   └── EditScrollForm.tsx - Edit scroll modal
├── lib/
│   └── supabase.ts - Supabase client
├── store/
│   └── userStore.ts - Zustand user state
├── types/
│   ├── scroll.ts - Scroll interface
│   └── idea.ts - Idea interface
├── theme.css - Global theme variables
├── index.css - Global base styles
├── App.tsx/css - Main app router
└── main.tsx - Entry point
```

## Common Tasks

### Adding a new color
1. Add to `src/theme.css` for both light and dark modes
2. Use `var(--new-variable)` in component CSS

### Adding realtime feature
1. Subscribe to channel in useEffect
2. Handle INSERT/UPDATE/DELETE events
3. Clean up in return function

### Creating new component
1. Create `.tsx` and `.css` files in `components/`
2. Use theme variables for all colors
3. Export default function
