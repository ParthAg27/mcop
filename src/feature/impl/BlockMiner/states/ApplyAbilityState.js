const BlockMinerState = require('./BlockMinerState');
const StartingState = require('./StartingState');
const ChoosingBlockState = require('./ChoosingBlockState');
const InventoryUtil = require('../../../util/InventoryUtil');

/**
 * ApplyAbilityState
 * 
 * State responsible for activating pickaxe abilities (speed boosts, mining enhancements).
 * Handles both primary and alternative pickaxe abilities.
 */
class ApplyAbilityState extends BlockMinerState {
    constructor() {
        super();
        this.activationStartTime = 0;
        this.maxActivationTime = 5000; // 5 seconds max to activate ability
        this.hasAttemptedActivation = false;
        this.abilityActivated = false;
    }

    async onStart(miner) {
        await super.onStart(miner);
        this.activationStartTime = Date.now();
        this.hasAttemptedActivation = false;
        this.abilityActivated = false;
        this.log('Attempting to activate pickaxe ability...');
    }

    async onTick(miner) {
        if (!this.isValidMiner(miner)) {
            return null;
        }

        const bot = this.getBot(miner);
        if (!bot) {
            this.logError('Bot not available');
            return null;
        }

        try {
            // Check for timeout
            const elapsed = Date.now() - this.activationStartTime;
            if (elapsed > this.maxActivationTime) {
                this.logError('Timeout activating pickaxe ability');
                return new ChoosingBlockState(); // Continue without ability
            }

            // Check if ability is not available
            if (miner.getPickaxeAbilityState() !== 'AVAILABLE') {
                this.log('Pickaxe ability not available, proceeding to mining');
                return new ChoosingBlockState();
            }

            // Attempt to activate ability if not already attempted
            if (!this.hasAttemptedActivation) {
                await this.activatePickaxeAbility(miner, bot);
                this.hasAttemptedActivation = true;
                
                // Give some time for activation to take effect
                await this.sleep(500);
                return this;
            }

            // Check if ability was successfully activated
            if (this.checkAbilityActivated(miner)) {
                this.log('Pickaxe ability activated successfully');
                this.abilityActivated = true;
                return new ChoosingBlockState();
            }

            // If primary tool failed, try alternative pickaxe
            if (!miner.isTriedAlt()) {
                this.log('Primary pickaxe failed, trying alternative...');
                await this.tryAlternativePickaxe(miner, bot);
                miner.setTriedAlt(true);
                this.hasAttemptedActivation = false; // Reset to try again
                return this;
            }

            // If all attempts failed, proceed without ability
            this.logWarn('Failed to activate pickaxe ability, proceeding without boost');
            return new ChoosingBlockState();

        } catch (error) {
            this.logError(`Error in ApplyAbilityState: ${error.message}`);
            return new ChoosingBlockState();
        }
    }

    async activatePickaxeAbility(miner, bot) {
        if (!bot) return;

        try {
            this.log('Activating pickaxe ability...');
            
            // Ensure we have a pickaxe equipped
            await this.ensurePickaxeEquipped(bot);
            
            // Right-click to activate ability
            await bot.activateItem();
            
            this.log('Ability activation attempted');
            
            // Mark ability as unavailable immediately
            miner.setPickaxeAbilityState('UNAVAILABLE');
            
        } catch (error) {
            this.logError(`Error activating pickaxe ability: ${error.message}`);
            throw error;
        }
    }

    async tryAlternativePickaxe(miner, bot) {
        if (!bot) return;

        try {
            this.log('Trying alternative pickaxe...');
            
            const inventoryUtil = new InventoryUtil(bot);
            
            // Look for alternative mining tools
            const alternativeTools = [
                'Gauntlet', 'Drill', 'Pickaxe'
            ];
            
            for (const tool of alternativeTools) {
                if (await inventoryUtil.equipItem(tool)) {
                    this.log(`Equipped alternative tool: ${tool}`);
                    await this.sleep(200); // Give time for equipment change
                    return true;
                }
            }
            
            this.logWarn('No alternative pickaxe found');
            return false;
            
        } catch (error) {
            this.logError(`Error trying alternative pickaxe: ${error.message}`);
            return false;
        }
    }

    async ensurePickaxeEquipped(bot) {
        if (!bot) return;

        try {
            const heldItem = bot.heldItem;
            
            // Check if already holding a mining tool
            if (heldItem && this.isMiningTool(heldItem.name)) {
                this.log(`Mining tool already equipped: ${heldItem.name}`);
                return;
            }
            
            // Equip a pickaxe
            const inventoryUtil = new InventoryUtil(bot);
            const equipped = await inventoryUtil.equipPickaxe();
            
            if (!equipped) {
                this.logError('No pickaxe found to equip');
                throw new Error('No pickaxe available');
            }
            
            this.log('Pickaxe equipped successfully');
            
        } catch (error) {
            this.logError(`Error ensuring pickaxe equipped: ${error.message}`);
            throw error;
        }
    }

    isMiningTool(itemName) {
        if (!itemName) return false;
        
        const miningTools = [
            'pickaxe', 'drill', 'gauntlet', 'shovel'
        ];
        
        const lowerName = itemName.toLowerCase();
        return miningTools.some(tool => lowerName.includes(tool));
    }

    checkAbilityActivated(miner) {
        // Check if the ability state changed to unavailable (indicating activation)
        if (miner.getPickaxeAbilityState() === 'UNAVAILABLE') {
            return true;
        }
        
        // Additional checks could be added here, such as:
        // - Speed effect detection
        // - Mining speed increase detection
        // - Particle effects
        
        return false;
    }

    detectSpeedEffect(bot) {
        if (!bot || !bot.entity || !bot.entity.effects) {
            return false;
        }
        
        try {
            // Check for speed effects
            const effects = bot.entity.effects;
            
            // Look for speed effect (effect ID 1)
            if (effects[1]) {
                this.log('Speed effect detected');
                return true;
            }
            
            // Look for haste effect (effect ID 3)
            if (effects[3]) {
                this.log('Haste effect detected');
                return true;
            }
            
            return false;
        } catch (error) {
            this.logError(`Error detecting speed effect: ${error.message}`);
            return false;
        }
    }

    async waitForAbilityConfirmation(timeout = 2000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            // Wait for chat message or effect confirmation
            await this.sleep(100);
            
            // Check if we received confirmation
            // This could be enhanced to listen for specific chat messages
            
        }
        
        return false;
    }

    async onEnd(miner) {
        await super.onEnd(miner);
        
        const elapsed = Date.now() - this.activationStartTime;
        
        if (this.abilityActivated) {
            this.log(`Ability activation completed successfully in ${elapsed}ms`);
        } else {
            this.log(`Ability activation phase completed in ${elapsed}ms (not activated)`);
        }
        
        // Reset the tried alternative flag for next time
        if (miner) {
            miner.setTriedAlt(false);
        }
    }
}

module.exports = ApplyAbilityState;

