# Carnation

Carnation connects Claude Code to Carnation's hosted microscopy analysis service. It helps scientists inspect connected datasets, confirm experimental metadata and channel assignments, test segmentation and measurement workflows on representative images, compare parameters, and review visible evidence before launching a full analysis.

The plugin contains connection metadata, a scientific workflow skill, and a local TIFF upload helper for clients that can run commands. Authentication uses Carnation's browser-based OAuth flow; the package contains no credentials or hooks. Image transfer uses a separate one-time authorization and requires approval of the inspected file selection. Treatment maps are imported as drafts and require separate review before confirmation. True volumetric analysis and cloud-to-cloud uploads remain follow-ups.
