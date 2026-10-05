# Carnation plugin

Use Carnation from Claude Code or Codex to answer biological questions from microscopy images with scalable cloud analysis.

The plugin connects to Carnation's hosted MCP service. It contains instructions and connection metadata only, with no executable code or credentials.

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

> Does the treated condition change nuclear morphology, cell size, or cell count compared with the vehicle control? Build an analysis to measure these effects, confirm the treatment and control groups and channel mapping, and test it on representative images. Show me the source images, segmentation masks, and measurement distributions, then run the validated analysis across the full dataset and summarize the results.

Your first Carnation tool call opens Carnation in the browser. Sign in and approve the requested permissions. The assistant can then inspect your organization's data and use the tools allowed by that connection.

Manage or revoke the connection from **Carnation → MCP connections**. A revoked client must complete a new authorization before it can use Carnation again.

## Direct MCP setup

Clients that support remote HTTP MCP and OAuth can connect directly to:

```text
https://public-api.carnation.bio/mcp
```

The plugin is recommended for Claude Code and Codex because it also teaches the assistant Carnation's scientific validation workflow.

## Current scope

Carnation supports dataset and field inspection, saved analysis loading, live step discovery, workflow validation, representative previews, visible evidence, parameter sweeps, cancellation, explicit pipeline saves, confirmed full-dataset runs, server-side result queries, and Parquet or CSV exports.

Dataset upload and true volumetric analysis are planned follow-ups. Current analysis is limited to one plate at a time, `t=0`, and 2D images or an explicit Z projection.

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
- Source is available here so users can inspect exactly what the plugin installs.

For access or support, contact [support@carnation.bio](mailto:support@carnation.bio).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). This repository is licensed under Apache License 2.0.
