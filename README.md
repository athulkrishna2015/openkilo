# OpenKilo

[![npm version](https://img.shields.io/npm/v/openkilo.svg)](https://www.npmjs.com/package/openkilo)
[![npm downloads](https://img.shields.io/npm/dt/openkilo)](https://www.npmjs.com/package/openkilo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Known issue: OpenKilo is currently not working with OpenCode 2.0.19.** In a local verification, OpenCode did not load the configured OpenKilo plugin and no `openkilo` provider or models appeared. The current release should not be installed with the expectation that it will expose models. This README will be updated when compatibility is restored.

OpenKilo is intended to provide access to free AI models through Kilo Gateway, without requiring an API key for free models. That functionality is currently unavailable in the tested OpenCode version.

## Installation

### 🤖 Let an LLM do it

Paste this into any LLM agent (OpenCode, Claude Code, Cursor, etc.):

```text
Install the openkilo plugin by following: https://raw.githubusercontent.com/AnganSamadder/openkilo/main/README.md
```

<details>
<summary><b>Instructions for LLM Agents</b></summary>

**Do not install OpenKilo for use with OpenCode 2.0.19 yet.** It currently fails to load as a provider plugin in that version. The following instructions describe the intended setup only and will not resolve the known issue:

1. **Install the NPM package globally:**
   ```bash
   npm install -g openkilo
   ```
   *Note: Installation alone does not make models available in OpenCode 2.0.19.*

2. **Configure OpenCode:**
   Add `"openkilo"` to the `plugin` array in the user's config file (usually `~/.config/opencode/opencode.json`).

   ```json
   {
     "plugin": [
       "openkilo"
     ]
   }
   ```

3. **Verify & Finalize:**
   - Do not tell the user installation succeeded or that OpenKilo models are available until this issue is fixed and verified.

</details>

### 👤 For Humans (Manual)

1. **Install via NPM:**
   ```bash
   npm install -g openkilo
   ```

2. **Enable the Plugin:**
   Add `"openkilo"` to your `~/.config/opencode/opencode.json`:
   ```json
   {
     "plugin": [
       "openkilo"
     ]
   }
   ```

3. **Current status:**
   OpenCode 2.0.19 does not load the configured OpenKilo provider in our verification. Models are not available; restarting does not fix this currently.

## ✨ Features

- **Free models (intended)**: 40+ free models without authentication (currently unavailable; see known issue above)
- **Kilo Gateway**: Uses Kilo's free OpenRouter-compatible gateway at `api.kilo.ai`
- **Dual authentication**: OAuth browser flow or API key for 350+ paid models
- **Auto-refresh**: Model registry updates automatically on OpenCode startup
- **Simple tools**: `/kilo_login`, `/kilo_logout`, `/kilo_status`, `/kilo_models`, `/kilo_refresh`

## 🎯 Available Free Models

| Model | Context | Output | Description |
|-------|---------|--------|-------------|
| `z-ai/glm-5:free` | 202K | 131K | Z.AI's flagship model for complex systems |
| `deepseek/deepseek-r1-0528:free` | 164K | 164K | DeepSeek R1 reasoning model |
| `meta-llama/llama-3.3-70b-instruct:free` | 128K | 128K | Meta Llama 3.3 70B |
| `qwen/qwen3-coder:free` | 262K | 262K | Qwen3 Coder 480B |
| `minimax/minimax-m2.5:free` | 205K | 131K | MiniMax M2.5 |
| `google/gemma-3-27b-it:free` | 131K | 8K | Google Gemma 3 27B |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 128K | 8K | Mistral Small 3.1 |

And **30+ more free models**!

## 🔐 Authentication (For Paid Models)

To access 350+ paid models, authenticate with Kilo:

```
/kilo_login
```

This opens a browser for OAuth authentication. Alternatively, use an API key:

```
/kilo_login --method api-key --api-key YOUR_KEY
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `kilo_login` | Authenticate with Kilo (OAuth or API key) |
| `kilo_logout` | Clear stored credentials |
| `kilo_status` | Check authentication status |
| `kilo_refresh` | Force refresh model registry |
| `kilo_models` | List available models |

## ⚙️ Configuration

| File | Purpose |
|------|---------|
| `~/.config/openkilo/auth.json` | Stored credentials |
| `~/.cache/openkilo/gateway-models.json` | Model registry cache |

## ❓ Troubleshooting

### OpenKilo Provider or Models Are Missing

This is a known compatibility issue in the current release with OpenCode 2.0.19. We verified that the configured plugin did not load and the `openkilo` provider was absent. Restarting OpenCode and refreshing the model registry do not fix a plugin that OpenCode does not load. Please wait for a compatibility fix before relying on OpenKilo.

### Models Not Showing
1. Check OpenCode config has `"openkilo"` in the `plugin` array
2. Restart OpenCode
3. Run `/kilo_refresh` to force refresh the model registry

### Free Models Not Working
- Free models should work without any API key
- The plugin uses `apiKey: "anonymous"` for free access
- If you see authentication errors, run `/kilo_status` to check

### Paid Models Require Auth
- Run `/kilo_login` to authenticate
- Use `--method api-key` if you have a Kilo API key

## 🔧 Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck

# Lint
bun run lint
```

## 📄 License

MIT
