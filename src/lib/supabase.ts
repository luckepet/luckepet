import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mwrzpdwmcnpmtyzcqueg.supabase.co'

const supabaseKey = 'sb_publishable_6xD0ne2SBwcl7MkVEaXlDA_VKWa0l-3'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)