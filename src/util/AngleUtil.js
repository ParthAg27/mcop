/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.AngleUtil
 */
const { Vec3 } = require('vec3');
const Angle = require('./helper/Angle');

class AngleUtil {
    constructor(bot) {
        this.bot = bot;
        this.randomAddition = (Math.random() * 0.3 - 0.15);
    }

    // EXACT replica of getPlayerAngle from Java
    getPlayerAngle() {
        if (!this.bot || !this.bot.entity) {
            return new Angle(0, 0);
        }
        return new Angle(this.get360RotationYaw(), this.bot.entity.pitch);
    }

    static get360RotationYaw(yaw) {
        return (yaw % 360 + 360) % 360;
    }

    // This is MathHelper::wrapAngleTo180_float
    static normalizeAngle(yaw) {
        let newYaw = yaw % 360;
        if (newYaw < -180) {
            newYaw += 360;
        }
        if (newYaw > 180) {
            newYaw -= 360;
        }
        return newYaw;
    }

    get360RotationYaw() {
        if (!this.bot || !this.bot.entity) {
            return 0;
        }
        return AngleUtil.get360RotationYaw(this.bot.entity.yaw);
    }

    static clockwiseDifference(initialYaw360, targetYaw360) {
        return AngleUtil.get360RotationYaw(targetYaw360 - initialYaw360);
    }

    static antiClockwiseDifference(initialYaw360, targetYaw360) {
        return AngleUtil.get360RotationYaw(initialYaw360 - targetYaw360);
    }

    static smallestAngleDifference(initialYaw360, targetYaw360) {
        return Math.min(
            AngleUtil.clockwiseDifference(initialYaw360, targetYaw360),
            AngleUtil.antiClockwiseDifference(initialYaw360, targetYaw360)
        );
    }

    static getVectorForRotation(pitch, yaw) {
        const f = Math.cos(-yaw * 0.017453292 - Math.PI);
        const f1 = Math.sin(-yaw * 0.017453292 - Math.PI);
        const f2 = -Math.cos(-pitch * 0.017453292);
        const f3 = Math.sin(-pitch * 0.017453292);
        return new Vec3(f1 * f2, f3, f * f2);
    }

    static getVectorForRotationYaw(yaw) {
        return new Vec3(
            -Math.sin(-yaw * 0.017453292 - Math.PI),
            0,
            -Math.cos(-yaw * 0.017453292 - Math.PI)
        );
    }

    getRotation(to) {
        if (!this.bot || !this.bot.entity || !to) {
            return new Angle(0, 0);
        }
        try {
            const eyePos = this.getPlayerEyePos();
            return this.getRotationFromTo(eyePos, to);
        } catch (error) {
            return new Angle(0, 0);
        }
    }

    getRotationToEntity(entity) {
        if (!this.bot || !this.bot.entity || !entity) {
            return new Angle(0, 0);
        }
        try {
            const eyePos = this.getPlayerEyePos();
            const entityPos = entity.position.offset(
                0,
                Math.min((entity.height * 0.85) + this.randomAddition, 1.7),
                0
            );
            return this.getRotationFromTo(eyePos, entityPos);
        } catch (error) {
            return new Angle(0, 0);
        }
    }

    getRotationToBlock(blockPos) {
        if (!this.bot || !this.bot.entity || !blockPos) {
            return new Angle(0, 0);
        }
        try {
            const eyePos = this.getPlayerEyePos();
            const targetPos = new Vec3(blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5);
            return this.getRotationFromTo(eyePos, targetPos);
        } catch (error) {
            return new Angle(0, 0);
        }
    }

    getRotationFromTo(from, to) {
        if (!from || !to) {
            return new Angle(0, 0);
        }
        
        try {
            const xDiff = to.x - from.x;
            const yDiff = to.y - from.y;
            const zDiff = to.z - from.z;

            const dist = Math.sqrt(xDiff * xDiff + zDiff * zDiff);
            
            // Prevent division by zero
            if (dist === 0) {
                return new Angle(0, 0);
            }

            const yaw = Math.atan2(zDiff, xDiff) * 180 / Math.PI - 90;
            const pitch = -Math.atan2(yDiff, dist) * 180 / Math.PI;
            
            // Check for NaN values
            if (isNaN(yaw) || isNaN(pitch)) {
                return new Angle(0, 0);
            }

            return new Angle(yaw, pitch);
        } catch (error) {
            return new Angle(0, 0);
        }
    }

