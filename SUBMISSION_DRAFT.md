# Carnation directory submission draft

**Status: review only. Do not submit or publish this listing yet.**

This is the proposed shared listing for the Anthropic and OpenAI directories.
The hosted MCP endpoint is `https://public-api.carnation.bio/mcp`.

## Identity

- **Listing name:** Carnation
- **Permanent slug:** `carnation`
- **Developer:** Carnation Bio
- **Legal entity:** Carnation Labs, Inc.
- **Submission owner:** owen@carnation.bio
- **Website:** https://www.carnation.bio
- **Support:** https://app.carnation.bio/support
- **Privacy policy:** https://app.carnation.bio/privacy
- **Terms of service:** https://app.carnation.bio/terms
- **Stable package version:** `0.1.0`
- **Brand color:** `#D94A64`

## Listing copy

**Subtitle**

Microscopy analysis at scale

**One-line description**

Answer biological questions from microscopy images with scalable cloud analysis.

**Full description**

Carnation helps scientists answer biological questions from microscopy images.
Starting from a research question, assay description, or published method, it
inspects the connected dataset, confirms channels and metadata, and runs
state-of-the-art segmentation models and quantitative measurements on cloud GPU
infrastructure. Scientists can review representative source images, masks, and
measurements before approving the analysis across the full dataset. Completed
results can be queried directly or exported as Parquet and CSV.

**Example prompt**

> Does the treated condition change nuclear morphology, cell size, or cell count
> compared with the vehicle control? Build an analysis to measure these effects,
> confirm the treatment and control groups and channel mapping, and test it on
> representative images. Show me the source images, segmentation masks, and
> measurement distributions, then run the validated analysis across the full
> dataset and summarize the results.

**Anthropic categories**

- Health & Life Sciences
- Data & Analytics
- Productivity

**OpenAI primary category:** Productivity

**Capabilities**

- Inspect microscopy datasets, images, channels, and experimental metadata.
- Run state-of-the-art segmentation and quantitative measurements on cloud GPUs.
- Test analyses on representative images and compare parameters.
- Review source images, masks, overlays, measurements, and quality evidence.
- Run analyses across full datasets, query results, and export Parquet or CSV.
- Read and write; no commerce or payments.

**Current prerequisites and limits**

- A Carnation account and an existing uploaded plate dataset are required.
- Dataset upload and true volumetric analysis are not yet available through this connection.
- Analysis currently operates on one plate at a time, at `t=0`, using 2D inputs or an explicit Z projection.

## Visuals

- Use the approved 2D segmentation image for Anthropic, the plugin repository, and marketing.
- Do not include a screenshot in the OpenAI submission unless the MCP adds custom embedded UI; OpenAI's current screenshot guidance is for custom UI.
- Reserve the 3D visualization image for the volumetric release.

## Data handling answers

- **API ownership:** Carnation's own API and storage services.
- **Personal health data:** Depends on the customer's microscopy data and metadata; Carnation does not require health data for ordinary use.
- **Advertisements or sponsored content:** No.
- **Conversation collection:** Carnation receives specific MCP tool requests and does not request the assistant's full conversation history.
- **Model training:** Carnation does not use customer content to train generalized AI or machine-learning models unless the customer explicitly agrees.

## Reviewer walkthrough

- Use the dedicated **Carnation Directory Review** organization and
  `reviewer@carnation.bio` password-login account with no MFA, email-code,
  magic-link, or private-network dependency.
- Provide a public, non-sensitive 2D treatment-versus-control sample dataset.
- Give the reviewer access to inspect data, segment and measure representative images, save a pipeline, launch a full run, query results, and export Parquet or CSV.
- Use the approved example prompt as the primary walkthrough.
- Keep the account and sample data available for later re-reviews.

## Compliance notes

- The connector does not transfer money or execute financial transactions.
- The public surface excludes virtual staining so the connector does not generate synthetic image content with an AI model.
- Segmentation models return scientific masks and measurements as analysis evidence.
- Tool descriptions are factual, narrowly scoped, and do not instruct the model to call other tools or load instructions from external sources.
- Every tool declares a title and read-only, destructive, idempotency, and open-world annotations.
- The remote server uses Streamable HTTP and per-user OAuth.

## Items required before submission

- Merge and deploy the approved app/API copy and legal pages.
- Publish the reviewed `0.1.0` plugin package.
- Finish the reviewer account invitation and upload the approved sample data.
- Record a short walkthrough showing connection, authorization, metadata confirmation, representative preview, visible evidence, a confirmed full run, a result query, and export.
- Enter the OpenAI domain-verification token in the public API environment after the portal provides it.
- Run both portals' live MCP scans against the deployed version and resolve any new findings.
