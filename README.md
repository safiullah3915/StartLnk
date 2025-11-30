# Startup Sales & Purchase Platform - Final Year Project

A comprehensive full-stack web application for managing startup job postings and employee recommendations using advanced machine learning algorithms. This project integrates a Django REST API backend with a React frontend and a Flask-based recommendation service powered by multiple ML models.

## 🎯 Project Overview

This platform provides:
- **Job Posting Management**: Create, update, and search startup job postings
- **User Authentication**: Secure JWT-based authentication with role-based access
- **Recommendation System**: AI-powered job recommendations using ensemble models (ALS, Two-Tower Networks, Ranker models)
- **Real-time Notifications**: WebSocket support for user notifications
- **Responsive UI**: Modern React interface with Tailwind CSS styling
- **Docker Support**: Containerized deployment for all services

## 📋 Tech Stack

### Backend
- **Framework**: Django + Django REST Framework
- **Database**: SQLite (development), PostgreSQL (production-ready)
- **Authentication**: JWT (PyJWT)
- **ORM**: Django ORM
- **Task Scheduling**: APScheduler

### Recommendation Service
- **Framework**: Flask
- **ML Models**: 
  - Alternating Least Squares (ALS)
  - Two-Tower Neural Networks
  - Ranker Models
- **Libraries**: scikit-learn, sentence-transformers, pandas, numpy

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Routing**: React Router v7

### DevOps
- **Containerization**: Docker & Docker Compose
- **Network**: Docker bridge network

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+ and npm
- Docker & Docker Compose (for containerized deployment)

### Option 1: Local Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd FYP-Development
```

#### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv env
.\env\Scripts\activate  # Windows
# or
source env/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create and apply database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

Backend will run on: `http://localhost:8000`

#### 3. Recommendation Service Setup
```bash
# Navigate to recommendation service directory
cd recommendation_service

# Create and activate virtual environment
python -m venv env
.\env\Scripts\activate  # Windows
# or
source env/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start Flask service
python app.py
```

Recommendation service will run on: `http://localhost:5000`

#### 4. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:5173`

### Option 2: Docker Deployment

#### 1. Build and Start All Services
```bash
# From project root directory
docker-compose up --build
```

This will start:
- **Backend** on `http://localhost:8000`
- **Recommendation Service** on `http://localhost:5000`
- **Frontend** on configured port (check docker-compose.yml)

#### 2. View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f recommendation-service
```

#### 3. Stop Services
```bash
docker-compose down
```

## 🏗️ Project Structure

```
.
├── backend/                          # Django REST API
│   ├── startup_platform/             # Main Django app
│   │   ├── settings.py              # Django configuration
│   │   ├── urls.py                  # URL routing
│   │   └── wsgi.py                  # WSGI entry point
│   ├── api/                         # REST API endpoints
│   │   ├── models.py                # Database models
│   │   ├── serializers.py           # DRF serializers
│   │   ├── views.py                 # API views
│   │   └── urls.py                  # API routes
│   ├── requirements.txt              # Python dependencies
│   ├── manage.py                     # Django CLI
│   └── Dockerfile
│
├── recommendation_service/           # Flask ML Service
│   ├── app.py                       # Flask application
│   ├── config.py                    # Configuration
│   ├── engines/                     # ML model implementations
│   │   ├── als_engine.py           # ALS model
│   │   ├── two_tower_engine.py     # Two-Tower model
│   │   └── ranker_engine.py        # Ranker model
│   ├── models/                      # Trained model files
│   ├── services/                    # Business logic
│   ├── requirements.txt              # Python dependencies
│   └── Dockerfile
│
├── frontend/                        # React Application
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API services
│   │   ├── App.jsx                  # Root component
│   │   └── main.jsx                 # Entry point
│   ├── public/                      # Static assets
│   ├── package.json                 # NPM dependencies
│   ├── vite.config.js               # Vite configuration
│   └── index.html
│
├── docker-compose.yml               # Multi-container orchestration
└── README.md                        # This file
```

## 🔑 Key Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (User roles, Admin)
- Secure password hashing with bcrypt
- Token refresh mechanism

### Recommendation Engine
- **Multi-Model Ensemble**: Combines ALS, Two-Tower, and Ranker models
- **Real-time Predictions**: Generates recommendations based on user interactions
- **Model Training**: Automated model training pipelines
- **Performance Metrics**: Tracks recommendation accuracy

### Job Management
- Create, read, update, and delete job postings
- Filter and search job listings
- Apply to jobs with tracking
- Bookmark favorite jobs

### User Management
- User registration and profile management
- Email verification
- Password reset functionality
- Profile picture uploads

## 📝 API Documentation

### Base URL
- Local: `http://localhost:8000/api/`
- Production: `<your-domain>/api/`

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh JWT token

