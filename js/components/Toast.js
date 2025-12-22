/**
 * Toast Component
 * Shows notification messages to users
 */

class Toast {
  static container = null
  static defaultDuration = 3000

  /**
   * Initialize toast container
   */
  static init() {
    if (!Toast.container) {
      Toast.container = DOM.$('#toastContainer')
      if (!Toast.container) {
        Toast.container = DOM.createElement('div', {
          id: 'toastContainer',
          className: 'toast-container',
        })
        document.body.appendChild(Toast.container)
      }
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type: 'info', 'success', 'error', 'warning'
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} Toast element
   */
  static show(message, type = 'info', duration = Toast.defaultDuration) {
    Toast.init()

    const toast = DOM.createElement(
      'div',
      {
        className: `toast toast--${type}`,
      },
      message
    )

    Toast.container.appendChild(toast)

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        Toast.remove(toast)
      }, duration)
    }

    return toast
  }

  /**
   * Remove a toast
   * @param {HTMLElement} toast - Toast element
   */
  static remove(toast) {
    if (!toast || !toast.parentNode) return

    toast.style.animation = 'toastSlideOut 0.3s ease forwards'
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }

  /**
   * Show a success toast
   * @param {string} message - Message
   * @param {number} duration - Duration
   */
  static success(message, duration) {
    return Toast.show(message, 'success', duration)
  }

  /**
   * Show an error toast
   * @param {string} message - Message
   * @param {number} duration - Duration
   */
  static error(message, duration) {
    return Toast.show(message, 'error', duration)
  }

  /**
   * Show an info toast
   * @param {string} message - Message
   * @param {number} duration - Duration
   */
  static info(message, duration) {
    return Toast.show(message, 'info', duration)
  }

  /**
   * Show a warning toast
   * @param {string} message - Message
   * @param {number} duration - Duration
   */
  static warning(message, duration) {
    return Toast.show(message, 'warning', duration)
  }

  /**
   * Clear all toasts
   */
  static clearAll() {
    Toast.init()
    DOM.empty(Toast.container)
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Toast
} else {
  window.Toast = Toast
}
