# Agent Teams Reference — Best Setups (Feb 2026)

## 1. Official Claude Code Agent Teams (Built-in)
- **Status:** Experimental, enabled via env var
- **How:** Tell Claude in plain English to spawn teammates
- **Features:** Teammate-to-teammate messaging, shared task lists, coordinated work
- **Docs:** https://code.claude.com/docs/en/agent-teams
- **Enabled in:** `.claude/settings.json` → `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

## 2. everything-claude-code (Hackathon Winner)
- **GitHub:** https://github.com/affaan-m/everything-claude-code
- **Agents (13):** planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, e2e-runner, refactor-cleaner, doc-updater, go-reviewer, go-build-resolver, python-reviewer, database-reviewer
- **Also includes:** 50+ skills, 30+ commands, hooks, MCP configs, language-specific rules
- **CLAUDE.md templates:** SaaS Next.js, Go microservice, Django API, Rust API
- **Multi-agent commands:** /multi-plan, /multi-execute, /multi-backend, /multi-frontend

## 3. wshobson/agents (112 Agents)
- **GitHub:** https://github.com/wshobson/agents
- **Agents (112):** Across 72 plugins — Python, JS/TS, Kubernetes, security, DevOps, AI/ML, full-stack
- **Orchestrators (16):** Full-stack dev, security hardening, ML pipelines, incident response
- **Example flow:** architect → database → frontend → testing → security → deploy → observability

## 4. IndyDevDan Multi-Agent Observability
- **GitHub:** https://github.com/disler/claude-code-hooks-multi-agent-observability
- **Purpose:** Real-time dashboard to monitor all running agents
- **Has CLAUDE.md:** Yes, plus .claude/skills/ folder
- **Best for:** Visibility into what your agent team is doing

## 5. Pixel Agents (Visual Only — Parallel)
- **GitHub:** https://github.com/pablodelucca/pixel-agents
- **Purpose:** VS Code extension — pixel art characters for each agent terminal
- **Note:** Visualization only, agents run in parallel (not coordinated teams)
- **Saved:** Research/pixel-agents-CLAUDE.md

## Nate Herk — AI Automation
- **YouTube:** https://youtube.com/@NateHerk
- **Community:** https://skool.com/ai-automation-society
- **Content:** Claude Code workflows, n8n integration, no-code AI agents, Firecrawl MCP setup
- **Agency:** TrueHorizon AI
