// Deprecated: Firebase removed. Left as shim for safety if any import remains.
export function getDb() {
  throw new Error("Firebase removed. Use Supabase via lib/supabaseClient.ts");
}

export function getBucket() {
  throw new Error("Firebase removed. Use Supabase Storage via lib/supabaseClient.ts");
}


