import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drdhdaawvtpzmjvczewr.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_PTqAlSSujirG_v3i9cgGFA_IkKd8Tsq";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
