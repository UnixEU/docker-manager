# Quick Start Guide

## What Has Been Created

A complete Docker management application with:

✅ **Backend (Python/FastAPI)**
- Full Docker API integration
- JWT authentication with bcrypt password hashing
- PostgreSQL + Redis for data and caching
- Complete REST API for all Docker operations

✅ **Frontend (React/TypeScript/Vite)**
- Modern UI with Tailwind CSS
- Dark/Light mode support
- Responsive design for all devices
- Login/Registration pages
- Dashboard and management pages

✅ **Infrastructure**
- Docker Compose configuration
- Dockerfiles for both services
- Nginx configuration for frontend
- Health checks and proper dependencies

## Getting Started

### Step 1: Navigate to Project Directory

```bash
cd docker-manager
```

### Step 2: Start the Application

```bash
docker-compose up -d --build
```

This will:
- Build and start PostgreSQL database
- Build and start Redis cache
- Build and start FastAPI backend on port 8000
- Build and start React frontend on port 80

### Step 3: Access the Application

Open your browser and go to:
```
http://localhost
```

### Step 4: Create Your First User

1. Click "Need an account? Register"
2. Fill in the registration form
3. After successful registration, login

## Project Structure

```
docker-manager/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration & security
│   │   ├── db/           # Database & Redis
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Docker service logic
│   │   └── main.py       # FastAPI application
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities
│   │   ├── pages/        # Page components
│   │   ├── stores/       # State management
│   │   ├── App.tsx       # Main app
│   │   └── main.tsx      # Entry point
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

## Available Features

### Dashboard
- View Docker system statistics
- Monitor running/stopped containers
- Quick overview of images, volumes, networks

### Containers
- List all containers with status
- Start/Stop/Restart containers
- View detailed configuration
- Edit container settings
- Detect docker-compose vs docker run

### Images
- List all Docker images
- View image details (size, tags, creation date)
- Export images for backup
- Import images for restore

### Networks
- List all Docker networks
- Create new networks
- Connect/disconnect containers

### Volumes
- List all Docker volumes
- Create new volumes
- View volume details

## API Documentation

Once the backend is running, access interactive API docs:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server will run on http://localhost:3000

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
SECRET_KEY=your-super-secret-key-here
POSTGRES_PASSWORD=secure-password
```

### Change Default Port

Edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "8080:80"  # Change 8080 to your desired port
```

## Troubleshooting

### Issue: Cannot connect to Docker socket

**Solution**: Ensure Docker is running and the socket is accessible:
```bash
ls -la /var/run/docker.sock
```

### Issue: Port 80 is already in use

**Solution**: Change the port in docker-compose.yml or stop the service using port 80:
```bash
sudo lsof -i :80
```

### Issue: Backend cannot connect to PostgreSQL

**Solution**: Wait for PostgreSQL to fully start (health check):
```bash
docker-compose logs postgres
docker-compose restart backend
```

### Issue: Frontend shows "Network Error"

**Solution**: Check if backend is running:
```bash
docker-compose logs backend
curl http://localhost:8000/health
```

## Viewing Logs

### All services
```bash
docker-compose logs -f
```

### Specific service
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Stopping the Application

```bash
docker-compose down
```

To also remove volumes:
```bash
docker-compose down -v
```

## Next Steps

1. **Enhance the Frontend**: Add more detailed modals, forms, and visualizations
2. **Add More Features**: Container logs, exec commands, compose file editor
3. **Improve Security**: Add role-based access control, audit logs
4. **Add Monitoring**: Integrate Prometheus/Grafana for metrics
5. **Add Notifications**: Email/Slack notifications for events

## Technology Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Docker SDK
- **Database**: PostgreSQL 16, Redis 7
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Deployment**: Docker, Docker Compose, Nginx

## Support

For issues or questions:
1. Check the main README.md
2. Review API documentation at /docs
3. Check Docker logs
4. Review the troubleshooting section

---

**Happy Docker Managing! 🐳**
