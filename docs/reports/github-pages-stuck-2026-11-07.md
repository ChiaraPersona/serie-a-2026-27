# GitHub Pages publication blocked — 7 November 2026

## Findings

- Repository: https://github.com/ChiaraPersona/serie-a-2026-27
- Site: https://chiarapersona.github.io/serie-a-2026-27/
- Commit: `905af7de0a78153a117ce626be90c62692287810`.
- Last successful workflow: https://github.com/ChiaraPersona/serie-a-2026-27/actions/runs/42391869951 . Its deployment took approximately 16 seconds.
- Failed workflow: https://github.com/ChiaraPersona/serie-a-2026-27/actions/runs/42404295925 . Attempt 1 timed out after remaining in `syncing_files`; attempt 2 reused the artifact and received empty status values until the same 10-minute timeout.
- A fresh complete workflow was dispatched without source changes: https://github.com/ChiaraPersona/serie-a-2026-27/actions/runs/42407139566 . Build, validation and artifact upload succeeded again. Pages again returned an empty status. Cancellation was requested to stop repeating the same blocked wait.
- Fresh artifact: `13588032397`, `github-pages`, 62,731,478 compressed bytes, not expired. Original failed artifact: `13586513156`. The new artifact rules out reuse of the old artifact as a sufficient explanation.
- The successful and failed packages both contained 2,253 files; the failing package was only 38,285 uncompressed bytes larger. Both passed the existing package validation and were below the enforced size budget.
- At 19:43:14 UTC (20:43:14 Europe/Rome), the Pages status endpoint returned HTTP 200 and `{"status":""}`. Request ID: `5A3A:45600:73000AD:AECFE58:6AEF7F52`.
- Latest environment deployment: `7626093695`, created at 19:41:53 UTC. The environment status was `in_progress`, while the Pages API returned an empty status for the Pages deployment ID below.
- Pages deployment ID: `905af7de0a78153a117ce626be90c62692287810`. After the second attempt ended, this endpoint had reported `deployment_cancelled`; the fresh attempt reused this Pages deployment identifier and returned empty status values.

## Reproduction / diagnostic commands

```powershell
gh run view 42404295925 --attempt 2 --log-failed
gh run view 42407139566 --json status,conclusion,jobs
gh api repos/ChiaraPersona/serie-a-2026-27/pages/deployments/905af7de0a78153a117ce626be90c62692287810
gh api repos/ChiaraPersona/serie-a-2026-27/deployments/7626093695/statuses --jq '.[0]|{state,description,created_at}'
```

Observed failure signal: Pages status is empty rather than a valid progress, success or terminal failure state. Workflow logs repeatedly show `Current status:` without a value. The public official-lineup payload checked after the second attempt still lacked Roma–Sassuolo MD11.

This points to a Pages backend/deployment-state issue; it does not establish the precise internal cause. No source-code correction was justified by these observations. Increasing the action timeout cannot solve this: the current official deploy-pages v5 source clamps it to 600,000 ms.

## Primary references

- Action source: https://github.com/actions/deploy-pages/blob/v5/src/internal/deployment.js
- Independent user report dated November 7, with the same syncing_files/timeout symptom: https://github.com/orgs/community/discussions/212350
- Independent user report dated November 6: https://github.com/orgs/community/discussions/212290

These reports are supporting observations, not confirmation of an acknowledged GitHub-wide incident.

## Support request draft (not sent)

Subject: Pages deployment stuck with HTTP 200 and empty status after syncing_files timeout

Hello GitHub Support,

Please investigate the Pages backend deployment state for ChiaraPersona/serie-a-2026-27, commit and Pages deployment ID 905af7de0a78153a117ce626be90c62692287810.

The previous deployment completed in about 16 seconds. Run 42404295925 uploaded a valid artifact, but deployment remained in syncing_files until the ten-minute timeout. Rerunning the deploy job produced empty status values and another timeout. A completely fresh workflow, run 42407139566, built and uploaded a new artifact (13588032397) successfully, but the Pages status endpoint again returned HTTP 200 with {"status":""}. The environment deployment (7626093695) reported in_progress. We requested cancellation of this fresh workflow after observing the repeated backend status problem.

Example request ID: 5A3A:45600:73000AD:AECFE58:6AEF7F52, 2026-11-07 19:43:14 UTC.

Please check whether a stale or cancelled Pages deployment is preventing this commit from publishing and clear or repair the backend state if necessary. We have preserved the existing site and have not deleted/recreated the Pages configuration.

The workflow and logs are linked above. No credentials are included in this report.
