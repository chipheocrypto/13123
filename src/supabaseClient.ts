
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zgejtjedngnnuemefihg.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZWp0amVkbmdubnVlbWVmaWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDk1NjYsImV4cCI6MjA4MDU4NTU2Nn0.jCrgkp0dBMmHxhrcDOACZLQta1eRXMCi5uImfO8hftk';

export const supabase = createClient(supabaseUrl, supabaseKey);
