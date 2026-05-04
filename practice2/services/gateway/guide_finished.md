# Technical Specification: Whynot Finances (Svelte 5 Edition)

> 📚 **Related Documents:**
>
> - [README.md](./README.md) - Main project information
> - [guide.md](./guide.md) - Original brief specification
> - [llms-shadcn.md](./llms-shadcn.md) - Shadcn-svelte components documentation
> - [llms-small.md](./llms-small.md) - Svelte 5 and SvelteKit documentation

## 1. Concept and Goals

A simple, modern, and fast web application for personal expense tracking with a focus on mobile usability "on the go" while maintaining a full-featured desktop interface.

**Core Principles:**

- Mobile First approach
- Simple and intuitive interface
- Quick expense entry
- Visual analytics
- Responsive design for all devices

## 2. Technology Stack

### Frontend

- **SvelteKit 5** (Runes) - main framework
- **Tailwind CSS 4** - styling
- **Shadcn-svelte** - UI components
- **LayerChart** - charts and data visualization
- **Bits-UI** / **Vaul-svelte** - UI component primitives

### Backend & Database

- **PostgreSQL** - database (locally via Docker during development)
- **Drizzle ORM** - database operations, migrations
- **Better Auth** - authentication (Email/Password, GitHub, Google)

### Development Tools

- **TypeScript** - type safety
- **ESLint** + **Prettier** - linting and formatting
- **Drizzle Kit** - migrations and database schema management

## 3. Data Architecture (Database Schema)

### Users

Uses standard Better Auth tables. Data is saved automatically after registration.

**Better Auth Fields:**

- `id`: String (UUID)
- `name`: String
- `email`: String
- `image`: String (avatar URL)

**Note:** After registration via Better Auth, the user is automatically created in the database. No additional profile tables are needed - data connection is via `userId`.

### Categories

- `id`: Serial/UUID (Primary Key)
- `userId`: String (Foreign Key → `user.id`)
- `name`: String (category name)
- `icon`: String (Lucide icon name or Emoji)
- `color`: String (valid CSS color, e.g., `#ef4444`)
- `createdAt`: Timestamp

**Features:**

- Categories are individual per user
- Icon is selected via Combobox with Lucide library search
- Color is selected via Color Picker and applied to category badges

### Transactions

- `id`: Serial/UUID (Primary Key)
- `userId`: String (Foreign Key → `user.id`)
- `categoryId`: Integer (Foreign Key → `categories.id`)
- `amount`: Integer (stored in kopecks/minimal units for precision)
- `description`: Text (optional comment)
- `createdAt`: Timestamp (expense date)

**Important Details:**

- One transaction = one category (simplified model)
- Currency: strictly RUR (rubles)
- Transaction type: expenses only (income not tracked in first phase)

## 4. Functional Requirements

### Core Mechanics

#### Adding an Expense

Maximum speed action "on the go":

- **Amount** (required) - numeric input with formatting
- **Category** (required) - selection from list via Combobox
- **Description** (optional) - text field for comment
- **Date** - automatically current date, with option to change

#### Category Management

- **Creating a category:**
  - Name (required)
  - Icon selection via Combobox with Lucide search
  - Color selection via Color Picker
  - Icon can be omitted (name only)
- **Editing a category**
- **Deleting a category** (with check for existing transactions)

#### Transaction History

- Table/list of all user transactions
- Filter by categories
- Filter by date (month, period)
- Search by description
- Ability to edit and delete transactions

### Analytics and Reports

#### Category Aggregation

- Donut chart of expenses by category for current month
- Percentage breakdown by category
- Absolute values

#### Expense Trends

- Line chart of expenses by month
- Period: last 6-12 months
- Trend tracking and changes

#### Simple Statistics

- Total expenses for the month
- Average daily expense
- Most expensive category for the period
- Comparison with previous period

## 5. Interface and UX

### Responsiveness (Mobile First)

#### Mobile Mode (< 768px)

