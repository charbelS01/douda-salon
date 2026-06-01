import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://udlsrzwtbrnrumvcisus.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbHNyend0YnJucnVtdmNpc3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDYzOTIsImV4cCI6MjA5NTg4MjM5Mn0.6CjOPvZBE9P8qMwAdTnMd5lXNgI3J8cuE1a5ADgUEoU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});
