# Calls made to the live TANTRA services on the run day

Run `20261104T133229Z`, TANTRA base `http://163.128.209.18`. Every trace id and submission id sent starts with `cyber-p0-test-` (request ids and ids inside payloads do not); every payload is synthetic. Generated from `api_samples/`, `runtime_logs/cyber_service.log` and `api_samples/outside_run/`.

## Calls made by the verification harness

The UTC column is the time the reply arrived; a slow call was sent earlier (see the next sections).

| UTC (reply received) | Check | Method | Path | HTTP | Ledger write? |
|---|---|---|---|---|---|
| 2026-11-04T13:32:49Z | O-02 | GET | `/health` | 200 | no ledger write (validation or read; whether /validate stores anything is not known) |
| 2026-11-04T13:32:49Z | O-02 | GET | `/health` | 200 | no ledger write (validation or read; whether /validate stores anything is not known) |
| 2026-11-04T13:32:50Z | O-02 | GET | `/health` | 200 | no ledger write (validation or read; whether /validate stores anything is not known) |
| 2026-11-04T13:33:18Z | S5-01 | GET | `/replay/cyber-p0-test-3d551675-ca1a-4a29-a940-b6a4a6b8de02` | 404 | no ledger write (validation or read; whether /validate stores anything is not known) |
| 2026-11-04T13:33:23Z | S5-04 | POST | `/validate/prana/ingress` | 422 | no ledger write (validation or read; whether /validate stores anything is not known) |

## Calls made by the Cybersecurity API itself

The API runs with TANTRA_KARMA_URL empty in this run, so it can only call /validate.

| UTC | Trace id | Outcome | Ledger write? |
|---|---|---|---|
| 2026-11-04T13:33:11.680165+00:00 | `cyber-p0-test-2bac3fe6-29e1-4c70-b81d-ca01188a9127` | CONTRACT_REJECTED | no |
| 2026-11-04T13:33:14.451153+00:00 | `cyber-p0-test-1f574eec-e2dc-47a1-888c-ddeadd919e77` | CONTRACT_REJECTED | no |
| 2026-11-04T13:33:17.484713+00:00 | `cyber-p0-test-3d551675-ca1a-4a29-a940-b6a4a6b8de02` | CONTRACT_REJECTED | no |

Not listed: 2 outcome(s) from the induced-outage checks (S5-02, S5-05), where the API was pointed at local closed or never-answering ports instead of TANTRA.

## What the single ledger write caused inside TANTRA (from TANTRA's own reply, check S8-02)

- Source: run 20261104T103939Z (carried over; not repeated); see `previous_runs/20261104T103939Z/`.
- Karma: status `success`, event `388ac0bb-c817-40ee-8877-84a39ab8d2b3`, submission `cyber-p0-test-80c17aba-e107-426e-af95-7904ea5c1eb1`, logged by TANTRA at 2026-11-04T10:40:28.555931+00:00 (the reply arrived at 2026-11-04T10:40:50Z).
- PRANA: `forwarded`, PRANA event `45565419-3108-4e7d-84c0-997fea900629`.
- PRANA -> Bucket: `failed`, HTTP 400: Artifact validation failed: parent_hash required (not first artifact) (TANTRA also reported a read timeout) - reported to the TANTRA team as TAN-06.
- TANTRA's internal Bucket address in this reply was replaced by a `[REDACTED after capture ...]` label before publication; everything else is as received.

## Calls made by the earlier verification run 20261104T103939Z (same day)

