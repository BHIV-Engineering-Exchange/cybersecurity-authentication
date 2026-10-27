// Environment configuration utility
const getEnvVar = (key, defaultValue = null) => {
  // Try Vite environment variables first
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Fallback to process.env for Create React App
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // Return default value
  return defaultValue;
};

// Backend configuration
export const config = {
  backendUrl: getEnvVar('VITE_BACKEND_URL', 'http://localhost:5050'),
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL', 'https://uhopxfehjwxmtbvvjhvj.supabase.co'),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVob3B4ZmVoand4bXRidnZqaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzA4ODYsImV4cCI6MjA3MzQ0Njg4Nn0.U1EnbftqM5O61_PsiYBZRF_0op6piiYuxUPCyNJShK8')
};

export default config;
