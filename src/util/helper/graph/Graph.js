/**
 * Graph - Generic graph data structure with pathfinding
 * Perfect 1:1 replica of Java Graph.java
 */

class Graph {
    constructor() {
        this.map = new Map();
    }
    
    /**
     * Add a single node to the graph
     * @param {*} source - Node to add
     */
    add(source) {
        if (this.map.size > 0) {
            return;
        }
        if (!this.map.has(source)) {
            this.map.set(source, []);
        }
    }
    
    /**
     * Add an edge between two nodes
     * @param {*} source - Source node
     * @param {*} target - Target node
     * @param {boolean} bidi - Whether the edge is bidirectional
     */
    addEdge(source, target, bidi = false) {
        if (!this.map.has(source)) {
            this.map.set(source, []);
        }
        if (!this.map.has(target)) {
            this.map.set(target, []);
        }
        
        this.map.get(source).push(target);
        
        if (bidi) {
            this.map.get(target).push(source);
        }
    }
    
    /**
     * Update a node in the graph
     * @param {*} oldNode - Old node to replace
     * @param {*} newNode - New node to replace with
     */
    update(oldNode, newNode) {
        if (oldNode === null || newNode === null) {
            throw new Error("Nodes cannot be null");
        }
        
        const edges = this.map.get(oldNode);
        if (edges) {
            this.map.delete(oldNode);
            this.map.set(newNode, edges);
        }
        
        // Update all references to the old node
        for (const [key, edgeList] of this.map.entries()) {
            const updatedEdges = edgeList.map(edge => edge === oldNode ? newNode : edge);
            this.map.set(key, updatedEdges);
        }
    }
    
    /**
     * Remove a node from the graph
     * @param {*} node - Node to remove
     */
    remove(node) {
        if (!this.map.delete(node)) {
            return;
        }
        
        // Remove all references to this node from other edges
        for (const [key, edgeList] of this.map.entries()) {
            const filteredEdges = edgeList.filter(edge => edge !== node);
            this.map.set(key, filteredEdges);
        }
    }
    
    /**
     * Find path between two nodes using BFS
     * @param {*} start - Start node
     * @param {*} end - End node
     * @returns {Array} - Path from start to end, or empty array if no path
     */
    findPath(start, end) {
        if (start === null || end === null || 
            !this.map.has(start) || !this.map.has(end)) {
            return [];
        }
        
        const queue = [start];
        const visited = new Set([start]);
        const parent = new Map([[start, null]]);
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current === end) {
                // Reconstruct path
                const path = [];
                let node = end;
                while (node !== null) {
                    path.unshift(node);
                    node = parent.get(node);
                }
                return path;
            }
            
            const neighbors = this.map.get(current) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    parent.set(neighbor, current);
                    queue.push(neighbor);
                }
            }
        }
        
        return []; // No path found
    }
    
    /**
     * Get all nodes in the graph
     * @returns {Array} - Array of all nodes
     */
    getNodes() {
        return Array.from(this.map.keys());
    }
    
    /**
     * Get edges for a specific node
     * @param {*} node - Node to get edges for
     * @returns {Array} - Array of connected nodes
     */
    getEdges(node) {
        return this.map.get(node) || [];
    }
    
    /**
     * Check if the graph contains a node
     * @param {*} node - Node to check
     * @returns {boolean} - True if node exists
     */
    hasNode(node) {
        return this.map.has(node);
    }
    
    /**
     * Get the size of the graph (number of nodes)
     * @returns {number} - Number of nodes
     */
    size() {
        return this.map.size;
    }
    
    /**
     * Clear the graph
     */
    clear() {
        this.map.clear();
    }
    
    /**
     * Convert graph to JSON-serializable object
     * @returns {Object} - Serializable representation
     */
    toJSON() {
        const result = {};
        for (const [key, value] of this.map.entries()) {
            result[key] = value;
        }
        return result;
    }
    
    /**
     * Create graph from JSON object
     * @param {Object} data - JSON data
     * @returns {Graph} - New graph instance
     */
    static fromJSON(data) {
        const graph = new Graph();
        for (const [key, value] of Object.entries(data)) {
            graph.map.set(key, value);
        }
        return graph;
    }
}

module.exports = Graph;

