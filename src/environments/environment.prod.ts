export const environment = {
  production: true,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
  },
  ai: {
    defaultProvider: 'openai', // 'openai' or 'gemini'
    providers: {
      openai: {
        name: 'OpenAI',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: '', // Set your OpenAI API key here or via environment variable
        model: 'gpt-4' // Use more advanced model in production
      },
      gemini: {
        name: 'Gemini',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKey: '', // Set your Gemini API key here or via environment variable
        model: 'gemini-pro'
      }
    }
  }
};
