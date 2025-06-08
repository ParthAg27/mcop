# 🚀 MightyMiner Quick Start Guide

## 📋 Prerequisites

- Node.js 16+ installed
- Git installed
- Minecraft account
- Discord bot token (optional)

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
cd mineflayer
npm install
```

### 2. Configure Environment
```bash
cp docker/.env.template .env
# Edit .env with your credentials
```

### 3. Start the Bot
```bash
npm start
```

## 🐳 Docker Deployment

### Local Docker
```bash
cd mineflayer
docker-compose up -d
```

### VPS Deployment
```bash
# On your VPS
wget https://raw.githubusercontent.com/your-repo/mineflayer/main/vps/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

## ⚙️ Configuration

Edit `.env` file with your settings:

```env
BOT_USERNAME=your_minecraft_username
BOT_PASSWORD=your_minecraft_password
SERVER_HOST=hypixel.net
DISCORD_TOKEN=your_discord_bot_token
```

## 💬 Discord Commands

- `/start` - Start mining
- `/stop` - Stop mining
- `/status` - Check status
- `/stats` - View statistics
- `/screenshot` - Take screenshot

## 🔧 Basic Usage

1. **Start Mining**: Bot automatically detects location and starts appropriate macro
2. **Monitor Progress**: Use Discord commands or check console logs
3. **Emergency Stop**: Use `/stop` command or Ctrl+C

## 📊 Monitoring

- **Console Logs**: Real-time bot activity
- **Discord Updates**: Remote monitoring
- **Web Interface**: Visit http://localhost:3000 (if enabled)

## 🛠️ Troubleshooting

- **Connection Issues**: Check credentials in `.env`
- **Permission Errors**: Ensure proper file permissions
- **Memory Issues**: Adjust `MAX_MEMORY_USAGE` in config

For detailed information, see the main documentation.

