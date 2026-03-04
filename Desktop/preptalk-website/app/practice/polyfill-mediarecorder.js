// polyfill-mediarecorder.js
import AudioRecorder from 'audio-recorder-polyfill'
import mpegEncoder from 'audio-recorder-polyfill/mpeg-encoder'

// Configure the polyfill before setting it
AudioRecorder.encoder = mpegEncoder
AudioRecorder.prototype.mimeType = 'audio/wav'

// Only replace if MediaRecorder isn't natively supported or if forced polyfill is needed
if (typeof window !== 'undefined') {
  const needsPolyfill = !window.MediaRecorder || window.location.search.includes('usePolyfill');
  
  if (needsPolyfill) {
    console.log('[Recorder] Installing AudioRecorder polyfill')
    window.MediaRecorder = AudioRecorder
    console.log('[Recorder] MediaRecorder polyfill installed successfully')
  } else {
    console.log('[Recorder] Using native MediaRecorder')
  }
}

export default AudioRecorder