#### Jobs
- `GET /jobs/` - List all jobs
- `POST /jobs/` - Create new job
- `GET /jobs/<id>/` - Get job details
- `PUT /jobs/<id>/` - Update job
- `DELETE /jobs/<id>/` - Delete job

#### Recommendations
- `GET /recommendations/` - Get personalized recommendations
- `POST /interactions/` - Log user interaction
- `GET /recommendations/history/` - Get recommendation history

#### Recommendations Service (Flask)
- `GET /health` - Health check
- `POST /predict` - Get recommendations
- `GET /models/status` - Check model status

See API documentation in backend README for detailed endpoints.

## 🤖 Machine Learning Models

### Alternating Least Squares (ALS)
- Collaborative filtering approach
- Factorizes user-item interaction matrix
- Efficient for sparse data

### Two-Tower Networks
- Deep learning approach
- Separate embedding towers for users and items
- Captures complex user preferences

### Ranker Models
- Learning-to-rank approach
- Refines top recommendations
- Improves recommendation diversity

## 🔧 Configuration

### Backend Configuration
Create `.env` file in `backend/` directory:
```
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
FLASK_RECOMMENDATION_SERVICE_URL=http://localhost:5000
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Recommendation Service Configuration
Create `.env` file in `recommendation_service/` directory:
```
FLASK_HOST=localhost
FLASK_PORT=5000
FLASK_DEBUG=True
DATABASE_PATH=db.sqlite3
MODEL_PATH=models/
```

### Frontend Configuration
Environment variables in `frontend/` (if needed):
```
VITE_API_URL=http://localhost:8000/api/
```

## 📊 Database Schema

The project uses Django ORM with models for:
- **User**: User accounts and profiles
- **Job**: Job postings
- **Application**: Job applications
- **Interaction**: User-job interactions for ML training
- **Recommendation**: Stored recommendations
- **Notification**: User notifications

See `DATABASE_SCHEMA.md` for detailed schema documentation.

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Test complete recommendation flow
python test_complete_recommendation_flow.py

# Test Django integration
python test_django_integration.sh
```

## 🚢 Deployment

### Docker Deployment
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment
Refer to individual service READMEs for deployment instructions.

## 📚 Documentation

Additional documentation available:
- `backend/README.md` - Backend API documentation
- `frontend/README.md` - Frontend setup and development
- `recommendation_service/README.md` - ML service documentation
- `DATABASE_SCHEMA.md` - Database schema details
- `TESTING_GUIDE.md` - Testing procedures

## 🐛 Troubleshooting

### CORS Issues
- Check `CORS_ALLOWED_ORIGINS` in backend `.env`
- Ensure frontend URL is in allowed origins

### Recommendation Service Not Connecting
- Verify Flask service is running on port 5000
- Check `FLASK_RECOMMENDATION_SERVICE_URL` in backend `.env`
- Review recommendation service logs

### Database Issues
- Run migrations: `python manage.py migrate`
- Clear cache: `python manage.py clear_cache`
- Check migrations status: `python manage.py showmigrations`

### Port Already in Use
- Change port in configuration
- Or kill existing process using the port

## 📄 License

This project is created as a Final Year Project. All rights reserved.

## 👥 Contributors

- **Project Lead**: [Your Name]
- **Backend**: [Names]
- **Frontend**: [Names]
- **ML/Recommendation**: [Names]

## 📞 Support

For issues or questions:
1. Check existing documentation
2. Review error logs
3. Create an issue on GitHub repository

## 🎓 Academic Reference

This project implements modern machine learning techniques for recommendation systems combined with a full-stack web application. It demonstrates proficiency in:
- Full-stack web development (Django, React)
- Machine learning (Collaborative filtering, Neural networks)
- DevOps (Docker, containerization)
- Database design and optimization
- API design and documentation
- Software architecture and design patterns

---

**Happy coding! 🚀**
