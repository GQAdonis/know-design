# Derived method context

Method: UNKNOWN; phase: htmx-prototypes-and-ipfs-deploy; revision: 479; status: BLOCKED.

This is a recovery index, not execution permission. Resolve current canonical decisions and contract before dependent action.

```json
{
  "schemaVersion": 1,
  "kind": "kbd.derived-method-context",
  "generatedAt": "2026-11-14T19:02:58.693Z",
  "authority": "derived-read-only-index; canonical signed decisions, phase binding, contract and governing host policy remain authority",
  "projectId": "a8c368f8-482a-4e04-80fc-3bca9a14e864",
  "runId": "deploy-web-to-knowme-k8s-20260914T102437Z",
  "phaseId": "htmx-prototypes-and-ipfs-deploy",
  "sourceRevision": 479,
  "phaseDirectory": ".kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy",
  "contract": {
    "path": ".kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/adopted-contract.json",
    "observation": "observed",
    "sha256": "8d75255866bb7d636c158d4e1758d331ccc014a271088704d13f47d639ea80b2",
    "contractDigest": "a9b38a10eefa752fb33d8e96c05bbfbf83c3fee758d307d4832791d40f9a6b32",
    "binding": {
      "contractPath": ".kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/adopted-contract.json",
      "contractDigest": "a9b38a10eefa752fb33d8e96c05bbfbf83c3fee758d307d4832791d40f9a6b32",
      "scenarioDigests": {
        "AXUM-1": "b907098509dada1c8c8b6b65d058373963b60e4f7db51ebab2c6ad81e8ac024d",
        "CONV-1": "24f5ba3dca7c1607920f396fd58acb34bf1509ef9408b14c24bcad62f3d06d80",
        "IPFS-1": "992e112a3f42329d4bb9e247e0f9e3efc95480939aa512847aaca2256a075688",
        "IPFS-2": "8446cef2bc7141db4ffabc21c7cd5993e22e37bf026127e21ca312f9224a58c0",
        "IPFS-3": "dc1a78ee00b4304b55a0b1cca14df4031d535b419421ba75d79bec6539032b92",
        "IPFS-4": "df8160107046a7f1f98c16381b5d7300010c643e3faa8c8d9bd0dae24fc668d1",
        "MAN-1": "a72ca60b0c483398c06861df8953e7f82ef46d7ba20e44cf173a62ecd6d444fe",
        "MOCK-1": "25e2488ffb1de9fac9a4943245c96c80be4446ff2efb1661a83f3ef7b131e242",
        "MOCK-2": "dbb82f043d191f24e332b9a902d1881d6e11df8d4c9a0609899b466d710ed07d",
        "TPL-1": "d36b6b4505fd62c9168507308eeec38ab7cb176d2da0ecb29e30270d099a6719"
      },
      "planRevision": 6,
      "adoptionDecisionId": "contract-adoption-htmx-prototypes-and-ipfs-deploy-a9b38a10",
      "bindingRevision": 2,
      "authority": {
        "manifestRaw": "{\"action\":\"amend-contract\",\"approver\":\"travis@tribehealthsolutions.com\",\"contractPath\":\".kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/adopted-contract.json\",\"kind\":\"kbd.scope-authority\",\"namespace\":\"prometheus-kbd-scope-amendment\",\"newContractDigest\":\"a9b38a10eefa752fb33d8e96c05bbfbf83c3fee758d307d4832791d40f9a6b32\",\"nonce\":\"369b0e5eacdfd3e5bed88c22d925a226\",\"phaseId\":\"htmx-prototypes-and-ipfs-deploy\",\"previousContractDigest\":\"f0197e0e46b4b8bdf6e7042c1ceb1c83bcab2e12c08a5cdec1de5dfbdbe88c95\",\"projectId\":\"a8c368f8-482a-4e04-80fc-3bca9a14e864\",\"reason\":\"Extend repairAttempts from 3 to 4: MOCK-1 found and fixed a real od-mock defect in blob: preview documents\",\"runId\":\"deploy-web-to-knowme-k8s-20260914T102437Z\",\"scenarioChanges\":{\"added\":[],\"modified\":[],\"removed\":[]},\"schemaVersion\":\"1\",\"timestamp\":\"2026-11-14T19:00:06Z\"}",
        "manifestSha256": "b5833e607280e5f91a1f605063e0db48034bc86066f3b25aa335dedc15fcdd91",
        "signature": "-----BEGIN SSH SIGNATURE-----\nU1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAgsgqOvzJMpDfEY0CKRyfxixLl97\nUxT+bg/r6Jl4BBHFcAAAAecHJvbWV0aGV1cy1rYmQtc2NvcGUtYW1lbmRtZW50AAAAAAAA\nAAZzaGE1MTIAAABTAAAAC3NzaC1lZDI1NTE5AAAAQFFqAHlBAHVG+s5wtPA0RHQ+N7xunu\nbJaD4DEPbsHCQMmMmcmtUk22qky+W7uPCgI3CtHOn5ytfDD71coHIGPAs=\n-----END SSH SIGNATURE-----\n",
        "approver": "travis@tribehealthsolutions.com",
        "namespace": "prometheus-kbd-scope-amendment",
        "allowedSignersSha256": "4c32adefb70e281e6c78f3ecb562088ef82209c54a9a01b1ed630ba3ed78a573"
      }
    },
    "identity": {
      "projectId": "a8c368f8-482a-4e04-80fc-3bca9a14e864",
      "runId": "deploy-web-to-knowme-k8s-20260914T102437Z",
      "phaseId": "htmx-prototypes-and-ipfs-deploy",
      "planRevision": 6,
      "contractDigest": "a9b38a10eefa752fb33d8e96c05bbfbf83c3fee758d307d4832791d40f9a6b32"
    }
  },
  "selectedMethod": "UNKNOWN",
  "methodDecision": null,
  "retiredMethods": [],
  "references": [],
  "includedValue": [
    "ipfs-kubo deploy provider in daemon, contracts, web UI and od CLI",
    "Vendored htmx 2.0.8, Alpine 3.x, selected htmx extensions and the od-mock extension",
    "htmx-alpine-prototype design template and htmx-alpine-runtime craft rule",
    "od-prototype.json schema, validator and preflight warning",
    "od-axum-export scenario",
    "React and Flutter conversion spec plus skill PRs",
    "Template generation emits od-prototype.json with routes, components, state, entities and tokens"
  ],
  "exclusions": [
    "Review comments, guest identity and the review hub (hosted-publish-and-review, paused per D-022)",
    "Provider-registry refactor of the deploy system",
    "Using IPFS for team resource storage",
    "Linux and Windows packaged validation"
  ],
  "stage": "reflect",
  "stageAuthority": {
    "operations": [
      "discover/define/plan within governing policy"
    ],
    "implementationComplete": true,
    "verificationAuthority": "separately authorized whole-value-phase boundary required; this index grants none",
    "executableTestAuthoring": "governed by host policy; where that policy is production-first, defer until the complete agreed production work"
  },
  "governingInstructions": [
    {
      "path": "AGENTS.md",
      "observation": "observed",
      "sha256": "9584b9dc7d863771d8c69233bfd63c66856965c09c8c8d4238228bce01cde4d8"
    },
    {
      "path": "CLAUDE.md",
      "observation": "observed",
      "sha256": "336cc4fbf19beaada7ccf9986414fa91851a8d7a07dfb3ccbe800a69eed0ab49"
    },
    {
      "path": ".kbd-orchestrator/constraints.md",
      "observation": "observed",
      "sha256": "64541c10b264a6e45174a77ae556a0978c81d7e134aba7d4cdab026662dce77c"
    }
  ],
  "policyConflicts": [],
  "candidateAndEvidence": {
    "freshness": "Evidence is keyed by contract digest, main HEAD at the boundary, vendored file sha256s and the Kubo RPC host. Only evidence whose key changed is invalidated; history is preserved; no blanket re-review.",
    "paths": [
      "review/boundary-<date>/README.md with commands, exit codes, CID, IPNS name, per-asset status codes, screenshots"
    ]
  },
  "budgets": {
    "adopted": {
      "timeMinutes": 900,
      "toolCalls": 900,
      "repairAttempts": 3,
      "noProgressLimit": 3,
      "tokenBudget": "UNKNOWN",
      "tokenFallback": "Checkpoint and report after each change; stop when toolCalls is exhausted.",
      "exhaustion": "checkpoint + BLOCKED; never silent PASS; docs/state may be saved without running product tests.",
      "extensions": [
        {
          "repairAttempts": 1,
          "date": "2026-11-14",
          "reason": "MOCK-1 found a real defect (od-mock did not absolutize request paths in blob: preview documents); the fix is the fourth repair attempt",
          "authorizedBy": "operator instruction in chat: Extend to 4"
        }
      ]
    },
    "consumption": {
      "noProgress": 0,
      "noProgressLimit": 0,
      "repairAttempts": 4
    }
  },
  "unresolved": {
    "boundaryObligations": {
      "phase:htmx-prototypes-and-ipfs-deploy": {
        "key": "phase:htmx-prototypes-and-ipfs-deploy",
        "receiptId": "e7b7437a25bac590111168d85c83ee20fb0da3415a76c38d7052b9ab763686b2",
        "boundary": "phase",
        "subject": "htmx-prototypes-and-ipfs-deploy",
        "sourceRevision": 386,
        "exactSignal": "Starting phase 3 out of 3: htmx-prototypes-and-ipfs-deploy"
      },
      "phase:knowdesign-brand::hosted-publish-and-review": {
        "key": "phase:knowdesign-brand::hosted-publish-and-review",
        "receiptId": "d7b78b773ec0c6feda3cdc0828faa3a91acc6825823ad2419b34040d24f2baea",
        "boundary": "phase",
        "subject": "knowdesign-brand::hosted-publish-and-review",
        "sourceRevision": 348,
        "exactSignal": "Starting phase 1 out of 1: hosted-publish-and-review"
      }
    },
    "blockers": [],
    "instruction": "Unknown side effects require reconciliation before retry, not a fresh attempt assumption."
  },
  "preserve": [
    "latest non-superseded method decision and retiredMethods; old commands/memory are context only",
    "original contract snapshots, evidence and source/build/configuration/fixture/assertion identity",
    "all budget consumption/high-water marks, including UNKNOWN prior usage; never reset on recovery",
    "unresolved effects and cleanup/receipt obligations; reconcile uncertain effects before retry"
  ],
  "hostCapabilities": {
    "platform": "darwin",
    "nodeVersion": "v26.5.0",
    "observedInterfaces": [
      "canonical status",
      "typed phase disposition",
      "project-owned file identity"
    ],
    "executionInterception": "not provided by this helper",
    "commandInventoryIsPermission": false
  },
  "control": {
    "mode": "instruction-only",
    "observed": [
      "canonical references and file identities"
    ],
    "enforced": [
      "only named existing signed runtime mutations; no generic shell/tool interception claimed"
    ],
    "unsupported": [
      "universal model obedience or arbitrary tool interception"
    ]
  },
  "status": "BLOCKED",
  "blockers": [
    "no current contract-bound selected-method decision"
  ]
}
```
