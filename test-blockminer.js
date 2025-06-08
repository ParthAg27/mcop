const mineflayer = require('mineflayer');
const BlockMiner = require('./src/feature/impl/BlockMiner/BlockMiner');
const MightyMinerConfig = require('./src/core/MightyMinerConfig');
const Logger = require('./src/core/Logger');

// Test configuration
const config = {
    host: 'hypixel.net',
    port: 25565,
    username: 'test_bot', // Replace with actual username
    password: 'password',  // Replace with actual password
    version: '1.8.9'
};

const logger = new Logger('BlockMinerTest');

async function testBlockMiner() {
    logger.info('Starting BlockMiner test...');
    
    try {
        // Create bot instance
        const bot = mineflayer.createBot({
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            version: config.version
        });

        // Handle bot events
        bot.once('spawn', async () => {
            logger.info('Bot spawned successfully!');
            
            // Wait a bit for world to load
            await sleep(3000);
            
            // Test BlockMiner functionality
            await testMiningSystem(bot);
        });

        bot.on('error', (err) => {
            logger.error(`Bot error: ${err.message}`);
        });

        bot.on('end', () => {
            logger.info('Bot disconnected');
        });

        bot.on('kicked', (reason) => {
            logger.error(`Bot kicked: ${reason}`);
        });

    } catch (error) {
        logger.error(`Test failed: ${error.message}`);
    }
}

async function testMiningSystem(bot) {
    logger.info('Testing BlockMiner system...');
    
    try {
        // Initialize utilities
        const PlayerUtil = require('./src/util/PlayerUtil');
        const BlockUtil = require('./src/util/BlockUtil');
        const InventoryUtil = require('./src/util/InventoryUtil');
        
        PlayerUtil.init(bot);
        BlockUtil.init(bot);
        InventoryUtil.init(bot);
        
        // Create test mineable blocks configuration
        const testBlocks = [
            {
                name: 'stone',
                stateIds: [1] // Stone block state ID
            },
            {
                name: 'coal_ore',
                stateIds: [16] // Coal ore block state ID
            },
            {
                name: 'iron_ore',
                stateIds: [15] // Iron ore block state ID
            }
        ];
        
        const priorities = [1, 3, 2]; // Coal ore has highest priority
        const miningSpeed = 1000;
        const miningTool = 'pickaxe';
        
        // Get BlockMiner instance
        const blockMiner = BlockMiner.getInstance();
        blockMiner.bot = bot;
        
        logger.info('Starting BlockMiner with test configuration...');
        
        // Start mining
        blockMiner.start(testBlocks, miningSpeed, priorities, miningTool);
        
        // Run mining for a test period
        const testDuration = 60000; // 1 minute
        logger.info(`Running mining test for ${testDuration / 1000} seconds...`);
        
        const testInterval = setInterval(async () => {
            if (blockMiner.isEnabled()) {
                await blockMiner.execute();
                
                // Log status every 5 seconds
                const currentState = blockMiner.getCurrentState();
                const error = blockMiner.getError();
                
                logger.info(`Status - State: ${currentState ? currentState.constructor.name : 'null'}, Error: ${error}`);
                
                if (error !== 'NONE') {
                    logger.error(`Mining error detected: ${error}`);
                }
            }
        }, 100); // Execute every 100ms
        
        // Stop test after duration
        setTimeout(() => {
            clearInterval(testInterval);
            blockMiner.stop();
            logger.info('BlockMiner test completed');
            
            // Disconnect bot
            bot.quit('Test completed');
        }, testDuration);
        
    } catch (error) {
        logger.error(`Mining system test error: ${error.message}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test configuration validation
function validateTestConfig() {
    logger.info('=== BlockMiner Test Configuration ===');
    logger.info(`Host: ${config.host}`);
    logger.info(`Port: ${config.port}`);
    logger.info(`Version: ${config.version}`);
    logger.info(`Username: ${config.username}`);
    logger.info('=====================================');
    
    if (!config.username || config.username === 'test_bot') {
        logger.warn('Please update the username in test configuration!');
        logger.warn('Set a valid Minecraft username to connect to Hypixel');
    }
    
    return true;
}

// Component availability check
function checkComponents() {
    logger.info('=== Checking Component Availability ===');
    
    const components = [
        { name: 'BlockMiner', path: './src/feature/impl/BlockMiner/BlockMiner' },
        { name: 'StartingState', path: './src/feature/impl/BlockMiner/states/StartingState' },
        { name: 'ChoosingBlockState', path: './src/feature/impl/BlockMiner/states/ChoosingBlockState' },
        { name: 'BreakingState', path: './src/feature/impl/BlockMiner/states/BreakingState' },
        { name: 'ApplyAbilityState', path: './src/feature/impl/BlockMiner/states/ApplyAbilityState' },
        { name: 'PlayerUtil', path: './src/util/PlayerUtil' },
        { name: 'BlockUtil', path: './src/util/BlockUtil' },
        { name: 'InventoryUtil', path: './src/util/InventoryUtil' },
        { name: 'AngleUtil', path: './src/util/AngleUtil' },
        { name: 'AbstractFeature', path: './src/feature/AbstractFeature' },
        { name: 'Logger', path: './src/core/Logger' },
        { name: 'Clock', path: './src/core/Clock' }
    ];
    
    let allAvailable = true;
    
    for (const component of components) {
        try {
            require(component.path);
            logger.info(`✅ ${component.name} - Available`);
        } catch (error) {
            logger.error(`❌ ${component.name} - Missing (${error.message})`);
            allAvailable = false;
        }
    }
    
    logger.info('=====================================');
    
    if (allAvailable) {
        logger.info('✅ All components are available!');
    } else {
        logger.error('❌ Some components are missing');
    }
    
    return allAvailable;
}

// Main execution
if (require.main === module) {
    logger.info('🚀 MightyMiner BlockMiner Test Suite');
    logger.info('===================================');
    
    // Validate configuration
    if (!validateTestConfig()) {
        process.exit(1);
    }
    
    // Check component availability
    if (!checkComponents()) {
        logger.error('Cannot proceed with missing components');
        process.exit(1);
    }
    
    // Start test
    logger.info('Starting BlockMiner functionality test...');
    testBlockMiner().catch(error => {
        logger.error(`Test suite failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    testBlockMiner,
    validateTestConfig,
    checkComponents
};

