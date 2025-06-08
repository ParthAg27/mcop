/**
 * Location - Skyblock location enumeration
 * Perfect 1:1 replica of Java Location.java
 */

class Location {
    constructor(name) {
        this.name = name;
    }
    
    getName() {
        return this.name;
    }
    
    toString() {
        return this.name;
    }
    
    // Static location instances
    static PRIVATE_ISLAND = new Location("Private Island");
    static HUB = new Location("Hub");
    static THE_PARK = new Location("The Park");
    static THE_FARMING_ISLANDS = new Location("The Farming Islands");
    static SPIDER_DEN = new Location("Spider's Den");
    static THE_END = new Location("The End");
    static CRIMSON_ISLE = new Location("Crimson Isle");
    static GOLD_MINE = new Location("Gold Mine");
    static DEEP_CAVERNS = new Location("Deep Caverns");
    static DWARVEN_MINES = new Location("Dwarven Mines");
    static CRYSTAL_HOLLOWS = new Location("Crystal Hollows");
    static JERRY_WORKSHOP = new Location("Jerry's Workshop");
    static DUNGEON_HUB = new Location("Dungeon Hub");
    static GARDEN = new Location("Garden");
    static DUNGEON = new Location("Dungeon");
    static LIMBO = new Location("UNKNOWN");
    static LOBBY = new Location("PROTOTYPE");
    static KNOWHERE = new Location("Knowhere");
    
    // Create name to location mapping
    static nameToLocationMap = new Map();
    
    /**
     * Get location by name
     * @param {string} name - Location name
     * @returns {Location} - Location instance or KNOWHERE if not found
     */
    static fromName(name) {
        const location = Location.nameToLocationMap.get(name);
        return location || Location.KNOWHERE;
    }
    
    /**
     * Get all available locations
     * @returns {Array<Location>} - Array of all locations
     */
    static values() {
        return [
            Location.PRIVATE_ISLAND,
            Location.HUB,
            Location.THE_PARK,
            Location.THE_FARMING_ISLANDS,
            Location.SPIDER_DEN,
            Location.THE_END,
            Location.CRIMSON_ISLE,
            Location.GOLD_MINE,
            Location.DEEP_CAVERNS,
            Location.DWARVEN_MINES,
            Location.CRYSTAL_HOLLOWS,
            Location.JERRY_WORKSHOP,
            Location.DUNGEON_HUB,
            Location.GARDEN,
            Location.DUNGEON,
            Location.LIMBO,
            Location.LOBBY,
            Location.KNOWHERE
        ];
    }
    
    /**
     * Check if this location is a mining location
     * @returns {boolean} - True if mining location
     */
    isMiningLocation() {
        return this === Location.DWARVEN_MINES || 
               this === Location.CRYSTAL_HOLLOWS ||
               this === Location.DEEP_CAVERNS ||
               this === Location.GOLD_MINE;
    }
    
    /**
     * Check if this location is skyblock
     * @returns {boolean} - True if skyblock location
     */
    isSkyblock() {
        return this !== Location.LIMBO && 
               this !== Location.LOBBY && 
               this !== Location.KNOWHERE;
    }
}

// Initialize the name mapping
Location.values().forEach(location => {
    Location.nameToLocationMap.set(location.getName(), location);
});

module.exports = Location;

