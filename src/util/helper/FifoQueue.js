/**
 * FifoQueue - First-In-First-Out queue data structure
 * Perfect 1:1 replica of Java FifoQueue.java
 */

class FifoQueue {
    constructor() {
        this.queue = [];
        this.front = 0;
        this.rear = 0;
        this.size = 0;
    }
    
    /**
     * Add an element to the rear of the queue
     * @param {*} element - Element to add
     */
    enqueue(element) {
        this.queue[this.rear] = element;
        this.rear++;
        this.size++;
    }
    
    /**
     * Remove and return the front element
     * @returns {*} - Front element or null if empty
     */
    dequeue() {
        if (this.isEmpty()) {
            return null;
        }
        
        const element = this.queue[this.front];
        this.queue[this.front] = null; // Help GC
        this.front++;
        this.size--;
        
        // Reset indices if queue becomes empty
        if (this.isEmpty()) {
            this.front = 0;
            this.rear = 0;
        }
        
        return element;
    }
    
    /**
     * Peek at the front element without removing it
     * @returns {*} - Front element or null if empty
     */
    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.queue[this.front];
    }
    
    /**
     * Check if the queue is empty
     * @returns {boolean} - True if empty
     */
    isEmpty() {
        return this.size === 0;
    }
    
    /**
     * Get the number of elements in the queue
     * @returns {number} - Number of elements
     */
    getSize() {
        return this.size;
    }
    
    /**
     * Clear all elements from the queue
     */
    clear() {
        this.queue = [];
        this.front = 0;
        this.rear = 0;
        this.size = 0;
    }
    
    /**
     * Check if queue contains a specific element
     * @param {*} element - Element to search for
     * @returns {boolean} - True if found
     */
    contains(element) {
        for (let i = this.front; i < this.rear; i++) {
            if (this.queue[i] === element) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get all elements as array (in queue order)
     * @returns {Array} - Array of elements
     */
    toArray() {
        const result = [];
        for (let i = this.front; i < this.rear; i++) {
            result.push(this.queue[i]);
        }
        return result;
    }
    
    /**
     * Remove a specific element from the queue
     * @param {*} element - Element to remove
     * @returns {boolean} - True if removed successfully
     */
    remove(element) {
        for (let i = this.front; i < this.rear; i++) {
            if (this.queue[i] === element) {
                // Shift all elements after this one forward
                for (let j = i; j < this.rear - 1; j++) {
                    this.queue[j] = this.queue[j + 1];
                }
                this.rear--;
                this.size--;
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get element at specific index (0-based from front)
     * @param {number} index - Index to get
     * @returns {*} - Element at index or null if out of bounds
     */
    get(index) {
        if (index < 0 || index >= this.size) {
            return null;
        }
        return this.queue[this.front + index];
    }
    
    /**
     * Set element at specific index
     * @param {number} index - Index to set
     * @param {*} element - Element to set
     * @returns {boolean} - True if set successfully
     */
    set(index, element) {
        if (index < 0 || index >= this.size) {
            return false;
        }
        this.queue[this.front + index] = element;
        return true;
    }
    
    /**
     * Iterate over all elements
     * @param {Function} callback - Callback function (element, index) => {}
     */
    forEach(callback) {
        for (let i = 0; i < this.size; i++) {
            callback(this.queue[this.front + i], i);
        }
    }
    
    /**
     * Find index of element
     * @param {*} element - Element to find
     * @returns {number} - Index or -1 if not found
     */
    indexOf(element) {
        for (let i = 0; i < this.size; i++) {
            if (this.queue[this.front + i] === element) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Check if queue is full (for bounded queues)
     * @param {number} maxSize - Maximum size to check against
     * @returns {boolean} - True if full
     */
    isFull(maxSize = Infinity) {
        return this.size >= maxSize;
    }
    
    /**
     * Get capacity (remaining space for bounded queues)
     * @param {number} maxSize - Maximum size
     * @returns {number} - Remaining capacity
     */
    getCapacity(maxSize = Infinity) {
        return Math.max(0, maxSize - this.size);
    }
    
    toString() {
        return `FifoQueue{size=${this.size}, elements=[${this.toArray().join(', ')}]}`;
    }
}

module.exports = FifoQueue;

