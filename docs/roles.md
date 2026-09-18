# Roles & Permissions — Prizy

Prizy splits a workspace user's permissions into **two independent axes**, exactly
as defined in `PRD.md` §3.1.1 and the `users` table in `schema.sql`
(`admin_level`, `is_developer`, `is_agent`). This is **not** a single flat list of
roles — the administrative level and the module capabilities are orthogonal.

## Axis 1 — Administrative level (`admin_level`)

Mutually exclusive: **exactly one** per user. Stored as the `admin_level` enum
(`'owner' | 'admin' | 'member' | 'viewer'`, default `member`).

**Owner** - the person who created the workspace. Exactly one per workspace. Has
every permission, including deleting the workspace, managing billing, and
transferring ownership. Think of it as the root admin.
**Admin** - full control over workspace configuration (members, roles,
integrations, settings) but can't touch billing or delete the workspace. You'd
give this to a trusted co-founder or a senior ops person.
**Member** - a standard user. The administrative level grants nothing on its own;
what a Member can actually do is defined entirely by the capability flags below.
**Viewer** - read-only across the modules they are enabled for. Useful for
stakeholders, executives, or clients who need visibility without the ability to
change anything.

## Axis 2 — Capabilities (`is_developer`, `is_agent`)

Independent boolean flags, combinable in any way. They decide which **module** a
user can work in, regardless of administrative level.

**is_developer** - access to the Issue Tracker: create and manage issues,
projects, cycles, and roadmaps. This is the Linear-style surface.
**is_agent** - access to the Support module: manage tickets, reply to customers,
use macros, and write Knowledge Base articles. This is the Zendesk-style surface.
A developer (without `is_agent`) has no access to the issue tracker beyond seeing
issues linked to tickets they can reach.

## The workspace switch (`workspaces.helpdesk_enabled`)

Above both axes sits one workspace-level switch: a workspace can turn the
Support module off entirely. It defaults to on, and an owner or admin flips it
under Settings → General → Modules (`PATCH /v1/workspace`).

While it is off, nobody is an agent: `User::canWorkHelpdesk()` requires the
`is_agent` capability **and** the switch, every support use case goes through
`HelpdeskAccess::gate()` and answers 403, and the public help centre, the
customer portal and the agent desk answer 404. Nothing is deleted — every
ticket, contact and article is where you left it when the switch goes back on.

The Issue Tracker has no equivalent switch: it is gated per user by
`is_developer` alone.

## Putting the two axes together

A user holds one level **and** any combination of capabilities:

| Example                  | admin_level | is_developer | is_agent |
|--------------------------|-------------|--------------|----------|
| Developer                | member      | ✓            | ✗        |
| Support agent            | member      | ✗            | ✓        |
| Full-stack / small team  | member      | ✓            | ✓        |
| Support manager          | admin       | ✗            | ✓        |
| CTO                      | admin       | ✓            | ✓        |
| Stakeholder              | viewer      | ✗            | ✗        |

A user with the `member` level and **neither** capability has no meaningful
access and should not be invited in that state.

### Notes carried over from the original design discussion

- **A "Support Manager" role** falls out naturally from the two axes
  (`admin` + `is_agent` + `not is_developer`) — no separate role is needed.
- **Agents creating issues on escalation:** capabilities gate *module* access; an
  agent who also needs to open engineering issues simply gets `is_developer = true`
  (or uses the ticket → issue bridge in §3.4). A limited "create issue from
  ticket" capability for agents without full developer access is a possible future
  refinement, not a v1 requirement.
- **Member read access to linked tickets:** a developer (no `is_agent`) can still
  see tickets linked to their issues via the bridge, but cannot reply to
  customers. This is a property of the bridge, not a third capability.

## Who Opens Tickets? Customers as Contacts

The people who open tickets are **customers**, and they sit entirely outside
the role system. They're not workspace members at all; they're stored as
**Contacts** (the `contacts` table in `schema.sql`). A Contact has an email, a
name, and optionally an `external_id` to link them to your own user database via
the API.

Customers interact with Prizy through three surfaces:

- **Customer Portal** - they log in (or use a magic link) and submit tickets,
  track their status, and browse the Knowledge Base.
- **Email** - they send an email to the workspace's support address and a
  ticket is created automatically.
- **Chat Widget** - they open the widget on your website, which can identify
  them if they're already logged in to your product.

So the full picture of "who can be in the system" is really two separate trees:

|                        | Workspace Members                          | Customers                                        |
|------------------------|--------------------------------------------|--------------------------------------------------|
| Stored as              | `users`                                    | `contacts`                                       |
| Permissions            | `admin_level` + `is_developer` / `is_agent`| None — they're requesters                        |
| Access                 | The Prizy app                              | Customer Portal only                             |
| Can create issues      | Yes (with `is_developer`)                  | No                                               |
| Can create tickets     | No (agents do it on their behalf, or inbound channels do it automatically) | Yes, via portal / email / chat |

## Open Question — Internal Tickets

The one edge case worth thinking about is **internal tickets** — i.e. a workspace
user submitting a ticket themselves (say, an employee reporting an IT issue). You
could handle that by allowing workspace members to also be Contacts, or by giving
members a "submit request" surface in the portal. Not critical for v1, but worth
flagging.
