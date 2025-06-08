/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.macros.commission.Commission
 * Represents a mining commission with all associated data
 */
const Logger = require('../../util/Logger');

class Commission {
    // Commission types from Hypixel Skyblock
    static TYPES = {
        MITHRIL_POWDER: 'MITHRIL_POWDER',
        GEMSTONE_POWDER: 'GEMSTONE_POWDER', 
        GLACITE_POWDER: 'GLACITE_POWDER',
        HARD_STONE: 'HARD_STONE',
        COBBLESTONE: 'COBBLESTONE',
        COAL: 'COAL',
        IRON: 'IRON',
        GOLD: 'GOLD',
        DIAMOND: 'DIAMOND',
        EMERALD: 'EMERALD',
        REDSTONE: 'REDSTONE',
        LAPIS: 'LAPIS',
        RUBY: 'RUBY',
        SAPPHIRE: 'SAPPHIRE',
        JASPER: 'JASPER',
        AMETHYST: 'AMETHYST',
        AMBER: 'AMBER',
        TOPAZ: 'TOPAZ',
        JADE: 'JADE',
        OPAL: 'OPAL',
        AQUAMARINE: 'AQUAMARINE',
        CITRINE: 'CITRINE',
        ONYX: 'ONYX',
        PERIDOT: 'PERIDOT'
    };
    
    constructor(type, target = 1000, current = 0) {
        this.type = type;
        this.name = this.getCommissionName(type);
        this.target = target;
        this.current = current;
        this.startTime = Date.now();
        this.completedTime = null;
        this.isCompleted = false;
        this.reward = this.calculateReward(type, target);
        this.location = this.getOptimalLocation(type);
        this.priority = this.calculatePriority(type);
        this.difficulty = this.calculateDifficulty(type);
        this.estimatedTime = this.estimateCompletionTime(type, target);
    }
    
    // EXACT replica of getCommissionName from Java
    getCommissionName(type) {
        switch (type) {
            case Commission.TYPES.MITHRIL_POWDER:
                return 'Mithril Powder Collection';
            case Commission.TYPES.GEMSTONE_POWDER:
                return 'Gemstone Powder Collection';
            case Commission.TYPES.GLACITE_POWDER:
                return 'Glacite Powder Collection';
            case Commission.TYPES.HARD_STONE:
                return 'Hard Stone Collection';
            case Commission.TYPES.COBBLESTONE:
                return 'Cobblestone Collection';
            case Commission.TYPES.COAL:
                return 'Coal Collection';
            case Commission.TYPES.IRON:
                return 'Iron Ingot Collection';
            case Commission.TYPES.GOLD:
                return 'Gold Ingot Collection';
            case Commission.TYPES.DIAMOND:
                return 'Diamond Collection';
            case Commission.TYPES.EMERALD:
                return 'Emerald Collection';
            case Commission.TYPES.REDSTONE:
                return 'Redstone Collection';
            case Commission.TYPES.LAPIS:
                return 'Lapis Lazuli Collection';
            case Commission.TYPES.RUBY:
                return 'Ruby Gemstone Collection';
            case Commission.TYPES.SAPPHIRE:
                return 'Sapphire Gemstone Collection';
            case Commission.TYPES.JASPER:
                return 'Jasper Gemstone Collection';
            case Commission.TYPES.AMETHYST:
                return 'Amethyst Gemstone Collection';
            case Commission.TYPES.AMBER:
                return 'Amber Gemstone Collection';
            case Commission.TYPES.TOPAZ:
                return 'Topaz Gemstone Collection';
            case Commission.TYPES.JADE:
                return 'Jade Gemstone Collection';
            case Commission.TYPES.OPAL:
                return 'Opal Gemstone Collection';
            case Commission.TYPES.AQUAMARINE:
                return 'Aquamarine Gemstone Collection';
            case Commission.TYPES.CITRINE:
                return 'Citrine Gemstone Collection';
            case Commission.TYPES.ONYX:
                return 'Onyx Gemstone Collection';
            case Commission.TYPES.PERIDOT:
                return 'Peridot Gemstone Collection';
            default:
                return 'Unknown Commission';
        }
    }
    
