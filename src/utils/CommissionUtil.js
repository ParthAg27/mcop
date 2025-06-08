const Logger = require('../Logger');
const ScoreboardUtil = require('./ScoreboardUtil');
const TablistUtil = require('./TablistUtil');

/**
 * Utility for handling mining commissions on Hypixel Skyblock
 * 1:1 replica of CommissionUtil.java
 */
class CommissionUtil {
    constructor() {
        this.logger = new Logger('CommissionUtil');
        this.commissions = [];
        this.lastUpdateTime = 0;
        this.updateInterval = 5000; // Update every 5 seconds
        
        // Commission patterns for recognition
        this.commissionPatterns = {
            mithril: /Mithril Powder.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            gemstone: /Gemstone Powder.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            hardStone: /Hard Stone.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            cobblestone: /Cobblestone.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            coal: /Coal.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            iron: /Iron.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            gold: /Gold.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            diamond: /Diamond.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            emerald: /Emerald.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            redstone: /Redstone.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            lapis: /Lapis.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            ruby: /Ruby.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            amber: /Amber.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            sapphire: /Sapphire.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            jade: /Jade.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            amethyst: /Amethyst.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            topaz: /Topaz.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            jasper: /Jasper.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            opal: /Opal.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            aquamarine: /Aquamarine.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            citrine: /Citrine.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            onyx: /Onyx.*?([0-9,]+)\s*\/\s*([0-9,]+)/i,
            peridot: /Peridot.*?([0-9,]+)\s*\/\s*([0-9,]+)/i
        };
        
        // Commission completion patterns
        this.completionPatterns = {
            complete: /COMPLETED/i,
            claimed: /CLAIMED/i,
            progress: /([0-9,]+)\s*\/\s*([0-9,]+)/
        };
    }

    /**
     * Update commissions from scoreboard/tablist
     * @param {Object} bot - Mineflayer bot instance
     */
    async updateCommissions(bot) {
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            return; // Don't update too frequently
        }
        
        this.lastUpdateTime = now;
        
