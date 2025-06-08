/**
 * BadEffectFailsafe - Detects harmful potion effects and disables macro
 * Perfect 1:1 replica of Java BadEffectFailsafe.java
 */

const AbstractFailsafe = require('./AbstractFailsafe');
const MacroManager = require('../src/macro/MacroManager');
const Logger = require('../src/util/Logger');

class BadEffectFailsafe extends AbstractFailsafe {
    static instance = null;
    
    constructor() {
        super();
        
        // Bad effect IDs from Java version
        this.BAD_EFFECTS = new Set([
            19, // poison
            20, // wither
            18, // weakness
            15, // blindness
            17, // hunger
            2,  // moveSlowdown
            4   // digSlowdown
        ]);
    }
    
    static getInstance() {
        if (!BadEffectFailsafe.instance) {
            BadEffectFailsafe.instance = new BadEffectFailsafe();
        }
        return BadEffectFailsafe.instance;
    }
    
    getName() {
        return "BadEffectFailsafe";
    }
    
    getFailsafeType() {
        return "BAD_EFFECTS";
    }
    
    getPriority() {
        return 7;
    }
    
    onTick(bot) {
        if (!bot.entity) return false;
        
        try {
            // Check for active potion effects
            const effects = bot.entity.effects;
            if (!effects) return false;
            
            for (const [effectId, effect] of Object.entries(effects)) {
                const id = parseInt(effectId);
                if (this.BAD_EFFECTS.has(id)) {
                    Logger.warn(`[BadEffectFailsafe] Bad effect detected: ${id}`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            Logger.error(`[BadEffectFailsafe] Error in onTick: ${error.message}`);
            return false;
        }
    }
    
    react() {
        try {
            MacroManager.getInstance().disable();
            this.warn("Bad effect detected! Disabling macro.");
            return true;
        } catch (error) {
            Logger.error(`[BadEffectFailsafe] Error in react: ${error.message}`);
            return false;
        }
    }
}

module.exports = BadEffectFailsafe;

