# Carnation directory submission draft

**Status: review only. Do not submit or publish this listing yet.**

This is the proposed shared listing for the Anthropic and OpenAI directories.
The hosted MCP endpoint is `https://public-api.carnation.bio/mcp`.

## Identity

- **Listing name:** Carnation
- **Permanent slug:** `carnation`
- **Developer:** Carnation Bio
- **Submission owner:** owen@carnation.bio
- **Website:** https://www.carnation.bio
- **Support:** https://app.carnation.bio/support
- **Privacy policy:** https://app.carnation.bio/privacy
- **Terms of service:** https://app.carnation.bio/terms

## Listing copy

**One-line description**

Build microscopy analysis pipelines.

**Full description**

Carnation helps scientists inspect microscopy data, translate biological
questions and published methods into analysis pipelines, validate workflows on
representative fields, compare parameters, review images and measurements, and
save evidence-backed pipelines to their Carnation workspace.

This release requires a Carnation account and an existing uploaded plate
dataset. Upload, full dataset runs, bulk result export, and true volumetric
analysis are not yet available through the plugin.

**Anthropic categories**

- Health & Life Sciences
- Data & Analytics
- Productivity

**OpenAI primary category:** Productivity

**Capabilities**

- Read and write
- Authentication is always required through Carnation OAuth
- The connection can access only the organization and permissions approved by
  the signed-in Carnation user

## Proposed use cases

### Reproduce a published analysis

**Prompt:** Use this paper to build a matching analysis pipeline for my dataset.
Confirm the channel mapping, test it on representative fields, and show me the
source images, masks, and measurements before saving anything.

**Prerequisite:** A ready microscopy dataset already uploaded to Carnation.

### Compare segmentation parameters

**Prompt:** Compare two Cellpose diameter settings on the same representative
fields. Show me the masks and quantitative differences, then recommend which
setting to validate on additional fields.

**Prerequisite:** A ready plate dataset with channels identified in Carnation.

### Save a validated pipeline

**Prompt:** Load my existing nuclei-and-cells pipeline, validate it on this
dataset, show me the evidence, and save the approved revision as a new version.

**Prerequisite:** A ready dataset and an existing saved pipeline in Carnation.

## Data handling answers

- **API ownership:** Carnation's own API and storage services
- **Personal health data:** Depends on the customer's microscopy data and
  metadata; Carnation does not require health data for ordinary use
- **Advertisements or sponsored content:** No
- **Conversation collection:** Carnation receives specific MCP tool requests and
  does not request the assistant's full conversation history

## Compliance notes

- The connector does not transfer money or execute financial transactions.
- The public authoring surface excludes the virtual-staining model so the
  connector does not generate synthetic image content with an AI model.
- Segmentation models return scientific masks and measurements as analysis
  evidence.
- Tool descriptions are factual, narrowly scoped, and do not instruct the model
  to call other tools or load instructions from external sources.
- Every tool declares a title and read-only, destructive, idempotency, and
  open-world annotations.
- The remote server uses Streamable HTTP and per-user OAuth.

## Items required before submission

- Review and approve this listing name, copy, categories, and use cases.
- Review the privacy policy and terms of service with the appropriate legal
  owner.
- Deploy the server and public-page changes after their PR is approved.
- Publish the reviewed plugin package version.
- Create a dedicated reviewer account with representative sample data and no
  MFA or magic-link dependency during review.
- Record a short walkthrough video showing connection, authorization, dataset
  inspection, a bounded preview, visible evidence, and a save.
- Enter the OpenAI domain-verification token in the public API environment after
  the portal provides it.
- Run both portals' live MCP scans against the deployed version and resolve any
  new findings.