- Use `Drawer` (bottom sheets) for add forms and category selection
- Large touch-friendly controls
- Optimized navigation
- Minimalist interface

#### Desktop Mode (≥ 768px)

- Use `Dialog` (modal windows) and `Popover` for forms
- Full sidebar navigation (`app-sidebar.svelte`)
- Extended analytics with more charts
- Tabular data presentation

#### General

- Dark/light theme support (mechanics from `../parkings-svelte/`)
- Smooth animations and transitions
- Loading skeletons for better UX

### Components

#### Responsive Combobox

Created reusable `Combobox` component for adaptive selection:

- Desktop: `Popover` with search
- Mobile: `Drawer` (bottom sheet)
- Automatic switching based on screen size
- Uses `IsMobile` hook to determine mode

**Structure:**

```
Combobox.Root
├── Combobox.Trigger
└── Combobox.Content
    └── Command.Root (for search and list)
```

#### IconPicker (planned)

Custom Combobox for searching and selecting icons from Lucide library:

- Search by icon name
- Visual preview
- Grouping by categories (optional)

#### AmountInput (planned)

Specialized input for amount entry:

- Automatic formatting (thousand separators)
- Numeric input validation
- Support for kopecks input with ruble display

## 6. Authentication (Better Auth)

### Providers

- **Email/Password** - standard registration
- **GitHub OAuth** - sign in via GitHub
- **Google OAuth** - sign in via Google

### Database Integration

- Better Auth automatically creates tables: `user`, `session`, `account`, `verification`
- After registration, user is available via `session.user`
- Connection to our tables via `userId = session.user.id`
- No additional profile tables needed

### Route Protection

- Only authenticated users can see their data
- Filter by `userId` in all database queries
- Middleware for session verification

## 7. Implementation Plan (Roadmap)

### Phase 1: Infrastructure ✅ (Partially Complete)

#### Database

- [x] Docker Compose setup for PostgreSQL
- [x] Drizzle ORM initialization
- [ ] Database schema creation:
  - [ ] `categories` table
  - [ ] `transactions` table
  - [ ] Relationships and indexes
- [ ] Migration setup (`drizzle-kit push/migrate`)

#### Authentication

- [ ] Better Auth setup:
  - [ ] Generate auth schemas (`auth:schema`)
  - [ ] Configure providers (Email, GitHub, Google)
  - [ ] Create demo login/registration page
  - [ ] Integration with existing database tables

#### Basic Layout

- [x] Create adaptive Sidebar
- [x] Theme setup (dark/light)
- [ ] Route protection (authenticated only)

### Phase 2: Core Application (CRUD)

#### Category Management

- [ ] Category management page
- [ ] Category creation form:
  - [ ] Name field
  - [ ] IconPicker (Combobox with Lucide icons)
  - [ ] Color Picker
- [ ] Category list with badges
- [ ] Category editing
- [ ] Category deletion (with check)

#### Main Page

- [ ] "Add Expense" button (adaptive)
- [ ] Transaction add form:
  - [ ] Amount field (AmountInput)
  - [ ] Category selection (Combobox)
  - [ ] Description field
  - [ ] Date selection (Calendar)
- [ ] Recent transactions list
- [ ] Filters and search

#### API Endpoints

- [ ] `GET /api/categories` - user's category list
- [ ] `POST /api/categories` - create category
- [ ] `PUT /api/categories/:id` - update category
- [ ] `DELETE /api/categories/:id` - delete category
- [ ] `GET /api/transactions` - transaction list (with filters)
- [ ] `POST /api/transactions` - create transaction
- [ ] `PUT /api/transactions/:id` - update transaction
- [ ] `DELETE /api/transactions/:id` - delete transaction

### Phase 3: Analytics and Visualization

#### LayerChart Integration

- [ ] Donut chart of expenses by category for the month
- [ ] Line chart of expense trends by month
- [ ] Additional charts (optional):
  - Bar chart by day of week
  - Period comparison

#### Analytics Page

