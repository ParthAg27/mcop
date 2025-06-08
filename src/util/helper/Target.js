/**
 * Target - Represents a target for rotation/interaction
 * Perfect 1:1 replica of Java Target.java
 */

const AngleUtil = require('../AngleUtil');
const Angle = require('./Angle');
const { Vec3 } = require('vec3');

class Target {
    constructor(input) {
        this.vec = null;
        this.entity = null;
        this.blockPos = null;
        this.angle = null;
        this.additionalY = (1 + Math.random()) * 0.75;
        
        if (input instanceof Vec3) {
            this.vec = input;
        } else if (input && typeof input === 'object' && input.position) {
            this.entity = input;
        } else if (input && typeof input === 'object' && typeof input.x === 'number') {
            this.blockPos = input;
        } else if (input instanceof Angle) {
            this.angle = input;
        }
    }
    
    /**
     * Set additional Y offset for entity targeting
     * @param {number} y - Y offset
     * @returns {Target} - This target for chaining
     */
    additionalY(y) {
        this.additionalY = y;
        return this;
    }
    
    /**
     * Get the target angle for rotation
     * @returns {Angle} - Target angle
     */
    getTargetAngle() {
        if (this.blockPos !== null) {
            return AngleUtil.getRotation(this.blockPos);
        }
        
        if (this.vec !== null) {
            return AngleUtil.getRotation(this.vec);
        }
        
        if (this.entity !== null) {
            const entityPos = this.entity.position || this.entity;
            const targetPos = new Vec3(entityPos.x, entityPos.y + this.additionalY, entityPos.z);
            return AngleUtil.getRotation(targetPos);
        }
        
        return this.angle || new Angle(0, 0);
    }
    
    /**
     * Get the target position as Vec3
     * @returns {Vec3} - Target position
     */
    getPosition() {
        if (this.vec !== null) {
            return this.vec;
        }
        
        if (this.blockPos !== null) {
            return new Vec3(this.blockPos.x, this.blockPos.y, this.blockPos.z);
        }
        
        if (this.entity !== null) {
            const entityPos = this.entity.position || this.entity;
            return new Vec3(entityPos.x, entityPos.y + this.additionalY, entityPos.z);
        }
        
        return new Vec3(0, 0, 0);
    }
    
    /**
     * Check if this target has a valid position
     * @returns {boolean} - True if target is valid
     */
    isValid() {
        return this.vec !== null || this.blockPos !== null || 
               this.entity !== null || this.angle !== null;
    }
    
    /**
     * Get the type of this target
     * @returns {string} - Target type
     */
    getType() {
        if (this.vec !== null) return 'vec3';
        if (this.blockPos !== null) return 'blockpos';
        if (this.entity !== null) return 'entity';
        if (this.angle !== null) return 'angle';
        return 'unknown';
    }
    
    toString() {
        return `Target{Vec3: ${this.vec}, Entity: ${this.entity ? this.entity.id || 'unknown' : 'null'}, Pos: ${this.blockPos}, Angle: ${this.angle}}`;
    }
}

module.exports = Target;

