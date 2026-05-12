# MalaSafe Frontend Setup Guide

## 🎯 Complete Next.js Frontend Structure

A modern, enterprise-grade malaria surveillance dashboard built with Next.js 14, Tailwind CSS, shadcn/ui, Recharts, and Leaflet.

## 📁 Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── upload/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── maps/
│   │   │   └── page.tsx
│   │   ├── alerts/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── alert.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── footer.tsx
│   ├── dashboard/
│   │   ├── stats-card.tsx
│   │   ├── trend-chart.tsx
│   │   └── recent-alerts.tsx
│   ├── maps/
│   │   ├── risk-map.tsx
│   │   └── map-legend.tsx
│   ├── upload/
│   │   ├── csv-upload.tsx
│   │   └── upload-history.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── analytics.ts
│   │   ├── uploads.ts
│   │   ├── maps.ts
│   │   └── alerts.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-dashboard.ts
│   │   └── use-toast.ts
│   ├── utils.ts
│   └── constants.ts
├── types/
│   ├── auth.ts
│   ├── analytics.ts
│   ├── upload.ts
│   └── map.ts
├── public/
│   └── geojson/
│       └── ethiopia_districts.json
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
copy .env.local.example .env.local

# Edit .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

## 📦 Dependencies

### Core
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety

### Styling
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide React** - Icons

### Data Visualization
- **Recharts** - Charts and graphs
- **Leaflet** - Interactive maps
- **React Leaflet** - React bindings for Leaflet

### API & State
- **Axios** - HTTP client
- **Next Themes** - Theme management

### Utilities
- **date-fns** - Date formatting
- **clsx** - Class name utilities
- **tailwind-merge** - Merge Tailwind classes

## 🎨 Theme Configuration

### Professional Blue Theme

**Light Mode:**
- Primary: Blue (#3B82F6)
- Background: White
- Cards: White with subtle shadows
- Text: Dark gray

**Dark Mode:**
- Primary: Blue (#3B82F6)
- Background: Dark blue-gray
- Cards: Darker blue-gray
- Text: Light gray

### Color Palette

```css
/* Primary Blue */
--primary: 217 91% 60%;

/* Backgrounds */
--background: 0 0% 100%; /* Light */
--background: 222.2 84% 4.9%; /* Dark */

/* Cards */
--card: 0 0% 100%; /* Light */
--card: 222.2 84% 4.9%; /* Dark */
```

## 📄 Key Files to Create

I've created the foundational files. Here are the remaining files you need to create:

### 1. API Client (`lib/api/client.ts`)

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2. Auth API (`lib/api/auth.ts`)

```typescript
import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
};
```

### 3. Dashboard Layout (`app/(dashboard)/layout.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 4. Login Page (`app/(auth)/login/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            MalaSafe
          </CardTitle>
          <CardDescription className="text-center">
            Malaria Surveillance Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@malasafe.gov.et"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Dashboard Page (`app/(dashboard)/dashboard/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get('/analytics/dashboard');
        setStats(response.data.summary);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of malaria surveillance data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cases
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_cases?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.period || 'Current period'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deaths
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_deaths?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              CFR: {stats?.case_fatality_rate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.active_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Risk Districts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.high_risk_districts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Elevated risk level
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## 🔧 Installation Steps

### Step 1: Install Node.js Dependencies

```bash
cd frontend
npm install
```

### Step 2: Install shadcn/ui Components

```bash
npx shadcn-ui@latest init
```

When prompted:
- Style: Default
- Base color: Blue
- CSS variables: Yes

Then install components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert
```

### Step 3: Create Remaining Files

Create the files listed above in their respective directories.

### Step 4: Run Development Server

```bash
npm run dev
```

## 📱 Pages Overview

### 1. Login (`/login`)
- Email/password authentication
- Error handling
- Redirect to dashboard on success

### 2. Dashboard (`/dashboard`)
- Statistics cards
- Recent trends chart
- Active alerts list
- Region breakdown

### 3. Upload (`/upload`)
- CSV file upload
- Template download
- Upload history
- Validation errors display

### 4. Analytics (`/analytics`)
- Trend charts (weekly/monthly)
- Region comparison
- Time series analysis
- Export functionality

### 5. Maps (`/maps`)
- Interactive Leaflet map
- Risk level heatmap
- District information popups
- Legend and filters

### 6. Alerts (`/alerts`)
- Alert list with filtering
- Risk level badges
- District information
- Active/inactive toggle

### 7. Settings (`/settings`)
- User profile
- Theme toggle
- Notification preferences
- Account settings

## 🎨 Component Library

### UI Components (shadcn/ui)
- Button
- Card
- Input
- Label
- Select
- Table
- Badge
- Alert

### Custom Components
- Sidebar navigation
- Header with user menu
- Stats cards
- Trend charts (Recharts)
- Risk map (Leaflet)
- CSV upload form
- Alert list
- Theme toggle

## 🔐 Authentication Flow

1. User enters credentials on `/login`
2. API call to `/api/v1/auth/login`
3. Store JWT token in localStorage
4. Redirect to `/dashboard`
5. Protected routes check for token
6. API client adds token to requests
7. 401 responses redirect to login

## 📊 Data Flow

1. **Dashboard**: Fetch from `/analytics/dashboard`
2. **Trends**: Fetch from `/analytics/trends`
3. **Maps**: Fetch from `/maps/risk`
4. **Alerts**: Fetch from `/alerts`
5. **Upload**: POST to `/uploads/malaria` or `/uploads/climate`

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.malasafe.gov.et/api/v1
NEXT_PUBLIC_APP_NAME=MalaSafe
```

## 📚 Next Steps

1. **Complete all component files** - Use the examples above
2. **Add error boundaries** - Handle errors gracefully
3. **Add loading states** - Skeleton loaders
4. **Add toast notifications** - User feedback
5. **Add form validation** - Client-side validation
6. **Add tests** - Jest and React Testing Library
7. **Optimize performance** - Code splitting, lazy loading
8. **Add PWA support** - Offline functionality

## 🎉 You're Ready!

Your Next.js frontend structure is set up with:
- ✅ Modern Next.js 14 App Router
- ✅ Tailwind CSS styling
- ✅ shadcn/ui components
- ✅ Professional blue theme
- ✅ API integration structure
- ✅ Authentication handling
- ✅ Protected routes
- ✅ Responsive layout

**Start building your components and pages!** 🚀