Archived in `previous_runs/20261104T103939Z/` (that run's full call list: its LIVE_TANTRA_CALLS.md).

| UTC (reply received) | Source | Check | Method | Path | HTTP | Ledger write? |
|---|---|---|---|---|---|---|
| 2026-11-04T10:39:54Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T10:39:54Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T10:39:55Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T10:40:14.429252+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T10:40:16.994840+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T10:40:19.462075+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T10:40:20Z | harness | S5-01 | GET | `/replay/cyber-p0-test-35797205-3f70-438f-ae00-dd5382899ff0` | 404 | no |
| 2026-11-04T10:40:25Z | harness | S5-04 | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T10:40:26Z | harness | S8-02 | POST | `/validate/prana/ingress` | 200 | no |
| 2026-11-04T10:40:50Z | harness | S8-02 | POST | `/karma/ingest` | 200 | YES |
| 2026-11-04T10:40:51Z | harness | S8-02 | POST | `/karma/verify` | 200 | replay check (TANTRA may store a validation record) |

## Calls made by the earlier verification run 20261104T120458Z (same day)

Archived in `previous_runs/20261104T120458Z/` (that run's full call list: its LIVE_TANTRA_CALLS.md).

| UTC (reply received) | Source | Check | Method | Path | HTTP | Ledger write? |
|---|---|---|---|---|---|---|
| 2026-11-04T12:05:18Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T12:05:18Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T12:05:19Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T12:05:43.948285+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T12:05:46.935582+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T12:05:49.522558+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T12:05:50Z | harness | S5-01 | GET | `/replay/cyber-p0-test-f3fcb75d-6ffa-4848-a77e-fcc5143e6fea` | 404 | no |
| 2026-11-04T12:05:57Z | harness | S5-04 | POST | `/validate/prana/ingress` | 422 | no |

## Calls made by the earlier verification run 20261104T123826Z (same day)

Archived in `previous_runs/20261104T123826Z/` (that run's full call list: its LIVE_TANTRA_CALLS.md).

| UTC (reply received) | Source | Check | Method | Path | HTTP | Ledger write? |
|---|---|---|---|---|---|---|
| 2026-11-04T12:38:42Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T12:38:42Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T12:38:43Z | harness | O-02 | GET | `/health` | 200 | no |
| 2026-11-04T12:39:02.007907+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T12:39:04.651305+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T12:39:07.141959+00:00 | api |  | POST | `/validate/prana/ingress` | 422 | no |
| 2026-11-04T12:39:07Z | harness | S5-01 | GET | `/replay/cyber-p0-test-6a56021b-b117-4ad8-a593-01366e5be0a8` | 404 | no |
| 2026-11-04T12:39:14Z | harness | S5-04 | POST | `/validate/prana/ingress` | 422 | no |

## Calls made by hand on the same day, outside this run

Contract discovery before the run, and screenshots after it. Raw files: `api_samples/outside_run/`.

| UTC | Method | URL | HTTP | What | Record |
|---|---|---|---|---|---|
| 2026-11-04T07:48:45Z | GET | `http://163.128.209.18:8103/health` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T07:48:47Z | GET | `http://163.128.209.18:8103/prana/system/health` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T07:48:49Z | GET | `http://163.128.209.18:8101/health` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T07:48:50Z | GET | `http://163.128.209.18:8102/health` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T07:48:51Z | GET | `https://bhiv-bucket-i1l6.onrender.com/health` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T07:48:53Z | GET | `https://vajra.blackholeinfiverse.com/api/health` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T07:48:55Z | GET | `https://vajra.blackholeinfiverse.com/identity` | 200 | read-only health / identity check | live_probe_20261104T074845Z.txt |
| 2026-11-04T08:16:51Z | GET | `http://163.128.209.18:8101/openapi.json` | not recorded (full OpenAPI document saved) | read TANTRA validation layer's API description | manual_record.json (time: modification time of the saved response file) |
| 2026-11-04T08:16:53Z | GET | `http://163.128.209.18:8102/openapi.json` | not recorded (full OpenAPI document saved) | read TANTRA karma helper's API description | manual_record.json (time: modification time of the saved response file) |
| 2026-11-04T08:16:53Z | GET | `http://163.128.209.18:8103/openapi.json` | not recorded (full OpenAPI document saved) | read TANTRA PRANA's API description | manual_record.json (time: modification time of the saved response file) |
| 2026-11-04T08:22:44.161565+00:00 | POST | `http://163.128.209.18:8101/validate/prana/ingress` | 422 | contract check of `security_decision` (submission `cyber-p0-test-1f22b904a67c-sub-A`): rejected - event_type_not_registered | validation_probe_20261104T082244Z.json |
| 2026-11-04T08:22:45.155992+00:00 | POST | `http://163.128.209.18:8101/validate/prana/ingress` | 200 | contract check of `integrity_probe` (submission `cyber-p0-test-1f22b904a67c-sub-B`): valid | validation_probe_20261104T082244Z.json |
| 2026-11-04T10:43:26Z (shortly after) | GET | `http://163.128.209.18:8101/health` | not recorded (page rendered) | screenshot 06 (headless browser) | manual_record.json (time: capture stamp in screenshots/SCREENSHOTS_INDEX.md) |
| 2026-11-04T10:43:26Z (shortly after) | GET | `http://163.128.209.18:8103/prana/system/health` | not recorded (page rendered) | screenshot 07 (headless browser; image withdrawn from the packet, see SCREENSHOTS_INDEX.md) | manual_record.json (time: capture stamp in screenshots/SCREENSHOTS_INDEX.md) |
| 2026-11-04T12:09:24Z (shortly after) | GET | `http://163.128.209.18:8101/health` | not recorded (page rendered) | screenshot 06, second capture after the fixes (headless browser) | manual_record.json (time: capture stamp in screenshots/SCREENSHOTS_INDEX.md) |

Not recorded: An earlier attempt of the same screenshot script, a minute or two before 10:43Z, failed to save its images. If its browser reached the two TANTRA pages, that adds up to 2 more read-only GETs. No ledger write was possible from it.

Ledger writes to TANTRA in this run: **0**. In the earlier run 20261104T103939Z: **1** (11 TANTRA calls). In the earlier run 20261104T120458Z: **0** (8 TANTRA calls). In the earlier run 20261104T123826Z: **0** (8 TANTRA calls). Outside the runs, to TANTRA: 10 read-only GET(s), 2 /validate call(s), **0** ledger write(s); to other services: 3 read-only GET(s), listed above.
