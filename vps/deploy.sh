#!/bin/bash

# MightyMiner VPS Deployment Script
# Automated deployment for production VPS environments

set -e  # Exit on any error

# Configuration
APP_NAME="mightyminer"
APP_USER="mightyminer"
APP_DIR="/opt/mightyminer"
SERVICE_NAME="mightyminer"
GIT_REPO="https://github.com/your-username/mightyminer-nodejs.git"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        nginx \
        ufw \
        fail2ban \
        htop \
        unzip \
        screen \
        tmux \
        logrotate
    
    log_success "System dependencies installed"
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js ${NODE_VERSION}..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    
    # Install Node.js
    sudo apt-get install -y nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    # Configure PM2 startup
    pm2 startup
    
    log_success "Node.js ${NODE_VERSION} installed"
}

# Create application user
create_app_user() {
    log "Creating application user..."
    
    if ! id "$APP_USER" &>/dev/null; then
        sudo useradd -r -m -s /bin/bash "$APP_USER"
        sudo usermod -aG sudo "$APP_USER"
        log_success "User $APP_USER created"
    else
        log_warning "User $APP_USER already exists"
    fi
}

# Setup application directory
setup_app_directory() {
    log "Setting up application directory..."
    
    # Create directory
    sudo mkdir -p "$APP_DIR"
    sudo chown "$APP_USER":"$APP_USER" "$APP_DIR"
    
    # Create subdirectories
    sudo -u "$APP_USER" mkdir -p "$APP_DIR"/{logs,config,data,backups}
    
    log_success "Application directory setup complete"
}

# Clone and setup application
setup_application() {
    log "Setting up MightyMiner application..."
    
    # Clone repository
    if [ ! -d "$APP_DIR/.git" ]; then
        sudo -u "$APP_USER" git clone "$GIT_REPO" "$APP_DIR"
    else
        log "Repository already exists, pulling latest changes..."
        sudo -u "$APP_USER" git -C "$APP_DIR" pull origin main
    fi
    
    # Install dependencies
    sudo -u "$APP_USER" npm --prefix="$APP_DIR" ci --only=production
    
    # Copy environment template
    if [ ! -f "$APP_DIR/.env" ]; then
        sudo -u "$APP_USER" cp "$APP_DIR/docker/.env.template" "$APP_DIR/.env"
        log_warning "Please edit $APP_DIR/.env with your configuration"
    fi
    
    log_success "Application setup complete"
}

# Configure PM2
configure_pm2() {
    log "Configuring PM2..."
    
    # Create PM2 ecosystem file
    sudo -u "$APP_USER" cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
    apps: [{
        name: '$SERVICE_NAME',
        script: 'src/MightyMiner.js',
        cwd: '$APP_DIR',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '512M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: '$APP_DIR/logs/err.log',
        out_file: '$APP_DIR/logs/out.log',
        log_file: '$APP_DIR/logs/combined.log',
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        restart_delay: 5000,
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
EOF
    
    log_success "PM2 configuration created"
}

# Setup nginx (optional)
setup_nginx() {
    log "Setting up Nginx reverse proxy..."
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/mightyminer > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com;  # Change this to your domain
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/mightyminer /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload nginx
    sudo nginx -t
    sudo systemctl reload nginx
    
    log_success "Nginx configuration complete"
}

# Configure firewall
setup_firewall() {
    log "Configuring firewall..."
    
    # Enable UFW
    sudo ufw --force enable
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP/HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow custom port if needed
    sudo ufw allow 3000/tcp
    
    log_success "Firewall configured"
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/mightyminer > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reload $SERVICE_NAME
    endscript
}
EOF
    
    log_success "Log rotation configured"
}

# Start application
start_application() {
    log "Starting MightyMiner application..."
    
    # Start with PM2
    sudo -u "$APP_USER" pm2 start "$APP_DIR/ecosystem.config.js"
    
    # Save PM2 configuration
    sudo -u "$APP_USER" pm2 save
    
    # Setup PM2 startup script
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER"
    
    log_success "Application started"
}

# Create backup script
setup_backup() {
    log "Setting up backup system..."
    
    sudo -u "$APP_USER" cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash

# MightyMiner Backup Script
BACKUP_DIR="/opt/mightyminer/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="mightyminer_backup_$DATE.tar.gz"

# Create backup
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude="logs" \
    --exclude="backups" \
    -C /opt mightyminer/

# Keep only last 7 backups
find "$BACKUP_DIR" -name "mightyminer_backup_*.tar.gz" -type f -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
EOF
    
    chmod +x "$APP_DIR/backup.sh"
    
    # Add to crontab
    (sudo -u "$APP_USER" crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | sudo -u "$APP_USER" crontab -
    
    log_success "Backup system configured"
}

# Health check script
setup_healthcheck() {
    log "Setting up health check..."
    
    sudo -u "$APP_USER" cat > "$APP_DIR/healthcheck.js" << 'EOF'
const http = require('http');
const process = require('process');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('Health check passed');
        process.exit(0);
    } else {
        console.log(`Health check failed: ${res.statusCode}`);
        process.exit(1);
    }
});

req.on('error', (err) => {
    console.log(`Health check error: ${err.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.log('Health check timeout');
    req.destroy();
    process.exit(1);
});

req.end();
EOF
    
    log_success "Health check configured"
}

# Main deployment function
main() {
    log "Starting MightyMiner VPS deployment..."
    
    check_root
    install_dependencies
    install_nodejs
    create_app_user
    setup_app_directory
    setup_application
    configure_pm2
    setup_nginx
    setup_firewall
    setup_logrotate
    setup_backup
    setup_healthcheck
    start_application
    
    log_success "🎉 MightyMiner deployment complete!"
    log "📝 Don't forget to:"
    log "   1. Edit $APP_DIR/.env with your configuration"
    log "   2. Update nginx server_name in /etc/nginx/sites-available/mightyminer"
    log "   3. Configure SSL certificate (Let's Encrypt recommended)"
    log "   4. Monitor logs: pm2 logs $SERVICE_NAME"
    log "   5. Check status: pm2 status"
}

# Run main function
main "$@"

