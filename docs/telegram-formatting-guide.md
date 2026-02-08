# Telegram Formatting Guide for All Agents

**Applies to:** Hikari, Mika, Sora, Koji, and all future agents
**Last Updated:** 2026-02-07
**Source:** Gabe requested global formatting standards for Telegram messages

---

## 🚨 The Problem

Telegram Bot API **does not support markdown tables**. They render as plain text mess.

## ✅ What Works

| Format | Syntax | Result |
|--------|--------|--------|
| **Bold** | `**text**` or `<b>text</b>` | **text** |
| *Italic* | `_text_` or `<i>text</i>` | *text* |
| `Code` | `` `text` `` | `text` |
| ```Block``` | ` ```text``` ` | Monospace block |
| [Links](url) | `[text](url)` | Clickable |
| Emojis | Direct paste | 🎨 Visual anchors |

## ❌ What Doesn't Work

- Markdown tables (`| col | col |`) — render as plain text mess
- Nested structures — break on mobile
- Long lines — >40 chars wrap poorly on phones

## 🎨 Recommended Patterns

### 1. Bullet Lists (Preferred)
```
📊 Trading Schedule
• 6:00 AM — Mika: Pre-market brief
• 9:25 AM — Sora: Pre-open check
• 12:00 PM — Sora: Midday position check
• 3:55 PM — Sora: EOD report
```
Clean, readable, mobile-friendly.

### 2. Code Blocks (For aligned data)
```
Time  | Agent | Task
------|-------|------------------
06:00 | Mika  | Pre-market brief
09:25 | Sora  | Pre-open check
12:00 | Sora  | Midday check
15:55 | Sora  | EOD report
```
Use `<pre>` tags or triple backticks. Fixed-width font = alignment works.

### 3. Data Cards (Visual hierarchy)
```
🎯 Task: Review LinkedIn Post 1
👤 Assignee: Gabe
📊 Status: Today
🏷️ Domain: Startup
💡 Notes: 5-post series drafted
```
Emoji headers create visual "cards" without tables.

### 4. Section Headers with Emojis
```
🧬 MASTER TASKS
✅ Fix Gemini memory → Done
⏰ Mika pre-market brief → Scheduled
📋 Map trading to ADP → Inbox

⚡ HIKARI DASHBOARD  
🤖 Trading Agent System — Running
📊 Mika — Scheduled (Mon 6 AM)
💰 Sora — Scheduled (Mon 9:25 AM)
```

## 📱 Mobile-First Rules

1. **Keep lines short** — < 40 chars ideal for phones
2. **Use emojis as visual anchors** — faster scanning than tables
3. **Whitespace is your friend** — blank lines between sections
4. **Bold the key info** — not the labels
5. **Avoid nested structures** — flat lists > hierarchical tables

## 💡 Example: Bad vs Good

### ❌ Bad (Markdown table):
```
| Task | Status | Who |
|------|--------|-----|
| Post 1 | Drafted | Gabe |
| Post 2 | Drafted | Gabe |
```

### ✅ Good (Visual cards):
```
📝 CONTENT PIPELINE

📄 Post 1: The Why
   Status: ✅ Drafted
   Owner: 👤 Gabe
   Platform: 📱 LinkedIn + Twitter

📄 Post 2: The Architecture  
   Status: ✅ Drafted
   Owner: 👤 Gabe
   Platform: 📱 LinkedIn + Twitter
```

---

**Remember:** When in doubt, use bullet lists with emojis. They're always readable on mobile.
