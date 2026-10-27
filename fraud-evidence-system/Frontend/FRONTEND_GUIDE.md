# 🎨 Frontend Developer Guide - Fraud Evidence System

**Complete guide to understanding and developing the React frontend**

---

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Routing & Navigation](#routing--navigation)
6. [Components Guide](#components-guide)
7. [Pages Guide](#pages-guide)
8. [State Management](#state-management)
9. [API Integration](#api-integration)
10. [Authentication](#authentication)
11. [Styling Guide](#styling-guide)
12. [Common Tasks](#common-tasks)
13. [Best Practices](#best-practices)

---

## 🎯 Project Overview

The Fraud Evidence System frontend is a modern React application built for fraud detection, evidence management, and case investigation. It provides role-based interfaces for different user types:

- **Public Users**: Submit fraud reports
- **Investigators**: Manage cases and evidence
- **Admins**: Full system control and user management

---

## 🛠️ Technology Stack

### Core Technologies
- **React 18.3.1** - UI framework
- **React Router DOM 6.14.2** - Routing
- **React Scripts 5.0.1** - Build tooling

### UI & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Lucide React 0.544.0** - Icon library
- **React Toastify 8.2.0** - Toast notifications
- **Leaflet 1.9.4** - Maps for threat visualization

### Data & Forms
- **Axios 1.10.0** - HTTP client
- **PapaParse 5.5.3** - CSV parsing
- **React CSV 2.2.2** - CSV export
- **File Saver 2.0.5** - File downloads

### Authentication & Blockchain
- **Supabase JS 2.50.3** - Authentication
- **Ethers.js 5.8.0** - Blockchain interaction

### Data Visualization
- **ReactFlow 11.11.4** - Flow diagrams
- **React Leaflet 4.2.1** - Map components

### Utilities
- **date-fns 4.1.0** - Date manipulation
- **dayjs 1.11.13** - Date formatting
- **react-copy-to-clipboard 5.1.0** - Copy functionality

---

## 📁 Project Structure

```
Frontend/
├── public/                     # Static files
│   ├── index.html             # HTML template
│   ├── favicon.ico            # Site icon
│   └── manifest.json          # PWA manifest
│
├── src/
│   ├── components/            # Reusable components (38 files)
│   │   ├── AdminDownloadTable.jsx
│   │   ├── AlertLog.js
│   │   ├── CaseManager.jsx
│   │   ├── ChainVisualizer.jsx
│   │   ├── ContactPolice.jsx
│   │   ├── EvidenceLibrary.jsx
│   │   ├── FileUpload.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── RLDashboard.jsx
│   │   ├── SidebarNavigation.jsx
│   │   ├── SystemLogs.jsx
│   │   ├── ThreatMap.jsx
│   │   ├── Timeline.jsx
│   │   ├── UserManagement.jsx
│   │   └── ... (25 more)
│   │
│   ├── Pages/                 # Page components (10 files)
│   │   ├── AdminPage.jsx      # Admin dashboard
│   │   ├── InvestigatorPage.jsx
│   │   ├── PublicPage.jsx     # Public interface
│   │   └── ... (7 more)
│   │
│   ├── api/                   # API integration
│   │   ├── apiClient.js       # API client setup
│   │   ├── contractApi.js     # Blockchain API
│   │   ├── eventApi.js        # Event handling
│   │   └── fraudApi.js        # Fraud detection API
│   │
│   ├── hooks/                 # Custom React hooks
│   │   └── useEventPolling.js # Real-time event polling
│   │
│   ├── utils/                 # Utility functions
│   │   ├── authHelper.js      # Authentication helpers
│   │   ├── config.js          # Configuration
│   │   └── ... (2 more)
│   │
│   ├── styles/                # Global styles
│   │   └── Button.css         # Button styles
│   │
│   ├── abi/                   # Smart contract ABIs
│   │   ├── ContractABI.json
│   │   └── Cybercrime.json
│   │
│   ├── App.jsx                # Main application component
│   ├── index.js               # Entry point with routing
│   ├── index.css              # Global styles
│   ├── supabase.js            # Supabase configuration
│   └── contract.js            # Blockchain contract setup
│
├── .env                       # Environment variables (not in Git)
├── .env.example              # Environment template
├── package.json              # Dependencies
├── tailwind.config.js        # Tailwind configuration
└── postcss.config.js         # PostCSS configuration
```

---

## 🚀 Getting Started

### 1. Installation

```bash
cd Frontend
npm install
```

### 2. Environment Configuration

Create `.env` file in `Frontend/` directory:

```bash
# Backend API
REACT_APP_BACKEND_URL=http://localhost:5050

# Supabase Authentication
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Vite configuration (for future migration)
VITE_BACKEND_URL=http://localhost:5050
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Environment
NODE_ENV=development
```

### 3. Start Development Server

```bash
npm start
```

Opens at: `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

Output in `build/` directory.

---

## 🗺️ Routing & Navigation

### Route Configuration

Routes are defined in `src/index.js`:

```javascript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/investigator" element={<InvestigatorPage />} />
    <Route path="/public" element={<PublicPage />} />
    <Route path="/status" element={<PublicStatus />} />
  </Routes>
</BrowserRouter>
```

### Available Routes

| Route | Component | Access | Purpose |
|-------|-----------|--------|---------|
| `/` | HomePage (App.jsx) | All users | Main landing page & login |
| `/admin` | AdminPage | Admin only | Admin dashboard |
| `/investigator` | InvestigatorPage | Investigator+ | Investigation tools |
| `/public` | PublicPage | Public | Submit reports |
| `/status` | PublicStatus | Public | Check report status |

### Navigation Components

**SidebarNavigation.jsx** - Sidebar menu for authenticated users
**ProtectedRoute.jsx** - Route protection wrapper

---

## 🧩 Components Guide

### 📊 **Dashboard Components**

#### **RLDashboard.jsx**
- **Purpose**: Reinforcement Learning AI dashboard
- **Features**:
  - Model performance metrics
  - Training controls
  - Prediction logs
  - Real-time updates
- **Usage**:
  ```jsx
  import RLDashboard from './components/RLDashboard';
  <RLDashboard />
  ```

#### **ThreatMap.jsx**
- **Purpose**: Geographic threat visualization
- **Features**:
  - Leaflet map integration
  - Geo-IP location plotting
  - Risk level markers
- **Dependencies**: leaflet, react-leaflet

---

### 📁 **Evidence Management**

#### **EvidenceLibrary.jsx**
- **Purpose**: Browse and manage evidence files
- **Features**:
  - File list with metadata
  - Search and filter
  - Download evidence
  - Verify blockchain hashes
- **Props**:
  ```javascript
  {
    userRole: string,        // 'admin', 'investigator', 'user'
    userEmail: string,       // Current user email
    refreshTrigger: number   // Force refresh
  }
  ```

#### **FileUpload.jsx**
- **Purpose**: Upload evidence files
- **Features**:
  - Multi-file upload
  - File type validation
  - Progress tracking
  - Blockchain anchoring
- **Props**:
  ```javascript
  {
    caseId: string,          // Associated case ID
    wallet: string,          // Related wallet address
    onUploadComplete: func   // Callback after upload
  }
  ```

---

### 🔍 **Investigation Tools**

#### **CaseManager.jsx**
- **Purpose**: Manage fraud investigation cases
- **Features**:
  - Create new cases
  - Assign investigators
  - Update case status
  - Link evidence
- **API Endpoints**: `/api/cases/*`

#### **Timeline.jsx**
- **Purpose**: Visual case timeline
- **Features**:
  - Chronological events
  - Evidence milestones
  - Case progression
- **Usage**: Auto-updates with case changes

#### **ChainVisualizer.jsx**
- **Purpose**: Visualize blockchain evidence chain
- **Features**:
  - ReactFlow diagrams
  - Interactive nodes
  - Chain of custody
- **Dependencies**: reactflow

---

### 👥 **User Management**

#### **UserManagement.jsx**
- **Purpose**: Admin user management
- **Features**:
  - Add/remove users
  - Role assignment
  - Password reset
  - User activation/deactivation
- **Access**: Admin only

#### **RoleBasedUI.jsx**
- **Purpose**: Role-based component rendering
- **Components**:
  - `RoleBasedButton` - Conditional buttons
  - `RoleBasedContent` - Content by role
  - `RoleBadge` - Display user role
  - `AccessDeniedMessage` - Permission errors

---

### 🚨 **Security & Enforcement**

#### **ContactPolice.jsx**
- **Purpose**: Law enforcement contact interface
- **Features**:
  - Police department lookup
  - Location-based search
  - Contact information
  - Report submission

#### **Escalations.jsx**
- **Purpose**: Escalate cases to authorities
- **Features**:
  - Case escalation workflow
  - Authority notifications
  - Status tracking

#### **EnforcementPanel.jsx**
- **Purpose**: Account freeze/enforcement
- **Features**:
  - Wallet freeze requests
  - Unfreeze management
  - Enforcement logs

---

### 📈 **Analytics & Reporting**

#### **AdminDownloadTable.jsx**
- **Purpose**: Download reports and data
- **Features**:
  - CSV export
  - PDF reports
  - Filtered downloads
- **Dependencies**: react-csv, file-saver

#### **ReportGenerator.jsx**
- **Purpose**: Generate case reports
- **Features**:
  - Custom report templates
  - Evidence inclusion
  - PDF generation

#### **AlertLog.js**
- **Purpose**: System alerts and notifications
- **Features**:
  - Real-time alerts
  - Alert history
  - Severity levels

---

### 🎨 **UI Components**

#### **SidebarNavigation.jsx**
- **Purpose**: Main navigation sidebar
- **Features**:
  - Role-based menu items
  - Active route highlighting
  - Collapsible sections

#### **DarkModeToggle.jsx**
- **Purpose**: Light/dark theme toggle
- **Features**: Theme persistence

#### **RiskBadge.js**
- **Purpose**: Display risk levels
- **Variants**: low, medium, high, critical

#### **RiskDial.jsx**
- **Purpose**: Visual risk meter
- **Features**: Animated dial (0-100)

---

### 🔐 **Authentication**

#### **ProtectedRoute.jsx**
- **Purpose**: Route access control
- **Usage**:
  ```jsx
  <ProtectedRoute>
    <AdminPage />
  </ProtectedRoute>
  ```

---

### 🔄 **Real-time Features**

#### **EventDashboard.js**
- **Purpose**: Real-time event monitoring
- **Features**:
  - WebSocket connection
  - Event stream
  - Live updates

#### **useEventPolling** (Hook)
- **Purpose**: Poll backend for events
- **Usage**:
  ```javascript
  const { events, isPolling } = useEventPolling(interval);
  ```

---

## 📄 Pages Guide

### HomePage (App.jsx)
- **Route**: `/`
- **Purpose**: Main landing page with authentication
- **Features**:
  - Login/Register
  - Fraud report submission
  - ML analysis
  - Evidence upload
  - Incident history

### AdminPage.jsx
- **Route**: `/admin`
- **Access**: Admin only
- **Features**:
  - System overview
  - User management
  - Case management
  - Evidence library
  - System logs
  - RL Dashboard
  - Enforcement tools

### InvestigatorPage.jsx
- **Route**: `/investigator`
- **Access**: Investigator+
- **Features**:
  - Assigned cases
  - Evidence management
  - Investigation tools
  - Report generation

### PublicPage.jsx
- **Route**: `/public`
- **Access**: Public
- **Features**:
  - Submit fraud reports
  - Check report status
  - View public statistics

---

## 🔄 State Management

### Local State (useState)
Most components use React's `useState` for local state:

```javascript
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
const [reports, setReports] = useState([]);
```

### Global State (Context - if needed)
For shared state across components, use React Context:

```javascript
// Create context
const AuthContext = createContext();

// Provider
<AuthContext.Provider value={{ user, setUser }}>
  {children}
</AuthContext.Provider>

// Consumer
const { user } = useContext(AuthContext);
```

### State Management Best Practices

1. **Keep state close to where it's used**
2. **Lift state up** only when shared
3. **Use callbacks** for child-to-parent communication
4. **Avoid prop drilling** - use Context for deeply nested components

---

## 🌐 API Integration

### API Client Setup

Located in `src/api/apiClient.js`:

```javascript
import axios from 'axios';
import { config } from '../utils/config';

const apiClient = axios.create({
  baseURL: config.backendUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### API Modules

#### **fraudApi.js** - Fraud Detection
```javascript
import apiClient from './apiClient';

export const submitFraudReport = async (data) => {
  const response = await apiClient.post('/api/evidence/upload', data);
  return response.data;
};

export const analyzeFraud = async (walletAddress) => {
  const response = await apiClient.post('/api/rl/predict', { wallet: walletAddress });
  return response.data;
};
```

#### **contractApi.js** - Blockchain Integration
```javascript
export const flagWallet = async (wallet, reason) => {
  // Blockchain contract interaction
};

export const verifyEvidence = async (evidenceId) => {
  const response = await apiClient.get(`/api/evidence/${evidenceId}/blockchain-verify`);
  return response.data;
};
```

#### **eventApi.js** - Event Handling
```javascript
export const getEvents = async () => {
  const response = await apiClient.get('/api/queue/stats');
  return response.data;
};
```

### Making API Calls

**Example: Fetching Reports**
```javascript
const fetchReports = async () => {
  try {
    setLoading(true);
    const response = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}/api/evidence/case/all`
    );
    setReports(response.data);
  } catch (error) {
    console.error('Error fetching reports:', error);
    toast.error('Failed to load reports');
  } finally {
    setLoading(false);
  }
};
```

### Error Handling

```javascript
try {
  const response = await apiClient.post('/api/endpoint', data);
  toast.success('Success!');
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with error
    toast.error(error.response.data.message);
  } else if (error.request) {
    // Network error
    toast.error('Network error. Please check your connection.');
  } else {
    // Other error
    toast.error('An error occurred');
  }
}
```

---

## 🔐 Authentication

### Supabase Authentication

Configuration in `src/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Authentication Flow

#### **Login**
```javascript
const signIn = async () => {
  try {
    // Try backend authentication first
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      
      // Redirect based on role
      if (data.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    toast.error("Login failed");
  }
};
```

#### **Register**
```javascript
const signUp = async () => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    toast.error(error.message);
  } else {
    toast.success("Registration successful!");
  }
};
```

#### **Logout**
```javascript
const signOut = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("authToken");
  localStorage.removeItem("userInfo");
  setUser(null);
  window.location.href = '/';
};
```

### Auth Helper Functions

Located in `src/utils/authHelper.js`:

```javascript
export const authHelper = {
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    return token && token !== 'null';
  },
  
  getToken: () => localStorage.getItem('authToken'),
  
  setToken: (token) => localStorage.setItem('authToken', token),
  
  clearAuth: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
  },
  
  login: async (email, password) => {
    const response = await fetch('http://localhost:5050/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      authHelper.setToken(data.token);
      return { success: true, token: data.token };
    }
    return { success: false };
  }
};
```

---

## 🎨 Styling Guide

### Tailwind CSS

The project uses Tailwind CSS for styling. Configuration in `tailwind.config.js`.

**Common Patterns:**

```jsx
// Button styles
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click Me
</button>

// Card layout
<div className="bg-white rounded-lg shadow-lg p-6">
  <h2 className="text-2xl font-bold mb-4">Title</h2>
  <p className="text-gray-600">Content</p>
</div>

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>
```

### Custom Styles

Global styles in `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

Component-specific styles in `src/styles/Button.css`:
```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}
```

### Responsive Design

```jsx
// Mobile-first responsive design
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Responsive content */}
</div>

// Hide/show based on screen size
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

---

## 🔧 Common Tasks

### 1. Adding a New Component

```bash
# Create component file
touch src/components/MyNewComponent.jsx
```

```jsx
// src/components/MyNewComponent.jsx
import React, { useState } from 'react';

const MyNewComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState('');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{prop1}</h2>
      <p>{prop2}</p>
    </div>
  );
};

export default MyNewComponent;
```

### 2. Adding a New Page/Route

**Step 1:** Create page component
```jsx
// src/Pages/MyNewPage.jsx
import React from 'react';

const MyNewPage = () => {
  return (
    <div className="container mx-auto p-4">
      <h1>My New Page</h1>
    </div>
  );
};

export default MyNewPage;
```

**Step 2:** Add route in `src/index.js`
```javascript
import MyNewPage from "./Pages/MyNewPage";

<Routes>
  <Route path="/mynewpage" element={<MyNewPage />} />
</Routes>
```

### 3. Adding API Integration

**Step 1:** Create API function
```javascript
// src/api/myApi.js
import apiClient from './apiClient';

export const fetchData = async (id) => {
  const response = await apiClient.get(`/api/myendpoint/${id}`);
  return response.data;
};
```

**Step 2:** Use in component
```jsx
import { fetchData } from '../api/myApi';

const MyComponent = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchData(123);
      setData(result);
    };
    loadData();
  }, []);

  return <div>{data && <p>{data.name}</p>}</div>;
};
```

### 4. Adding Toast Notifications

```javascript
import { toast } from 'react-toastify';

// Success
toast.success('Operation successful!');

// Error
toast.error('Something went wrong');

// Warning
toast.warn('Please review this');

// Info
toast.info('FYI: Something happened');

// Custom
toast('Custom message', {
  position: 'top-right',
  autoClose: 3000,
});
```

### 5. Form Handling

```jsx
const MyForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/submit', formData);
      toast.success('Submitted!');
    } catch (error) {
      toast.error('Submission failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        className="border p-2"
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

---

## ✅ Best Practices

### 1. **Component Structure**
```jsx
// Imports
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../api/apiClient';

// Component
const MyComponent = ({ prop1, prop2 }) => {
  // State
  const [state, setState] = useState(null);
  
  // Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleClick = () => {
    // Handle event
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default MyComponent;
```

### 2. **Error Handling**
- Always use try-catch for API calls
- Show user-friendly error messages
- Log errors for debugging
- Handle loading and error states

### 3. **Performance**
- Use `React.memo()` for expensive components
- Implement pagination for large lists
- Lazy load images and components
- Debounce search inputs

### 4. **Security**
- Sanitize user inputs
- Use HTTPS in production
- Never expose sensitive data in frontend
- Validate on both frontend and backend

### 5. **Code Quality**
- Use meaningful variable names
- Comment complex logic
- Keep components small and focused
- Follow DRY principle

---

## 🐛 Debugging

### React DevTools
- Install React DevTools browser extension
- Inspect component props and state
- Profile performance

### Console Logging
```javascript
console.log('Debug:', variable);
console.error('Error:', error);
console.table(arrayOfObjects);
```

### Network Tab
- Monitor API calls
- Check request/response data
- Verify authentication headers

---

## 📦 Building for Production

### 1. Optimize Build
```bash
npm run build
```

### 2. Environment Variables
Update `.env` for production:
```bash
REACT_APP_BACKEND_URL=https://api.yoursite.com
NODE_ENV=production
```

### 3. Deploy
- **Vercel**: `vercel deploy`
- **Netlify**: Connect GitHub repo
- **AWS S3**: Upload build folder

---

## 📞 Support

For questions or issues:
1. Check this guide first
2. Review component source code
3. Check Backend API documentation
4. Create an issue on GitHub

---

**Happy Coding!** 🚀

*Last Updated: October 14, 2025*

