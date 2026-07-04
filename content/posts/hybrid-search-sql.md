---
title: 80 行 SQL 实现混合检索：BM25 + 余弦合二为一
description: 把 ts_rank 与 pgvector 余弦距离合成一个可调权重的得分，附生产环境完整 SQL。
date: 2026-04-10
tags: [postgres, search, sql]
lang: zh
minutes: 6
---

上一篇讲过为什么混合检索优于纯向量。这篇给出可以直接抄走的实现——不引入 Elasticsearch，不加消息队列，就用你已经有的 Postgres。

## 表结构

```sql
create extension if not exists vector;

create table chunks (
  id        bigserial primary key,
  path      text not null,          -- 内容文件路径
  heading   text,
  body      text not null,
  body_tsv  tsvector generated always as
            (to_tsvector('simple', body)) stored,
  embedding vector(1024),
  updated   timestamptz default now()
);

create index on chunks using gin (body_tsv);
create index on chunks using hnsw (embedding vector_cosine_ops);
```

两个索引各司其职：GIN 服务 BM25 侧，HNSW 服务向量侧。中文分词用 `simple` 配合应用层预分词（jieba 切好再入库），比装 zhparser 少一个运维负担。

## 合成查询

核心思路：两路各取 top-30，**归一化到同一量纲**后加权：

```sql
with lexical as (
  select id, ts_rank(body_tsv, plainto_tsquery('simple', $1)) as s
  from chunks
  where body_tsv @@ plainto_tsquery('simple', $1)
  order by s desc limit 30
),
semantic as (
  select id, 1 - (embedding <=> $2::vector) as s
  from chunks
  order by embedding <=> $2::vector
  limit 30
),
unioned as (
  select coalesce(l.id, s.id) as id,
         coalesce(l.s / nullif(max(l.s) over (), 0), 0) as lex_norm,
         coalesce(s.s, 0)                               as sem_norm
  from lexical l
  full outer join semantic s using (id)
)
select c.path, c.heading, c.body,
       0.4 * u.lex_norm + 0.6 * u.sem_norm as score
from unioned u
join chunks c using (id)
order by score desc
limit 8;
```

## 权重怎么调

没有万能权重，但有可复用的方法：拿 30–50 条真实查询做小评测集，扫一遍参数：

| lex : sem | nDCG@5 | 备注 |
| --- | --- | --- |
| 1.0 : 0.0 | 0.62 | 纯关键词，语义改写全军覆没 |
| 0.4 : 0.6 | **0.87** | 我的生产配置 |
| 0.2 : 0.8 | 0.83 | 稀有词开始漏 |
| 0.0 : 1.0 | 0.71 | 纯向量 |

一个细节：如果查询里含反引号、路径这类「代码味」token，我会把词法权重临时提到 0.6——这类查询的意图几乎总是精确匹配。

```ts
const codeish = /[`_/.-]{2,}|[A-Z]{2,}/.test(q)
const [wLex, wSem] = codeish ? [0.6, 0.4] : [0.4, 0.6]
```

80 行到此为止。它当然不如专门的检索引擎强，但对一座个人花园：**够了，而且是你完全理解的 80 行**。
