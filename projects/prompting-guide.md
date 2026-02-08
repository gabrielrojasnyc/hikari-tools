# 2026 AI Model Prompting Guide
*Compiled for Nagomi & Coding/Trading Agents — February 7, 2026*

This guide consolidates best practices for the current frontier models (GPT-5.3, Grok 4.1, Claude Opus 4.6, Sonnet 4.5, Gemini 3). It focuses on practical, actionable techniques to maximize performance in coding, trading analysis, and agentic orchestration.

---

## 1. GPT-5.3 Codex (OpenAI)
**Best For:** Heavy code generation, complex refactoring, enterprise-grade agent workflows.

### 🔑 Key Changes from GPT-4/5.0
*   **Verbosity Control:** GPT-5.3 is highly sensitive to output shape constraints. It defaults to "thorough," which can be verbose.
*   **Reasoning Effort:** Supports `reasoning_effort` (none/low/medium/high). For coding, **Medium** is the sweet spot; **High** is only for architecture design.

### 🛠 System Prompt Best Practices
Use "clamp" blocks to control verbosity and scope.

```markdown
<system_constraints>
- **Verbosity:** Low. Code only. No "Here is the code" preambles.
- **Scope:** Implement EXACTLY what is requested. No unasked-for features or UX embellishments.
- **Style:** Follow the user's existing patterns. Do not introduce new libraries unless necessary.
</system_constraints>
```

### 💻 Getting the Best Code Output
*   **Use "Apply Patch" Pattern:** Instead of rewriting full files, instruct it to generate git-compatible patches or search/replace blocks for large files.
*   **Scope Drift:** Explicitly forbid "UX improvements" unless asked. GPT-5.3 loves to "fix" UI it thinks is ugly.
    *   *Prompt:* "Do not change colors or styling unless explicitly part of the requirements."
*   **Clarification:** Enable a "Clarification Mode."
    *   *Prompt:* "If requirements are ambiguous, ask 1-3 specific clarifying questions before generating code. Do not guess."

### 🧠 Chain-of-Thought (CoT)
*   **Direct Prompting:** Best for simple functions or known refactors.
*   **CoT:** Required for architectural decisions. Use structured tags:
    ```xml
    <reasoning>
    1. Analyze dependencies...
    2. Identify breaking changes...
    3. Propose migration path...
    </reasoning>
    ```

### ⚡ Parameters
*   **Temperature:** `0.0` for code. `0.2` for architecture.
*   **Reasoning Effort:** `medium` (default for agents), `high` (for "hard" problems).

---

## 2. Grok 4 / 4.1 Fast (xAI)
**Best For:** Real-time market analysis, sentiment tracking, "pulse" checks on crypto/stocks.

### 🔑 Key Features
*   **Real-Time Injection:** Native access to X (Twitter) data. It *knows* what is trending now.
*   **Atomic Error Reduction:** 4.1 Fast has significantly reduced hallucination rates (~50% less than 4.0) for factual queries.
*   **Auto-Mode:** Automatically switches between "Fast" (direct answer) and "Reasoning" (web search + deep think) based on complexity.

### 📈 Trading & Analysis Prompts
Leverage its "now" awareness. Don't ask generic questions; ask for **synthesis**.

*   **Sentiment Analysis:**
    *   *Prompt:* "Scan X for $SOL sentiment in the last 6 hours. Filter out bot spam. Categorize opinions into: 'Bullish (Tech)', 'Bullish (Hype)', 'Bearish (FUD)', 'Bearish (Macro)'. Output as a JSON table."
*   **News Correlation:**
    *   *Prompt:* "Correlate the sudden drop in $TSLA with the top 3 trending news stories on X right now. Is the sentiment reacting to news or price action?"

### 🛠 System Prompt Tips
*   **Persona:** "You are a ruthless, objective market analyst. You do not care about community vibes, only data and verifiable sentiment."
*   **Hallucination Check:** Explicitly ask it to cite specific tweets or accounts when making claims about "market sentiment."

### ⚡ Parameters
*   **Temperature:** `0.3` - `0.5` (Higher than coding models to capture "vibe" nuances without being creative).
*   **Mode:** Use `Auto-mode` for general queries; force `Reasoning` for deep-dive due diligence (DD).

---

## 3. Claude Opus 4.6 (Anthropic)
**Best For:** Orchestration, complex reasoning, "Project Manager" agents, long-context retrieval (1M context).

### 🔑 Key Changes
*   **Adaptive Thinking:** Replaces manual "budget_tokens". Claude now decides *how hard* to think.
*   **No Pre-fill:** You can no longer pre-fill the assistant response (e.g., `{"role": "assistant", "content": "{"}`). You **must** use Structured Outputs or explicit system instructions.
*   **1M Context:** "Needle in a haystack" retrieval is near-perfect (93% accuracy at 256k+).

