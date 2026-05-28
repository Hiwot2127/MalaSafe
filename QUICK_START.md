# 🚀 MalaSafe Frontend - Quick Start Guide

## For Developers New to the Codebase

This guide gets you up and running with the transformed MalaSafe frontend in **5 minutes**.

---

## ⚡ Prerequisites

- **Node.js** 18+ and npm
- **Backend API** running at `http://localhost:8000`
- **Git** for version control

---

## 📦 Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:3000**

---

## 🏗️ Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register)
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── dashboard/            # Main dashboard
│   │   ├── analytics/            # Trends & analytics
│   │   ├── maps/                 # Risk maps
│   │   ├── predictions/          # Predictions
│   │   ├── alerts/               # Alerts
│   │   └── upload/               # Data upload
│   └── layout.tsx                # Root layout with QueryClientProvider
│
├── components/                   # React components
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── dashboard-skeleton.tsx
│   │   └── dashboard-error.tsx
│   ├── predictions/              # Prediction components
│   │   └── prediction-explanation-card.tsx
│   └── ui/                       # Reusable UI components
│
├── lib/                          # Core utilities
│   ├── api/                      # API layer
│   │   ├── client.ts             # Axios client with cookie auth
│   │   ├── query-client.ts       # React Query configuration
│   │   ├── queries.ts            # Query hooks (useDashboard, etc.)
│   │   ├── analytics.ts          # Analytics API
│   │   ├── maps.ts               # Maps API
│   │   ├── predictions.ts        # Predictions API
│   │   └── alerts.ts             # Alerts API
│   ├── constants/                # Constants
│   │   └── design-tokens.ts      # Design system tokens
│   └── utils.ts                  # Utility functions
│
├── middleware.ts                 # Auth & security middleware
├── tests/e2e/                    # Playwright E2E tests
└── playwright.config.ts          # Test configuration
```

---

## 🔑 Key Concepts

### 1. React Query for Data Fetching

**Before:**
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData().then(setData).finally(() => setLoading(false));
}, []);
```

**After:**
```typescript
import { useDashboard } from '@/lib/api/queries';

const { data, isLoading, error, refetch } = useDashboard();
```

**Benefits:**
- Automatic caching
- Background refetching
- Request deduplication
- Optimistic updates

### 2. Cookie-Based Authentication

**Before:**
```typescript
localStorage.setItem('token', jwt); // XSS vulnerable
```

**After:**
```typescript
// Backend sets HttpOnly cookie
response.set_cookie(key="session_token", httponly=True);

// Frontend automatically sends cookie
apiClient.create({ withCredentials: true });
```

**Benefits:**
- XSS protection
- Automatic session management
- Silent token refresh

### 3. Skeleton Loaders

**Before:**
```typescript
{isLoading && <Spinner />}
```

**After:**
```typescript
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

{isLoading && <DashboardSkeleton />}
```

**Benefits:**
- Zero layout shift
- Professional appearance
- Matches actual layout

### 4. Error Handling

**Before:**
```typescript
{error && <div>Error!</div>}
```

**After:**
```typescript
import { DashboardError } from '@/components/dashboard/dashboard-error';

{error && <DashboardError error={error} onRetry={refetch} />}
```

**Benefits:**
- Graceful degradation
- Retry capability
- Troubleshooting steps

---

## 📝 Common Tasks

### Add a New Page with React Query

1. **Create API function** in `lib/api/`:
```typescript
// lib/api/reports.ts
export const reportsApi = {
  getReports: async () => {
    const { data } = await apiClient.get('/reports');
    return data;
  },
};
```

2. **Create query hook** in `lib/api/queries.ts`:
```typescript
export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.getReports(),
    staleTime: 60 * 1000,
  });
}
```

3. **Use in component**:
```typescript
import { useReports } from '@/lib/api/queries';

export default function ReportsPage() {
  const { data, isLoading, error, refetch } = useReports();
  
  if (isLoading) return <ReportsSkeleton />;
  if (error) return <ReportsError error={error} onRetry={refetch} />;
  
  return <div>{/* Render data */}</div>;
}
```

### Create a Skeleton Loader

```typescript
// components/reports/reports-skeleton.tsx
export function ReportsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-muted rounded mb-4" />
      <div className="h-64 w-full bg-muted rounded" />
    </div>
  );
}
```

### Add a Mutation (POST/PUT/DELETE)

```typescript
// In lib/api/queries.ts
export function useCreateReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ReportData) => reportsApi.create(data),
    onSuccess: () => {
      // Invalidate reports query to refetch
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// In component
const createReport = useCreateReport();

const handleSubmit = async (data: ReportData) => {
  await createReport.mutateAsync(data);
};
```