- [ ] General statistics (sums, averages)
- [ ] Expense charts
- [ ] Period filters
- [ ] Data export (optional)

### Phase 4: Polish and Optimization

#### UX Improvements

- [ ] Animations and transitions
- [ ] Loading skeletons
- [ ] Toast notifications (svelte-sonner)
- [ ] Error handling
- [ ] Form validation

#### Performance

- [ ] Database query optimization
- [ ] Data caching
- [ ] Lazy loading of charts
- [ ] Image and asset optimization

#### Testing

- [ ] Testing on different devices
- [ ] Responsiveness verification
- [ ] Authentication testing
- [ ] Cross-browser compatibility check

## 8. Technical Implementation Details

### Database Operations (Drizzle ORM)

#### Migrations

```bash
# Generate migrations based on schema
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (for development)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

#### Database Schema

File: `src/lib/server/db/schema.ts`

**Example structure:**

```typescript
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  name: varchar('name').notNull(),
  icon: varchar('icon'),
  color: varchar('color').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  amount: integer('amount').notNull(), // in kopecks
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
});
```

### Better Auth Integration

#### Configuration

File: `src/lib/server/auth.ts`

**Schema generation:**

```bash
npm run auth:schema
```

#### Usage in Components

```typescript
import { auth } from '$lib/server/auth';
import { getSession } from 'better-auth/sveltekit';

// In load function
const session = await getSession({ auth });
if (!session) {
  throw redirect(303, '/login');
}
```

### Responsive Components

#### Using IsMobile Hook

```typescript
import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';

const isMobile = new IsMobile();
// isMobile.current - reactive value
```

#### Pattern for Responsive Components

Created state class (as in `sidebar/context.svelte.ts`):

- Logic encapsulation
- Single source of truth for `isMobile`
- Reactivity via getters

## 9. Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── combobox/          # Responsive combobox
│   │   │   ├── button/
│   │   │   ├── dialog/
│   │   │   ├── drawer/
│   │   │   └── ...
│   │   └── app-sidebar.svelte
│   ├── hooks/
│   │   └── is-mobile.svelte.ts    # Hook for mobile mode detection
│   └── server/
│       ├── db/
│       │   ├── schema.ts           # Drizzle schema
│       │   └── index.ts           # Database connection
│       └── auth.ts                # Better Auth configuration
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte               # Main page
│   ├── categories/
│   │   └── +page.svelte           # Category management
│   └── api/
│       ├── categories/
│       └── transactions/
└── app.d.ts
```

## 10. Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Database
npm run db:start      # Start Docker container
npm run db:push       # Push schema to DB
npm run db:generate   # Generate migrations
npm run db:migrate    # Apply migrations
npm run db:studio     # Drizzle Studio

# Authentication
npm run auth:schema   # Generate Better Auth schemas
```

## 11. Development Notes

### Important Points

1. **Mobile First**: All components must work excellently on mobile devices
2. **Reactivity**: Use Svelte 5 Runes (`$state`, `$derived`, `$props`, `$bindable`)
3. **Type Safety**: Strict TypeScript typing for all components and API
4. **Security**: All database queries must be filtered by `userId`
5. **Performance**: Optimize queries, use database indexes

### References and Documentation

#### Project Documentation

- **[README.md](./README.md)** - Main project information and setup
- **[guide.md](./guide.md)** - Original technical specification (brief version)
- **[llms-shadcn.md](./llms-shadcn.md)** - Shadcn-svelte components documentation
- **[llms-small.md](./llms-small.md)** - Svelte 5 and SvelteKit documentation

#### External References

- Theme switching code: `../parkings-svelte/` (specify as string for LLM)
- Database structure: follow patterns in `src/lib/server/db/`
- UI components: use Shadcn-svelte as foundation

### Next Steps

1. Complete database setup and migrations
2. Configure Better Auth with providers
3. Create basic API endpoints
4. Implement UI for category management
5. Implement transaction add form
6. Add analytics and charts

---

**Version:** 1.0  
**Date:** 2026-02-24  
**Status:** In Development
