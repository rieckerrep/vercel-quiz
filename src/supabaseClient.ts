import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lqoulygftdjbnfxkrihy.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxb3VseWdmdGRqYm5meGtyaWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzUzMDAsImV4cCI6MjA1NTA1MTMwMH0.VInK_7i6zY_f5zjHSR0U93Ut0L7ku_Q0C9xS-u4Lols";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
