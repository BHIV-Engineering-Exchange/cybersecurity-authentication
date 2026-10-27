import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yueoqcjicffzgrafwmhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZW9xY2ppY2ZmemdyYWZ3bWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MDA2OTcsImV4cCI6MjA2NTk3NjY5N30.YeheD11-9oXT3PZz_PNoe0xy-_Cu6EfZYQSKqU9H0k4';

export const supabase = createClient(supabaseUrl, supabaseKey);
