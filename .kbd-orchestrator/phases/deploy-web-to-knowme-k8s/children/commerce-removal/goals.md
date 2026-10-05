# Goals — deploy-web-to-knowme-k8s › commerce-removal

- Capture the daemon/web test baseline before touching source (parent risk 1: baseline UNKNOWN)
- Build-profile seam; decouple collab permissions from billing lifecycle
- Remove AMR login, billing, touchpoints/campaigns, marketplace and Vela media from the KnowDesign profile
- Disable telemetry and upstream-hosted endpoints by configuration
- Done = desktop starts a local agent run with no sign-in or balance prompt and zero requests to *.open-design.ai
