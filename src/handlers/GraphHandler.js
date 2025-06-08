/**
 * GraphHandler - Advanced graph management for route building and pathfinding
 * Perfect 1:1 replica of Java GraphHandler.java
 */

const Graph = require('../util/helper/graph/Graph');
const RouteWaypoint = require('../util/helper/route/RouteWaypoint');
const PlayerUtil = require('../util/PlayerUtil');
const Logger = require('../util/Logger');
const fs = require('fs');
const path = require('path');
const { Vec3 } = require('vec3');

class GraphHandler {
    static instance = null;
    
    constructor() {
        this.graphs = new Map();
        this.activeGraphKey = "default";
        this.editing = false;
        this.dirty = false;
        this.lastPos = null;
        
        // Graph building state
        this.recording = false;
        this.currentPath = [];
        this.autoSaveInterval = 30000; // 30 seconds
        this.lastSave = Date.now();
        
        // Ensure default graph exists
        this.getActiveGraph();
    }
    
    static getInstance() {
        if (!GraphHandler.instance) {
            GraphHandler.instance = new GraphHandler();
        }
        return GraphHandler.instance;
    }
    
    /**
     * Get the currently active graph
     * @returns {Graph} - Active graph instance
     */
    getActiveGraph() {
        if (!this.graphs.has(this.activeGraphKey)) {
            this.graphs.set(this.activeGraphKey, new Graph());
        }
        return this.graphs.get(this.activeGraphKey);
    }
    
    /**
     * Switch to a different graph
     * @param {string|AbstractMacro} graphKey - Graph key or macro instance
     */
    switchGraph(graphKey) {
        if (typeof graphKey === 'object' && graphKey.getName) {
            this.activeGraphKey = graphKey.getName();
        } else {
            this.activeGraphKey = graphKey;
        }
        
        this.getActiveGraph();
        Logger.info(`[GraphHandler] Switched to graph: ${this.activeGraphKey}`);
    }
    
    /**
     * Toggle edit mode for a graph
     * @param {string} graphName - Graph name
     */
    toggleEdit(graphName) {
        if (!this.graphs.has(graphName)) {
            Logger.warn(`[GraphHandler] Graph '${graphName}' does not exist`);
            return;
        }
        
        this.activeGraphKey = graphName;
        
        if (this.editing) {
            this.stopEditing();
        } else {
            this.startEditing();
        }
    }
    
    /**
     * Start editing mode
     */
    startEditing() {
        this.editing = true;
        this.recording = false;
        this.currentPath = [];
        Logger.info(`[GraphHandler] Started editing graph: ${this.activeGraphKey}`);
    }
    
    /**
     * Stop editing mode
     */
    stopEditing() {
        if (this.recording) {
            this.stopRecording();
        }
        
        this.editing = false;
        this.dirty = false;
        
        // Auto-save if changes were made
        if (this.dirty) {
            this.saveGraph(this.activeGraphKey);
        }
        
        Logger.info(`[GraphHandler] Stopped editing graph: ${this.activeGraphKey}`);
    }
    
    /**
     * Start recording a path
     * @param {Object} bot - Mineflayer bot instance
     */
    startRecording(bot) {
        if (!this.editing) {
            Logger.warn("[GraphHandler] Must be in edit mode to start recording");
            return;
        }
        
        this.recording = true;
        this.currentPath = [];
        
        if (bot && bot.entity) {
            this.lastPos = new RouteWaypoint(bot.entity.position.clone());
        }
        
        Logger.info("[GraphHandler] Started recording path");
    }
    
    /**
     * Stop recording and add path to graph
     */
    stopRecording() {
        if (!this.recording) {
            return;
        }
        
        this.recording = false;
        
        if (this.currentPath.length > 1) {
            this.addPathToGraph(this.currentPath);
            Logger.info(`[GraphHandler] Added path with ${this.currentPath.length} waypoints`);
        } else {
            Logger.warn("[GraphHandler] Path too short, not added to graph");
        }
        
        this.currentPath = [];
    }
    
    /**
     * Add a waypoint at current position
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} action - Action type for waypoint
     */
    addWaypoint(bot, action = "MOVE") {
        if (!this.editing) {
            Logger.warn("[GraphHandler] Must be in edit mode to add waypoints");
            return;
        }
        
        if (!bot || !bot.entity) {
            Logger.warn("[GraphHandler] Bot entity not available");
            return;
        }
        
        const waypoint = new RouteWaypoint(bot.entity.position.clone(), action);
        const graph = this.getActiveGraph();
        
        graph.add(waypoint);
        
        if (this.lastPos) {
            graph.addEdge(this.lastPos, waypoint, false);
        }
        
        this.lastPos = waypoint;
        this.dirty = true;
        
        Logger.info(`[GraphHandler] Added waypoint at ${waypoint.getPosition()}`);
    }
    
