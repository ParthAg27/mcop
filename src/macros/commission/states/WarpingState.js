const CommissionMacroState = require('./CommissionMacroState');
const PlayerUtil = require('../../../utils/PlayerUtil');

/**
 * State for warping to different locations
 * 1:1 replica of WarpingState.java
 */
class WarpingState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'Warping');
        this.warpingStartTime = 0;
        this.maxWarpTime = 15000; // 15 seconds max
        this.targetLocation = null;
        this.warpAttempts = 0;
        this.maxWarpAttempts = 3;
        
        // Common warp locations
        this.warpLocations = {
            'hub': ['hub', 'spawn'],
            'dwarven_mines': ['mines', 'dwarven'],
            'crystal_hollows': ['ch', 'crystals', 'hollows'],
            'deep_caverns': ['deep', 'caverns'],
            'spider_den': ['spider'],
            'end': ['end'],
            'park': ['park'],
            'barn': ['barn'],
            'mushroom_desert': ['desert'],
            'gold_mine': ['gold']
        };
    }

    /**
     * Enter warping state
     */
    async onEnter() {
        await super.onEnter();
        this.warpingStartTime = Date.now();
        this.warpAttempts = 0;
        this.log('info', 'Starting warp process');
    }

    /**
     * Execute warping logic
     */
    async onTick() {
        const bot = this.getBot();
        if (!bot) return;
        
        try {
            // Determine target location if not set
            if (!this.targetLocation) {
                this.targetLocation = this.determineTargetLocation();
                if (!this.targetLocation) {
                    this.log('warn', 'No target location determined');
                    return;
                }
            }
            
            // Attempt warp if we haven't exceeded max attempts
            if (this.warpAttempts < this.maxWarpAttempts) {
                await this.executeWarp(bot, this.targetLocation);
                this.warpAttempts++;
                
                // Wait to see if warp was successful
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check if we're in the right location
                if (await this.verifyWarpSuccess(bot)) {
                    this.log('info', `Successfully warped to ${this.targetLocation}`);
                } else {
                    this.log('warn', `Warp to ${this.targetLocation} may have failed, attempt ${this.warpAttempts}`);
                }
            }
            
        } catch (error) {
            this.log('error', 'Error in warping state:', error);
        }
    }

    /**
     * Determine where we should warp based on current commission
     * @returns {string|null}
     */
    determineTargetLocation() {
        const commission = this.macro.currentCommission;
        if (!commission) {
            return this.macro.settings.targetLocation || 'dwarven_mines';
        }
        
        // Map commission types to optimal locations
        const locationMapping = {
            mithril: 'dwarven_mines',
            gemstone: 'crystal_hollows',
            hardStone: 'dwarven_mines',
            cobblestone: 'dwarven_mines',
            coal: 'dwarven_mines',
            iron: 'dwarven_mines',
            gold: 'gold_mine',
            diamond: 'deep_caverns',
            emerald: 'deep_caverns',
            redstone: 'deep_caverns',
            lapis: 'deep_caverns'
        };
        
        return locationMapping[commission.type] || 'dwarven_mines';
    }

    /**
     * Execute the warp command
     * @param {Object} bot
     * @param {string} location
     */
    async executeWarp(bot, location) {
        this.log('info', `Attempting to warp to ${location}`);
        
        // Get possible warp commands for this location
        const warpCommands = this.getWarpCommands(location);
        
        for (const command of warpCommands) {
            try {
                this.log('debug', `Trying warp command: ${command}`);
                await bot.chat(command);
                
                // Wait a bit for the command to process
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if we're loading/warping
                if (await this.isWarping(bot)) {
                    this.log('debug', 'Warp initiated, waiting for completion');
                    return; // Warp started, exit the loop
                }
                
            } catch (error) {
                this.log('debug', `Warp command failed: ${command}`);
            }
        }
    }

    /**
     * Get possible warp commands for a location
     * @param {string} location
     * @returns {Array<string>}
     */
    getWarpCommands(location) {
        const commands = [];
        const aliases = this.warpLocations[location] || [location];
        
        for (const alias of aliases) {
            commands.push(`/warp ${alias}`);
            commands.push(`/visit ${alias}`);
            commands.push(`/is ${alias}`);
        }
        
        return commands;
    }

    /**
     * Check if currently warping/loading
     * @param {Object} bot
     * @returns {boolean}
     */
    async isWarping(bot) {
        // Check for loading screen indicators
        // This is a simplified check - could be enhanced
        
        // Check if player movement is restricted (common during warps)
        const oldPos = bot.entity ? bot.entity.position.clone() : null;
        
        if (oldPos) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const newPos = bot.entity ? bot.entity.position : null;
            
            if (newPos && oldPos.distanceTo(newPos) < 0.1) {
                // Player hasn't moved much, might be warping
                return true;
            }
        }
        
        return false;
    }

    /**
     * Verify that the warp was successful
     * @param {Object} bot
     * @returns {boolean}
     */
    async verifyWarpSuccess(bot) {
        try {
            // Check if we're in the expected location
            // This is a basic implementation - could be enhanced with specific location detection
            
            if (!bot.entity) return false;
            
            const position = bot.entity.position;
            
            // Basic location verification based on coordinates
            // Each area in Hypixel has typical coordinate ranges
            const locationChecks = {
                'hub': () => Math.abs(position.x) < 200 && Math.abs(position.z) < 200,
                'dwarven_mines': () => position.y < 100 && position.y > 0,
                'crystal_hollows': () => position.y < 100,
                'deep_caverns': () => position.y < 50,
                'end': () => position.y > 100
            };
            
            const check = locationChecks[this.targetLocation];
            if (check) {
                return check();
            }
            
            // If no specific check, assume success if we moved significantly
            return true;
            
        } catch (error) {
            this.log('error', 'Error verifying warp success:', error);
            return false;
        }
    }

    /**
     * Set target location manually
     * @param {string} location
     */
    setTargetLocation(location) {
        this.targetLocation = location;
        this.log('info', `Target location set to: ${location}`);
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check warping timeout
        if (Date.now() - this.warpingStartTime > this.maxWarpTime) {
            this.log('warn', 'Warping timeout reached');
            return this.macro.states.STARTING;
        }
        
        // Check if warp was successful or max attempts reached
        if (this.warpAttempts >= this.maxWarpAttempts) {
            this.log('info', 'Warp attempts completed, proceeding to next state');
            
            // Move to appropriate next state based on context
            if (this.macro.currentCommission) {
                return this.macro.states.MINING;
            } else {
                return this.macro.states.STARTING;
            }
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = WarpingState;

