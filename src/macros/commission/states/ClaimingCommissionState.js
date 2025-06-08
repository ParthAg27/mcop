const CommissionMacroState = require('./CommissionMacroState');
const PlayerUtil = require('../../../utils/PlayerUtil');

/**
 * State for claiming completed commissions
 * 1:1 replica of ClaimingCommissionState.java
 */
class ClaimingCommissionState extends CommissionMacroState {
    constructor(macro) {
        super(macro, 'ClaimingCommission');
        this.claimingStartTime = 0;
        this.maxClaimTime = 30000; // 30 seconds max
        this.claimAttempts = 0;
        this.maxClaimAttempts = 3;
    }

    /**
     * Enter claiming state
     */
    async onEnter() {
        await super.onEnter();
        this.claimingStartTime = Date.now();
        this.claimAttempts = 0;
        this.log('info', 'Starting commission claiming process');
    }

    /**
     * Execute claiming logic
     */
    async onTick() {
        const bot = this.getBot();
        if (!bot) return;
        
        try {
            // Check if we have completed commissions to claim
            const completedCommissions = this.getCommissionUtil().getCompletedCommissions();
            
            if (completedCommissions.length === 0) {
                this.log('info', 'No completed commissions to claim');
                return;
            }
            
            // Attempt to claim commissions
            for (const commission of completedCommissions) {
                if (this.claimAttempts < this.maxClaimAttempts) {
                    await this.claimCommission(bot, commission);
                    this.claimAttempts++;
                    
                    // Wait between attempts
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
        } catch (error) {
            this.log('error', 'Error in claiming state:', error);
        }
    }

    /**
     * Claim a specific commission
     * @param {Object} bot
     * @param {Object} commission
     */
    async claimCommission(bot, commission) {
        try {
            this.log('info', `Attempting to claim commission: ${commission.type}`);
            
            // Open commission menu
            await this.openCommissionMenu(bot);
            
            // Find and click claim button
            await this.findAndClickClaim(bot, commission);
            
            // Verify claim was successful
            const claimed = await this.verifyClaimSuccess(bot, commission);
            if (claimed) {
                this.log('info', `Successfully claimed commission: ${commission.type}`);
                this.macro.sessionStats.commissionsCompleted++;
            } else {
                this.log('warn', `Failed to claim commission: ${commission.type}`);
            }
            
        } catch (error) {
            this.log('error', `Error claiming commission ${commission.type}:`, error);
        }
    }

    /**
     * Open the commission menu
     * @param {Object} bot
     */
    async openCommissionMenu(bot) {
        // Try multiple methods to open commission menu
        
        // Method 1: Use command
        try {
            await bot.chat('/commissions');
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            this.log('debug', 'Failed to use /commissions command');
        }
        
        // Method 2: Find and interact with NPC
        try {
            const npc = this.findCommissionNPC(bot);
            if (npc) {
                await bot.lookAt(npc.position);
                await bot.activateEntity(npc);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            this.log('debug', 'Failed to interact with commission NPC');
        }
        
        // Method 3: Try to find commission item in inventory
        try {
            const commissionItem = bot.inventory.items().find(item => 
                item.name.includes('commission') || 
                item.displayName?.includes('Commission')
            );
            
            if (commissionItem) {
                await bot.equip(commissionItem, 'hand');
                await bot.activateItem();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            this.log('debug', 'Failed to use commission item');
        }
    }

    /**
     * Find commission NPC
     * @param {Object} bot
     * @returns {Object|null}
     */
    findCommissionNPC(bot) {
        const npcs = Object.values(bot.entities).filter(entity => 
            entity.type === 'villager' || 
            entity.name?.includes('Commission') ||
            entity.displayName?.includes('Commission')
        );
        
        if (npcs.length > 0) {
            // Find closest NPC
            const playerPos = bot.entity.position;
            npcs.sort((a, b) => 
                a.position.distanceTo(playerPos) - b.position.distanceTo(playerPos)
            );
            return npcs[0];
        }
        
        return null;
    }

    /**
     * Find and click the claim button for a commission
     * @param {Object} bot
     * @param {Object} commission
     */
    async findAndClickClaim(bot, commission) {
        // Look for commission GUI window
        if (bot.currentWindow) {
            const window = bot.currentWindow;
            
            // Look for claim buttons or completed commission indicators
            for (const slot of window.slots) {
                if (slot && slot.name) {
                    const itemName = slot.name.toLowerCase();
                    const displayName = slot.displayName?.toLowerCase() || '';
                    
                    // Check if this is a claim button or completed commission
                    if (itemName.includes('claim') || 
                        displayName.includes('claim') ||
                        displayName.includes('completed') ||
                        displayName.includes(commission.type.toLowerCase())) {
                        
                        try {
                            await bot.clickWindow(slot.slot, 0, 0);
                            await new Promise(resolve => setTimeout(resolve, 500));
                            this.log('debug', `Clicked on potential claim item: ${displayName}`);
                        } catch (error) {
                            this.log('debug', 'Failed to click claim item');
                        }
                    }
                }
            }
        }
    }

    /**
     * Verify that the commission was successfully claimed
     * @param {Object} bot
     * @param {Object} commission
     * @returns {boolean}
     */
    async verifyClaimSuccess(bot, commission) {
        // Wait for game to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update commission data
        await this.getCommissionUtil().updateCommissions(bot);
        
        // Check if commission is now claimed
        const updatedCommission = this.getCommissionUtil().getCommissionByType(commission.type);
        if (updatedCommission) {
            return updatedCommission.claimed;
        }
        
        // If commission is no longer in the list, it might have been claimed
        return !updatedCommission;
    }

    /**
     * Check if should transition to another state
     * @returns {CommissionMacroState|null}
     */
    async shouldTransition() {
        // Check parent timeout
        const parentTransition = await super.shouldTransition();
        if (parentTransition) return parentTransition;
        
        // Check claiming timeout
        if (Date.now() - this.claimingStartTime > this.maxClaimTime) {
            this.log('info', 'Claiming timeout reached');
            return this.macro.states.STARTING;
        }
        
        // Check if all commissions claimed or no more to claim
        const completedCommissions = this.getCommissionUtil().getCompletedCommissions();
        if (completedCommissions.length === 0 || this.claimAttempts >= this.maxClaimAttempts) {
            this.log('info', 'Finished claiming, moving to next commission');
            return this.macro.states.STARTING;
        }
        
        // Check if should stop
        if (this.shouldStop()) {
            return null; // Stop macro
        }
        
        return null;
    }
}

module.exports = ClaimingCommissionState;