---

## 🧪 Testing

### Run E2E Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

### Write a New Test

```typescript
// tests/e2e/reports.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Reports', () => {
  test('should load reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
  });
});
```

---

## 🎨 Design System

### Use Design Tokens

```typescript
import { spacing, typography, colors } from '@/lib/constants/design-tokens';

// Spacing
<div className="p-6">  {/* spacing[6] = 24px */}

// Typography
<h1 className="text-4xl font-display">  {/* typography.fontSize['4xl'] */}

// Colors
<div className="bg-status-error">  {/* colors.status.error */}
```

### Standard Spacing Scale

```
0: 0px
1: 4px
2: 8px
3: 12px
4: 16px
5: 20px
6: 24px
8: 32px
10: 40px
12: 48px
16: 64px
20: 80px
24: 96px
```

---

## 🔒 Security

### Protected Routes

Routes are automatically protected by `middleware.ts`:

```typescript
// middleware.ts
const protectedRoutes = [
  '/dashboard',
  '/analytics',
  '/maps',
  // ...
];
```

### RBAC Enforcement

```typescript
// middleware.ts checks user_role cookie
if (isAdminRoute && userRole !== 'admin') {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

---

## 🐛 Debugging

### React Query DevTools

DevTools are automatically available in development:

```typescript
// app/layout.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

**Access:** Click the React Query icon in the bottom-right corner

**Features:**
- View all queries and their states
- Inspect cached data
- Manually trigger refetches
- See query timelines

### Common Issues

#### 1. "Network Error" on API calls

**Solution:** Ensure backend is running at `http://localhost:8000`

```bash
cd backend
uvicorn app.main:app --reload
```

#### 2. "401 Unauthorized" errors

**Solution:** Check cookie configuration in `lib/api/client.ts`:

```typescript
withCredentials: true  // Must be true for cookies
```

#### 3. Skeleton loader not showing

**Solution:** Ensure query is in loading state:

```typescript
const { data, isLoading } = useDashboard();

if (isLoading) return <DashboardSkeleton />;  // Must check isLoading
```

---

## 📚 Additional Resources

### Documentation
- **Full Implementation Guide**: `FRONTEND_IMPROVEMENTS.md`
- **Transformation Summary**: `FRONTEND_TRANSFORMATION_SUMMARY.md`
- **Before/After Comparison**: `BEFORE_AFTER_COMPARISON.md`
- **Completion Report**: `IMPLEMENTATION_COMPLETE.md`

### External Docs
- [React Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Playwright Testing](https://playwright.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🎯 Next Steps

1. **Explore the codebase** - Start with `app/(dashboard)/dashboard/page.tsx`
2. **Run the app** - `npm run dev`
3. **Run tests** - `npm run test:e2e:ui`
4. **Read the docs** - See `FRONTEND_IMPROVEMENTS.md` for deep dive
5. **Make changes** - Follow patterns in existing code

---

## 💡 Pro Tips

### 1. Use Query Keys Consistently

```typescript
// ✅ Good - Centralized in queries.ts
export const queryKeys = {
  dashboard: (year?: number) => ['dashboard', { year }] as const,
};

// ❌ Bad - Inline query keys
useQuery({ queryKey: ['dashboard', year] });
```

### 2. Invalidate Queries After Mutations

```typescript
const createReport = useMutation({
  mutationFn: reportsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  },
});
```

### 3. Use Skeleton Loaders, Not Spinners

```typescript
// ✅ Good - Matches layout
{isLoading && <DashboardSkeleton />}

// ❌ Bad - Generic spinner
{isLoading && <Spinner />}
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good - Actionable error with retry
{error && <DashboardError error={error} onRetry={refetch} />}

// ❌ Bad - Generic error
{error && <div>Error!</div>}
```

### 5. Use Design Tokens

```typescript
// ✅ Good - Consistent spacing
<div className="p-6 gap-4">

// ❌ Bad - Magic numbers
<div style={{ padding: '23px', gap: '17px' }}>
```

---

## 🎉 You're Ready!

The MalaSafe frontend is now a **ministry-grade, enterprise-quality platform**. Follow the patterns in the existing code, and you'll build features that are:

- **Fast** - React Query caching
- **Secure** - Cookie auth + middleware
- **Tested** - E2E coverage
- **Professional** - Skeleton loaders + error handling
- **Maintainable** - Design system + TypeScript

**Happy coding!** 🚀

---

**Last Updated**: January 2025
**Version**: 2.0.0
**Status**: Production Ready
