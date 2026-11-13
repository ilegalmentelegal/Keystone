# Security Specification: Trainer Hub (Cloud Firestore & Auth)

## 1. Data Invariants

1. **Verified Identity Required**: Every read and write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **Master Workspace Gate**: No subcollection document under `/workspaces/{workspaceId}/...` can be created, read, updated, or deleted unless the parent workspace exists and the caller is an authorized member (`/workspaces/{workspaceId}/members/{uid}`) or verified administrator.
3. **Immutable Ownership & Timestamps**:
   - On `create`, `ownerId` MUST match `request.auth.uid`, and both `createdAt` and `updatedAt` MUST equal `request.time`.
   - On `update`, `ownerId` and `createdAt` MUST remain identical to `existing()`, and `updatedAt` MUST equal `request.time`.
4. **No Self-Privilege Escalation**:
   - Users creating `/users/{userId}` cannot self-assign `role == 'admin'` unless verified by `/admins/{uid}` or bootstrapped admin email (`israelangelito1@gmail.com`).
   - Only `isAdmin()` can grant or revoke `/admins/{uid}` or approve/reject `pendingRegistrations` past terminal state.
5. **PII Isolation (Split Collection Strategy)**:
   - Operational collections (`users`, `appUsers`, `employees`, `evaluations`, `trainingSessions`, `tasks`, `roomReviews`, `visualReviews`, `weaknesses`, `observations`, `dailySummaries`, `supervisorFeedbacks`, `rooms`) contain **zero** `email` or `phone` PII fields.
   - `email` fields are isolated in `/users/{userId}/private/{infoId}`, `/workspaces/{workspaceId}/appUsers/{appUserId}/private/{infoId}`, and `/workspaces/{workspaceId}/pendingRegistrations/{regId}`, restricted strictly to the record owner or verified admins.
6. **Strict Schema & Volumetric Guards**:
   - Every document ID matches `^[a-zA-Z0-9_\-]+$` (max 128 chars).
   - Every `create` checks both `keys().hasAll(...)` and `keys().hasOnly(...)` to block shadow fields.
   - Every `update` calls `isValid[Entity](incoming())` first and explicitly allowlists modified keys via `affectedKeys().hasOnly([...])`.
   - Every string enforces bounded `.size()` and every array enforces bounded `.size() <= MAX`.
7. **Query Enforcement Without Read Explosions**:
   - Every `allow list` rule evaluates `resource.data` against `request.auth.uid` (`resource.data.ownerId == request.auth.uid || request.auth.uid in resource.data.memberUids`) with **zero** `get()` or `exists()` calls.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Collection | Expected Result | Guard Triggered |
|---|---|---|---|---|
| 1 | Unauthenticated read/write | `/workspaces/keystone_plant` | `PERMISSION_DENIED` | `isVerified()` |
| 2 | Unverified email spoofing bootstrapped admin (`email_verified: false`) | `/admins/{uid}` | `PERMISSION_DENIED` | `request.auth.token.email_verified == true` |
| 3 | Shadow field injection (`isAdmin: true`) during task create | `/workspaces/keystone_plant/tasks/{id}` | `PERMISSION_DENIED` | `keys().hasOnly(...)` in `isValidTask` |
| 4 | Self-assigned admin role on `/users/{uid}` create | `/users/{uid}` | `PERMISSION_DENIED` | `incoming().role != 'admin' \|\| isAdmin()` |
| 5 | Identity spoofing (`ownerId` set to another user's UID) | `/workspaces/keystone_plant/employees/{id}` | `PERMISSION_DENIED` | `incoming().ownerId == request.auth.uid` |
| 6 | Client-forged timestamp (`createdAt: new Date(0)`) | `/workspaces/keystone_plant/roomReviews/{id}` | `PERMISSION_DENIED` | `incoming().createdAt == request.time` |
| 7 | Oversized ID string (`id` length 300 or `../` path chars) | `/workspaces/keystone_plant/rooms/{badId}` | `PERMISSION_DENIED` | `isValidId(roomId)` |
| 8 | Cross-user PII read on `/users/{otherUid}/private/profile` | `/users/{otherUid}/private/profile` | `PERMISSION_DENIED` | `isOwner(userId) \|\| isAdmin()` |
| 9 | Blanket `list` query without `memberUids` / `ownerId` filter | `/workspaces/keystone_plant/employees` | `PERMISSION_DENIED` | `allow list` checks `resource.data` |
| 10 | Value type poisoning on update (`completed: "yes"` string instead of boolean) | `/workspaces/keystone_plant/tasks/{id}` | `PERMISSION_DENIED` | `isValidTask(incoming())` on `allow update` |
| 11 | Mutating terminal `pendingRegistrations` after `aprobado` by non-admin | `/workspaces/keystone_plant/pendingRegistrations/{id}` | `PERMISSION_DENIED` | `existing().status == 'pendiente' \|\| isAdmin()` |
| 12 | Unbounded `memberUids` array (`> 20` entries) or `prioritiesForTomorrow` (`> 20`) | `/workspaces/keystone_plant/dailySummaries/{id}` | `PERMISSION_DENIED` | `.size() <= 20` array bound guard |