    // EXACT replica of calculateReward from Java
    calculateReward(type, target) {
        const baseReward = {
            coins: 0,
            miningXp: 0,
            hotmXp: 0,
            powder: { mithril: 0, gemstone: 0, glacite: 0 }
        };
        
        const multiplier = Math.max(1, target / 1000);
        
        switch (type) {
            case Commission.TYPES.MITHRIL_POWDER:
                baseReward.coins = 7500 * multiplier;
                baseReward.miningXp = 350 * multiplier;
                baseReward.hotmXp = 1500 * multiplier;
                baseReward.powder.mithril = 2500 * multiplier;
                break;
                
            case Commission.TYPES.GEMSTONE_POWDER:
                baseReward.coins = 12000 * multiplier;
                baseReward.miningXp = 500 * multiplier;
                baseReward.hotmXp = 2000 * multiplier;
                baseReward.powder.gemstone = 2500 * multiplier;
                break;
                
            case Commission.TYPES.GLACITE_POWDER:
                baseReward.coins = 15000 * multiplier;
                baseReward.miningXp = 750 * multiplier;
                baseReward.hotmXp = 2500 * multiplier;
                baseReward.powder.glacite = 2500 * multiplier;
                break;
                
            case Commission.TYPES.HARD_STONE:
            case Commission.TYPES.COBBLESTONE:
                baseReward.coins = 5000 * multiplier;
                baseReward.miningXp = 200 * multiplier;
                baseReward.hotmXp = 1000 * multiplier;
                break;
                
            default:
                if (this.isGemstone(type)) {
                    baseReward.coins = 10000 * multiplier;
                    baseReward.miningXp = 400 * multiplier;
                    baseReward.hotmXp = 1800 * multiplier;
                    baseReward.powder.gemstone = 1000 * multiplier;
                } else {
                    baseReward.coins = 6000 * multiplier;
                    baseReward.miningXp = 300 * multiplier;
                    baseReward.hotmXp = 1200 * multiplier;
                }
                break;
        }
        
        return baseReward;
    }
    
    // EXACT replica of getOptimalLocation from Java
    getOptimalLocation(type) {
        switch (type) {
            case Commission.TYPES.MITHRIL_POWDER:
            case Commission.TYPES.HARD_STONE:
            case Commission.TYPES.COBBLESTONE:
                return 'Dwarven Mines';
                
            case Commission.TYPES.GEMSTONE_POWDER:
            case Commission.TYPES.RUBY:
            case Commission.TYPES.SAPPHIRE:
            case Commission.TYPES.JASPER:
            case Commission.TYPES.AMETHYST:
            case Commission.TYPES.AMBER:
            case Commission.TYPES.TOPAZ:
            case Commission.TYPES.JADE:
            case Commission.TYPES.OPAL:
                return 'Crystal Hollows';
                
            case Commission.TYPES.GLACITE_POWDER:
            case Commission.TYPES.AQUAMARINE:
            case Commission.TYPES.CITRINE:
            case Commission.TYPES.ONYX:
            case Commission.TYPES.PERIDOT:
                return 'Glacial Cave';
                
            case Commission.TYPES.COAL:
            case Commission.TYPES.IRON:
            case Commission.TYPES.GOLD:
            case Commission.TYPES.DIAMOND:
            case Commission.TYPES.EMERALD:
            case Commission.TYPES.REDSTONE:
            case Commission.TYPES.LAPIS:
                return 'Deep Caverns';
                
            default:
                return 'Unknown Location';
        }
    }
    
    // EXACT replica of calculatePriority from Java
    calculatePriority(type) {
        // Higher priority = more important to complete
        switch (type) {
            case Commission.TYPES.GLACITE_POWDER:
                return 10; // Highest priority - best rewards
            case Commission.TYPES.GEMSTONE_POWDER:
                return 9;
            case Commission.TYPES.MITHRIL_POWDER:
                return 8;
            case Commission.TYPES.RUBY:
            case Commission.TYPES.SAPPHIRE:
            case Commission.TYPES.JASPER:
                return 7; // High value gemstones
            case Commission.TYPES.AMETHYST:
            case Commission.TYPES.AMBER:
            case Commission.TYPES.TOPAZ:
                return 6; // Medium value gemstones
            case Commission.TYPES.JADE:
            case Commission.TYPES.OPAL:
            case Commission.TYPES.AQUAMARINE:
            case Commission.TYPES.CITRINE:
                return 5; // Lower value gemstones
            case Commission.TYPES.DIAMOND:
            case Commission.TYPES.EMERALD:
                return 4; // Valuable ores
            case Commission.TYPES.GOLD:
            case Commission.TYPES.IRON:
                return 3; // Common ores
            case Commission.TYPES.REDSTONE:
            case Commission.TYPES.LAPIS:
            case Commission.TYPES.COAL:
                return 2; // Low value ores
            case Commission.TYPES.HARD_STONE:
            case Commission.TYPES.COBBLESTONE:
                return 1; // Lowest priority - easy but low reward
            default:
                return 0;
        }
    }
    
