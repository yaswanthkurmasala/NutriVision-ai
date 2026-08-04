/**
 * Triggers clean, physical tactile clicks on Android devices.
 * Uses the WebVibration API safely.
 */
export const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
    return;
  }
  try {
    switch (intensity) {
      case 'light':
        window.navigator.vibrate(12);
        break;
      case 'medium':
        window.navigator.vibrate(25);
        break;
      case 'heavy':
        window.navigator.vibrate(50);
        break;
      case 'success':
        window.navigator.vibrate([10, 40, 10]);
        break;
      case 'error':
        window.navigator.vibrate([40, 80, 40]);
        break;
      default:
        window.navigator.vibrate(15);
    }
  } catch (error) {
    // Fail silently in sandboxed environments or browsers that disable vibration
  }
};