    /**
     * Remove nearest waypoint
     * @param {Object} bot - Mineflayer bot instance
     * @param {number} maxDistance - Maximum distance to consider
     */
    removeNearestWaypoint(bot, maxDistance = 5.0) {
        if (!this.editing) {
            Logger.warn("[GraphHandler] Must be in edit mode to remove waypoints");
            return;
        }
        
        if (!bot || !bot.entity) {
            return;
        }
        
        const playerPos = bot.entity.position;
        const graph = this.getActiveGraph();
        const nodes = graph.getNodes();
        
        let nearestWaypoint = null;
        let nearestDistance = maxDistance;
        
        for (const waypoint of nodes) {
            const distance = playerPos.distanceTo(waypoint.getPosition());
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestWaypoint = waypoint;
            }
        }
        
        if (nearestWaypoint) {
            graph.remove(nearestWaypoint);
            this.dirty = true;
            Logger.info(`[GraphHandler] Removed waypoint at ${nearestWaypoint.getPosition()}`);
        } else {
            Logger.warn("[GraphHandler] No waypoint found within range");
        }
    }
    
    /**
     * Connect two waypoints
     * @param {RouteWaypoint} waypoint1 - First waypoint
     * @param {RouteWaypoint} waypoint2 - Second waypoint
     * @param {boolean} bidirectional - Whether connection is bidirectional
     */
    connectWaypoints(waypoint1, waypoint2, bidirectional = true) {
        if (!this.editing) {
            Logger.warn("[GraphHandler] Must be in edit mode to connect waypoints");
            return;
        }
        
        const graph = this.getActiveGraph();
        graph.addEdge(waypoint1, waypoint2, bidirectional);
        this.dirty = true;
        
        Logger.info(`[GraphHandler] Connected waypoints${bidirectional ? ' (bidirectional)' : ''}`);
    }
    
    /**
     * Find path between two positions
     * @param {Vec3} start - Start position
     * @param {Vec3} end - End position
     * @returns {Array<RouteWaypoint>} - Path waypoints
     */
    findPath(start, end) {
        const graph = this.getActiveGraph();
        const nodes = graph.getNodes();
        
        if (nodes.length === 0) {
            return [];
        }
        
        // Find nearest waypoints to start and end positions
        const startWaypoint = this.findNearestWaypoint(start);
        const endWaypoint = this.findNearestWaypoint(end);
        
        if (!startWaypoint || !endWaypoint) {
            return [];
        }
        
        // Use graph pathfinding
        return graph.findPath(startWaypoint, endWaypoint);
    }
    
    /**
     * Find nearest waypoint to position
     * @param {Vec3} position - Target position
     * @returns {RouteWaypoint|null} - Nearest waypoint or null
     */
    findNearestWaypoint(position) {
        const graph = this.getActiveGraph();
        const nodes = graph.getNodes();
        
        let nearest = null;
        let nearestDistance = Infinity;
        
        for (const waypoint of nodes) {
            const distance = position.distanceTo(waypoint.getPosition());
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = waypoint;
            }
        }
        
        return nearest;
    }
    
    /**
     * Add a complete path to the graph
     * @param {Array<RouteWaypoint>} path - Path waypoints
     */
    addPathToGraph(path) {
        if (path.length < 2) {
            return;
        }
        
        const graph = this.getActiveGraph();
        
        // Add all waypoints
        for (const waypoint of path) {
            graph.add(waypoint);
        }
        
        // Connect sequential waypoints
        for (let i = 0; i < path.length - 1; i++) {
            graph.addEdge(path[i], path[i + 1], false);
        }
        
        this.dirty = true;
    }
    
    /**
     * Update recording with current position
     * @param {Object} bot - Mineflayer bot instance
     */
    updateRecording(bot) {
        if (!this.recording || !bot || !bot.entity) {
            return;
        }
        
        const currentPos = bot.entity.position;
        
        // Check if we've moved enough to record a new waypoint
        if (!this.lastPos || currentPos.distanceTo(this.lastPos.getPosition()) > 3.0) {
            const waypoint = new RouteWaypoint(currentPos.clone());
            this.currentPath.push(waypoint);
            this.lastPos = waypoint;
        }
    }
    
    /**
     * Save graph to file
     * @param {string} graphName - Graph name
     */
    saveGraph(graphName) {
        try {
            if (!this.graphs.has(graphName)) {
                Logger.warn(`[GraphHandler] Graph '${graphName}' does not exist`);
                return;
            }
            
            const graph = this.graphs.get(graphName);
            const graphData = {
                name: graphName,
                nodes: graph.getNodes().map(node => node.toJSON()),
                edges: this.serializeEdges(graph),
                timestamp: Date.now()
            };
            
            const graphsDir = path.join(process.cwd(), 'graphs');
            if (!fs.existsSync(graphsDir)) {
                fs.mkdirSync(graphsDir, { recursive: true });
            }
            
            const filePath = path.join(graphsDir, `${graphName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2));
            
            this.dirty = false;
            this.lastSave = Date.now();
            
            Logger.info(`[GraphHandler] Saved graph '${graphName}' to ${filePath}`);
        } catch (error) {
            Logger.error(`[GraphHandler] Error saving graph: ${error.message}`);
        }
    }
    
    /**
     * Load graph from file
     * @param {string} graphName - Graph name
     */
    loadGraph(graphName) {
        try {
            const filePath = path.join(process.cwd(), 'graphs', `${graphName}.json`);
            
            if (!fs.existsSync(filePath)) {
                Logger.warn(`[GraphHandler] Graph file '${filePath}' does not exist`);
                return false;
            }
            
            const graphData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const graph = new Graph();
            
            // Load nodes
            const nodeMap = new Map();
            for (const nodeData of graphData.nodes) {
                const waypoint = RouteWaypoint.fromJSON(nodeData);
                graph.add(waypoint);
                nodeMap.set(nodeData.id || nodeData.position, waypoint);
            }
            
            // Load edges
            this.deserializeEdges(graph, graphData.edges, nodeMap);
            
            this.graphs.set(graphName, graph);
            Logger.info(`[GraphHandler] Loaded graph '${graphName}' from ${filePath}`);
            
            return true;
        } catch (error) {
            Logger.error(`[GraphHandler] Error loading graph: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Serialize graph edges
     * @param {Graph} graph - Graph to serialize
     * @returns {Array} - Serialized edges
     */
    serializeEdges(graph) {
        const edges = [];
        const nodes = graph.getNodes();
        
        for (const node of nodes) {
            const connections = graph.getEdges(node);
            for (const connection of connections) {
                edges.push({
                    from: node.hashCode(),
                    to: connection.hashCode()
                });
            }
        }
        
        return edges;
    }
    
    /**
     * Deserialize graph edges
     * @param {Graph} graph - Graph to populate
     * @param {Array} edges - Edge data
     * @param {Map} nodeMap - Node mapping
     */
    deserializeEdges(graph, edges, nodeMap) {
        for (const edge of edges) {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            
            if (fromNode && toNode) {
                graph.addEdge(fromNode, toNode, false);
            }
        }
    }
    
    /**
     * Auto-save graphs periodically
     */
    autoSave() {
        if (!this.dirty || Date.now() - this.lastSave < this.autoSaveInterval) {
            return;
        }
        
        if (this.activeGraphKey && this.graphs.has(this.activeGraphKey)) {
            this.saveGraph(this.activeGraphKey);
        }
    }
    
    /**
     * Get all graph names
     * @returns {Array<string>} - Graph names
     */
    getGraphNames() {
        return Array.from(this.graphs.keys());
    }
    
    /**
     * Check if editing mode is active
     * @returns {boolean} - True if editing
     */
    isEditing() {
        return this.editing;
    }
    
    /**
     * Check if recording is active
     * @returns {boolean} - True if recording
     */
    isRecording() {
        return this.recording;
    }
    
    /**
     * Get active graph key
     * @returns {string} - Active graph key
     */
    getActiveGraphKey() {
        return this.activeGraphKey;
    }
    
    /**
     * Tick handler for auto-save and recording
     * @param {Object} bot - Mineflayer bot instance
     */
    onTick(bot) {
        try {
            // Update recording if active
            if (this.recording) {
                this.updateRecording(bot);
            }
            
            // Auto-save if needed
            this.autoSave();
        } catch (error) {
            Logger.error(`[GraphHandler] Error in onTick: ${error.message}`);
        }
    }
}

module.exports = GraphHandler;

