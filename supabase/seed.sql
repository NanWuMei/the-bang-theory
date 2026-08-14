-- 可选：建表后插入测试数据，验证搜索索引
-- 需先有一条 episodes 记录

-- insert into episodes (season, episode, storage_key, title)
-- values (1, 1, 'episodes/s01e01.mp4', 'Pilot')
-- on conflict (season, episode) do nothing;

-- insert into subtitle_lines (id, episode_id, start_ms, end_ms, en_text, zh_text, line_index)
-- values
--   ('s01e01-0001', 1, 1300, 5290, 'If a photon is directed through a plane', '将光子正对一块平板', 1),
--   ('s01e01-0002', 1, 15880, 18750, 'Bazinga!', '逗你玩！', 42)
-- on conflict (id) do nothing;

-- 测试搜索：
-- select id, en_text, zh_text from subtitle_lines where search_text ilike '%bazinga%';
