# MightyMiner Discord Bot

A comprehensive Discord bot for controlling MightyMiner with slash commands, settings management, and screenshot functionality.

## Features

### 🎯 Slash Commands
- `/status` - Get current MightyMiner status
- `/start <macro>` - Start a specific macro (commission, mining, glacial, route, powder)
- `/stop` - Stop MightyMiner
- `/settings` - Open interactive settings panel with buttons
- `/screenshot` - Take and send a screenshot of current status
- `/logs <lines>` - Get recent log lines
- `/stats` - View mining statistics
- `/failsafes <enabled>` - Toggle failsafe settings
- `/emergency` - Emergency stop all operations
- `/config <action>` - View, export, or reset configuration

### 📸 Screenshot System
- Automatic screen capture
- Image optimization and compression
- Embedded display in Discord
- Auto-cleanup of temporary files

### ⚙️ Interactive Settings
- Button-based settings panel
- Real-time configuration updates
- Macro selection and management
- Feature toggles (auto-sell, auto-warp, etc.)
- Mining speed controls

### 🛡️ Security Features
- User authorization system
- Ephemeral messages for sensitive data
- Rate limiting protection
- Secure error handling

## Setup

### Prerequisites
- Node.js 16.0.0 or higher
- Discord Bot Token
- MightyMiner instance running

### Installation

1. **Clone and navigate to the bot directory:**
   ```bash
   cd mineflayer/discord-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.template .env
   ```
   
   Edit `.env` file with your settings:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   AUTHORIZED_USERS=123456789012345678,987654321098765432
   ```

4. **Create Discord Application:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section
   - Create a bot and copy the token
   - Enable necessary intents (Message Content Intent if needed)

5. **Invite bot to server:**
   - Go to "OAuth2" > "URL Generator"
   - Select "bot" and "applications.commands" scopes
   - Select necessary permissions:
     - Send Messages
     - Use Slash Commands
     - Attach Files
     - Embed Links
   - Use generated URL to invite bot

### Running the Bot

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## Usage Examples

### Basic Commands

**Check status:**
```
/status
```

**Start mining:**
```
/start macro:commission
```

**Take screenshot:**
```
/screenshot
```

**Open settings panel:**
```
/settings
```

### Settings Panel

The `/settings` command opens an interactive panel with buttons:
- 🎯 **Macro** - Select active macro
- 🧱 **Blocks** - Configure target blocks
- ⚡ **Speed** - Adjust mining speed
- 🔧 **Features** - Toggle auto-features
- 💾 **Save** - Save current settings

### Emergency Controls

**Emergency stop:**
```
/emergency
```

**Toggle failsafes:**
```
/failsafes enabled:false
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `DISCORD_TOKEN` | Discord bot token | ✅ | - |
| `AUTHORIZED_USERS` | Comma-separated user IDs | ❌ | All users |
| `LOG_LEVEL` | Logging level | ❌ | info |
| `SCREENSHOT_QUALITY` | Image compression quality | ❌ | 80 |
| `SCREENSHOT_MAX_WIDTH` | Max screenshot width | ❌ | 1920 |
| `SCREENSHOT_MAX_HEIGHT` | Max screenshot height | ❌ | 1080 |

### Authorization

To restrict bot usage to specific users:
1. Get Discord user IDs (enable Developer Mode in Discord)
2. Add IDs to `AUTHORIZED_USERS` in `.env`:
   ```env
   AUTHORIZED_USERS=123456789012345678,987654321098765432
   ```

## Integration with MightyMiner

The bot integrates with MightyMiner through:
- Direct module imports
- Configuration sharing
- Status monitoring
- Command execution

### Status Monitoring

The bot monitors:
- ✅ Running state
- 🎯 Active macro
- ⏱️ Uptime
- ❌ Error count
- 📊 Mining statistics
- 💰 Profit tracking

### Real-time Updates

The bot provides real-time information about:
- Block mining progress
- Commission completion
- Failsafe activations
- Error notifications
- Performance metrics

## Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Check if bot is online in Discord
- Verify bot has necessary permissions
- Check console for error messages

**Screenshot failures:**
- Ensure display is available (not headless without virtual display)
- Check Sharp dependency installation
- Verify write permissions in temp directory

**Authorization errors:**
- Check user ID format in `AUTHORIZED_USERS`
- Ensure IDs are correct (18-19 digits)
- Verify environment variables are loaded

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

Run with detailed output:
```bash
DEBUG=* npm start
```

## API Reference

### Bot Methods

#### `getMinerStatus()`
Returns current MightyMiner status object.

#### `takeScreenshot()`
Captures screen and returns optimized image path.

#### `startMacro(macroType)`
Starts specified macro type.

#### `stopMacro()`
Stops current macro.

#### `emergencyStop()`
Force stops all operations.

### Events

The bot listens for:
- `ready` - Bot initialization complete
- `interactionCreate` - Slash command or button interaction
- `error` - Error handling

## Development

### Adding New Commands

1. Add command to `setupCommands()` method
2. Add handler to `handleCommand()` switch
3. Implement command logic
4. Register with Discord API

### Custom Features

Extend the bot by:
- Adding new slash commands
- Creating custom embeds
- Implementing additional buttons
- Adding monitoring features

## License

MIT License - See LICENSE file for details.

## Support

For issues and support:
1. Check troubleshooting section
2. Review console logs
3. Create GitHub issue with details

