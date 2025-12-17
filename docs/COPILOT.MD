# GitHub Copilot — Quick setup for ALOVE

This repo recommends GitHub Copilot in VS Code. If you have a Copilot seat (personal or org), follow these steps:

1. Install extensions

   - VS Code Extensions: `GitHub Copilot` (and optionally `GitHub Copilot Chat`).

2. Sign in

   - After installing, sign in when prompted and choose your GitHub account with an active Copilot seat.

3. Workspace settings

   - This repo contains `.vscode/settings.json` which enables Copilot and inline suggestions for the workspace automatically.
   - If you prefer to opt out, disable Copilot in VS Code Settings → `GitHub Copilot: Enable` for the workspace.

4. Keys and usage

   - Accept inline suggestion: Tab (or Ctrl/Cmd+Enter, depending on your keymaps).
   - Use Copilot Chat (if installed) for conversational assistance inside VS Code.

5. Security & best practices
   - Always review suggestions — verify logic and licenses.
   - Do not paste secrets into the editor. Add sensitive files to `.gitignore`.
   - We exclude infra/docs and common secret patterns from Copilot suggestions via workspace settings.

If you want, open an issue or PR and I can help add these files to the repo for you.
