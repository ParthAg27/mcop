require('dotenv').config();
const MightyMinerDiscordBot = require('./bot');
const Logger = require('../src/core/Logger');

const logger = new Logger('DiscordBotMain');

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const AUTHORIZED_USERS = (process.env.AUTHORIZED_USERS || '').split(',').filter(id => id.trim());

async function main() {
    logger.info('🚀 Starting MightyMiner Discord Bot...');
    
    if (!DISCORD_TOKEN) {
        logger.error('❌ DISCORD_TOKEN is required! Please set it in your .env file.');
        process.exit(1);
    }
    
    try {
        const bot = new MightyMinerDiscordBot();
        await bot.init(DISCORD_TOKEN, AUTHORIZED_USERS);
        
        logger.info('✅ Discord bot initialized successfully!');
        logger.info(`🔐 Authorized users: ${AUTHORIZED_USERS.length || 'All users (no restriction)'})`);
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('🛑 Received SIGINT, shutting down gracefully...');
            await bot.client.destroy();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            logger.info('🛑 Received SIGTERM, shutting down gracefully...');
            await bot.client.destroy();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('❌ Failed to start Discord bot:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the bot
main();

