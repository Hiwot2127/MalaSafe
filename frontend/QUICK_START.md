# 🚀 MalaSafe Frontend - Quick Start Guide

## For Developers Implementing the Improvements

This guide helps you quickly implement the enterprise-grade improvements to the MalaSafe frontend.

---

## ⚡ 5-Minute Setup

### 1. Install Dependencies

```bash
cd frontend
npm install @tanstack/react-query @tanstack/react-virtual @radix-ui/react-tooltip
npm install -D @playwright/test
npx playwright install
```

### 2. Add QueryClientProvider

```typescript
// app/layout.tsx - Add these imports at the top
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/api/query-client';

// Wrap children with QueryClientProvider
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {/* existing ThemeProvider and other wrappers */}
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 3. Update Dashboard Page

```typescript
// app/(dashboard)/dashboard/page.tsx
// Replace the entire file with:

'use client';

import { useDashboard } from '@/lib/api/queries';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { DashboardError } from '@/components/dashboard/dashboard-error';
// ... keep other imports

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  
  if (isLoading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={refetch} />;
  
  // Use data.summary instead of stats
  const stats = data?.summary;
  
  // ... rest of your component
}
```

### 4. Run Tests

```bash
npm run test:e2e
```

---

## 📋 Implementation Checklist

Copy this checklist to track your progress:

```markdown
## Week 1: Foundation
- [ ] Install dependencies
- [ ] Add QueryClientProvider to root layout
- [ ] Update dashboard to use useDashboard hook
- [ ] Test dashboard loading/error states
- [ ] Update analytics page to use useTrends hook
- [ ] Update maps page to use useRiskMap hook
- [ ] Update predictions page to use usePredictionHistory hook
- [ ] Update alerts page to use useAlerts hook

## Week 2: Security & AI
- [ ] Update API client to use credentials: 'include'
- [ ] Remove localStorage JWT code
- [ ] Test auth flow with cookies
- [ ] Add PredictionExplanationCard to predictions page
- [ ] Test prediction explanations
- [ ] Add tooltips to complex UI elements

## Week 3: Performance & Accessibility
- [ ] Lazy load map components
- [ ] Add table virtualization to large tables
- [ ] Run bundle analyzer
- [ ] Add keyboard navigation
- [ ] Add ARIA labels
- [ ] Test with screen reader
- [ ] Fix color contrast issues

## Week 4: Testing & Polish
- [ ] Add map E2E tests
- [ ] Add prediction E2E tests
- [ ] Run full test suite
- [ ] Fix any failing tests
- [ ] Run Lighthouse audit
- [ ] Fix performance issues
- [ ] Deploy to staging
- [ ] Final QA testing
```

---

## 🔥 Common Patterns

### Pattern 1: Convert Page to Use React Query

**Before:**
```typescript
export default function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getData();
        setData(response);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* render data */}</div>;
}
```

**After:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { MySkeleton } from '@/components/my-skeleton';
import { MyError } from '@/components/my-error';

export default function MyPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-data'],
    queryFn: () => api.getData(),
  });
  
  if (isLoading) return <MySkeleton />;
  if (error) return <MyError error={error} onRetry={refetch} />;
  
  return <div>{/* render data */}</div>;
}
```

### Pattern 2: Create Skeleton Loader

**Template:**
```typescript
export function MySkeleton() {
  return (
    <div className="animate-pulse">
      {/* Match your actual component's layout */}
      <div className="h-8 w-64 bg-muted rounded mb-4" />
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-3/4 bg-muted rounded" />
    </div>
  );
}
```

### Pattern 3: Create Error Component

**Template:**
```typescript
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface MyErrorProps {
  error: Error | null;
  onRetry: () => void;
}

export function MyError({ error, onRetry }: MyErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertTriangle className="size-12 text-status-error mb-4" />
      <h2 className="font-semibold text-xl mb-2">Unable to load data</h2>
      <p className="text-muted-foreground mb-6">{error?.message}</p>
      <button onClick={onRetry} className="btn-primary">
        <RefreshCw className="size-4 mr-2" />
        Retry
      </button>
    </div>
  );
}
```

### Pattern 4: Add Mutation

