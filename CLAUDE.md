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
   - id, created_at, user_id, name, key, status, step, modules
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

### Project Organization
- `/pages` - Page-level components (one per route)
  - Each page has its own folder: `PageName/`
  - Contains: `PageName.tsx`, `PageName.css`, `index.ts`
  - **Always use named exports**, not default exports
  - Page-specific components go in nested `components/` folder
    - Example: `Dashboard/components/ScrollCard/`, `PublicScroll/components/ModuleRenderer/`
    - Each component follows the same folder structure
    - Components used by only one page should be co-located with that page
- `/components` - Truly shared components (used across multiple pages)
  - Currently only contains `Logo` (used in Auth, Dashboard, PublicScroll)
  - Follow same folder structure as page components
  - Only add components here if they're used by 2+ pages
- `/types` - TypeScript type definitions (Scroll, Idea, Module)
  - **Always use `type` declarations**, never `interface`
  - For type composition, use intersection types (`&`) instead of `extends`
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
├── pages/
│   ├── Auth/
│   │   ├── Auth.tsx - Login/signup page
│   │   ├── Auth.css
│   │   └── index.ts
│   ├── Dashboard/
│   │   ├── Dashboard.tsx - Main dashboard view
│   │   ├── Dashboard.css
│   │   ├── index.ts
│   │   └── components/ - Dashboard-specific components
│   │       ├── ScrollCard/
│   │       ├── DatasetCard/
│   │       ├── TrendCard/
│   │       ├── Datasets/
│   │       ├── Trends/
│   │       ├── NewScrollForm/
│   │       ├── EditScrollForm/
│   │       ├── NewDatasetForm/
│   │       ├── EditDatasetForm/
│   │       ├── NewTrendForm/
│   │       ├── EditTrendForm/
│   │       ├── ModuleConfigEditor/
│   │       └── ScrollResultsPage/
│   └── PublicScroll/
│       ├── PublicScroll.tsx - Public scroll page
│       ├── PublicScroll.css
│       ├── index.ts
│       └── components/ - PublicScroll-specific components
│           ├── IntroView/
│           ├── MobileMenu/
│           ├── ScrollHeader/
│           ├── ModuleResultsView/
│           ├── ActiveUsers/
│           ├── NamePrompt/
│           ├── ModuleRenderer/
│           ├── ModuleTimer/
│           ├── IdeaCard/
│           ├── NewIdeaForm/
│           ├── ScrollResults/
│           ├── ResultsView/
│           ├── SimpleVoteView/
│           ├── WeightedVoteView/
│           ├── VotingView/
│           ├── RankOrderView/
│           ├── WorkEstimateView/
│           ├── GroupingView/
│           └── results/ - Result rendering components
│               ├── ModuleResultsRenderer/
│               ├── SimpleVoteResults/
│               ├── WeightedVoteResults/
│               ├── RankOrderResults/
│               ├── LikertVoteResults/
│               ├── WorkEstimateResults/
│               ├── GroupingResults/
│               └── ResultsCommon.css
├── components/
│   └── Logo/ - Truly shared component (used across pages)
├── lib/
│   └── supabase.ts - Supabase client
├── store/
│   └── userStore.ts - Zustand user state
├── types/
│   ├── scroll.ts - Scroll type
│   ├── idea.ts - Idea type
│   ├── dataset.ts - Dataset type
│   ├── trend.ts - Trend type
│   └── module.ts - Module types
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
**Decide where it belongs:**
- If used by only one page → `pages/PageName/components/ComponentName/`
- If used by 2+ pages → `components/ComponentName/`

**Then follow this structure:**
1. Create a new folder: `ComponentName/`
2. Create three files in the folder:
   - `ComponentName.tsx` - Component logic with **named export**
   - `ComponentName.css` - Component styles (use theme variables for all colors)
   - `index.ts` - Export file
3. Component file structure:
   ```typescript
   // ComponentName.tsx
   import './ComponentName.css'

   type ComponentNameProps = {
     // props here
   }

   export function ComponentName({ ...props }: ComponentNameProps) {
     // component logic
   }
   ```
4. Index file structure:
   ```typescript
   // index.ts
   export { ComponentName } from './ComponentName'
   ```
5. Import examples:
   ```typescript
   // From within same page
   import { ComponentName } from './components/ComponentName'

   // From shared components
   import { Logo } from '../../components/Logo'
   ```

### Breaking down complex pages
When a page component becomes too large (>500 lines) or has multiple distinct UI sections:
1. Create a `components/` folder inside the page folder (if it doesn't exist)
2. Extract logical sections into separate components (e.g., `IntroView`, `MobileMenu`, `ScrollHeader`)
3. Each component follows the same structure as other components
4. Move component-specific CSS to component files
5. Keep shared styles in the page's CSS file
6. Example structure:
   ```
   pages/PublicScroll/
   ├── PublicScroll.tsx       # Main page orchestration logic
   ├── PublicScroll.css       # Shared/base styles
   ├── index.ts
   └── components/            # Page-specific components
       ├── IntroView/
       │   ├── IntroView.tsx
       │   ├── IntroView.css
       │   └── index.ts
       ├── MobileMenu/
       │   ├── MobileMenu.tsx
       │   ├── MobileMenu.css
       │   └── index.ts
       └── ModuleRenderer/
           ├── ModuleRenderer.tsx
           ├── ModuleRenderer.css
           └── index.ts
   ```

### Creating new types
1. Add types to appropriate file in `types/` folder
2. **Always use `type` declarations**, never `interface`:
   ```typescript
   // ✅ Correct
   export type MyType = {
     id: string
     name: string
   }

   // ❌ Incorrect
   export interface MyType {
     id: string
     name: string
   }
   ```
3. For type composition, use intersection types (`&`):
   ```typescript
   // ✅ Correct
   export type ExtendedType = BaseType & {
     additionalField: string
   }

   // ❌ Incorrect - don't use extends with types
   export type ExtendedType extends BaseType = {
     additionalField: string
   }
   ```
