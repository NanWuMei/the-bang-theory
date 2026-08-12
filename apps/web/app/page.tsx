import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>TBBT 台词素材检索</h1>
        <p className={styles.subtitle}>
          搜索《生活大爆炸》双语台词 · 预览片段 · 分享素材
        </p>
      </header>

      <section className={styles.placeholder}>
        <p>Phase 0 脚手架已就绪</p>
        <p className={styles.hint}>下一步：语料入库 → 搜索 → 播放器</p>
      </section>
    </main>
  );
}
