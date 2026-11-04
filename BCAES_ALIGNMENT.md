# BCAES alignment - Cybersecurity module

Required by the Task 1 brief (section F). Every ownership statement below is quoted from one of these task documents
(named by file):

- **T1:** the Task 1 brief, `...Cybersecurity Sovereign Data-Control Module Completion (BHIV Cybersecurity — Task 1).pdf`.
- **D10:** the 10-day brief, `BHIV_vNEXT_Cybersecurity_10_Day_Integrated_Build_Task_FULL_TEAM_v2.pdf`.
- **EOD:** the P0 brief, `BHIV_Cybersecurity_Hypervelocity_P0_Team_Task_EOD_2026-11-04.pdf`.

Anything the documents do not state is marked **UNKNOWN**. The expansion of "BCAES" itself is not given in any
task document: **UNKNOWN**.

## 1. Constitutional identity

| Item | Statement | Source |
|---|---|---|
| Identity | "a production-ready, independently runnable Cybersecurity capability that participates correctly in the BHIV/BHQ ecosystem through explicit contracts, while remaining bounded inside its assigned constitutional responsibility" | T1 A |
| Responsibility | "Threat assessment, correlation, explainability and security integration." | EOD 1 |
| Authority boundary | "No independent privileged execution." | EOD 1 |
| Runtime position | "User/Vajra -> Consent / Authorized Access -> Cybersecurity Protection -> Authorized Application -> Evidence / Audit -> Replay / Observability" | T1 D |
| The module's "room" | "operate independently in its own room"; what a room is technically is not defined | T1 C - definition UNKNOWN |

## 2. What Cybersecurity owns

T1 C lists the capabilities to cover "where applicable to the inherited baseline":

- security-event ingestion, security/data access protection, authentication, authorization, access-control boundaries
- security intelligence, auditability, provenance, structured outputs, replay-safe evidence
- observability, health/status, API contracts, runtime registration
- VM deployment, TANTRA participation, Vajra participation, BCAES alignment, Central Depository handover

In this repository that means:

- the authentication and RBAC decision
- the `/authz/check` and `/protected/access` decisions
- the canonical security event and its audit record
- the module's own health and observability
- the contracts in INTEGRATION.md

## 3. What Cybersecurity explicitly does not own (negative authority)

| Statement | Source |
|---|---|
| "Do not absorb Vajra, TANTRA, BCAES, MDU, GC or other services' authority." | T1 A |
| "Do not treat successful execution as governance authority." | T1 A |
| "The Cybersecurity module must support Vajra without becoming Vajra governance." | T1 D |
| "Do not convert security telemetry or intelligence into ownership of user data." | T1 D |
| "No component may silently become the authority of another component." | D10 4 |
| "No parallel permission store, runtime, evidence registry or ungoverned executor." | EOD |

How the code respects this:

- Cybersecurity's code reads VAJRA authority state and never changes it. Verification check S5-03 confirms that no
  route or code path calls VAJRA's transition endpoint.
- The credential is a different matter. The VAJRA bearer token that Cybersecurity holds is not scoped by VAJRA, and
  the same value would also authorize VAJRA transitions. Keeping the boundary therefore currently depends on the code,
  not the credential, until VAJRA issues an evidence-only token.
- VAJRA's integration package (`VAJRA_EXTERNAL_INTEGRATION_PACKAGE.md:18` in the VAJRA repo) assigns opt-out
  revocation through VAJRA's transition route to "Kaushlendra / User UX". This slice does not call it. Who should is
  a team decision: UNKNOWN.
- It submits evidence to VAJRA and TANTRA but keeps no permission store of its own. The
  `protected_access_decisions` table records only its own decisions, for idempotency.
- It sends TANTRA a minimal projection of its audit event. The subject appears only as a pseudonymous SHA-256
  prefix, and the caller as an internal user id. The free-text purpose and idempotency keys are not sent (field list
  in INTEGRATION.md).

## 4. What the other systems own

| System | Ownership statement | Source |
|---|---|---|
| VAJRA | "Vajra remains the user-control surface for identity, data, permissions and value." | T1 D |
| VAJRA | "Applicable identity, permission, transaction and trust boundaries." Boundary: "No asset-protection claim without boundary-level proof." | EOD 1 |
| TANTRA | "Contracts, authority, orchestration and bounded execution." Boundary: "Approved governed execution boundary only." | EOD 1 |
| PRANA / KARMA | "Event propagation, trace continuity and behavioural interpretation where applicable." | EOD 1 |
| Bucket / Replay | "Canonical evidence, provenance and replay where supported." Boundary: "Replay proves history, not legitimacy." | EOD 1 |
| InsightFlow / Pravah | "Observability, telemetry and operational health." | EOD 1 |
| BIQOS | "Cross-pillar convergence, dependency visibility and qualification." | EOD 1 |
| DHARMA | "purpose, ethical boundaries and governing principles" | EOD 5 |
| TMS / GC / MDU | "strategy and convergence / governance and authority / schemas, lineage and semantic-provenance discipline" | EOD 5 |
| BCAES | Not described in any task document | UNKNOWN |

## 5. Dependencies

| Direction | Dependency | Contract | State (2026-11-04) |
|---|---|---|---|
| Upstream | Callers (investigator UI, services) | JWT bearer + RBAC; `/api/v1/*` | works |
| Upstream | VAJRA authority state | `GET /api/vajra/authority/verify` | works on a local VAJRA node; live node not used (VAJRA rule) |
| Downstream | VAJRA evidence | `POST /api/vajra/evidence/record` (Bearer) | works on a local node |
| Downstream | TANTRA contract gate + ledger | `/validate/prana/ingress`, `/karma/ingest`, `/karma/verify` | gate answers live; no cybersecurity contract registered |
| Downstream | BHIV Core / Bucket (earlier hooks) | `BHIV_CORE_EVENT_URL`, `BHIV_BUCKET_EVIDENCE_URL` | URLs not provided: UNKNOWN |
| Peer | Threat assessment (Shivam), correlation (Aryan Dias) | not defined yet | wallet analysis and case-linking exist; nothing assesses or correlates access signals |

## 6. Evidence, observability, knowledge contribution

- Evidence: canonical security events in the SQL audit log and the JSON log; VAJRA TruthStore rows; TANTRA ledger
  (blocked by the missing contract). See INTEGRATION.md.
- Observability: `/health`, `/api/v1/system/health` (peer reachability for superadmins), trace and request ids on API
  responses, one log line per external call.
- Knowledge contribution: required by T1 C but not defined for this slice: **UNKNOWN**.

## 7. Open boundary questions (UNKNOWN until an owner answers)

1. What BCAES stands for, and the format it expects for this document.
2. Who approves a security response on the TANTRA side, and through which contract. TANTRA exposes
   `/intelligence/rajya/validate` ("authority validation"), but whether it serves this purpose is not documented.
3. Who calls VAJRA's transition route for user opt-out (VAJRA's package names Kaushlendra / User UX).
4. Which VAJRA environment Cybersecurity may write test evidence to, who issues its bearer token, and whether VAJRA can
   scope that token to evidence only.
5. What "runtime registration" means for this module, and where it registers.
6. How Central Depository / BHEX receives the asset (submission reference).
