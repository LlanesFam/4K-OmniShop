# Code Signing Guide — OmniShop

Signing prevents Windows SmartScreen and macOS Gatekeeper from flagging the
installer as malicious or "from an unknown publisher."

---

## Windows — Authenticode Certificate

### Why you need it
Every unsigned `.exe` / `.msi` shows the SmartScreen warning:
> "Windows protected your PC — Microsoft Defender SmartScreen prevented
> an unrecognized app from starting."

### Certificate types

| Type                         | Annual Cost | SmartScreen on day 1 | Notes                                               |
| ---------------------------- | ----------- | -------------------- | --------------------------------------------------- |
| **EV (Extended Validation)** | ~$250–500   | ✅ Yes — instant      | Best for distribution                               |
| **OV (Standard)**            | ~$70–200    | ⚠️ Builds over time   | Signed, but warning stays until reputation is built |
| Self-signed                  | Free        | ❌ Still warned       | Only for internal/dev use                           |

**Recommended**: EV certificate — eliminates the SmartScreen warning immediately.

### Recommended CAs
- **SSL.com** — cheapest EV (~$249/yr), offers cloud signing (no USB dongle)
- **Sectigo** — well-known, OV ~$180/yr
- **DigiCert** — enterprise-grade, more expensive

### SSL.com eSigner (cloud EV, no USB token required)
1. Purchase EV Code Signing at [ssl.com](https://www.ssl.com/certificates/ev-code-signing/)
2. Complete identity verification (takes 1–3 business days)
3. Enroll in **eSigner** cloud signing
4. Add these to GitHub Actions secrets:
   ```
   SSL_COM_USERNAME          your ssl.com account email
   SSL_COM_PASSWORD          your ssl.com password
   SSL_COM_CREDENTIAL_ID     from ssl.com dashboard
   SSL_COM_TOTP_SECRET       TOTP secret from ssl.com
   ```

### Standard PFX certificate (USB token or exported .pfx)
1. Export your signing certificate as a `.pfx` file
2. Base64-encode it:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) | Out-File cert_b64.txt
   ```
3. Add to GitHub Actions secrets:
   ```
   WIN_CSC_LINK           value from cert_b64.txt
   WIN_CSC_KEY_PASSWORD   your pfx password
   ```
4. electron-builder reads `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` automatically.

---

## macOS — Apple Developer + Notarization

### Requirements
- **Apple Developer Program** membership: $99/year at [developer.apple.com](https://developer.apple.com/programs/)
- **Developer ID Application** certificate (for distribution outside the App Store)

### Steps
1. Enroll in Apple Developer Program
2. In Xcode or Keychain, create a **Developer ID Application** certificate
3. Export as `.p12`, set a password
4. Base64-encode it:
   ```bash
   base64 -i cert.p12 | pbcopy
   ```
5. Create an app-specific password at [appleid.apple.com](https://appleid.apple.com) → Security → App-Specific Passwords
6. Add to GitHub Actions secrets:
   ```
   CSC_LINK                       base64 value of .p12
   CSC_KEY_PASSWORD               .p12 password
   APPLE_ID                       your Apple ID email
   APPLE_APP_SPECIFIC_PASSWORD    app-specific password
   APPLE_TEAM_ID                  10-char team ID from developer.apple.com
   ```
7. In `electron-builder.yml`, change `notarize: false` → `notarize: true`

---

## GitHub Actions integration (once you have certs)

In your release workflow (e.g., `.github/workflows/release.yml`):

```yaml
- name: Build & sign
  run: npm run build
  env:
    # Windows (PFX method):
    WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
    WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
    # macOS:
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

electron-builder auto-detects these variables and signs during the build step.
No source code changes are needed beyond setting `notarize: true` for macOS.

---

## Local builds (dev machine)

For local signing during development:
```powershell
# Windows: set env vars temporarily
$env:WIN_CSC_LINK = "base64string..."
$env:WIN_CSC_KEY_PASSWORD = "password"
npm run build
```

---

## Current status in `electron-builder.yml`

- **Windows**: Ready — just supply `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` env vars.
- **macOS**: Set `notarize: false` → `true` when Apple Developer enrollment is complete.

---

## Priority recommendation

1. **Short-term**: Get an **SSL.com EV Code Signing** certificate for Windows
   — eliminates the SmartScreen warning on day 1 (~$249/yr)
2. **When targeting macOS**: Enroll in Apple Developer Program ($99/yr)
   and enable notarization
