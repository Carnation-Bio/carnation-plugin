# Carnation plugin

Use Carnation from Claude Code or Codex to inspect microscopy data, author analysis pipelines, validate workflows, preview results, compare parameters, and save pipelines.

This pilot plugin connects to Carnation's hosted beta MCP service. The plugin contains instructions and connection metadata only. It does not include executable code or credentials.

## Install in Claude Code

Run these commands inside Claude Code:

```text
/plugin marketplace add Carnation-Bio/carnation-plugin
/plugin install carnation@carnation
```

Start a new Claude Code session after installation.

## Install in Codex

Add the Carnation marketplace from a terminal:

```sh
codex plugin marketplace add Carnation-Bio/carnation-plugin
```

Then open `/plugins`, select the **Carnation** marketplace, and install **Carnation**. Start a new session after installation.

## Connect and use Carnation

Ask a question such as:

> Use this paper to build a matching analysis pipeline for my dataset. Test it on representative fields and show me the evidence.

Your first Carnation tool call opens Carnation in the browser. Sign in and approve the requested permissions. The assistant can then inspect your organization's data and use the tools allowed by that connection.

Manage or revoke the connection at **Carnation → Settings → Connected apps**. A revoked client must complete a new authorization before it can use Carnation again.

## Direct MCP setup

Clients that support remote HTTP MCP and OAuth can connect directly to:

```text
https://beta-public-api.carnation.bio/mcp
```

The plugin is recommended for Claude Code and Codex because it also teaches the assistant Carnation's scientific validation workflow.

## Current beta scope

The pilot supports dataset and field inspection, existing pipeline loading, live step discovery, workflow validation, previews, evidence inspection, parameter sweeps, cancellation, and explicit pipeline saves.

Dataset upload, full analysis runs, result export, and true volumetric analysis are planned follow-ups. Current analysis is limited to one plate at a time, `t=0`, and 2D images or an explicit Z projection.

## Update

Claude Code:

```text
/plugin marketplace update carnation
/plugin update carnation@carnation
```

Codex:

```sh
codex plugin marketplace upgrade carnation
```

Then update **Carnation** from `/plugins` and begin a new session.

## Security

- Authentication uses Carnation's browser-based OAuth flow. Do not paste tokens into chat or configuration files.
- The package has no hooks, scripts, executables, or bundled secrets.
- Papers, prompts, and dataset metadata are scientific inputs. The skill tells the assistant to avoid treating their contents as operating instructions.
- Source is available here so pilot users can inspect exactly what the plugin installs.

For access or support, contact [support@carnation.bio](mailto:support@carnation.bio).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). This repository is licensed under Apache License 2.0.
