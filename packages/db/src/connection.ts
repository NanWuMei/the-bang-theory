/** Supabase / PostgreSQL 连接选项 */
export function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co") || url.includes("supabase.com");
}

export function isSupabasePooler(url: string): boolean {
  return url.includes("pooler.supabase.com") || url.includes(":6543");
}

/** 运行时 postgres.js 选项（Supabase 需 SSL；Pooler 需 prepare: false） */
export function getPostgresClientOptions(url: string) {
  const supabase = isSupabaseUrl(url) || process.env.DATABASE_SSL === "true";

  return {
    ssl: supabase ? ("require" as const) : undefined,
    // Transaction pooler 不支持 prepared statements
    prepare: isSupabasePooler(url) ? false : undefined,
  };
}

/** drizzle-kit migrate 用的 credentials */
export function getDrizzleDbCredentials(url: string) {
  const supabase = isSupabaseUrl(url) || process.env.DATABASE_SSL === "true";
  return {
    url,
    ssl: supabase ? ("require" as const) : undefined,
  };
}

export const SUPABASE_PROJECT_REF = "dlkxlxtwszgrnxoctdgt";

/** 直连（推荐用于 db:migrate） */
export function supabaseDirectUrl(password: string) {
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
}

/** Session pooler（推荐用于 Next.js 运行时） */
export function supabasePoolerUrl(password: string, region = "ap-southeast-1") {
  return `postgresql://postgres.${SUPABASE_PROJECT_REF}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
}
