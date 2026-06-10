<p align="center">
  <h1 align="center">🚀 StartLnk</h1>
  <p align="center">
    <strong>Where Startups Meet Talent & Investment</strong>
  </p>
  <p align="center">
    A full-stack startup networking platform connecting entrepreneurs, developers, and investors — from idea validation to team building and beyond.
  </p>
  <p align="center">
    <a href="https://startlnk.xyz">Live Demo</a> ·
    <a href="#-getting-started">Getting Started</a> ·
    <a href="#-api-reference">API Reference</a> ·
    <a href="#-deployment">Deployment</a>
  </p>
</p>

<br/>

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

<br/>

## 🎯 About the Project

**StartLnk** is a comprehensive startup ecosystem platform developed as a Final Year Project (FYP). It bridges the gap between startup founders looking for co-founders/talent and professionals seeking meaningful startup opportunities. The platform also serves investors interested in discovering and engaging with early-stage startups.

The platform supports **three distinct user roles**, each with tailored dashboards, features, and workflows:

| Role | Description |
|------|-------------|
| **Entrepreneur** | Create startup listings, manage positions, review applications, pitch ideas to investors, and build teams |
| **Student / Professional** | Discover collaboration opportunities, apply for positions, build a public profile, and connect with founders |
| **Investor** | Browse the marketplace, save/favorite startups, express interest, and track portfolio engagement |

<br/>

## ✨ Key Features

### 🏢 Startup Management
- Create and manage both **Marketplace** (buy/sell) and **Collaboration** (team-building) startup listings
- Tag-based categorization across SaaS, E-commerce, Social Platform, Agency, and more
- Startup verification workflow with admin approval pipeline
- Rich detail pages with financial metrics, team size, phase, and revenue data

### 👥 Team Building & Collaboration
- **Position Management** — Create, open, and close roles within startups
- **Application System** — Full apply → review → approve/decline lifecycle with notifications
- **Team Builder Modal** — Select team members and assign roles directly from the messaging interface
- Role-based access control ensuring entrepreneurs manage listings while students apply

### 💬 Real-Time Messaging
- Direct messaging between platform users
- Group conversations for startup teams
- System messages for team formation events
- Online presence indicators with heartbeat-based tracking
- Message read receipts and real-time polling

### 🔍 Search & Discovery
- Full-text search across startups and collaboration opportunities
- Chip-style filter UI for category, phase, team size, and field
- Hero-style search headers with dynamic result counts
- **People Directory** — Browse and discover public user profiles

### 📊 Recommendation System
- **Two-Tower Neural Network** architecture for personalized startup recommendations
- User interaction tracking (views, clicks, likes, dislikes, favorites, applications, interests)
- Weighted interaction scoring for training data generation
- Cold-start handling via onboarding preference collection
- Profile and startup embedding vectors (all-MiniLM-L6-v2)

### 🔐 Authentication & Security
- Custom **JWT authentication** with access/refresh token rotation
- **Google OAuth 2.0** integration for social sign-in
- Session-based auth with secure HTTP-only cookies
- Email verification with 6-digit OTP codes
- Bcrypt password hashing with custom Django auth backend
- Rate limiting on sensitive endpoints

### 📈 Admin Portal
- Custom-built admin dashboard (separate from Django admin)
- Startup verification and moderation tools
- User management with role-based filtering
- Platform statistics and analytics overview

### 🌐 SEO & Performance
- Programmatic SEO pages for job/internship/collaboration discovery
- Dynamic sitemap generation (static, startups, collaborations, marketplace, programmatic)
- Structured data (JSON-LD) for Organization, Website, FAQ, and Startup schemas
- React Helmet for per-page meta tags
- Lazy-loaded routes with code splitting — initial JS reduced from ~2 MB to ~300 KB
- Vite build optimization with manual vendor chunk splitting
- Nginx gzip compression and immutable asset caching

### 🔔 Notifications
- In-app notification system for application status changes, new applications, and business pitches
- Mark as read / mark all as read functionality
- Notification badges in the navigation bar

### ❤️ Investor Engagement
- Favorite/save startups for later review
- Express interest with personalized messages
- Dedicated Investor Dashboard
- Startup-to-marketplace conversion for entrepreneurs seeking buyers