    getRotationYaw(to) {
        if (!this.bot || !this.bot.entity || !to) {
            return 0;
        }
        try {
            const result = -Math.atan2(to.x - this.bot.entity.position.x, to.z - this.bot.entity.position.z) * 180 / Math.PI;
            return isNaN(result) ? 0 : result;
        } catch (error) {
            return 0;
        }
    }

    static getRotationYawFromTo(from, to) {
        if (!from || !to) {
            return 0;
        }
        try {
            const result = -Math.atan2(to.x - from.x, to.z - from.z) * 180 / Math.PI;
            return isNaN(result) ? 0 : result;
        } catch (error) {
            return 0;
        }
    }

    getRotationYaw360(to) {
        if (!this.bot || !this.bot.entity || !to) {
            return 0;
        }
        try {
            let yaw = -Math.atan2(to.x - this.bot.entity.position.x, to.z - this.bot.entity.position.z) * 180 / Math.PI;
            if (isNaN(yaw)) {
                return 0;
            }
            if (yaw < 0) {
                return yaw + 360;
            }
            return yaw;
        } catch (error) {
            return 0;
        }
    }

    static getRotationYaw360FromTo(from, to) {
        if (!from || !to) {
            return 0;
        }
        try {
            let yaw = -Math.atan2(to.x - from.x, to.z - from.z) * 180 / Math.PI;
            if (isNaN(yaw)) {
                return 0;
            }
            if (yaw < 0) {
                return yaw + 360;
            }
            return yaw;
        } catch (error) {
            return 0;
        }
    }

    // start and end should be normalized
    static getNeededYawChange(start, end) {
        return AngleUtil.normalizeAngle(end - start);
    }

    static getNeededChange(startAngle, endAngle) {
        if (!startAngle || !endAngle) {
            return new Angle(0, 0);
        }
        try {
            const yawChange = AngleUtil.normalizeAngle(
                AngleUtil.normalizeAngle(endAngle.getYaw()) - 
                AngleUtil.normalizeAngle(startAngle.getYaw())
            );
            const pitchChange = endAngle.getPitch() - startAngle.getPitch();
            
            if (isNaN(yawChange) || isNaN(pitchChange)) {
                return new Angle(0, 0);
            }
            
            return new Angle(yawChange, pitchChange);
        } catch (error) {
            return new Angle(0, 0);
        }
    }

    isLookingAtDebug(vec, distance) {
        if (!vec || !this.bot || !this.bot.entity) {
            return false;
        }
        try {
            console.log('PlayerAngle:', this.getPlayerAngle().toString());
            console.log('RotationForVec:', this.getRotation(vec).toString());
            const change = AngleUtil.getNeededChange(this.getPlayerAngle(), this.getRotation(vec));
            if (!change) {
                return false;
            }
            console.log('Change:', change.toString(), ', Dist:', distance);
            return Math.abs(change.getYaw()) <= distance && Math.abs(change.getPitch()) <= distance;
        } catch (error) {
            return false;
        }
    }

    isLookingAt(vec, distance) {
        if (!vec || !this.bot || !this.bot.entity) {
            return false;
        }
        try {
            const change = AngleUtil.getNeededChange(this.getPlayerAngle(), this.getRotation(vec));
            if (!change) {
                return false;
            }
            return Math.abs(change.getYaw()) <= distance && Math.abs(change.getPitch()) <= distance;
        } catch (error) {
            return false;
        }
    }

    getPlayerEyePos() {
        if (!this.bot || !this.bot.entity) {
            return new Vec3(0, 0, 0);
        }
        const pos = this.bot.entity.position;
        return new Vec3(pos.x, pos.y + this.bot.entity.eyeHeight, pos.z);
    }

    // Static methods for global access
    static getStaticPlayerAngle(bot) {
        if (!bot || !bot.entity) {
            return new Angle(0, 0);
        }
        return new Angle(AngleUtil.get360RotationYaw(bot.entity.yaw), bot.entity.pitch);
    }

    static getStaticRotation(bot, to) {
        const util = new AngleUtil(bot);
        return util.getRotation(to);
    }

    static getStaticRotationToBlock(bot, blockPos) {
        const util = new AngleUtil(bot);
        return util.getRotationToBlock(blockPos);
    }
}

module.exports = AngleUtil;

