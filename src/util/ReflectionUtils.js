/**
 * ReflectionUtils - Reflection and dynamic method invocation utilities
 * Perfect 1:1 replica of Java ReflectionUtils.java (adapted for JavaScript)
 */

const Logger = require('./Logger');

class ReflectionUtils {
    
    /**
     * Get the value of an object property by name
     * @param {Object} obj - Target object
     * @param {string} fieldName - Property name
     * @returns {*} - Property value or null
     */
    static getField(obj, fieldName) {
        try {
            if (!obj || typeof obj !== 'object') {
                return null;
            }
            
            return obj[fieldName] || null;
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error getting field '${fieldName}': ${error.message}`);
            return null;
        }
    }
    
    /**
     * Set the value of an object property by name
     * @param {Object} obj - Target object
     * @param {string} fieldName - Property name
     * @param {*} value - Value to set
     * @returns {boolean} - True if successful
     */
    static setField(obj, fieldName, value) {
        try {
            if (!obj || typeof obj !== 'object') {
                return false;
            }
            
            obj[fieldName] = value;
            return true;
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error setting field '${fieldName}': ${error.message}`);
            return false;
        }
    }
    
    /**
     * Invoke a method on an object
     * @param {Object} obj - Target object
     * @param {string} methodName - Method name
     * @param {...*} args - Method arguments
     * @returns {*} - Method return value or null
     */
    static invokeMethod(obj, methodName, ...args) {
        try {
            if (!obj || typeof obj !== 'object') {
                return null;
            }
            
            const method = obj[methodName];
            if (typeof method !== 'function') {
                Logger.warn(`[ReflectionUtils] Method '${methodName}' is not a function`);
                return null;
            }
            
            return method.apply(obj, args);
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error invoking method '${methodName}': ${error.message}`);
            return null;
        }
    }
    
    /**
     * Check if an object has a specific property
     * @param {Object} obj - Target object
     * @param {string} fieldName - Property name
     * @returns {boolean} - True if property exists
     */
    static hasField(obj, fieldName) {
        try {
            if (!obj || typeof obj !== 'object') {
                return false;
            }
            
            return obj.hasOwnProperty(fieldName) || fieldName in obj;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check if an object has a specific method
     * @param {Object} obj - Target object
     * @param {string} methodName - Method name
     * @returns {boolean} - True if method exists
     */
    static hasMethod(obj, methodName) {
        try {
            if (!obj || typeof obj !== 'object') {
                return false;
            }
            
            return typeof obj[methodName] === 'function';
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get all property names of an object
     * @param {Object} obj - Target object
     * @param {boolean} includePrototype - Include prototype properties
     * @returns {Array<string>} - Array of property names
     */
    static getFieldNames(obj, includePrototype = false) {
        try {
            if (!obj || typeof obj !== 'object') {
                return [];
            }
            
            if (includePrototype) {
                const properties = new Set();
                let current = obj;
                
                while (current && current !== Object.prototype) {
                    Object.getOwnPropertyNames(current).forEach(prop => {
                        if (typeof obj[prop] !== 'function') {
                            properties.add(prop);
                        }
                    });
                    current = Object.getPrototypeOf(current);
                }
                
                return Array.from(properties);
            } else {
                return Object.getOwnPropertyNames(obj).filter(prop => 
                    typeof obj[prop] !== 'function'
                );
            }
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error getting field names: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Get all method names of an object
     * @param {Object} obj - Target object
     * @param {boolean} includePrototype - Include prototype methods
     * @returns {Array<string>} - Array of method names
     */
    static getMethodNames(obj, includePrototype = false) {
        try {
            if (!obj || typeof obj !== 'object') {
                return [];
            }
            
            if (includePrototype) {
                const methods = new Set();
                let current = obj;
                
                while (current && current !== Object.prototype) {
                    Object.getOwnPropertyNames(current).forEach(prop => {
                        if (typeof obj[prop] === 'function') {
                            methods.add(prop);
                        }
                    });
                    current = Object.getPrototypeOf(current);
                }
                
                return Array.from(methods);
            } else {
                return Object.getOwnPropertyNames(obj).filter(prop => 
                    typeof obj[prop] === 'function'
                );
            }
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error getting method names: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Create a new instance of a class by name
     * @param {string} className - Class name
     * @param {Object} context - Context object containing classes
     * @param {...*} args - Constructor arguments
     * @returns {Object} - New instance or null
     */
    static createInstance(className, context = global, ...args) {
        try {
            const ClassConstructor = context[className];
            
            if (typeof ClassConstructor !== 'function') {
                Logger.warn(`[ReflectionUtils] Class '${className}' not found`);
                return null;
            }
            
            return new ClassConstructor(...args);
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error creating instance of '${className}': ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get the constructor name of an object
     * @param {Object} obj - Target object
     * @returns {string} - Constructor name
     */
    static getClassName(obj) {
        try {
            if (!obj) {
                return 'null';
            }
            
            if (obj.constructor && obj.constructor.name) {
                return obj.constructor.name;
            }
            
            return Object.prototype.toString.call(obj).slice(8, -1);
        } catch (error) {
            return 'Unknown';
        }
    }
    
    /**
     * Check if an object is an instance of a specific class
     * @param {Object} obj - Target object
     * @param {Function} classConstructor - Class constructor
     * @returns {boolean} - True if instance of class
     */
    static isInstanceOf(obj, classConstructor) {
        try {
            return obj instanceof classConstructor;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} - Cloned object
     */
    static deepClone(obj) {
        try {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            
            if (obj instanceof Array) {
                return obj.map(item => this.deepClone(item));
            }
            
            if (typeof obj === 'object') {
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = this.deepClone(obj[key]);
                    }
                }
                return cloned;
            }
            
            return obj;
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error deep cloning object: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get property descriptor
     * @param {Object} obj - Target object
     * @param {string} propertyName - Property name
     * @returns {Object} - Property descriptor
     */
    static getPropertyDescriptor(obj, propertyName) {
        try {
            if (!obj || typeof obj !== 'object') {
                return null;
            }
            
            return Object.getOwnPropertyDescriptor(obj, propertyName) ||
                   Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), propertyName);
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error getting property descriptor: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Set property descriptor
     * @param {Object} obj - Target object
     * @param {string} propertyName - Property name
     * @param {Object} descriptor - Property descriptor
     * @returns {boolean} - True if successful
     */
    static setPropertyDescriptor(obj, propertyName, descriptor) {
        try {
            if (!obj || typeof obj !== 'object') {
                return false;
            }
            
            Object.defineProperty(obj, propertyName, descriptor);
            return true;
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error setting property descriptor: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Get all keys of an object including non-enumerable
     * @param {Object} obj - Target object
     * @returns {Array<string>} - Array of all keys
     */
    static getAllKeys(obj) {
        try {
            if (!obj || typeof obj !== 'object') {
                return [];
            }
            
            return Object.getOwnPropertyNames(obj);
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error getting all keys: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Safely access nested property
     * @param {Object} obj - Target object
     * @param {string} path - Property path (e.g., 'a.b.c')
     * @returns {*} - Property value or null
     */
    static getNestedProperty(obj, path) {
        try {
            if (!obj || typeof obj !== 'object' || !path) {
                return null;
            }
            
            const keys = path.split('.');
            let current = obj;
            
            for (const key of keys) {
                if (current === null || current === undefined || typeof current !== 'object') {
                    return null;
                }
                current = current[key];
            }
            
            return current;
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error getting nested property '${path}': ${error.message}`);
            return null;
        }
    }
    
    /**
     * Safely set nested property
     * @param {Object} obj - Target object
     * @param {string} path - Property path (e.g., 'a.b.c')
     * @param {*} value - Value to set
     * @returns {boolean} - True if successful
     */
    static setNestedProperty(obj, path, value) {
        try {
            if (!obj || typeof obj !== 'object' || !path) {
                return false;
            }
            
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                
                current = current[key];
            }
            
            current[keys[keys.length - 1]] = value;
            return true;
        } catch (error) {
            Logger.error(`[ReflectionUtils] Error setting nested property '${path}': ${error.message}`);
            return false;
        }
    }
}

module.exports = ReflectionUtils;

