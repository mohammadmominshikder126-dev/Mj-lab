# MJ LAB Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Public vs Admin Separation**: Only verified administrators (`isAdmin()`) can create, edit, or delete `projects`, `banners`, `settings`, `team`, or `admins`.
2. **Inactive Project Protection**: Public visitors can only read `projects` whose `status == 'Active'`. Inactive/draft projects are visible only to admins.
3. **PII Isolation**: `contacts`, `visitors`, `contact_clicks`, and `orders` contain visitor/client details. Public users may only `create` valid new submissions with enforced initial status (`Unread` for contacts, `Pending` for orders) and server timestamp (`request.time`). Only admins can `get`, `list`, `update`, or `delete` these records.
4. **Strict Key & Size Enforcement**: Every collection enforces exact `hasAll` + `hasOnly` key checks and `.size()` limits on all strings and maps, preventing shadow-field injection and resource exhaustion.
5. **Immutable Creation Timestamps**: `createdAt` cannot be modified after creation (`incoming().createdAt == existing().createdAt`).

## 2. Dirty Dozen Attack Payloads
1. Unauthenticated `create` on `/projects/p1` -> `PERMISSION_DENIED`
2. Authenticated non-admin `create` on `/projects/p1` -> `PERMISSION_DENIED`
3. Spoofed admin (`email: 'nexasworld5@gmail.com'`, `email_verified: false`) `update` on `/settings/site` -> `PERMISSION_DENIED`
4. Shadow field injection (`isVerified: true`) on `/contacts/c1` -> `PERMISSION_DENIED`
5. Contact message created with pre-marked `status: 'Read'` -> `PERMISSION_DENIED`
6. Contact message created with forged past `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`
7. Non-admin `list` or `get` on `/contacts` -> `PERMISSION_DENIED`
8. Non-admin `get` on inactive project (`/projects/inactive1`) -> `PERMISSION_DENIED`
9. Oversized ID poisoning (`150` chars or invalid chars `$bad!id`) on `/contacts/{id}` -> `PERMISSION_DENIED`
10. Order created with `status: 'Completed'` by public visitor -> `PERMISSION_DENIED`
11. Non-admin `update` on `/orders/o1` -> `PERMISSION_DENIED`
12. Non-admin self-promotion `create` on `/admins/{uid}` -> `PERMISSION_DENIED`
