# Docker Manager

A modern, full-featured Docker management application with a beautiful GUI for DevOps Infrastructure Specialists. Manage your Docker containers, images, networks, and volumes through an intuitive web interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)

## 🚀 Features

### Core Functionality
- **Complete Docker Engine Access** - Full access to Docker Engine services on the host
- **Container Management**
  - View all containers with real-time status (running, exited, etc.)
  - Detailed configuration view (environment variables, ports, volumes, images, networks)
  - Start, stop, restart containers
  - Edit container configuration and redeploy
  - Add/remove volumes to containers
  - Connect/disconnect containers to networks
  - Change Docker images (upgrade/downgrade with config preservation)
  
- **Docker Compose Support**
  - Automatically detect containers started with `docker compose`
  - View and edit docker-compose.yml files
  - Redeploy containers after configuration changes
  
- **Image Management**
  - List all Docker images
  - Export images for backup (tar format)
  - Import images for restore
  
- **Network Management**
  - Create Docker networks
  - View all networks
  - Connect/disconnect containers to networks
  
- **Volume Management**
  - Create Docker volumes
  - View all volumes
  - Manage volume assignments to containers

### Modern GUI Features
- **Responsive Design** - Works perfectly on desktops, laptops, tablets, and mobile devices
- **Dark & Light Modes** - Built-in theme switcher with system preference detection
- **Fast & Modern** - Built with React 18, Vite, and TypeScript for optimal performance
- **Beautiful UI** - Tailwind CSS with shadcn/ui components

### Security & Authentication
- **Secure Authentication** - JWT-based authentication system
- **Password Hashing** - All passwords are hashed with bcrypt (no plain text storage)
- **User Management** - Support for multiple users with roles and permissions
- **Session Management** - Secure token-based sessions

### Performance & Reliability
- **PostgreSQL Database** - Reliable data storage for users and configurations
- **Redis Caching** - Fast data access with intelligent caching
- **Optimized Backend** - Async FastAPI for high performance
- **Real-time Updates** - React Query for efficient data fetching and caching

### Backup & Restore
- **Configuration Export/Import** - Export and import application configuration
- **User Data Backup** - Back up users, groups, roles, and permissions
- **Image Backup** - Export Docker images for disaster recovery

## 🛠 Technology Stack

### Backend
- **Python 3.11** with **FastAPI** - Modern, fast async web framework
- **PostgreSQL** - Reliable relational database
- **Redis** - High-performance caching layer
- **Docker Python SDK** - Native Docker API integration
- **SQLAlchemy** - Powerful ORM with async support
- **JWT & bcrypt** - Secure authentication

### Frontend
- **React 18** - Latest React with modern hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **React Router** - Client-side routing
- **React Query** - Powerful data fetching
- **Zustand** - Lightweight state management
- **Axios** - HTTP client

### Infrastructure
- **Docker & Docker Compose** - Containerized deployment
- **Nginx** - Production-ready web server for frontend

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of free RAM
- Access to Docker socket (`/var/run/docker.sock`)

## 🚀 Quick Start

### 1. Clone or Download the Project

```bash
cd /path/to/docker-manager
```

### 2. Configure Environment (Optional)

Create a `.env` file in the root directory:

```bash
SECRET_KEY=your-super-secret-key-change-in-production
```

### 3. Build and Start

```bash
docker-compose up -d --build
```

This will:
- Build the backend and frontend containers
- Start PostgreSQL and Redis
- Initialize the database
- Start all services

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost
```

### 5. Create First User

On first launch, register a new user account. The first user will have admin privileges.

## 📖 Usage Guide

### Dashboard
- View system-wide Docker statistics
- Monitor running and stopped containers
- Quick access to all features

### Containers Page
- **List View**: See all containers with status indicators
- **Details**: Click any container to view full configuration
- **Actions**: Start/Stop/Restart buttons for quick control
- **Edit**: Modify environment variables, volumes, networks, and images
- **Compose**: View and edit docker-compose.yml for compose containers

### Images Page
- View all Docker images
- Export images as tar files for backup
- Import images from tar files
- See image size and creation date

### Networks Page
- List all Docker networks
- Create new networks with custom drivers
- View network details and connected containers

### Volumes Page
- List all Docker volumes
- Create new volumes
- View volume details and usage

### Settings
- Toggle between light and dark themes
- Manage user profile
- Configure application settings

## 🔒 Security Considerations

### Production Deployment

1. **Change the Secret Key**
   ```bash
   SECRET_KEY=$(openssl rand -hex 32)
   echo "SECRET_KEY=$SECRET_KEY" > .env
   ```

2. **Use Strong Passwords**
   - All passwords are automatically hashed with bcrypt
   - Use strong, unique passwords for database and admin users

3. **Limit Docker Socket Access**
   - The application requires access to `/var/run/docker.sock`
   - Only run this application in trusted environments
   - Consider using Docker's socket proxy for additional security

4. **Use HTTPS**
   - Add an SSL/TLS termination proxy (e.g., Nginx, Traefik)
   - Redirect all HTTP traffic to HTTPS

5. **Regular Backups**
   - Export configuration regularly
   - Back up PostgreSQL database
   - Export critical Docker images

## 🔧 Configuration

### Environment Variables

#### Backend
- `SECRET_KEY` - JWT secret key (required in production)
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_HOST` - PostgreSQL host
- `POSTGRES_DB` - PostgreSQL database name
- `REDIS_HOST` - Redis host
- `DEBUG` - Enable debug mode (default: False)

### Custom Port

To change the default port (80), edit `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "8080:80"  # Change 8080 to your desired port
```

## 🐛 Troubleshooting

### Cannot Connect to Docker Socket

**Error**: `Failed to connect to Docker`

**Solution**: Ensure Docker is running and the application has access to the socket:
```bash
ls -la /var/run/docker.sock
sudo chmod 666 /var/run/docker.sock  # Temporary fix
```

### Database Connection Issues

**Error**: `Cannot connect to PostgreSQL`

**Solution**: Wait for PostgreSQL to fully initialize:
```bash
docker-compose logs postgres
docker-compose restart backend
```

### Frontend Cannot Reach Backend

**Error**: `Network Error` or `API not responding`

**Solution**: Check if backend is running:
```bash
docker-compose logs backend
docker-compose restart frontend
```

## 📦 Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🧪 API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📧 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## 🙏 Acknowledgments

- FastAPI for the amazing web framework
- React team for the powerful UI library
- shadcn for the beautiful UI components
- Docker for the containerization platform

---

**Built with ❤️ for DevOps Engineers**
