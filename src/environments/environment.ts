export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyAkUEJOu9MmCXrjl_3MwAlr5xkjHwQJddI",
    authDomain: "hackathon-aa2ca.firebaseapp.com",
    projectId: "hackathon-aa2ca",
    storageBucket: "hackathon-aa2ca.firebasestorage.app",
    messagingSenderId: "37746716578",
    appId: "1:37746716578:web:61e67633658ee85c2e0cfb",
    measurementId: "G-N25BHZQK69"
  },
  ai: {
    defaultProvider: 'gemini', // 'openai' or 'gemini'
    providers: {
      openai: {
        name: 'OpenAI',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: '', // Set your OpenAI API key here or via environment variable
        model: 'gpt-3.5-turbo'
      },
      gemini: {
        name: 'Gemini',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKey: 'AIzaSyDm4nkvxuBv5A7vzdp-ZE2EPSNJf7NsTmI', // Set your Gemini API key here or via environment variable
        model: 'gemini-2.0-flash'
      }
    }
  }
};

