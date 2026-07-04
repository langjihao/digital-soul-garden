---
title: 把 Git 当 CMS：用 PR 发布内容，告别所见即所得
description: 一份务实笔记：把仓库作为文章、碎念与媒体的唯一来源，CI 负责 diff、摘要与索引。
date: 2026-04-28
tags: [devx, github-actions, writing]
lang: zh
minutes: 8
---

所见即所得编辑器的问题不在「所见」，在「所得」——你得到的是一坨锁在数据库里的富文本，迁移、批量重构、版本回溯全都要跟平台搏斗。把 Git 当 CMS 之后，这些问题变成了我早就会的东西：`grep`、`sed`、`git revert`。

## 目录即信息架构

```
content/
├── posts/          # 长文，一篇一个 .md
│   ├── digital-twin-rag.md
│   └── git-as-cms.md
├── tweets/         # 碎念，一条一个 .yml
│   ├── 0142.yml
│   └── 0141.yml
└── media/          # 媒体签到
    └── colemak-day41.yml
```

三个约定：

1. 文件名即 slug，改名等于改 URL，所以**文件名一旦发布就冻结**；
2. frontmatter 是结构化数据的家，正文只写给人看的东西;
3. 草稿用 `draft: true` 标记，构建时过滤，不搞分支。

## 发布流程

日常写作只有三步：

```bash
vim content/posts/new-idea.md   # 写
git add -A && git commit -m "post: 新想法"
git push                        # 发布完成
```

CI 收到 push 之后做的事情稍多一些：

```yaml
name: publish
on:
  push:
    branches: [main]
jobs:
  build-and-index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }   # 需要上一个 commit 来 diff
      - run: npm ci && npm run build
      - name: 增量索引变更内容
        run: node scripts/index-changed.mjs
        env:
          CHANGED: ${{ steps.diff.outputs.files }}
      - name: 部署
        run: rsync -az .output/ deploy@garden:/srv/releases/$SHA/
```

## 意外收获：Review 你自己的写作

给自己提 PR 听起来很蠢，直到我第一次在 diff 视图里读自己的草稿——**diff 视图是最好的自我审校工具**，因为它强迫你逐行看。配合一个 LLM review bot，它会：

- 找出前后矛盾的表述
- 标记没有展开就跳过的论点
- 用我自己过去的文章反驳我（这一条最气人，也最有用）

> 写作平台卖给你的是「流畅的写作体验」。但好文章不是流畅写出来的，是反复 diff 出来的。

## 局限

诚实清单：

- 图片这类二进制资产不适合进 Git，我走对象存储 + 引用；
- 非技术合作者的门槛真实存在，`git` 不是所有人的母语；
- 移动端随手记需要一个中转（我用一个发 issue 的快捷指令，CI 定期收割成 tweet 文件）。

这些代价我都认。换来的是：我的全部写作，二十年后还能 `git clone`。
