const Logger = require('../core/Logger');
const TablistUtil = require('./TablistUtil');
const EntityUtil = require('./EntityUtil');
const { Vec3 } = require('vec3');

/**
 * CommissionUtil
 * 
 * 1:1 exact replica of com.jelly.mightyminerv2.util.CommissionUtil
 * Handles commission-related utilities and emissary management
 */
class CommissionUtil {
    static logger = new Logger('CommissionUtil');
    static bot = null;

    // Emissary locations (exact replica from Java)
    static emissaries = [
        { name: 'Ceanna', position: new Vec3(42.50, 134.50, 22.50) },
        { name: 'Carlton', position: new Vec3(-72.50, 153.00, -10.50) },
        { name: 'Wilson', position: new Vec3(171.50, 150.00, 31.50) },
        { name: 'Lilith', position: new Vec3(58.50, 198.00, -8.50) },
        { name: 'Fraiser', position: new Vec3(-132.50, 174.00, -50.50) }
        // Eliza at dwarven village (-37.50, 200.00, -131.50) - not needed
    ];

    // Commission enum equivalent
    static Commission = {
        GOBLIN_SLAYER: 'GOBLIN_SLAYER',
        MINES_SLAYER: 'MINES_SLAYER', 
        GLACITE_WALKER_SLAYER: 'GLACITE_WALKER_SLAYER',
        TREASURE_HOARDER_SLAYER: 'TREASURE_HOARDER_SLAYER',
        COMMISSION_CLAIM: 'COMMISSION_CLAIM',
        
        // Mapping function equivalent to Java getCommission
        getCommission: function(text) {
            const cleanText = text.toLowerCase().trim();
            
            if (cleanText.includes('goblin') && cleanText.includes('slayer')) {
                return this.GOBLIN_SLAYER;
            }
            if (cleanText.includes('mines') && cleanText.includes('slayer')) {
                return this.MINES_SLAYER;
            }
            if (cleanText.includes('glacite walker') && cleanText.includes('slayer')) {
                return this.GLACITE_WALKER_SLAYER;
            }
            if (cleanText.includes('treasure hoarder') && cleanText.includes('slayer')) {
                return this.TREASURE_HOARDER_SLAYER;
            }
            
            return null;
        },
        
        // Get best commission from list (priority-based)
        getBestCommissionFrom: function(commissions) {
            if (!commissions || commissions.length === 0) {
                return [];
            }
            
            // Priority order (highest to lowest)
            const priority = [
                this.COMMISSION_CLAIM,
                this.GLACITE_WALKER_SLAYER,
                this.GOBLIN_SLAYER,
                this.MINES_SLAYER,
                this.TREASURE_HOARDER_SLAYER
            ];
            
            // Sort by priority
            const sorted = [...commissions].sort((a, b) => {
                const aPriority = priority.indexOf(a);
                const bPriority = priority.indexOf(b);
                
                // If not in priority list, put at end
                if (aPriority === -1) return 1;
                if (bPriority === -1) return -1;
                
                return aPriority - bPriority;
            });
            
            return sorted;
        }
    };

    // Slayer mob mapping (exact replica from Java)
    static slayerMob = new Map([
        [CommissionUtil.Commission.GOBLIN_SLAYER, new Set(['Goblin', 'Knifethrower', 'Fireslinger'])],
        [CommissionUtil.Commission.MINES_SLAYER, new Set(['Goblin', 'Knifethrower', 'Fireslinger', 'Glacite Walker'])],
        [CommissionUtil.Commission.GLACITE_WALKER_SLAYER, new Set(['Glacite Walker'])]
    ]);

    static init(bot) {
        this.bot = bot;
    }

    /**
     * Gets mob types for a specific commission
     * @param commission Commission type
     * @return Set of mob names
     */
    static getMobForCommission(commission) {
        return this.slayerMob.get(commission) || new Set();
    }

    /**
     * Gets emissary entity at specific position
     * @param pos Position to check
     * @return Emissary entity or null
     */
    static getEmissary(pos) {
        if (!this.bot) return null;

        try {
            const entities = Object.values(this.bot.entities);
            
            return entities.find(entity => {
                return entity.position &&
                       entity.position.x === pos.x &&
                       entity.position.y === pos.y &&
                       entity.position.z === pos.z &&
                       !entity.name?.includes('Sentry') &&
                       EntityUtil.isNpc(entity);
            }) || null;
        } catch (error) {
            this.logger.error('Error getting emissary:', error);
            return null;
        }
    }

    /**
     * Gets the closest emissary to player
     * @return Closest emissary entity or null
     */
    static getClosestEmissary() {
        if (!this.bot || !this.bot.entity) {
            return null;
        }

        try {
            const playerPos = this.bot.entity.position;
            
            // Find closest emissary position
            let closestPos = null;
            let minDistance = Infinity;
            
            for (const emissary of this.emissaries) {
                const distance = playerPos.distanceSquared(emissary.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPos = emissary.position;
                }
            }
            
            if (!closestPos) {
                return null;
            }

            // Find entity at that position
            const entities = Object.values(this.bot.entities);
            
            return entities.find(entity => {
                return entity.position &&
                       entity.position.x === closestPos.x &&
                       entity.position.y === closestPos.y &&
                       entity.position.z === closestPos.z &&
                       !entity.name?.includes('Sentry') &&
                       EntityUtil.isNpc(entity);
            }) || null;
        } catch (error) {
            this.logger.error('Error getting closest emissary:', error);
            return null;
        }
    }

