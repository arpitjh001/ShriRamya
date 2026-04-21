# Continue VS Code Extension - Multi-Model AI Setup Guide

## ✅ Setup Complete Status

### Ollama Status
- **Ollama Server**: ✅ Running on http://localhost:11434
- **Models Installed**: ✅ 5 models ready

### Installed Models

| Model | Size | Purpose | Status |
|-------|------|---------|--------|
| `deepseek-coder:6.7b` | 3.8 GB | Code Generation & Autocomplete | ✅ Ready |
| `deepseek-coder-v2:latest` | 8.9 GB | Advanced Code Generation | ✅ Ready |
| `deepseek-r1:8b` | 5.2 GB | Reasoning & Architecture | ✅ Ready |
| `gemma3:4b` | 3.3 GB | Fast Responses | ✅ Ready |
| `nomic-embed-text:latest` | 274 MB | Codebase Embeddings | ✅ Ready |
| `qwen2.5-coder:7b` | ~4.7 GB | Autocomplete (Alternative) | ⏳ Downloading |

**Total Storage Used**: ~21.5 GB (excluding Qwen)

---

## 📋 Configuration Steps

### Step 1: Copy Configuration File

The Continue configuration file has been created at:
```
c:\Users\Lenovo\shriramya\ShriRamya\continue-config.json
```

**Copy this file to the Continue config directory:**

```powershell
# PowerShell command to copy config
Copy-Item "c:\Users\Lenovo\shriramya\ShriRamya\continue-config.json" `
  "$env:APPDATA\Code\User\globalStorage\continue.continue\config.json" -Force
