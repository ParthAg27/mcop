const RotationHandler = require('../handlers/RotationHandler');
const PlayerUtil = require('../util/PlayerUtil');
const BlockUtil = require('../util/BlockUtil');
const AngleUtil = require('../util/AngleUtil');
const KeyBindUtil = require('../util/KeyBindUtil');
const StrafeUtil = require('../util/StrafeUtil');
const Logger = require('../util/Logger');
const Clock = require('../util/helper/Clock');
const Angle = require('../util/helper/Angle');
const MightyMinerConfig = require('../config/MightyMinerConfig');
const { Vec3 } = require('vec3');

/**
 * PathExecutor - Advanced pathfinding execution system
 * Perfect 1:1 replica of Java PathExecutor
 * 
 * Features:
 * - Queue-based path execution
 * - Intelligent movement and rotation
 * - Sprint and jump optimization
 * - Stuck detection and recovery
 * - Interpolated movement
 */
class PathExecutor {
    constructor(bot) {
        this.bot = bot;
        this.name = 'PathExecutor';
        
        // Singleton pattern
        if (!PathExecutor._instance) {
            PathExecutor._instance = this;
        }
        
        // Path management
        this.pathQueue = [];
        this.map = new Map();
        this.blockPath = [];
        this.stuckTimer = new Clock();
        
        // State management
        this.enabled = false;
        this.prev = null;
        this.curr = null;
        this.failed = false;
        this.succeeded = false;
        this.pastTarget = false;
        
        // Movement parameters
        this.target = 0;
        this.previous = -1;
        this.nodeChangeTime = 0;
        this.interpolated = true;
        this.interpolYawDiff = 0;
        
        // Configuration
        this.allowSprint = true;
        this.allowInterpolation = false;
        
        // Dynamic pitch for natural movement
        this.random = Math.random;
        this.lastPitch = 10 + (15 - 10) * this.random();
        this.dynamicPitch = new Clock();
        
        // State enumeration
        this.state = 'STARTING_PATH';
    }
    
    static getInstance(bot) {
        if (!PathExecutor._instance && bot) {
            PathExecutor._instance = new PathExecutor(bot);
        }
        return PathExecutor._instance;
    }
    
    /**
     * Queue a path for execution
     * @param {Object} path - Path object with start, goal, and path points
     */
    queuePath(path) {
        if (!path.path || path.path.length === 0) {
            this.error('Path is empty');
            this.failed = true;
            return;
        }
        
        const start = path.start;
        const lastPath = this.curr || this.pathQueue[this.pathQueue.length - 1];
        
        if (lastPath && !lastPath.goal.isAtGoal(start.x, start.y, start.z)) {
            this.error(`This path segment does not start at last path's goal. LastPathGoal: ${JSON.stringify(lastPath.goal)}, ThisPathStart: ${JSON.stringify(start)}`);
            this.failed = true;
            return;
        }
        
        this.pathQueue.push(path);
    }
    
    start() {
        this.state = 'STARTING_PATH';
        this.enabled = true;
    }
    
    stop() {
        this.enabled = false;
        this.pathQueue.length = 0;
        this.blockPath.length = 0;
        this.map.clear();
        this.curr = null;
        this.prev = null;
        this.target = 0;
        this.previous = -1;
        this.pastTarget = false;
        this.state = 'END';
        this.interpolYawDiff = 0;
        this.allowSprint = true;
        this.allowInterpolation = false;
        this.nodeChangeTime = 0;
        this.interpolated = true;
        
        // Stop related systems
        StrafeUtil.enabled = false;
        RotationHandler.getInstance(this.bot).stop();
        KeyBindUtil.releaseAllExcept(this.bot);
    }
    
    clearQueue() {
        this.pathQueue.length = 0;
        this.curr = null;
        this.succeeded = true;
        this.failed = false;
        this.interpolated = false;
        this.target = 0;
        this.previous = -1;
    }
    
