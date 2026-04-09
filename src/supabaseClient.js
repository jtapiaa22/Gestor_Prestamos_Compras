import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://okajupeeuiquarjjyefh.supabase.co';
const supabaseKey = 'sb_publishable_1wutf_2_nXYcclELrm2guQ_XV15Yl8G';

export const supabase = createClient(supabaseUrl, supabaseKey);