    /**
     * Gets the position of the closest emissary
     * @return Closest emissary position
     */
    static getClosestEmissaryPosition() {
        if (!this.bot || !this.bot.entity) {
            return this.emissaries[0].position; // Default fallback
        }

        try {
            const playerPos = this.bot.entity.position;
            
            let closestEmissary = this.emissaries[0];
            let minDistance = Infinity;
            
            for (const emissary of this.emissaries) {
                const distance = playerPos.distanceSquared(emissary.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEmissary = emissary;
                }
            }
            
            return closestEmissary.position;
        } catch (error) {
            this.logger.error('Error getting closest emissary position:', error);
            return this.emissaries[0].position;
        }
    }

    /**
     * Gets current commissions from tablist (exact replica from Java)
     * @return List of Commission objects
     */
    static getCurrentCommissionsFromTablist() {
        try {
            const comms = [];
            let foundCommission = false;
            
            const tablist = TablistUtil.getCachedTablist();
            
            for (const text of tablist) {
                if (!foundCommission) {
                    if (text.toLowerCase() === 'commissions:') {
                        foundCommission = true;
                    }
                    continue;
                }

                // Check for completed commissions
                if (text.includes('DONE')) {
                    return [this.Commission.COMMISSION_CLAIM];
                }

                // Parse commission from text
                const colonIndex = text.indexOf(': ');
                if (colonIndex !== -1) {
                    const commissionText = text.substring(0, colonIndex).trim();
                    const comm = this.Commission.getCommission(commissionText);
                    if (comm !== null) {
                        comms.push(comm);
                    }
                }

                // Stop at empty line
                if (text.trim() === '') {
                    break;
                }
            }

            return this.Commission.getBestCommissionFrom(comms);
        } catch (error) {
            this.logger.error('Error getting commissions from tablist:', error);
            return [];
        }
    }

    /**
     * Checks if player has completed commissions ready to claim
     * @return True if has commissions to claim
     */
    static hasCompletedCommissions() {
        const commissions = this.getCurrentCommissionsFromTablist();
        return commissions.includes(this.Commission.COMMISSION_CLAIM);
    }

    /**
     * Gets commission progress from tablist
     * @param commissionName Commission name to check
     * @return Progress percentage or -1 if not found
     */
    static getCommissionProgress(commissionName) {
        try {
            const tablist = TablistUtil.getCachedTablist();
            let foundCommission = false;
            
            for (const text of tablist) {
                if (!foundCommission) {
                    if (text.toLowerCase() === 'commissions:') {
                        foundCommission = true;
                    }
                    continue;
                }

                if (text.toLowerCase().includes(commissionName.toLowerCase())) {
                    const colonIndex = text.indexOf(': ');
                    if (colonIndex !== -1) {
                        const progressText = text.substring(colonIndex + 2).trim();
                        
                        if (progressText === 'DONE') {
                            return 100;
                        }
                        
                        const percentMatch = progressText.match(/(\d+(?:\.\d+)?)%/);
                        if (percentMatch) {
                            return parseFloat(percentMatch[1]);
                        }
                    }
                }

                if (text.trim() === '') {
                    break;
                }
            }

            return -1; // Not found
        } catch (error) {
            this.logger.error('Error getting commission progress:', error);
            return -1;
        }
    }

    /**
     * Checks if commission is completed
     * @param commissionName Commission name to check
     * @return True if commission is done
     */
    static isCommissionCompleted(commissionName) {
        const progress = this.getCommissionProgress(commissionName);
        return progress === 100;
    }

    /**
     * Gets all active commission names
     * @return Array of commission names
     */
    static getActiveCommissionNames() {
        try {
            const names = [];
            const tablist = TablistUtil.getCachedTablist();
            let foundCommission = false;
            
            for (const text of tablist) {
                if (!foundCommission) {
                    if (text.toLowerCase() === 'commissions:') {
                        foundCommission = true;
                    }
                    continue;
                }

                const colonIndex = text.indexOf(': ');
                if (colonIndex !== -1) {
                    const commissionName = text.substring(0, colonIndex).trim();
                    if (commissionName) {
                        names.push(commissionName);
                    }
                }

                if (text.trim() === '') {
                    break;
                }
            }

            return names;
        } catch (error) {
            this.logger.error('Error getting active commission names:', error);
            return [];
        }
    }

    /**
     * Gets distance to closest emissary
     * @return Distance in blocks
     */
    static getDistanceToClosestEmissary() {
        if (!this.bot || !this.bot.entity) {
            return Infinity;
        }

        const playerPos = this.bot.entity.position;
        const emissaryPos = this.getClosestEmissaryPosition();
        
        return playerPos.distanceTo(emissaryPos);
    }

    /**
     * Gets emissary by name
     * @param name Emissary name
     * @return Emissary info or null
     */
    static getEmissaryByName(name) {
        return this.emissaries.find(emissary => 
            emissary.name.toLowerCase() === name.toLowerCase()
        ) || null;
    }

    /**
     * Checks if position is near any emissary
     * @param position Position to check
     * @param radius Check radius
     * @return True if near emissary
     */
    static isNearEmissary(position, radius = 5) {
        for (const emissary of this.emissaries) {
            if (position.distanceTo(emissary.position) <= radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Debug method to log commission information
     */
    static debugCommissions() {
        this.logger.info('=== COMMISSION DEBUG ===');
        const commissions = this.getCurrentCommissionsFromTablist();
        this.logger.info(`Active commissions: ${commissions.length}`);
        
        commissions.forEach((comm, index) => {
            this.logger.info(`Commission ${index}: ${comm}`);
        });
        
        const closestEmissary = this.getClosestEmissaryPosition();
        this.logger.info(`Closest emissary: ${closestEmissary.x}, ${closestEmissary.y}, ${closestEmissary.z}`);
        
        this.logger.info('========================');
    }
}

module.exports = CommissionUtil;

