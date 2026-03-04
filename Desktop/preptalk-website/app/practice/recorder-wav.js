// WAV Recorder using audio-recorder-polyfill
// This file is meant to be imported dynamically in page.tsx

import AudioRecorder from 'audio-recorder-polyfill'
console.log('[Recorder] AudioRecorder polyfill loaded:', AudioRecorder)
window.MediaRecorder = AudioRecorder
console.log('[Recorder] window.MediaRecorder set to AudioRecorder polyfill:', window.MediaRecorder)
// Optionally, you can set the MIME type to WAV
AudioRecorder.mimeType = 'audio/wav'

export default AudioRecorder