    // EXACT replica of calculateDifficulty from Java
    calculateDifficulty(type) {
        // 1 = Easy, 5 = Very Hard
        switch (type) {
            case Commission.TYPES.HARD_STONE:
            case Commission.TYPES.COBBLESTONE:
                return 1; // Very easy - abundant blocks
            case Commission.TYPES.COAL:
            case Commission.TYPES.IRON:
                return 2; // Easy - common ores
            case Commission.TYPES.MITHRIL_POWDER:
            case Commission.TYPES.GOLD:
            case Commission.TYPES.REDSTONE:
            case Commission.TYPES.LAPIS:
                return 3; // Medium - requires specific locations
            case Commission.TYPES.GEMSTONE_POWDER:
            case Commission.TYPES.DIAMOND:
            case Commission.TYPES.EMERALD:
            case Commission.TYPES.RUBY:
            case Commission.TYPES.SAPPHIRE:
                return 4; // Hard - rare ores/gemstones
            case Commission.TYPES.GLACITE_POWDER:
            case Commission.TYPES.JASPER:
            case Commission.TYPES.AMETHYST:
            case Commission.TYPES.AMBER:
            case Commission.TYPES.TOPAZ:
            case Commission.TYPES.JADE:
            case Commission.TYPES.OPAL:
            case Commission.TYPES.AQUAMARINE:
            case Commission.TYPES.CITRINE:
            case Commission.TYPES.ONYX:
            case Commission.TYPES.PERIDOT:
                return 5; // Very hard - specific locations and rare spawns
            default:
                return 3;
        }
    }
    
    // EXACT replica of estimateCompletionTime from Java
    estimateCompletionTime(type, target) {
        // Returns estimated time in minutes
        const baseRate = this.getBaseCollectionRate(type);
        const timeInMinutes = target / baseRate;
        
        // Factor in difficulty multiplier
        const difficultyMultiplier = this.calculateDifficulty(type) * 0.3;
        
        return Math.max(5, timeInMinutes * (1 + difficultyMultiplier));
    }
    
    getBaseCollectionRate(type) {
        // Items per minute with average setup
        switch (type) {
            case Commission.TYPES.HARD_STONE:
            case Commission.TYPES.COBBLESTONE:
                return 200; // Very fast
            case Commission.TYPES.COAL:
            case Commission.TYPES.IRON:
                return 150; // Fast
            case Commission.TYPES.MITHRIL_POWDER:
                return 100; // Medium
            case Commission.TYPES.GOLD:
            case Commission.TYPES.REDSTONE:
            case Commission.TYPES.LAPIS:
                return 80; // Medium-slow
            case Commission.TYPES.GEMSTONE_POWDER:
            case Commission.TYPES.DIAMOND:
            case Commission.TYPES.EMERALD:
                return 60; // Slow
            case Commission.TYPES.GLACITE_POWDER:
                return 40; // Very slow
            default:
                if (this.isGemstone(type)) {
                    return 50; // Gemstones are generally slow
                }
                return 100; // Default rate
        }
    }
    
    isGemstone(type) {
        const gemstones = [
            Commission.TYPES.RUBY, Commission.TYPES.SAPPHIRE, Commission.TYPES.JASPER,
            Commission.TYPES.AMETHYST, Commission.TYPES.AMBER, Commission.TYPES.TOPAZ,
            Commission.TYPES.JADE, Commission.TYPES.OPAL, Commission.TYPES.AQUAMARINE,
            Commission.TYPES.CITRINE, Commission.TYPES.ONYX, Commission.TYPES.PERIDOT
        ];
        return gemstones.includes(type);
    }
    
    // EXACT replica of updateProgress from Java
    updateProgress(newCurrent) {
        if (typeof newCurrent !== 'number' || newCurrent < 0) {
            Logger.sendWarning('Invalid progress value for commission');
            return false;
        }
        
        this.current = Math.min(newCurrent, this.target);
        
        if (this.current >= this.target && !this.isCompleted) {
            this.complete();
        }
        
        return true;
    }
    