### 🤖 Orchestration & Agent Use
Opus 4.6 is the best "Brain" for a multi-agent system.

*   **The "Manager" Prompt:**
    ```markdown
    You are the Orchestrator. Your goal is to break down this complex user request into atomic tasks for sub-agents (Coder, Researcher, Reviewer).
    1. Analyze the request.
    2. List necessary steps.
    3. Assign each step to a specific agent persona.
    4. Output strictly in JSON format: { "plan": [ ... ] }
    ```
*   **Compaction:** Use the new **Compaction API** for long-running agents. It summarizes history server-side to keep context fresh without losing "state."

### 🧠 Adaptive Thinking
*   Trust the model. Do not force specific "thinking token" counts anymore.
*   *Prompt:* "Think adaptively. If the task is complex, spend more time reasoning about edge cases."

### ⚡ Parameters
*   **Temperature:** `0.0` - `0.3` (Precision is key).
*   **Output:** Max 128k tokens (great for generating full design docs).

---

## 4. Claude Sonnet 4.5 (Anthropic)
**Best For:** Analysis, code reviews, writing, "Worker" agents (high intelligence/cost ratio).

### 🔑 System Prompt Insights (The "Playbook")
Anthropic's own system prompt for Sonnet 4.5 reveals its "personality" is programmable.
*   **Tone:** Balances "professional prose" with "warm conversation." You must explicitly set the mode.
    *   *Prompt:* "Tone: Clinical, dry, dense. No fluff."
*   **Refusals:** Extremely strict on "malicious code." If asking for security reviews, frame it as "defensive analysis" or "audit" to avoid refusals.

### 📝 Analysis Best Practices
*   **"Teach it to teach you":** Sonnet 4.5 is trained to follow detailed formatting instructions perfectly.
*   **The "Reviewer" Prompt:**
    *   *Prompt:* "Review this PR. Focus ONLY on: 1. Security vulnerabilities. 2. Performance bottlenecks. Ignore styling/formatting. Output as a bulleted list of 'Blocking' vs 'Non-blocking' issues."

### ⚡ Parameters
*   **Temperature:** `0.1` (Analysis), `0.7` (Creative writing).

---

## 5. Gemini 3 Pro & Flash (Google)
**Best For:** Structured data extraction, massive context (2M+ tokens), multimodal (video/audio) analysis.

### 🔑 The Golden Rule: "Less is More"
Gemini 3 has over-corrected on instruction following. Old, verbose prompts (Gemini 1.5/2.0 era) confuse it or cause "bloated" output.
*   **Old:** "Please extract the data. Make sure it is JSON. Do not include markdown. Ensure keys are..."
*   **New:** "Extract Q3 revenue as JSON: {revenue, date}."

### 📊 Structured Data Best Practices
Gemini 3 is the king of "OCR to JSON" and "Video to JSON".
*   **Prompt Template:**
    ```text
    TASK: Extract all technical indicators from this chart image.
    OUTPUT: JSON list of objects { "indicator": "RSI", "value": 72, "signal": "Overbought" }
    ```
*   **Multimodal:**
    *   *Prompt:* "Watch this 1-hour trading session video. Output a CSV of every trade executed: Timestamp, Ticker, Buy/Sell, Price."

### ⚡ Parameters
*   **Model Selection:**
    *   **Pro:** For complex reasoning or massive context (e.g., "Analyze these 50 PDFs").
    *   **Flash:** For high-speed data extraction or simple queries.
*   **Thinking Level:** Set to `Low` for extraction tasks (faster, cheaper).

---

## 🏆 Summary: Which Model When?

| Task | Recommended Model | Why? |
| :--- | :--- | :--- |
| **Complex Coding** | **GPT-5.3 Codex** | Best reasoning, "apply patch" capability, follows scope constraints. |
| **Trading Signals** | **Grok 4.1 Fast** | Real-time X access, "vibe" analysis, lowest hallucination for news. |
| **Agent "Brain"** | **Claude Opus 4.6** | Adaptive thinking, huge context for maintaining state, best orchestration. |
| **Code Review** | **Claude Sonnet 4.5** | High intelligence, programmable tone, strict but accurate. |
| **Data Extraction** | **Gemini 3 Pro** | Best structured output (JSON), huge context window, handles video/images best. |

## 📚 Resources
*   **@godofprompt (2026 Tips):** Focus on "Context Engineering" rather than just "Prompt Engineering"—managing the *state* of the conversation is now more important than the perfect phrasing.
*   **Tools:** Use `PromptBuilder` for Gemini 3 migration (stripping verbosity).