<br/>

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                       │
│                   React 19 + Vite 7 SPA                     │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY                     │
│  • SSL termination (Let's Encrypt)                          │
│  • Static file serving (/assets/, /media/, /static/)        │
│  • SPA catch-all → index.html                               │
│  • Gzip compression                                         │
│  • Security headers                                         │
└────────┬──────────────────────────────────┬─────────────────┘
         │ /api/*, /auth/*                  │ /*
         ▼                                  ▼
┌────────────────────┐           ┌────────────────────┐
│   GUNICORN WSGI    │           │  React SPA (dist)  │
│   (Unix Socket)    │           │   Pre-built static │
└────────┬───────────┘           └────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              DJANGO REST FRAMEWORK (Backend)                │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   Auth   │  │  API Views   │  │   SEO Module       │    │
│  │  (JWT)   │  │  (ViewSets)  │  │ (Sitemaps/Schema)  │    │
│  └──────────┘  └──────────────┘  └────────────────────┘    │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │  Services Layer  │  │    Recommendation Engine     │    │
│  │  (Cache, ETL,    │  │  (Interaction Tracking,      │    │
│  │   Presence)      │  │   Embeddings, Two-Tower NN)  │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
    ┌──────────────┐     ┌──────────────┐
    │  PostgreSQL   │     │    Redis     │
    │  (Production) │     │   (Cache)    │
    │  SQLite (Dev) │     │              │
    └──────────────┘     └──────────────┘
```

<br/>

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI component library |
| **Vite 7** | Build tool and dev server |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client with interceptors |
| **React Toastify** | Toast notifications |
| **Recharts** | Data visualization and charts |
| **React Select** | Enhanced select inputs |
| **React Spring** | Physics-based animations |
| **React Easy Crop** | Profile picture cropping |
| **React Helmet Async** | Dynamic SEO meta tags |
| **Google OAuth (react-oauth)** | Social authentication |
| **CSS Modules** | Scoped component styling |

### Backend
| Technology | Purpose |
|------------|---------|
| **Django 5** | Web framework |
| **Django REST Framework** | RESTful API layer |
| **PostgreSQL** | Production database |
| **SQLite** | Development database |
| **Redis + django-redis** | Caching layer (presence, rate limiting) |
| **PyJWT** | JSON Web Token authentication |
| **bcrypt** | Password hashing |
| **Pillow** | Image processing |
| **APScheduler** | Background task scheduling |
| **Faker** | Test data generation |
| **Jazzmin** | Django admin UI theme |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Nginx** | Reverse proxy, SSL, static serving |
| **Gunicorn** | WSGI HTTP server |
| **Docker & Docker Compose** | Containerization |
| **Let's Encrypt / Certbot** | SSL certificates |
| **DigitalOcean VPS** | Production hosting |

<br/>

## 📁 Project Structure

```
StartLnk/
├── backend/                        # Django REST Framework backend
│   ├── api/                        # Main API application
│   │   ├── models.py               # User, Startup, Position, Application, etc.
│   │   ├── messaging_models.py     # Conversation, Message, UserProfile, FileUpload
│   │   ├── recommendation_models.py# UserInteraction, StartupInteraction, Onboarding
│   │   ├── additional_models.py    # Legacy model definitions
│   │   ├── views.py                # API views and endpoints (~120KB)
│   │   ├── serializers.py          # DRF serializers (~47KB)
│   │   ├── urls.py                 # URL routing (150+ endpoints)
│   │   ├── authentication.py       # JWT auth, email verification, token management
│   │   ├── backends.py             # Custom bcrypt auth backend
│   │   ├── middleware.py           # Custom middleware
│   │   ├── signals.py             # Django signals
│   │   ├── admin.py               # Admin panel configuration
│   │   ├── services/              # Business logic layer
│   │   │   ├── cache_service.py   # Redis/LocMem caching
│   │   │   ├── presence_service.py# Online status tracking
│   │   │   ├── interaction_service.py # User interaction recording
│   │   │   ├── startup_interaction_service.py
│   │   │   ├── session_service.py # Session management
│   │   │   └── etl_helpers.py     # Data pipeline utilities
│   │   └── seo/                   # SEO module (isolated)
│   │       ├── metadata.py        # Page metadata & structured data
│   │       ├── sitemap.py         # Dynamic sitemap generation
│   │       └── views.py          # SEO endpoint views
│   ├── startup_platform/          # Django project settings
│   │   ├── settings.py            # Configuration (CORS, JWT, Cache, etc.)
│   │   └── urls.py               # Root URL configuration
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Python dependencies
│   └── .env.example              # Environment variable template
│
├── frontend/                      # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx               # Root component with lazy-loaded routing
│   │   ├── main.jsx              # Application entry point
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # Authentication state management
│   │   ├── components/           # Reusable UI components (20+)
│   │   │   ├── Navbar/           # Navigation bar
│   │   │   ├── Hero/             # Landing page hero section
│   │   │   ├── Footer/           # Site footer
│   │   │   ├── ProtectedRoute/   # Auth guard
│   │   │   ├── RoleBasedRoute/   # Role-based access guard
│   │   │   ├── SEOHead/          # SEO component
│   │   │   ├── login/            # Login form
│   │   │   ├── Signup/           # Registration form
│   │   │   └── ...
│   │   ├── pages/                # Page-level components (27 pages)
│   │   │   ├── LandingPage/      # Public marketing page
│   │   │   ├── Dashboard/        # Entrepreneur dashboard
│   │   │   ├── InvestorDashboard/# Investor dashboard
│   │   │   ├── Search/           # Startup search & discovery
│   │   │   ├── Collaboration/    # Job/collaboration search
│   │   │   ├── message/          # Messaging & team builder
│   │   │   ├── Portal/           # Admin portal (4 pages)
│   │   │   ├── ProgrammaticSEO/  # Auto-generated SEO pages
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── MessageService.js # Messaging API service
│   │   ├── hooks/
│   │   │   └── useSEO.js        # SEO custom hook
│   │   └── utils/
│   │       ├── axiosConfig.js    # Axios instance with auth interceptors
│   │       ├── apiServices.js    # API endpoint wrappers
│   │       ├── portalAPI.js      # Admin API client
│   │       └── cropImage.js      # Image crop utility
│   ├── vite.config.js            # Vite configuration with optimizations
│   ├── package.json              # Node.js dependencies
│   └── .env.development          # Development environment variables
│
├── nginx/
│   └── startlnk.conf            # Production Nginx configuration
│
├── docker-compose.yml            # Multi-service Docker orchestration
├── .gitignore                    # Git ignore rules
└── README.md                     # This file
```

<br/>

## 🚀 Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+ and npm
- **Git**
- **PostgreSQL** 14+ (production) or SQLite (development)
- **Redis** (optional, for caching in production)

### 1. Clone the Repository

```bash
git clone https://github.com/safiullah3915/StartLnk.git
cd StartLnk
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Run database migrations
python manage.py migrate

# Create a superuser (for admin access)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

The backend API will be available at `http://127.0.0.1:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

> **Note:** The Vite dev server automatically proxies `/api/` and `/auth/` requests to the Django backend at `http://127.0.0.1:8000`.

<br/>

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `django-insecure-change-this` |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DB_ENGINE` | Database engine | `django.db.backends.sqlite3` |
| `DB_NAME` | Database name | `db.sqlite3` |
| `DB_USER` | Database user | — |
| `DB_PASSWORD` | Database password | — |
| `DB_HOST` | Database host | — |
| `DB_PORT` | Database port | — |
| `JWT_SECRET_KEY` | Secret key for JWT signing | — |
| `JWT_COOKIE_SECURE` | Secure flag for JWT cookies | `False` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `EMAIL_HOST_USER` | SMTP email address | — |
| `EMAIL_HOST_PASSWORD` | SMTP app password | — |
| `REDIS_URL` | Redis connection URL (optional) | — |

### Frontend (`frontend/.env.development`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://127.0.0.1:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `VITE_APP_URL` | Application base URL | `http://localhost:5173` |
| `VITE_ENV` | Environment label | `development` |

<br/>

## 📡 API Reference

The backend exposes **150+ RESTful endpoints** organized by domain:

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | User registration |
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/logout` | Logout and invalidate tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/google-verify` | Google OAuth verification |
| `POST` | `/auth/send-verification-code` | Send email OTP |
| `POST` | `/auth/verify` | Verify email with OTP |
| `GET` | `/check-email` | Check email availability |
| `GET` | `/check-username` | Check username availability |

### Startups
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/startups` | Create a startup listing |
| `GET/PUT/DELETE` | `/api/startups/<id>` | Startup CRUD operations |
| `GET` | `/api/marketplace` | List marketplace startups |
| `GET` | `/api/collaborations` | List collaboration startups |
| `GET` | `/api/search` | Search across startups |
| `POST` | `/api/startups/<id>/convert-to-marketplace` | Convert to marketplace |

### Positions & Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/startups/<id>/positions` | Manage positions |
| `GET/PUT/DELETE` | `/api/positions/<id>` | Position CRUD |
| `POST` | `/api/positions/<id>/close` | Close a position |
| `POST` | `/api/positions/<id>/open` | Reopen a position |
| `POST` | `/api/collaborations/<id>/apply` | Apply for a position |
| `GET` | `/api/positions/<id>/applications` | View position applications |
| `POST` | `/api/applications/<id>/approve` | Approve an application |
| `POST` | `/api/applications/<id>/decline` | Decline an application |

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/messages` | List/create conversations |
| `GET` | `/api/messages/<id>` | Get conversation details |
| `GET/POST` | `/api/messages/<id>/messages` | List/send messages |

### User Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/PUT` | `/api/users/profile` | Manage user profile |
| `GET` | `/api/users/profile-data` | Get profile with onboarding status |
| `GET` | `/api/people` | Public people directory |
| `POST` | `/api/upload/profile-picture` | Upload profile picture |
| `POST` | `/api/upload/resume` | Upload resume/CV |

### Investor Engagement
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/startups/<id>/favorite` | Toggle favorite |
| `GET` | `/api/users/favorites` | List user favorites |
| `POST` | `/api/startups/<id>/interest` | Express interest |
| `GET` | `/api/users/interests` | List user interests |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List user notifications |
| `POST` | `/api/notifications/<id>/read` | Mark as read |
| `POST` | `/api/notifications/read-all` | Mark all as read |

### Interactions & Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/startups/<id>/like` | Like a startup |
| `POST` | `/api/startups/<id>/dislike` | Dislike a startup |
| `POST` | `/api/onboarding/preferences` | Submit onboarding preferences |

### Admin Portal
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/portal/stats` | Platform statistics |
| `GET` | `/api/portal/startups` | List all startups (admin) |
| `POST` | `/api/portal/startups/<id>/verify` | Verify/reject startup |
| `DELETE` | `/api/portal/startups/<id>/delete` | Delete startup |
| `GET` | `/api/portal/users` | List all users (admin) |

### SEO
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/robots.txt` | Robots file |
| `GET` | `/sitemap.xml` | Sitemap index |
| `GET` | `/api/seo/metadata` | Page metadata |
| `GET` | `/api/seo/schema/organization` | Organization schema |
| `GET` | `/api/seo/schema/startup/<id>` | Startup structured data |

<br/>

## 🌍 Deployment

### Production Stack

```
React + Vite  →  Nginx  →  Gunicorn (Unix Socket)  →  Django  →  PostgreSQL
                                                                    Redis
```

### Deployment Steps

#### Backend

```bash
cd backend
source venv/bin/activate
git pull origin main
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn
sudo systemctl reload nginx
```

#### Frontend

```bash
cd frontend
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/startlnk/
sudo systemctl reload nginx
```

### Docker (Development)

```bash
docker-compose up --build
```

This starts the Django backend on port `8000` and the recommendation service on port `5000`.

### SSL Configuration

SSL certificates are managed by **Certbot** (Let's Encrypt):

```bash
# Check certificates
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

<br/>

## 🧪 Testing

The project includes test suites for critical functionality:

```bash
# Run backend tests
cd backend
python -m pytest test_auth_endpoints.py
python -m pytest test_complete_auth_flow.py
python -m pytest test_pitch_endpoints.py
python -m pytest test_notification_api.py
python -m pytest test_interaction_count.py
python -m pytest test_logout.py
```

<br/>

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

<br/>

## 📄 License

This project was developed as a **Final Year Project (FYP)**. All rights reserved.

<br/>

## 👨‍💻 Author

**Safiullah** — [GitHub](https://github.com/safiullah3915)

<br/>

---

<p align="center">
  Built with ❤️ using React, Django & a lot of ☕
</p>