**Example:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function MyForm() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (data) => api.submitData(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['my-data'] });
      toast.success('Data submitted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });
  
  const handleSubmit = (data) => {
    mutation.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## 🧪 Testing Patterns

### Pattern 1: Test Page Loading

```typescript
// tests/e2e/my-page.spec.ts
import { test, expect } from '@playwright/test';

test('should load page with data', async ({ page }) => {
  await page.goto('/my-page');
  
  // Should show skeleton first
  await expect(page.locator('.animate-pulse')).toBeVisible();
  
  // Then show actual content
  await expect(page.locator('h1')).toContainText('My Page');
  await expect(page.locator('[data-testid="data-value"]')).toBeVisible();
});
```

### Pattern 2: Test Error Handling

```typescript
test('should show error and retry', async ({ page }) => {
  // Mock API error
  await page.route('**/api/v1/my-endpoint', route => {
    route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server error' }) });
  });
  
  await page.goto('/my-page');
  
  // Should show error
  await expect(page.locator('text=Unable to load')).toBeVisible();
  
  // Should have retry button
  await expect(page.locator('button:has-text("Retry")')).toBeVisible();
});
```

### Pattern 3: Test Form Submission

```typescript
test('should submit form successfully', async ({ page }) => {
  await page.goto('/my-form');
  
  // Fill form
  await page.fill('input[name="name"]', 'Test Name');
  await page.fill('input[name="email"]', 'test@example.com');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Should show success message
  await expect(page.locator('[role="alert"]:has-text("Success")')).toBeVisible();
});
```

---

## 🐛 Troubleshooting

### Issue: "QueryClient not found"

**Solution:** Make sure QueryClientProvider is in your root layout:

```typescript
// app/layout.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/api/query-client';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### Issue: "Hydration mismatch"

**Solution:** Make sure skeleton loaders match the actual component structure. Use `suppressHydrationWarning` if needed:

```typescript
<div suppressHydrationWarning>
  {isLoading ? <Skeleton /> : <ActualContent />}
</div>
```

### Issue: "Tests failing with 'page.goto' timeout"

**Solution:** Make sure dev server is running:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

Or use the webServer config in playwright.config.ts (already configured).

### Issue: "Cookie auth not working"

**Solution:** Make sure:
1. API client has `withCredentials: true`
2. Backend sets `credentials: 'include'` in CORS
3. Backend sets HttpOnly cookies in response
4. Frontend and backend are on same domain (or CORS configured properly)

---

## 📚 Key Files Reference

### Core Files
- `lib/api/query-client.ts` - React Query configuration
- `lib/api/queries.ts` - Query hooks
- `lib/constants/design-tokens.ts` - Design system
- `middleware.ts` - Auth & security

### Components
- `components/dashboard/dashboard-skeleton.tsx` - Dashboard skeleton
- `components/dashboard/dashboard-error.tsx` - Dashboard error
- `components/predictions/prediction-explanation-card.tsx` - AI explanations
- `components/ui/tooltip.tsx` - Tooltip component

### Tests
- `tests/e2e/auth.spec.ts` - Auth tests
- `tests/e2e/dashboard.spec.ts` - Dashboard tests
- `tests/e2e/upload.spec.ts` - Upload tests
- `playwright.config.ts` - Playwright config

### Documentation
- `FRONTEND_IMPROVEMENTS.md` - Complete guide
- `FRONTEND_TRANSFORMATION_SUMMARY.md` - Executive summary
- `QUICK_START.md` - This file

---

## 🎯 Priority Order

Implement in this order for maximum impact:

1. **React Query** (2-3 days) - Biggest performance win
2. **Skeleton Loaders** (1 day) - Biggest UX win
3. **Error States** (1 day) - Biggest reliability win
4. **Cookie Auth** (2 days) - Biggest security win
5. **AI Explanations** (1 day) - Biggest trust win
6. **Testing** (2 days) - Biggest confidence win
7. **Performance** (2 days) - Polish
8. **Accessibility** (2 days) - Compliance

Total: ~2 weeks for core improvements

---

## 💡 Pro Tips

1. **Start Small:** Convert one page at a time to React Query
2. **Test Often:** Run tests after each change
3. **Use Skeletons:** They're easier than you think
4. **Copy Patterns:** Use the examples in this guide
5. **Ask for Help:** Review the full documentation if stuck
6. **Commit Often:** Small, focused commits are easier to review
7. **Test Mobile:** Don't forget responsive testing
8. **Check Accessibility:** Use axe DevTools browser extension

---

## 🚀 Ready to Start?

1. Install dependencies (5 minutes)
2. Add QueryClientProvider (2 minutes)
3. Convert dashboard page (30 minutes)
4. Run tests (5 minutes)
5. Celebrate! 🎉

You're now ready to transform the MalaSafe frontend into a ministry-grade platform!

---

**Questions?** Check `FRONTEND_IMPROVEMENTS.md` for detailed explanations.

**Need Help?** Review the code examples in the created files.

**Want to Contribute?** Follow the patterns in this guide.

---

**Last Updated:** January 2025
**Version:** 1.0.0