    // EXACT replica of addProgress from Java
    addProgress(amount) {
        if (typeof amount !== 'number' || amount <= 0) {
            return false;
        }
        
        return this.updateProgress(this.current + amount);
    }
    
    // EXACT replica of complete from Java
    complete() {
        if (this.isCompleted) {
            Logger.sendWarning('Commission is already completed');
            return false;
        }
        
        this.isCompleted = true;
        this.completedTime = Date.now();
        this.current = this.target;
        
        Logger.sendMessage(`Commission completed: ${this.name}`);
        Logger.sendMessage(`Reward: ${this.reward.coins} coins, ${this.reward.miningXp} Mining XP`);
        
        return true;
    }
    
    // EXACT replica of getProgress from Java
    getProgress() {
        return {
            current: this.current,
            target: this.target,
            percentage: Math.min(100, (this.current / this.target) * 100),
            remaining: Math.max(0, this.target - this.current)
        };
    }
    
    // EXACT replica of getTimeElapsed from Java
    getTimeElapsed() {
        const endTime = this.isCompleted ? this.completedTime : Date.now();
        return endTime - this.startTime;
    }
    
    // EXACT replica of getEstimatedTimeRemaining from Java
    getEstimatedTimeRemaining() {
        if (this.isCompleted) return 0;
        
        const progress = this.getProgress();
        if (progress.percentage === 0) {
            return this.estimatedTime * 60 * 1000; // Convert to milliseconds
        }
        
        const timeElapsed = this.getTimeElapsed();
        const rate = progress.current / timeElapsed;
        
        if (rate <= 0) return this.estimatedTime * 60 * 1000;
        
        return progress.remaining / rate;
    }
    
    // Utility methods
    reset() {
        this.current = 0;
        this.startTime = Date.now();
        this.completedTime = null;
        this.isCompleted = false;
        Logger.sendDebug(`Reset commission: ${this.name}`);
    }
    
    isActive() {
        return !this.isCompleted && this.current < this.target;
    }
    
    getEfficiency() {
        if (this.getTimeElapsed() === 0) return 0;
        return (this.current / (this.getTimeElapsed() / 60000)); // Items per minute
    }
    
    // EXACT replica of toString from Java
    toString() {
        const progress = this.getProgress();
        return `Commission{type='${this.type}', name='${this.name}', progress=${progress.current}/${progress.target} (${progress.percentage.toFixed(1)}%), completed=${this.isCompleted}}`;
    }
    
    // Serialization methods
    toJSON() {
        return {
            type: this.type,
            name: this.name,
            target: this.target,
            current: this.current,
            startTime: this.startTime,
            completedTime: this.completedTime,
            isCompleted: this.isCompleted,
            reward: this.reward,
            location: this.location,
            priority: this.priority,
            difficulty: this.difficulty,
            estimatedTime: this.estimatedTime
        };
    }
    
    static fromJSON(data) {
        const commission = new Commission(data.type, data.target, data.current);
        commission.startTime = data.startTime || Date.now();
        commission.completedTime = data.completedTime || null;
        commission.isCompleted = data.isCompleted || false;
        return commission;
    }
    
    // Static factory methods
    static createRandomCommission() {
        const types = Object.values(Commission.TYPES);
        const randomType = types[Math.floor(Math.random() * types.length)];
        const randomTarget = Math.floor(Math.random() * 2000) + 500; // 500-2500 items
        return new Commission(randomType, randomTarget);
    }
    
    static createFromScoreboard(scoreboardText) {
        // Parse commission from Hypixel scoreboard text
        try {
            // Example: "Coal: 450/1000"
            const match = scoreboardText.match(/(\w+):\s*(\d+)\/(\d+)/);
            if (match) {
                const itemName = match[1].toUpperCase();
                const current = parseInt(match[2]);
                const target = parseInt(match[3]);
                
                // Map item name to commission type
                const type = Commission.TYPES[itemName] || Commission.TYPES.HARD_STONE;
                
                return new Commission(type, target, current);
            }
        } catch (error) {
            Logger.sendWarning(`Failed to parse commission from scoreboard: ${error.message}`);
        }
        
        return null;
    }
}

module.exports = Commission;