```

**Or manually:**
1. Open File Explorer
2. Navigate to: `%APPDATA%\Code\User\globalStorage\continue.continue\`
3. Copy `continue-config.json` content to `config.json` (or replace existing)

### Step 2: Verify Ollama is Running

Open a terminal and run:
```bash
ollama list
```

You should see all the models listed.

### Step 3: Restart VS Code

1. Close VS Code completely
2. Reopen VS Code
3. The Continue extension should now be configured

---

## 🎯 Model Configuration Explained

### Chat Models (For Conversations)

1. **DeepSeek R1 Reasoning** (`deepseek-r1:8b`)
   - Use for: Architecture decisions, complex problem solving
   - Best for: High-level reasoning and planning

2. **DeepSeek Coder V2** (`deepseek-coder-v2:latest`)
   - Use for: Complex code generation, refactoring
   - Best for: Multi-file changes, advanced patterns

3. **DeepSeek Coder** (`deepseek-coder:6.7b`)
   - Use for: General coding tasks, explanations
   - Best for: Day-to-day development

4. **Gemma 3** (`gemma3:4b`)
   - Use for: Quick questions, simple tasks
   - Best for: Fast responses when quality is less critical

### Autocomplete Model

**DeepSeek Coder** (`deepseek-coder:6.7b`)
- Provides inline code completions as you type
- Configured with optimized settings for balance between speed and quality

### Embeddings Provider

**Nomic Embed Text** (`nomic-embed-text:latest`)
- Creates vector embeddings of your codebase
- Enables semantic search across your project
- Powers the "@codebase" feature in Continue

---

## 🔧 Autocomplete Configuration

The autocomplete is configured with these optimized settings:

```json
{
  "maxPromptTokens": 1024,      // Context size for completions
  "debounceDelay": 500,         // Wait 500ms before triggering
  "maxSuffixPercentage": 0.2,   // 20% of context from after cursor
  "prefixPercentage": 0.3,      // 30% of context from before cursor
  "transform": true             // Enable code transformations
}
```

---

## 🧪 Testing the Setup

### Test 1: Verify Models Load

In VS Code with Continue:
1. Open the Continue sidebar (Ctrl+L or Cmd+L)
2. Click the model selector at the bottom
3. You should see all 4 chat models listed

### Test 2: Test Chat

1. Open Continue chat (Ctrl+L or Cmd+L)
2. Ask: "What is the purpose of this project?"
3. Switch between models to compare responses

### Test 3: Test Autocomplete

1. Open a JavaScript/TypeScript file
2. Start typing a function
3. You should see grayed-out autocomplete suggestions
4. Press Tab to accept

### Test 4: Test Codebase Search

1. In Continue chat, type: `@codebase`
2. Ask: "Where is the authentication handled?"
3. Continue should search your codebase and provide relevant files

---

## 🚀 Usage Tips

### When to Use Each Model

| Task | Recommended Model |
|------|------------------|
| Architecture decisions | DeepSeek R1 |
| Complex refactoring | DeepSeek Coder V2 |
| New feature implementation | DeepSeek Coder V2 |
| Daily coding | DeepSeek Coder |
| Quick questions | Gemma 3 |
| Code review | DeepSeek Coder V2 |
| Debugging | DeepSeek R1 |

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Open Chat | Ctrl+L | Cmd+L |
| Open Inline Edit | Ctrl+I | Cmd+I |
| Accept Autocomplete | Tab | Tab |
| Reject Autocomplete | Esc | Esc |

---

## 🔧 Troubleshooting

### Issue: Models Not Showing

**Solution:**
1. Verify Ollama is running: `ollama list`
2. Restart VS Code
3. Check Continue extension is enabled

### Issue: Autocomplete Not Working

**Solution:**
1. Check settings: `Ctrl+,` → Search "Continue"
2. Ensure "Tab Autocomplete" is enabled
3. Verify `deepseek-coder:6.7b` model exists: `ollama list`

### Issue: Slow Responses

**Solution:**
1. Use `gemma3:4b` for faster (but less accurate) responses
2. Close other applications to free up RAM
3. Consider using smaller models

### Issue: Out of Memory

**Solution:**
1. Close unused applications
2. Use smaller models (`gemma3:4b` instead of `deepseek-coder-v2`)
3. Reduce context window in settings

---

## 📊 System Requirements

### Minimum Requirements
- **RAM**: 16 GB (for 6.7B models)
- **Storage**: 25 GB free space
- **CPU**: Modern multi-core processor

### Recommended Requirements
- **RAM**: 32 GB (for running larger models)
- **Storage**: 50 GB SSD
- **GPU**: NVIDIA with 8GB+ VRAM (for GPU acceleration)

### Current Model Memory Usage

| Model | RAM Required |
|-------|-------------|
| gemma3:4b | ~6 GB |
| deepseek-coder:6.7b | ~8 GB |
| deepseek-r1:8b | ~10 GB |
| deepseek-coder-v2:latest | ~12 GB |
| nomic-embed-text | ~512 MB |

---

## 📝 Configuration File Location

The Continue configuration file is located at:
```
%APPDATA%\Code\User\globalStorage\continue.continue\config.json
```

Which expands to:
```
C:\Users\Lenovo\AppData\Roaming\Code\User\globalStorage\continue.continue\config.json
```

---

## 🔄 Updating Models

To update a model to the latest version:
```bash
ollama pull deepseek-coder:6.7b
```

To remove a model:
```bash
ollama rm model-name
```

To list all models:
```bash
ollama list
```

---

## 📈 Performance Optimization

### For Better Autocomplete Speed
1. Use `deepseek-coder:6.7b` (smaller, faster)
2. Reduce `maxPromptTokens` to 512
3. Increase `debounceDelay` to 750ms

### For Better Code Quality
1. Use `deepseek-coder-v2:latest` for chat
2. Increase `maxPromptTokens` to 2048
3. Use `@codebase` to provide more context

---

## 🎓 Next Steps

1. ✅ Copy the config file to Continue's directory
2. ✅ Restart VS Code
3. ✅ Test each model
4. ✅ Configure your preferred default model
5. ✅ Start coding with AI assistance!

---

**Setup Date**: March 10, 2026  
**Continue Version**: Latest  
**Ollama Version**: Latest  
**Status**: ✅ Ready to Use
