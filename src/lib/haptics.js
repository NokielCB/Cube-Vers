/**
 * haptics — cienka warstwa nad Vibration API (działa na telefonach z Androidem;
 * iOS Safari ignoruje, ale nie rzuca błędem). Wszystko owinięte w try/guard,
 * żeby na desktopie i bez wsparcia po prostu nic się nie działo.
 */
function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    /* brak wsparcia — ignorujemy */
  }
}

export const haptics = {
  ready: () => vibrate(12), // uzbrojenie (gotowe do startu)
  start: () => vibrate(18), // start pomiaru
  stop: () => vibrate([0, 22, 40, 22]), // zatrzymanie — krótkie „tak-tak"
  pb: () => vibrate([0, 30, 50, 30, 50, 60]), // nowy rekord — mocniejszy wzór
}
