import { createClient } from '@supabase/supabase-js';

// Debug: Log environment variables
console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('Supabase Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing');

// Fallback values if environment variables are not loaded
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://uhopxfehjwxmtbvvjhvj.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVob3B4ZmVoand4bXRidnZqaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzA4ODYsImV4cCI6MjA3MzQ0Njg4Nn0.U1EnbftqM5O61_PsiYBZRF_0op6piiYuxUPCyNJShK8';

export const supabase = createClient(supabaseUrl, supabaseKey);