    /**
     * Main tick function for path execution
     * @returns {boolean} True if completed or waiting
     */
    onTick() {
        if (!this.enabled) {
            return false;
        }
        
        // Check stuck timer
        if (this.stuckTimer.isScheduled() && this.stuckTimer.passed()) {
            this.log('Was stuck for a second');
            this.failed = true;
            this.succeeded = false;
            this.stop();
            return false;
        }
        
        const playerPos = PlayerUtil.getBlockStandingOn(this.bot);
        
        if (this.curr) {
            // Update current position in path
            const blockHashes = this.map.get(this.pack(playerPos.x, playerPos.z));
            let current = -1;
            
            if (blockHashes && blockHashes.length > 0) {
                let bestY = -1;
                const playerY = this.bot.entity.position.y;
                
                for (const blockHash of blockHashes) {
                    const block = this.unpack(blockHash);
                    const blockY = block.first;
                    const blockTarget = block.second;
                    
                    if (blockTarget > this.previous) {
                        if (bestY === -1 || (blockY < playerY && blockY > bestY) || (blockY >= playerY && blockY < bestY)) {
                            bestY = block.first;
                            current = blockTarget;
                        }
                    }
                }
            }
            
            if (current !== -1 && current > this.previous) {
                this.previous = current;
                this.target = current + 1;
                this.state = 'TRAVERSING';
                this.pastTarget = false;
                this.interpolated = false;
                this.interpolYawDiff = 0;
                this.nodeChangeTime = Date.now();
                this.log(`Changed target from ${this.previous} to ${this.target}`);
                RotationHandler.getInstance(this.bot).stop();
            }
            
            // Check if stuck
            const velocity = this.bot.entity.velocity;
            const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            
            if (horizontalSpeed < 0.05) {
                if (!this.stuckTimer.isScheduled()) {
                    this.stuckTimer.schedule(1000);
                }
            } else {
                this.stuckTimer.reset();
            }
        } else {
            if (this.stuckTimer.isScheduled()) {
                this.stuckTimer.reset();
            }
            if (this.pathQueue.length === 0) {
                return true;
            }
        }
        
        // Load next path if current is completed
        if (!this.curr || this.target >= this.blockPath.length) {
            this.log('Path traversed');
            if (this.pathQueue.length === 0) {
                this.log('Path queue is empty');
                if (this.curr) {
                    this.curr = null;
                    this.target = 0;
                    this.previous = -1;
                }
                this.state = 'WAITING';
                return true;
            }
            
            this.succeeded = true;
            this.failed = false;
            this.prev = this.curr;
            this.target = 1;
            this.previous = 0;
            this.loadPath(this.pathQueue.shift());
            
            if (this.target >= this.blockPath.length) {
                return true;
            }
            
            this.log(`Loaded new path target: ${this.target}, prev: ${this.previous}`);
        }
        
        const targetPos = this.blockPath[this.target];
        
        // Check if we can skip to next target
        if (this.target < this.blockPath.length - 1) {
            const nextTarget = this.blockPath[this.target + 1];
            const playerDistToNext = this.distanceSq(playerPos, nextTarget);
            const targetDistToNext = this.distanceSq(targetPos, nextTarget);
            
            if ((this.pastTarget || (this.pastTarget = playerDistToNext > targetDistToNext)) && playerDistToNext < targetDistToNext) {
                this.previous = this.target;
                this.target++;
                this.log('Walked past target');
            }
        }
        
        const onGround = this.bot.entity.onGround;
        const targetX = targetPos.x;
        const targetZ = targetPos.z;
        const horizontalDistToTarget = Math.sqrt(
            Math.pow(this.bot.entity.position.x - targetX - 0.5, 2) +
            Math.pow(this.bot.entity.position.z - targetZ - 0.5, 2)
        );
        
        const yaw = AngleUtil.getRotationYaw360(
            this.bot.entity.position,
            new Vec3(targetX + 0.5, 0, targetZ + 0.5)
        );
        
        const currentYaw = AngleUtil.get360RotationYaw(this.bot);
        const yawDiff = Math.abs(currentYaw - yaw);
        
        if (this.interpolYawDiff === 0) {
            this.interpolYawDiff = yaw - currentYaw;
        }
        
        // Handle rotation
        if (yawDiff > 3 && !RotationHandler.getInstance(this.bot).isEnabled()) {
            let rotYaw = yaw;
            
            // Look at a block that's at least 5 blocks away for smoother rotation
            for (let i = this.target; i < this.blockPath.length; i++) {
                const rotationTarget = this.blockPath[i];
                const distToTarget = Math.sqrt(
                    Math.pow(this.bot.entity.position.x - rotationTarget.x, 2) +
                    Math.pow(this.bot.entity.position.z - rotationTarget.z, 2)
                );
                
                if (distToTarget > 5) {
                    rotYaw = AngleUtil.getRotation(this.bot, rotationTarget).yaw;
                    break;
                }
            }
            
            const time = MightyMinerConfig.getFixRot() ? MightyMinerConfig.getRotTime() :
                       Math.max(300, 400 - horizontalDistToTarget * MightyMinerConfig.getRotMult());
            
            if (!this.dynamicPitch.isScheduled() || this.dynamicPitch.passed()) {
                this.lastPitch = 10 + (15 - 10) * this.random();
                this.dynamicPitch.schedule(1000);
            }
            
            const macroManager = require('../macro/MacroManager');
            const isRouteMiner = macroManager.getInstance(this.bot).isRunning() &&
                               macroManager.getInstance(this.bot).getCurrentMacro().name === 'RouteMinerMacro';
            
            const targetPitch = MightyMinerConfig.getRouteType() && isRouteMiner ? 90 : this.lastPitch;
            
            RotationHandler.getInstance(this.bot).easeTo({
                target: new Angle(rotYaw, targetPitch),
                duration: time,
                callback: null
            });
        }
        
        // Handle interpolated yaw
        let ipYaw = yaw;
        if (onGround && horizontalDistToTarget >= 8 && this.allowInterpolation && !this.interpolated) {
            const time = 200;
            const timePassed = Math.min(time, Date.now() - this.nodeChangeTime);
            ipYaw -= this.interpolYawDiff * (1 - (timePassed / time));
            
            if (timePassed >= time) {
                this.interpolated = true;
            }
        }
        
        // Movement control
        StrafeUtil.enabled = yawDiff > 3;
        StrafeUtil.yaw = ipYaw;
        
        const pos = new Vec3(this.bot.entity.position.x, playerPos.y + 0.5, this.bot.entity.position.z);
        const vec4Rot = AngleUtil.getVectorForRotation(yaw);
        const shouldJump = BlockUtil.canWalkBetween(
            this.bot,
            pos,
            pos.plus(new Vec3(vec4Rot.x, 1, vec4Rot.z))
        );
        
        // Set movement states
        KeyBindUtil.setKeyBindState(this.bot, 'forward', true);
        KeyBindUtil.setKeyBindState(this.bot, 'sprint', this.allowSprint && yawDiff < 40 && !shouldJump);
        
        if (shouldJump && onGround) {
            this.bot.setControlState('jump', true);
            this.state = 'JUMPING';
        }
        
        KeyBindUtil.setKeyBindState(this.bot, 'jump', shouldJump);
        
        return this.distanceSq(playerPos, targetPos) < 100;
    }
    
