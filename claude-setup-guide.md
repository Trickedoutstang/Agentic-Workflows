# Claude Code Setup Guide

Complete setup guide for Claude Code CLI with rules, agents, and skills.

---

## 1. Install Claude Code

### Windows (PowerShell)
```powershell
# Install Node.js first (if not installed)
winget install OpenJS.NodeJS.LTS

# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### macOS
```bash
brew install node
npm install -g @anthropic-ai/claude-code
```

### First Run
```bash
# Navigate to your project directory
cd "C:\Users\YourName\Projects\MyProject"

# Launch Claude Code
claude

# First time: it will open browser to authenticate with your Anthropic account
```

---

## 2. Directory Structure

Create this folder structure on your machine:

### Windows
```
%USERPROFILE%\.claude\
  settings.json
  rules\
    common\
      agents.md
      coding-style.md
      development-workflow.md
      git-workflow.md
      hooks.md
      patterns.md
      performance.md
      security.md
      testing.md
```

### macOS
```
~/.claude/
  settings.json
  rules/
    common/
      (same files as above)
```

### Create the directories

**Windows (PowerShell):**
```powershell
mkdir "$env:USERPROFILE\.claude\rules\common" -Force
```

**macOS:**
```bash
mkdir -p ~/.claude/rules/common
```

---

## 3. Settings File

Save this as `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`):

```json
{
  "permissions": {
    "allow": [
      "Bash(ls:*)",
      "Bash(node --check:*)"
    ],
    "additionalDirectories": []
  }
}
```

Customize permissions as needed. Add directories you want Claude to access in `additionalDirectories`.

---

## 4. Rule Files

Create each of these files inside `~/.claude/rules/common/` (Windows: `%USERPROFILE%\.claude\rules\common\`):

### 4.1 `agents.md`

```markdown
# Agent Orchestration

## Available Agents

Located in `~/.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
```

### 4.2 `coding-style.md`

```markdown
# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones:

WRONG:  modify(original, field, value) -> changes original in-place
CORRECT: update(original, field, value) -> returns new copy with change

Rationale: Immutable data prevents hidden side effects, makes debugging easier, and enables safe concurrency.

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large modules
- Organize by feature/domain, not by type

## Error Handling

ALWAYS handle errors comprehensively:
- Handle errors explicitly at every level
- Provide user-friendly error messages in UI-facing code
- Log detailed error context on the server side
- Never silently swallow errors

## Input Validation

ALWAYS validate at system boundaries:
- Validate all user input before processing
- Use schema-based validation where available
- Fail fast with clear error messages
- Never trust external data (API responses, user input, file content)

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values (use constants or config)
- [ ] No mutation (immutable patterns used)
```

### 4.3 `development-workflow.md`

```markdown
# Development Workflow

> This file extends git-workflow.md with the full feature development process.

## Feature Implementation Workflow

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format
   - See git-workflow.md for commit message format and PR process
```

### 4.4 `git-workflow.md`

```markdown
# Git Workflow

## Commit Message Format

<type>: <description>

<optional body>

Types: feat, fix, refactor, docs, test, chore, perf, ci

## Pull Request Workflow

When creating PRs:
1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch
```

### 4.5 `hooks.md`

```markdown
# Hooks System

## Hook Types

- **PreToolUse**: Before tool execution (validation, parameter modification)
- **PostToolUse**: After tool execution (auto-format, checks)
- **Stop**: When session ends (final verification)

## Auto-Accept Permissions

Use with caution:
- Enable for trusted, well-defined plans
- Disable for exploratory work
- Never use dangerously-skip-permissions flag
- Configure `allowedTools` in `~/.claude.json` instead

## TodoWrite Best Practices

Use TodoWrite tool to:
- Track progress on multi-step tasks
- Verify understanding of instructions
- Enable real-time steering
- Show granular implementation steps

Todo list reveals:
- Out of order steps
- Missing items
- Extra unnecessary items
- Wrong granularity
- Misinterpreted requirements
```

### 4.6 `patterns.md`

