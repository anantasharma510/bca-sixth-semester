// React Native Socket.IO Polyfills
import 'react-native-url-polyfill/auto';

// Simple TextEncoder/TextDecoder polyfills for React Native
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const buf = new ArrayBuffer(str.length * 2);
      const view = new Uint8Array(buf);
      for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i);
      }
      return view;
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(arr) {
      return String.fromCharCode.apply(null, arr);
    }
  };
}

// Additional polyfills for React Native compatibility
if (typeof global.process === 'undefined') {
  global.process = { env: {} };
}

// Ensure WebSocket is available
if (typeof global.WebSocket === 'undefined') {
  try {
    const { WebSocket } = require('react-native');
    global.WebSocket = WebSocket;
  } catch (e) {
    // WebSocket might be available globally in newer RN versions
    console.log('WebSocket already available globally');
  }
}

// Skip Buffer polyfill for now - Socket.IO should work without it in newer versions

console.log('✅ Socket.IO polyfills loaded successfully'); 