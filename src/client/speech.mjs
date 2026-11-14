/**
 * Lightweight browser speech synthesis helper for English pronunciation.
 * Safely no-ops in environments without Web Speech API support.
 */
export function canSpeak() {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis === 'object' &&
    window.speechSynthesis !== null &&
    typeof window.speechSynthesis.speak === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser synthesis cancel errors.
  }
}

export function speakEnglish(text, { rate = 1, lang = 'en-US' } = {}) {
  const clean = String(text ?? '').trim();
  if (!clean || !canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = Math.max(0.5, Math.min(1.5, Number(rate) || 1));
    const voices = typeof window.speechSynthesis.getVoices === 'function'
      ? window.speechSynthesis.getVoices()
      : [];
    const preferred = voices.find(v => v.lang === lang) || voices.find(v => v.lang?.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
