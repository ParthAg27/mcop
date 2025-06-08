/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.helper.graph.GraphSerializer
 * Handles serialization and deserialization of graph data structures
 */
const Logger = require('../../Logger');
const Graph = require('./Graph');

class GraphSerializer {
    
    // EXACT replica of serialize from Java
    static serialize(graph) {
        if (!graph) {
            Logger.sendWarning('Cannot serialize null graph');
            return null;
        }
        
        try {
            const serialized = {
                nodes: [],
                edges: [],
                metadata: {
                    nodeCount: graph.getNodeCount(),
                    edgeCount: graph.getEdgeCount(),
                    created: Date.now(),
                    version: '1.0.0'
                }
            };
            
            // Serialize nodes
            const nodes = graph.getAllNodes();
            for (const node of nodes) {
                serialized.nodes.push({
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    z: node.z,
                    type: node.type || 'default',
                    data: node.data || {}
                });
            }
            
            // Serialize edges
            const edges = graph.getAllEdges();
            for (const edge of edges) {
                serialized.edges.push({
                    from: edge.from,
                    to: edge.to,
                    weight: edge.weight || 1.0,
                    type: edge.type || 'default',
                    data: edge.data || {}
                });
            }
            
            return serialized;
        } catch (error) {
            Logger.sendError(`Error serializing graph: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of deserialize from Java
    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            Logger.sendWarning('Invalid graph data for deserialization');
            return null;
        }
        
        try {
            const graph = new Graph();
            
            // Deserialize nodes
            if (data.nodes && Array.isArray(data.nodes)) {
                for (const nodeData of data.nodes) {
                    if (nodeData && typeof nodeData === 'object') {
                        graph.addNode(
                            nodeData.id,
                            nodeData.x,
                            nodeData.y,
                            nodeData.z,
                            nodeData.type,
                            nodeData.data
                        );
                    }
                }
            }
            
            // Deserialize edges
            if (data.edges && Array.isArray(data.edges)) {
                for (const edgeData of data.edges) {
                    if (edgeData && typeof edgeData === 'object') {
                        graph.addEdge(
                            edgeData.from,
                            edgeData.to,
                            edgeData.weight,
                            edgeData.type,
                            edgeData.data
                        );
                    }
                }
            }
            
            // Set metadata
            if (data.metadata) {
                graph.setMetadata(data.metadata);
            }
            
            Logger.sendDebug(`Deserialized graph with ${graph.getNodeCount()} nodes and ${graph.getEdgeCount()} edges`);
            return graph;
        } catch (error) {
            Logger.sendError(`Error deserializing graph: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of serializeToString from Java
    static serializeToString(graph) {
        try {
            const serialized = GraphSerializer.serialize(graph);
            return serialized ? JSON.stringify(serialized, null, 2) : null;
        } catch (error) {
            Logger.sendError(`Error serializing graph to string: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of deserializeFromString from Java
    static deserializeFromString(jsonString) {
        try {
            if (!jsonString || typeof jsonString !== 'string') {
                Logger.sendWarning('Invalid JSON string for graph deserialization');
                return null;
            }
            
            const data = JSON.parse(jsonString);
            return GraphSerializer.deserialize(data);
        } catch (error) {
            Logger.sendError(`Error deserializing graph from string: ${error.message}`);
            return null;
        }
    }
    
    // EXACT replica of validateGraphData from Java
    static validateGraphData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, errors: ['Graph data must be an object'] };
        }
        
        const errors = [];
        
        // Validate nodes
        if (!data.nodes || !Array.isArray(data.nodes)) {
            errors.push('Graph data must contain a nodes array');
        } else {
            data.nodes.forEach((node, index) => {
                if (!node || typeof node !== 'object') {
                    errors.push(`Node ${index} is invalid`);
                } else {
                    if (typeof node.id === 'undefined') {
                        errors.push(`Node ${index} missing id`);
                    }
                    if (typeof node.x !== 'number' || typeof node.y !== 'number' || typeof node.z !== 'number') {
                        errors.push(`Node ${index} coordinates must be numbers`);
                    }
                }
            });
        }
        
        // Validate edges
        if (!data.edges || !Array.isArray(data.edges)) {
            errors.push('Graph data must contain an edges array');
        } else {
            data.edges.forEach((edge, index) => {
                if (!edge || typeof edge !== 'object') {
                    errors.push(`Edge ${index} is invalid`);
                } else {
                    if (typeof edge.from === 'undefined' || typeof edge.to === 'undefined') {
                        errors.push(`Edge ${index} missing from/to nodes`);
                    }
                    if (typeof edge.weight !== 'undefined' && typeof edge.weight !== 'number') {
                        errors.push(`Edge ${index} weight must be a number`);
                    }
                }
            });
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // Utility methods
    static getSerializationInfo(graph) {
        if (!graph) return null;
        
        return {
            nodeCount: graph.getNodeCount(),
            edgeCount: graph.getEdgeCount(),
            estimatedSize: GraphSerializer.estimateSerializedSize(graph),
            version: '1.0.0'
        };
    }
    
    static estimateSerializedSize(graph) {
        if (!graph) return 0;
        
        // Rough estimation in bytes
        const nodeSize = 100; // Approximate size per node
        const edgeSize = 50;  // Approximate size per edge
        
        return (graph.getNodeCount() * nodeSize) + (graph.getEdgeCount() * edgeSize);
    }
}

module.exports = GraphSerializer;

