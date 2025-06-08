/**
 * TeleportFailsafe - Detects teleportation and disables macro
 * Perfect 1:1 replica of Java TeleportFailsafe.java
 */

const AbstractFailsafe = require('./AbstractFailsafe');
const MacroManager = require('../src/macro/MacroManager');
const Logger = require('../src/util/Logger');
const Clock = require('../src/util/Clock');
const LagDetector = require('../src/features/LagDetector');
const { Vec3 } = require('vec3');

class TeleportFailsafe extends AbstractFailsafe {
    static instance = null;
    
    constructor() {
        super();
        
        this.originalPosition = null;
        this.triggerCheck = new Clock();
        this.potentialTeleportDetected = false;
        this.lagDetector = LagDetector.getInstance();
    }
    
    static getInstance() {
        if (!TeleportFailsafe.instance) {
            TeleportFailsafe.instance = new TeleportFailsafe();
        }
        return TeleportFailsafe.instance;
    }
    
    getName() {
        return "TeleportFailsafe";
    }
    
    getFailsafeType() {
        return "TELEPORT";
    }
    
    getPriority() {
        return 5;
    }
    
    onPacketReceive(packet, bot) {
        if (!packet || packet.name !== 'position') {
            return false;
        }
        
        try {
            const currentPlayerPos = bot.entity.position;
            const packetPlayerPos = new Vec3(packet.x, packet.y, packet.z);
            
            const distance = currentPlayerPos.distanceTo(packetPlayerPos);
            
            if (distance >= 1) {
                const lastReceivedPacketDistance = currentPlayerPos.distanceTo(
                    this.lagDetector.getLastPacketPosition()
                );
                
                // Player movement speed estimation
                const playerMovementSpeed = 0.1; // Default movement speed
                const ticksSinceLastPacket = Math.ceil(
                    this.lagDetector.getTimeSinceLastTick() / 50
                );
                const estimatedMovement = playerMovementSpeed * ticksSinceLastPacket;
                
                // Check if this is legitimate movement
                if (lastReceivedPacketDistance > 7.5 && 
                    Math.abs(lastReceivedPacketDistance - estimatedMovement) < 2) {
                    return false;
                }
                
                if (this.originalPosition === null) {
                    this.originalPosition = currentPlayerPos.clone();
                }
                
                this.potentialTeleportDetected = true;
                this.triggerCheck.schedule(500);
                return false;
            }
            
            return false;
        } catch (error) {
            Logger.error(`[TeleportFailsafe] Error in onPacketReceive: ${error.message}`);
            return false;
        }
    }
    
    onTick(bot) {
        if (!bot.entity) return false;
        
        try {
            if (this.potentialTeleportDetected && 
                this.triggerCheck.isScheduled() && 
                this.triggerCheck.passed()) {
                
                this.triggerCheck.reset();
                this.potentialTeleportDetected = false;
                
                const currentPosition = bot.entity.position;
                if (this.originalPosition !== null) {
                    const totalDisplacement = currentPosition.distanceTo(this.originalPosition);
                    this.originalPosition = null;
                    
                    if (totalDisplacement > 1) {
                        Logger.warn(`[TeleportFailsafe] Teleport detected, displacement: ${totalDisplacement}`);
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            Logger.error(`[TeleportFailsafe] Error in onTick: ${error.message}`);
            return false;
        }
    }
    
    react() {
        try {
            Logger.sendWarning("You have been teleported");
            MacroManager.getInstance().disable();
            this.reset();
            return true;
        } catch (error) {
            Logger.error(`[TeleportFailsafe] Error in react: ${error.message}`);
            return false;
        }
    }
    
    reset() {
        this.originalPosition = null;
        this.potentialTeleportDetected = false;
        this.triggerCheck.reset();
    }
}

module.exports = TeleportFailsafe;

