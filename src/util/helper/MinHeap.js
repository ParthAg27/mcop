/**
 * MinHeap - Binary heap data structure for efficient priority operations
 * Perfect 1:1 replica of Java MinHeap.java
 */

class HeapNode {
    constructor(value, priority = 0) {
        this.value = value;
        this.priority = priority;
    }
    
    compareTo(other) {
        return this.priority - other.priority;
    }
    
    equals(other) {
        if (!(other instanceof HeapNode)) return false;
        return this.value === other.value && this.priority === other.priority;
    }
    
    toString() {
        return `HeapNode{value=${this.value}, priority=${this.priority}}`;
    }
}

class MinHeap {
    constructor() {
        this.heap = [];
        this.size = 0;
    }
    
    /**
     * Insert a new element into the heap
     * @param {*} value - Value to insert
     * @param {number} priority - Priority of the value
     */
    insert(value, priority = 0) {
        const node = new HeapNode(value, priority);
        this.heap[this.size] = node;
        this.heapifyUp(this.size);
        this.size++;
    }
    
    /**
     * Insert a HeapNode into the heap
     * @param {HeapNode} node - Node to insert
     */
    insertNode(node) {
        this.heap[this.size] = node;
        this.heapifyUp(this.size);
        this.size++;
    }
    
    /**
     * Extract the minimum element from the heap
     * @returns {*} - The minimum value or null if empty
     */
    extractMin() {
        if (this.size === 0) {
            return null;
        }
        
        const min = this.heap[0].value;
        this.heap[0] = this.heap[this.size - 1];
        this.size--;
        
        if (this.size > 0) {
            this.heapifyDown(0);
        }
        
        return min;
    }
    
    /**
     * Extract the minimum HeapNode from the heap
     * @returns {HeapNode|null} - The minimum node or null if empty
     */
    extractMinNode() {
        if (this.size === 0) {
            return null;
        }
        
        const min = this.heap[0];
        this.heap[0] = this.heap[this.size - 1];
        this.size--;
        
        if (this.size > 0) {
            this.heapifyDown(0);
        }
        
        return min;
    }
    
    /**
     * Peek at the minimum element without removing it
     * @returns {*} - The minimum value or null if empty
     */
    peek() {
        return this.size > 0 ? this.heap[0].value : null;
    }
    
    /**
     * Peek at the minimum HeapNode without removing it
     * @returns {HeapNode|null} - The minimum node or null if empty
     */
    peekNode() {
        return this.size > 0 ? this.heap[0] : null;
    }
    
    /**
     * Check if the heap is empty
     * @returns {boolean} - True if empty
     */
    isEmpty() {
        return this.size === 0;
    }
    
    /**
     * Get the number of elements in the heap
     * @returns {number} - Number of elements
     */
    getSize() {
        return this.size;
    }
    
    /**
     * Clear all elements from the heap
     */
    clear() {
        this.heap = [];
        this.size = 0;
    }
    
    /**
     * Check if heap contains a specific value
     * @param {*} value - Value to search for
     * @returns {boolean} - True if found
     */
    contains(value) {
        for (let i = 0; i < this.size; i++) {
            if (this.heap[i].value === value) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Update the priority of a value in the heap
     * @param {*} value - Value to update
     * @param {number} newPriority - New priority
     * @returns {boolean} - True if updated successfully
     */
    updatePriority(value, newPriority) {
        for (let i = 0; i < this.size; i++) {
            if (this.heap[i].value === value) {
                const oldPriority = this.heap[i].priority;
                this.heap[i].priority = newPriority;
                
                if (newPriority < oldPriority) {
                    this.heapifyUp(i);
                } else if (newPriority > oldPriority) {
                    this.heapifyDown(i);
                }
                
                return true;
            }
        }
        return false;
    }
    
    /**
     * Remove a specific value from the heap
     * @param {*} value - Value to remove
     * @returns {boolean} - True if removed successfully
     */
    remove(value) {
        for (let i = 0; i < this.size; i++) {
            if (this.heap[i].value === value) {
                // Replace with last element
                this.heap[i] = this.heap[this.size - 1];
                this.size--;
                
                if (i < this.size) {
                    // Try both directions
                    this.heapifyUp(i);
                    this.heapifyDown(i);
                }
                
                return true;
            }
        }
        return false;
    }
    
    /**
     * Heapify up from a given index
     * @param {number} index - Starting index
     */
    heapifyUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            
            if (this.heap[index].compareTo(this.heap[parentIndex]) >= 0) {
                break;
            }
            
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }
    
    /**
     * Heapify down from a given index
     * @param {number} index - Starting index
     */
    heapifyDown(index) {
        while (true) {
            let smallest = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            
            if (leftChild < this.size && 
                this.heap[leftChild].compareTo(this.heap[smallest]) < 0) {
                smallest = leftChild;
            }
            
            if (rightChild < this.size && 
                this.heap[rightChild].compareTo(this.heap[smallest]) < 0) {
                smallest = rightChild;
            }
            
            if (smallest === index) {
                break;
            }
            
            this.swap(index, smallest);
            index = smallest;
        }
    }
    
    /**
     * Swap two elements in the heap
     * @param {number} i - First index
     * @param {number} j - Second index
     */
    swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
    
    /**
     * Validate heap property (for debugging)
     * @returns {boolean} - True if heap property is maintained
     */
    isValid() {
        for (let i = 0; i < this.size; i++) {
            const leftChild = 2 * i + 1;
            const rightChild = 2 * i + 2;
            
            if (leftChild < this.size && 
                this.heap[i].compareTo(this.heap[leftChild]) > 0) {
                return false;
            }
            
            if (rightChild < this.size && 
                this.heap[i].compareTo(this.heap[rightChild]) > 0) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Get all values as array (in heap order, not sorted)
     * @returns {Array} - Array of values
     */
    toArray() {
        return this.heap.slice(0, this.size).map(node => node.value);
    }
    
    /**
     * Get all values sorted by priority
     * @returns {Array} - Sorted array of values
     */
    toSortedArray() {
        const result = [];
        const tempHeap = new MinHeap();
        
        // Copy all nodes to temp heap
        for (let i = 0; i < this.size; i++) {
            tempHeap.insertNode(new HeapNode(this.heap[i].value, this.heap[i].priority));
        }
        
        // Extract all in order
        while (!tempHeap.isEmpty()) {
            result.push(tempHeap.extractMin());
        }
        
        return result;
    }
    
    toString() {
        return `MinHeap{size=${this.size}, elements=[${this.heap.slice(0, this.size).map(n => n.toString()).join(', ')}]}`;
    }
}

// Export both classes
MinHeap.HeapNode = HeapNode;

module.exports = MinHeap;

