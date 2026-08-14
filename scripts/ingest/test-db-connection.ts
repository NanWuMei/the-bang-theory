/**
 * 测试 .env 中的 DATABASE_URL 能否连接 Supabase
 * 用法: npx tsx scripts/ingest/test-db-connection.ts
 */
import { config } from "dotenv";
import dns from "dns";
import postgres from "postgres";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: join(root, ".env") });
config({ path: join(root, "apps/web/.env.local") });

const PROJECT_REF = "dlkxlxtwszgrnxoctdgt";

function diagnose(url: string) {
  const isDirect = url.includes("db.") && url.includes(".supabase.co");
  const isPooler = url.includes("pooler.supabase.com");
  const userMatch = url.match(/postgresql:\/\/([^:]+):/);
  const user = userMatch?.[1] ?? "";
  const expectedUser = `postgres.${PROJECT_REF}`;

  console.log("\n--- 连接串诊断 ---");
  if (isDirect) {
    console.log("⚠️  当前是 Direct 连接 (db.xxx.supabase.co)");
    console.log("   免费版只有 IPv6，很多家用网络连不上 → 会报 ENOTFOUND");
    console.log("   解决：改用 Dashboard 里的 Session pooler URI\n");
  }
  if (isPooler && user === "postgres") {
    console.log("⚠️  Pooler 用户名不能是 postgres");
    console.log(`   应改为: ${expectedUser}\n`);
  }
  if (isPooler && user === expectedUser) {
    console.log("✓  Pooler 用户名格式正确");
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ .env 里没有 DATABASE_URL");
    process.exit(1);
  }

  diagnose(url);
  dns.setDefaultResultOrder("ipv6first");

  const isPooler = url.includes("pooler.supabase.com");
  const sql = postgres(url, {
    ssl: "require",
    prepare: isPooler ? false : undefined,
    connect_timeout: 15,
  });

  try {
    const [row] = await sql`SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname = 'public'`;
    console.log(`\n✅ 连接成功！public 表数量: ${row.tables}`);
    console.log("可以继续: pnpm ingest:pipeline --season 1 --episode 1\n");
  } catch (e) {
    const msg = (e as Error).message;
    console.error("\n❌ 连接失败:", msg);
    console.log(`
请按以下步骤修复 .env 里的 DATABASE_URL：

1. 打开 Supabase Dashboard → 点左上角 Connect
   https://supabase.com/dashboard/project/${PROJECT_REF}?showConnect=true

2. 选择 「Session pooler」→ URI 格式

3. 整段复制（注意用户名是 postgres.${PROJECT_REF}，不是 postgres）

4. 粘贴到 .env 的 DATABASE_URL=

5. 密码有特殊字符要 URL 编码（! → %21）

6. 再运行: npx tsx scripts/ingest/test-db-connection.ts
`);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
