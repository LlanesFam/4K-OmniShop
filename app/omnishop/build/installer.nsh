; ─── OmniShop Custom NSIS Installer Script ────────────────────────────────────
; Included by electron-builder via nsis.include in electron-builder.yml
; Uses !ifndef guards so we never re-define something electron-builder already set.

; ── Welcome Page ──────────────────────────────────────────────────────────────
!ifndef MUI_WELCOMEPAGE_TITLE
  !define MUI_WELCOMEPAGE_TITLE "Welcome to OmniShop Setup"
!endif
!ifndef MUI_WELCOMEPAGE_TEXT
  !define MUI_WELCOMEPAGE_TEXT "OmniShop is your offline-first point-of-sale and store manager.$\r$\n$\r$\nThis wizard will guide you through the installation.$\r$\n$\r$\nClick Next to continue."
!endif

; ── Finish Page ───────────────────────────────────────────────────────────────
!ifndef MUI_FINISHPAGE_TITLE
  !define MUI_FINISHPAGE_TITLE "OmniShop Installed Successfully"
!endif
!ifndef MUI_FINISHPAGE_TEXT
  !define MUI_FINISHPAGE_TEXT "OmniShop has been installed.$\r$\n$\r$\nClick Finish to close this wizard."
!endif
!ifndef MUI_FINISHPAGE_LINK
  !define MUI_FINISHPAGE_LINK "Visit OmniShop on GitHub"
!endif
!ifndef MUI_FINISHPAGE_LINK_LOCATION
  !define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/LlanesFam/4K-OmniShop"
!endif

; ── Abort Warning ─────────────────────────────────────────────────────────────
!ifndef MUI_ABORTWARNING_TEXT
  !define MUI_ABORTWARNING_TEXT "Are you sure you want to cancel the OmniShop installation?"
!endif

; ── Custom Install/Uninstall Actions ──────────────────────────────────────────
!macro customInstall
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "Publisher" "4K OmniShop"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "URLInfoAbout" "https://github.com/LlanesFam/4K-OmniShop"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "Comments" "OmniShop — Your offline-first POS and store manager."
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\4K OmniShop"
!macroend

