# Template 03 — Account Access Checklist

> Rule: we always request **access to accounts you own**, never ownership transfer. You keep the assets if we ever part ways.

## Required before launch

| Account | What we need | How to grant |
|---|---|---|
| Google Ads | Standard access | Tools → Access & security → invite `{{AGENCY_EMAIL}}` (or link MCC `{{MCC_ID}}`) |
| Meta Business | Partner access to Ad Account, Page, Pixel, Catalogue | Business Settings → Partners → Add Partner → Business ID `{{META_BUSINESS_ID}}` |
| Google Analytics 4 | Editor | Admin → Property Access → add `{{AGENCY_EMAIL}}` |
| Google Tag Manager | Publish | Admin → User Management → add `{{AGENCY_EMAIL}}` |
| Google Search Console | Full user | Settings → Users → add `{{AGENCY_EMAIL}}` |
| Website CMS | Admin or editor | Create user for `{{AGENCY_EMAIL}}` |
| Email / CRM platform | Admin | Invite `{{AGENCY_EMAIL}}` |
| Domain / DNS | Records access or a named contact | Needed for tracking, subdomains, email auth |
| Payment/ecom platform | Reports + analytics | For revenue truth, not payouts |
| LinkedIn / TikTok / Pinterest ads | As applicable | Partner or user access |
| Shared drive | Editor on a `RELIER × {{CLIENT}}` folder | Assets, creative, reports |

## Never send by email or chat
Passwords, 2FA codes, card details. Use `{{PASSWORD_MANAGER_LINK}}` (1Password/Bitwarden shared vault) for anything that genuinely can't be delegated.

## Our commitments
- Least-privilege access: we ask for the lowest level that does the job.
- Named users only — no shared logins from our side.
- Access is revoked from our team within 48 hours of a team member leaving your account.
- On offboarding we hand over everything and remove ourselves within 5 business days.

## Billing setup
- Ad spend is billed **directly to your card on the ad platforms**, not through us. You see every cent.
- RELIER invoices management fees separately on `{{BILLING_DAY}}` each month, {{TERMS}}.

**Blocker rule:** if any Required item is outstanding at Day 7, the launch date moves and we tell you in writing the day it happens.
