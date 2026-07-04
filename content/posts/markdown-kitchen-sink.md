---
title: 渲染样张：Markdown 全要素测试
description: 这篇文章覆盖排版系统需要处理的所有 Markdown 要素——标题、列表、表格、代码、引用、图片与中西文混排，用于视觉回归。
date: 2026-03-30
tags: [meta, design]
lang: zh
minutes: 4
---

这是一篇功能性文章：如果它渲染得好，整个花园的排版就立得住。以下依次穷举各要素。

## 中西文混排

在中文语境里写技术文章，最常见的是中英混排：比如在 Nuxt 4 里使用 `useAsyncData` 时，SSR 与 client 端会共享 payload。数字与单位如 3.8 GB、120ms、99.9% 应当与汉字之间有呼吸感。**加粗的中文**、*斜体的 English*、~~删除线~~、以及 [带链接的文字](https://example.com) 都不应破坏行高。

长英文单词如 `supercalifragilisticexpialidocious` 或超长 URL 不应撑破容器，这一段专门用来测试 overflow-wrap 的表现是否得体。

### 三级标题：列表

无序列表（嵌套两层）：

- 第一层要点，保持简短
- 第一层的第二点，但这一条故意写得很长很长，长到需要折行，用来检查折行后的悬挂缩进是否对齐
  - 第二层要点 A，含行内代码 `git rebase -i`
  - 第二层要点 B
- 回到第一层

有序列表：

1. 先做这个
2. 再做那个
   1. 子步骤甲
   2. 子步骤乙
3. 最后验证

## 代码

行内代码：`const garden = await bloom()`。多语言块级代码：

```python
def water(plant: str, amount_ml: int = 200) -> None:
    """给花园浇水。中文注释也要着色正确。"""
    if amount_ml > 500:
        raise ValueError("别淹死它")
    print(f"watered {plant} with {amount_ml}ml")
```

```diff
- const theme = 'light'
+ const theme = localStorage.getItem('garden-theme') ?? 'dark'
  document.documentElement.classList.toggle('dark', theme === 'dark')
```

```bash
# 一次典型的发布
git add content/posts/new.md
git commit -m "post: 新文章"
git push origin main
```

## 表格

| 特性 | 旧站 (Phase 1) | 新站 | 备注 |
| --- | --- | --- | --- |
| 内容来源 | mock 数据 | Markdown 仓库 | 真·内容即代码 |
| 搜索 | 无 | ⌘K 混合检索 | 本地索引 |
| AI 对话 | 按钮占位 | 流式 SSE | 支持降级 |
| 主题 | 仅暗色 | 暗/亮双主题 | 无 FOUC |

## 引用与分隔

> 单行引用：数字花园的意义不在于「完成」，而在于持续生长。

> 多段引用的第一段。
>
> 第二段，中间隔了一个空行，考验引用块的段间距处理。

---

## 图片

![终端绿意（SVG 占位图）](/img/terminal-green.svg)

图片下方紧跟一段文字，检查图文间距。至此全要素测试结束——如果你在读这一行，说明段落、间距与色彩都活了下来。
