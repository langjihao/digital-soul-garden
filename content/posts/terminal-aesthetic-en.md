---
title: "Designing a Terminal-Aesthetic Site That Doesn't Feel Like a Gimmick"
description: "Phosphor green on charcoal is easy; restraint is hard. Notes on typography, motion and the line between homage and cosplay."
date: 2026-05-05
tags: [design, typography, css]
lang: en
minutes: 9
---

Every developer eventually ships a terminal-themed personal site. Most of them feel like Halloween costumes: green scanlines, CRT flicker, a `cat resume.txt` easter egg — and body text you cannot actually read. This garden went through three drafts before I found the line between *homage* and *cosplay*.

## Rule 1: Monospace is a spice, not a diet

The biggest mistake is setting body copy in monospace. Fixed-width glyphs cost roughly 30% more horizontal space and make long-form Chinese-English mixed text exhausting.

My split:

- **Monospace** — prompts (`$ whoami`), metadata, timestamps, tags, kbd hints
- **Sans-serif** — everything a human reads for more than five seconds

The terminal feeling survives entirely in the *periphery*. The moment it invades the reading column, you have built an aesthetic prison.

## Rule 2: One glow, earned

CSS makes glow effects free, which is exactly why they read as cheap. This site has a single glow token:

```css
--glow: 0 0 24px rgba(74, 222, 128, 0.13);
```

It appears only on *interactive intent* — a hovered card, a focused button. Nothing glows at rest. The phosphor accent works the same way: `#4ade80` covers less than 2% of any given viewport. Scarcity is what keeps it luminous.

> A theme is a budget, not a bucket. Every neon pixel you spend makes the next one worth less.

## Rule 3: Motion should feel like a terminal, not a casino

Terminals are *fast*. Anything over 200ms betrays the metaphor. My motion constants:

| Interaction | Duration | Easing |
| --- | --- | --- |
| Page transition | 180ms | ease-out |
| Card hover lift | 300ms | cubic-bezier(0.2, 0, 0, 1) |
| Caret blink | 1.1s steps(1) | — |
| ⌘K palette | 160ms | ease-out |

The blinking caret deserves special mention: `steps(1)` — not a fade. A caret that fades in and out is a heartbeat monitor, not a terminal.

## The dark/light problem

A phosphor terminal theme resists light mode. Inverting to white kills the fantasy entirely, so the light theme pivots the metaphor: **paper printout instead of screen**. Warm off-white (`#faf9f5`), ink text, and the accent green drops from `#4ade80` to `#15803d` — same hue family, printed instead of emitted.

Readers who switch themes should feel the *same personality* in a different medium, not a different site.

## Closing

The test for any aesthetic system: delete the styling and read your last three posts. If the writing carried them, the theme is decoration — the good kind. If the theme was doing the heavy lifting, no amount of phosphor will save you.
