import { createClient } from '@supabase/supabase-js';

// These values would ideally come from environment variables (e.g., import.meta.env.VITE_SUPABASE_URL)
// For now, we use the values provided in the root .env
const supabaseUrl = 'https://cjvcgmygexfvmmxbnlrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqdmNnbXlnZXhmdm1teGJubHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTU0NzQsImV4cCI6MjA5MjM3MTQ3NH0.YAsWSdHrbEJMVZ3Slc6WuViiVVBoNwCG-9kfYYcGpDo';

export const supabase = createClient(supabaseUrl, supabaseKey);