        try {
            // Try to get commissions from multiple sources
            const scoreboardCommissions = this.getCommissionsFromScoreboard(bot);
            const tablistCommissions = this.getCommissionsFromTablist(bot);
            
            // Merge and update
            this.commissions = this.mergeCommissions(scoreboardCommissions, tablistCommissions);
            
            this.logger.debug(`Updated ${this.commissions.length} commissions`);
        } catch (error) {
            this.logger.error('Error updating commissions:', error);
        }
    }

    /**
     * Get commissions from scoreboard
     * @param {Object} bot
     * @returns {Array}
     */
    getCommissionsFromScoreboard(bot) {
        const commissions = [];
        const scoreboardLines = ScoreboardUtil.getScoreboardLines(bot);
        
        for (const line of scoreboardLines) {
            const commission = this.parseCommissionLine(line);
            if (commission) {
                commission.source = 'scoreboard';
                commissions.push(commission);
            }
        }
        
        return commissions;
    }

    /**
     * Get commissions from tablist
     * @param {Object} bot
     * @returns {Array}
     */
    getCommissionsFromTablist(bot) {
        const commissions = [];
        const tablistLines = TablistUtil.getTablistLines(bot);
        
        for (const line of tablistLines) {
            const commission = this.parseCommissionLine(line);
            if (commission) {
                commission.source = 'tablist';
                commissions.push(commission);
            }
        }
        
        return commissions;
    }

    /**
     * Parse a line to extract commission information
     * @param {string} line
     * @returns {Object|null}
     */
    parseCommissionLine(line) {
        if (!line || typeof line !== 'string') return null;
        
        // Clean the line
        const cleanLine = line.replace(/§[0-9a-fk-or]/g, '').trim();
        
        // Check each commission pattern
        for (const [type, pattern] of Object.entries(this.commissionPatterns)) {
            const match = cleanLine.match(pattern);
            if (match) {
                const current = parseInt(match[1].replace(/,/g, ''));
                const target = parseInt(match[2].replace(/,/g, ''));
                
                return {
                    type,
                    current,
                    target,
                    progress: current / target,
                    completed: current >= target,
                    claimed: this.isCommissionClaimed(cleanLine),
                    rawLine: cleanLine,
                    originalLine: line
                };
            }
        }
        
        return null;
    }

    /**
     * Check if a commission is claimed
     * @param {string} line
     * @returns {boolean}
     */
    isCommissionClaimed(line) {
        return this.completionPatterns.claimed.test(line) || 
               this.completionPatterns.complete.test(line);
    }

    /**
     * Merge commissions from different sources
     * @param {Array} scoreboardCommissions
     * @param {Array} tablistCommissions
     * @returns {Array}
     */
    mergeCommissions(scoreboardCommissions, tablistCommissions) {
        const merged = [];
        const seen = new Set();
        
        // Add scoreboard commissions first (higher priority)
        for (const commission of scoreboardCommissions) {
            const key = `${commission.type}_${commission.target}`;
            if (!seen.has(key)) {
                merged.push(commission);
                seen.add(key);
            }
        }
        
        // Add tablist commissions if not already seen
        for (const commission of tablistCommissions) {
            const key = `${commission.type}_${commission.target}`;
            if (!seen.has(key)) {
                merged.push(commission);
                seen.add(key);
            }
        }
        
        return merged;
    }

    /**
     * Get all current commissions
     * @returns {Array}
     */
    getCommissions() {
        return [...this.commissions];
    }

    /**
     * Get active (unclaimed) commissions
     * @returns {Array}
     */
    getActiveCommissions() {
        return this.commissions.filter(c => !c.claimed);
    }

    /**
     * Get completed commissions
     * @returns {Array}
     */
    getCompletedCommissions() {
        return this.commissions.filter(c => c.completed && !c.claimed);
    }

    /**
     * Get incomplete commissions
     * @returns {Array}
     */
    getIncompleteCommissions() {
        return this.commissions.filter(c => !c.completed);
    }

    /**
     * Find commission by type
     * @param {string} type
     * @returns {Object|null}
     */
    getCommissionByType(type) {
        return this.commissions.find(c => c.type === type) || null;
    }

    /**
     * Find the best commission to work on
     * @param {Array} preferredTypes - Preferred commission types
     * @returns {Object|null}
     */
    getBestCommission(preferredTypes = []) {
        const activeCommissions = this.getActiveCommissions();
        
        if (activeCommissions.length === 0) return null;
        
        // First, try preferred types
        for (const type of preferredTypes) {
            const commission = activeCommissions.find(c => c.type === type);
            if (commission) return commission;
        }
        
        // Then, find the one with lowest progress (easiest to complete)
        return activeCommissions.sort((a, b) => a.progress - b.progress)[0];
    }

    /**
     * Get commission statistics
     * @returns {Object}
     */
    getStats() {
        const total = this.commissions.length;
        const completed = this.getCompletedCommissions().length;
        const claimed = this.commissions.filter(c => c.claimed).length;
        const active = this.getActiveCommissions().length;
        
        return {
            total,
            completed,
            claimed,
            active,
            completionRate: total > 0 ? completed / total : 0,
            lastUpdate: this.lastUpdateTime
        };
    }

    /**
     * Get commission types available
     * @returns {Array}
     */
    getAvailableTypes() {
        return Object.keys(this.commissionPatterns);
    }

    /**
     * Check if a specific type is a valid commission type
     * @param {string} type
     * @returns {boolean}
     */
    isValidCommissionType(type) {
        return this.commissionPatterns.hasOwnProperty(type);
    }

    /**
     * Reset commission data
     */
    reset() {
        this.commissions.length = 0;
        this.lastUpdateTime = 0;
        this.logger.info('Commission data reset');
    }

    /**
     * Get detailed commission information
     * @returns {Object}
     */
    getDetailedInfo() {
        return {
            commissions: this.commissions,
            stats: this.getStats(),
            lastUpdate: new Date(this.lastUpdateTime).toISOString(),
            availableTypes: this.getAvailableTypes()
        };
    }
}

module.exports = CommissionUtil;