```markdown
# Common Patterns

## Skeleton Projects

When implementing new functionality:
1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:
- Define standard operations: findAll, findById, create, update, delete
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

### API Response Format

Use a consistent envelope for all API responses:
- Include a success/status indicator
- Include the data payload (nullable on error)
- Include an error message field (nullable on success)
- Include metadata for paginated responses (total, page, limit)
```

### 4.7 `performance.md`

```markdown
# Performance Optimization

## Model Selection Strategy

**Haiku 4.5** (90% of Sonnet capability, 3x cost savings):
- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems

**Sonnet 4.6** (Best coding model):
- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks

**Opus 4.5** (Deepest reasoning):
- Complex architectural decisions
- Maximum reasoning requirements
- Research and analysis tasks

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Extended Thinking + Plan Mode

Extended thinking is enabled by default, reserving up to 31,999 tokens for internal reasoning.

Control extended thinking via:
- **Toggle**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: Set `alwaysThinkingEnabled` in `~/.claude/settings.json`
- **Budget cap**: `export MAX_THINKING_TOKENS=10000`
- **Verbose mode**: Ctrl+O to see thinking output

For complex tasks requiring deep reasoning:
1. Ensure extended thinking is enabled (on by default)
2. Enable **Plan Mode** for structured approach
3. Use multiple critique rounds for thorough analysis
4. Use split role sub-agents for diverse perspectives

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
```

### 4.8 `security.md`

```markdown
# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues
```

### 4.9 `testing.md`

```markdown
# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):
1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (framework chosen per language)

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first
```

---

## 5. Install Everything Claude Code (Skills + Agents)

This is a community-maintained collection of pre-built skills, agents, and rules.

```bash
# Clone the repository
git clone https://github.com/affaan-m/everything-claude-code.git --depth=1

# Run the installer
cd everything-claude-code
bash install.sh
```

**Windows users:** If `bash` isn't available, use Git Bash (comes with Git for Windows) or WSL.

The installer will ask which language pack to install (typescript, python, etc.) and place skills/agents in the correct `~/.claude/` directories.

---

## 6. Project-Level CLAUDE.md

Each project can have its own `CLAUDE.md` file in its root directory. This gives Claude context about that specific project. Example:

```markdown
# My Project

## What this is
Description of your project.

## Architecture
- Language: TypeScript / Python / etc.
- Framework: Next.js / Django / etc.
- Database: PostgreSQL / etc.

## Key Files
| File | Purpose |
|------|---------|
| src/index.ts | Entry point |
| src/lib/db.ts | Database connection |

## Conventions
- Use functional components
- Use TypeScript strict mode
- Run `npm test` before committing
```

---

## 7. Useful Commands

| Command | What it does |
|---------|-------------|
| `claude` | Start Claude Code in current directory |
| `claude --help` | Show all options |
| `/help` | In-session help |
| `/plan` | Enter plan mode (research before coding) |
| `/commit` | Smart commit with conventional format |
| `/review` | Code review current changes |
| `/rc` | Remote connect (mobile access) |
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit Claude Code |
| `Option+T` / `Alt+T` | Toggle extended thinking |
| `Ctrl+O` | Toggle verbose thinking output |

---

## 8. Quick Start Checklist

- [ ] Install Node.js (v18+)
- [ ] Install Claude Code: `npm install -g @anthropic-ai/claude-code`
- [ ] Create `~/.claude/settings.json`
- [ ] Create `~/.claude/rules/common/` directory
- [ ] Copy all 9 rule files into `rules/common/`
- [ ] (Optional) Install Everything Claude Code skills
- [ ] Create a `CLAUDE.md` in your project root
- [ ] Run `claude` in your project directory
- [ ] Authenticate with your Anthropic account
- [ ] Start coding!

---

## 9. Tips

- **Plan before coding**: Use `/plan` for anything non-trivial
- **Let agents help**: Claude auto-launches code-reviewer, planner, etc.
- **Mobile access**: Use `/rc` from any session to get a join code for your phone
- **Budget**: Track usage at console.anthropic.com
- **Context**: Keep `CLAUDE.md` updated as your project evolves
- **Rules are global**: Files in `~/.claude/rules/common/` apply to ALL projects
