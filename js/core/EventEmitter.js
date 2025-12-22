/**
 * EventEmitter
 * Simple pub/sub event system for component communication
 */

class EventEmitter {
  constructor() {
    this._events = new Map()
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set())
    }
    this._events.get(event).add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      callback.apply(this, args)
    }
    return this.on(event, wrapper)
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this._events.has(event)) {
      this._events.get(event).delete(callback)
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to callbacks
   */
  emit(event, ...args) {
    if (this._events.has(event)) {
      this._events.get(event).forEach((callback) => {
        try {
          callback.apply(this, args)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} event - Event name (optional)
   */
  removeAllListeners(event) {
    if (event) {
      this._events.delete(event)
    } else {
      this._events.clear()
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Listener count
   */
  listenerCount(event) {
    return this._events.has(event) ? this._events.get(event).size : 0
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventEmitter
} else {
  window.EventEmitter = EventEmitter
}
