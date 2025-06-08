#!/bin/bash

# MightyMiner Update Script for VPS
# Safely updates the application with zero-downtime

set -e

# Configuration
APP_NAME="mightyminer"
APP_USER="mightyminer"
APP_DIR="/opt/mightyminer"
SERVICE_NAME="mightyminer"
BACKUP_DIR="$APP_DIR/backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

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

# Create backup before update
create_backup() {
    log "Creating backup before update..."
    
    local backup_name="pre_update_$(date +"%Y%m%d_%H%M%S").tar.gz"
    
    sudo -u "$APP_USER" tar -czf "$BACKUP_DIR/$backup_name" \
        --exclude="node_modules" \
        --exclude="logs" \
        --exclude="backups" \
        -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)"
    
    log_success "Backup created: $backup_name"
    return 0
}

# Check if application is running
check_app_status() {
    if sudo -u "$APP_USER" pm2 describe "$SERVICE_NAME" &>/dev/null; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

# Graceful shutdown
stop_application() {
    log "Stopping application gracefully..."
    
    if check_app_status; then
        sudo -u "$APP_USER" pm2 stop "$SERVICE_NAME"
        log_success "Application stopped"
    else
        log_warning "Application was not running"
    fi
}

# Update application code
update_code() {
    log "Updating application code..."
    
    # Fetch latest changes
    sudo -u "$APP_USER" git -C "$APP_DIR" fetch origin
    
    # Get current and latest commit hashes
    local current_commit=$(sudo -u "$APP_USER" git -C "$APP_DIR" rev-parse HEAD)
    local latest_commit=$(sudo -u "$APP_USER" git -C "$APP_DIR" rev-parse origin/main)
    
    if [ "$current_commit" = "$latest_commit" ]; then
        log_warning "Already up to date"
        return 1
    fi
    
    # Pull latest changes
    sudo -u "$APP_USER" git -C "$APP_DIR" pull origin main
    
    log_success "Code updated from $current_commit to $latest_commit"
    return 0
}

# Update dependencies
update_dependencies() {
    log "Updating dependencies..."
    
    # Check if package.json changed
    if sudo -u "$APP_USER" git -C "$APP_DIR" diff HEAD~1 --name-only | grep -q "package.json\|package-lock.json"; then
        log "Package files changed, updating dependencies..."
        sudo -u "$APP_USER" npm --prefix="$APP_DIR" ci --only=production
        log_success "Dependencies updated"
    else
        log "No dependency changes detected"
    fi
}

# Start application
start_application() {
    log "Starting application..."
    
    sudo -u "$APP_USER" pm2 start "$APP_DIR/ecosystem.config.js"
    
    # Wait for application to start
    sleep 5
    
    if check_app_status; then
        log_success "Application started successfully"
    else
        log_error "Failed to start application"
        return 1
    fi
}

# Health check
perform_health_check() {
    log "Performing health check..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if sudo -u "$APP_USER" node "$APP_DIR/healthcheck.js" &>/dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback function
rollback() {
    log_error "Rolling back to previous version..."
    
    # Stop current version
    stop_application
    
    # Rollback git changes
    sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard HEAD~1
    
    # Reinstall previous dependencies if needed
    sudo -u "$APP_USER" npm --prefix="$APP_DIR" ci --only=production
    
    # Start application
    start_application
    
    if perform_health_check; then
        log_success "Rollback successful"
    else
        log_error "Rollback failed - manual intervention required"
        exit 1
    fi
}

# Show application status
show_status() {
    log "Application Status:"
    sudo -u "$APP_USER" pm2 status
    sudo -u "$APP_USER" pm2 logs "$SERVICE_NAME" --lines 10
}

# Main update function
main() {
    log "Starting MightyMiner update process..."
    
    # Check if running as correct user
    if [ "$USER" = "root" ]; then
        log_error "Do not run this script as root"
        exit 1
    fi
    
    # Create backup
    create_backup
    
    # Check if update is needed
    if ! update_code; then
        log "No updates available"
        exit 0
    fi
    
    # Stop application
    stop_application
    
    # Update dependencies
    update_dependencies
    
    # Start application
    if ! start_application; then
        rollback
        exit 1
    fi
    
    # Perform health check
    if ! perform_health_check; then
        rollback
        exit 1
    fi
    
    # Save PM2 configuration
    sudo -u "$APP_USER" pm2 save
    
    log_success "🎉 Update completed successfully!"
    
    # Show final status
    show_status
}

# Handle script arguments
case "${1:-update}" in
    "update")
        main
        ;;
    "status")
        show_status
        ;;
    "rollback")
        rollback
        ;;
    "health")
        perform_health_check
        ;;
    *)
        echo "Usage: $0 {update|status|rollback|health}"
        echo "  update   - Update the application (default)"
        echo "  status   - Show application status"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Perform health check"
        exit 1
        ;;
esac

