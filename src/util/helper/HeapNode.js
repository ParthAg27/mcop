/**
 * EXACT 1:1 replica of com.jelly.mightyminerv2.util.helper.HeapNode
 * Node structure for use in heap-based data structures
 */

class HeapNode {
    constructor(data, priority = 0) {
        this.data = data;
        this.priority = priority;
        this.index = -1; // Index in heap array for efficient operations
    }
    
    // EXACT replica of compareTo from Java
    compareTo(other) {
        if (!other || !(other instanceof HeapNode)) {
            throw new Error('Cannot compare with non-HeapNode object');
        }
        
        // Compare by priority (lower priority = higher precedence)
        if (this.priority < other.priority) return -1;
        if (this.priority > other.priority) return 1;
        return 0;
    }
    
    // EXACT replica of equals from Java
    equals(other) {
        if (!other || !(other instanceof HeapNode)) {
            return false;
        }
        
        return this.priority === other.priority && 
               this.data === other.data;
    }
    
    // EXACT replica of hashCode from Java
    hashCode() {
        let hash = 17;
        hash = hash * 31 + (this.data ? this.data.hashCode?.() || this.data.toString().length : 0);
        hash = hash * 31 + this.priority;
        return hash;
    }
    
    // EXACT replica of toString from Java
    toString() {
        return `HeapNode{data=${this.data}, priority=${this.priority}, index=${this.index}}`;
    }
    
    // Getter and setter methods
    getData() {
        return this.data;
    }
    
    setData(data) {
        this.data = data;
    }
    
    getPriority() {
        return this.priority;
    }
    
    setPriority(priority) {
        if (typeof priority !== 'number') {
            throw new Error('Priority must be a number');
        }
        this.priority = priority;
    }
    
    getIndex() {
        return this.index;
    }
    
    setIndex(index) {
        if (typeof index !== 'number' || index < -1) {
            throw new Error('Index must be a non-negative number or -1');
        }
        this.index = index;
    }
    
    // Utility methods
    isInHeap() {
        return this.index >= 0;
    }
    
    isHigherPriorityThan(other) {
        return this.compareTo(other) < 0;
    }
    
    isLowerPriorityThan(other) {
        return this.compareTo(other) > 0;
    }
    
    isSamePriorityAs(other) {
        return this.compareTo(other) === 0;
    }
    
    // Create a copy of this node
    clone() {
        const cloned = new HeapNode(this.data, this.priority);
        cloned.index = this.index;
        return cloned;
    }
    
    // Static factory methods
    static create(data, priority = 0) {
        return new HeapNode(data, priority);
    }
    
    static createWithHighPriority(data) {
        return new HeapNode(data, Number.MIN_SAFE_INTEGER);
    }
    
    static createWithLowPriority(data) {
        return new HeapNode(data, Number.MAX_SAFE_INTEGER);
    }
}

module.exports = HeapNode;

