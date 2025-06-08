/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.helper.Angle
 */
class Angle {
    constructor(yaw, pitch) {
        this.yaw = yaw || 0.0;
        this.pitch = pitch || 0.0;
    }
    
    getYaw() {
        return this.yaw;
    }
    
    getPitch() {
        return this.pitch;
    }
    
    setYaw(yaw) {
        this.yaw = yaw;
    }
    
    setPitch(pitch) {
        this.pitch = pitch;
    }
    
    add(other) {
        if (!other) return this;
        return new Angle(this.yaw + other.yaw, this.pitch + other.pitch);
    }
    
    subtract(other) {
        if (!other) return this;
        return new Angle(this.yaw - other.yaw, this.pitch - other.pitch);
    }
    
    lengthSqrt() {
        return Math.sqrt(this.yaw * this.yaw + this.pitch * this.pitch);
    }
    
    length() {
        return this.yaw * this.yaw + this.pitch * this.pitch;
    }
    
    toString() {
        return `Angle(yaw=${this.yaw.toFixed(3)}, pitch=${this.pitch.toFixed(3)})`;
    }
    
    equals(other) {
        if (!other) return false;
        return Math.abs(this.yaw - other.yaw) < 0.001 && Math.abs(this.pitch - other.pitch) < 0.001;
    }
    
    clone() {
        return new Angle(this.yaw, this.pitch);
    }
}

module.exports = Angle;

