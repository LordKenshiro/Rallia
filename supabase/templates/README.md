# Auth email templates

These templates are used by Supabase Auth for confirmation (OTP) and magic link emails. They use Go template variables such as `{{ .SiteURL }}`, `{{ .Data.locale }}`, and `{{ .Token }}`.

## Logo not showing in production

If the Rallia logo appears in Mailpit (local) but not in production emails, check both of the following.

### 1. Site URL must point to your app

The templates load the logo from `{{ .SiteURL }}/rallia_logo_light.png`. Supabase sets `.SiteURL` from **Authentication → URL Configuration → Site URL** in the [Supabase Dashboard](https://supabase.com/dashboard).

- **Production**: Set **Site URL** to your production web app URL (e.g. `https://app.rallia.com`). That way the logo URL becomes `https://app.rallia.com/rallia_logo_light.png`, which your app serves from `apps/web/public/`.
- If Site URL is wrong or points to the Supabase project URL, the image request 404s and the logo won’t show.

### 2. Use a PNG logo for email (not SVG)

Templates reference **`rallia_logo_light.png`** because many email clients (including Outlook) block or strip SVG images. Mailpit renders the page like a browser, so SVG can work locally but fail in real inboxes.

- Add **`rallia_logo_light.png`** to `apps/web/public/` (same folder as `rallia_logo_light.svg`).
- Export it from your design tool or from the SVG at 2× size for sharpness (e.g. 280×110 px). The template displays it at 140×55 px.

After that, deploy the PNG and ensure Site URL is correct; the logo should appear in production emails.