    loadPath(path) {
        this.blockPath.length = 0;
        this.map.clear();
        
        this.curr = path;
        this.blockPath.push(...path.smoothedPath);
        
        for (let i = 0; i < this.blockPath.length; i++) {
            const pos = this.blockPath[i];
            const key = this.pack(pos.x, pos.z);
            
            if (!this.map.has(key)) {
                this.map.set(key, []);
            }
            this.map.get(key).push(this.pack(pos.y, i));
        }
    }
    
    // Utility methods
    pack(x, z) {
        return (BigInt(x) << 32n) | BigInt(z & 0xFFFFFFFF);
    }
    
    unpack(packed) {
        return {
            first: Number(packed >> 32n),
            second: Number(packed & 0xFFFFFFFFn)
        };
    }
    
    distanceSq(pos1, pos2) {
        return Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2);
    }
    
    // Getters
    getPathQueue() {
        return this.pathQueue;
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    getState() {
        return this.state;
    }
    
    getPreviousPath() {
        return this.prev;
    }
    
    getCurrentPath() {
        return this.curr;
    }
    
    failed() {
        return !this.enabled && this.failed;
    }
    
    ended() {
        return !this.enabled && this.succeeded;
    }
    
    // Setters
    setAllowSprint(allow) {
        this.allowSprint = allow;
    }
    
    setAllowInterpolation(allow) {
        this.allowInterpolation = allow;
    }
    
    // Logging methods
    log(message) {
        Logger.info(this.bot, `[PathExecutor] ${message}`);
    }
    
    send(message) {
        Logger.info(this.bot, `[PathExecutor] ${message}`);
    }
    
    error(message) {
        Logger.error(this.bot, `[PathExecutor] ${message}`);
    }
    
    note(message) {
        Logger.info(this.bot, `[PathExecutor] ${message}`);
    }
}

// State enumeration
PathExecutor.State = {
    STARTING_PATH: 'STARTING_PATH',
    TRAVERSING: 'TRAVERSING',
    JUMPING: 'JUMPING',
    WAITING: 'WAITING',
    END: 'END'
};

module.exports = PathExecutor;

