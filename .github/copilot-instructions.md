# 4K-OmniShop Copilot Instructions

## 1. Project Overview & Architecture

This is an **Offline-First Desktop POS & Store Manager** built with **Electron, React, Vite, and TypeScript**.

- **Root**: `app/omnishop/` (Main project directory)
- **Architecture**:
  - **Main Process** (`src/main/`): Node.js runtime, handles OS interactions, window management.
  - **Preload Scripts** (`src/preload/`): Secure bridge between Main and Renderer (Context Isolation).
  - **Renderer Process** (`src/renderer/`): React UI, runs in a webview.
- **Data Strategy**:
  - **Firebase Firestore** (Offline persistence enabled).
  - **Sanity.io** (Headless CMS for Help/Support).
  - **Cloudinary** (Media optimization).

## 2. Tech Stack & Libraries

- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS v3, **Shadcn UI** (Radix Primitives).
- **Routing**: `react-router-dom` (Use **HashRouter** for Electron file compatibility).
- **State Management**: **Zustand** (POS cart, UI state).
- **Forms**: React Hook Form + Zod.
- **Icons**: `lucide-react`.
- **Packaging**: `electron-builder`.

## 3. Key Developer Workflows

All commands run from `app/omnishop/`:

- **Start Dev Server**: `npm run dev` (Runs Electron + Vite in parallel).
- **Typecheck**: `npm run typecheck` (Checks both Node and Web configs).
- **Build**: `npm run build` (Production build).
- **Add Shadcn Component**:
  - Prefer using existing components in `src/renderer/src/components/ui/`.
  - To add new: `npx shadcn@latest add <component-name>` or from `BLOCKS.md` URLs.

## 4. Coding Conventions & Patterns

- **File Naming**:
  - Folders: `kebab-case` (e.g., `components`, `pos-system`).
  - React Components: `PascalCase` (e.g., `DashboardLayout.tsx`).
  - Utils/Hooks: `camelCase` (e.g., `useAuth.ts`, `formatCurrency.ts`).
  - Constants: `UPPER_SNAKE_CASE`.
- **Component Structure**:
  - File size limit: **100-300 lines** (soft), max 750. Break down large components.
  - Hybrid OOP/Functional: Prioritize encapsulated, reusable functions.
- **Type Safety**:
  - **Strict TypeScript**: No `any`. Define interfaces/types for all props and data.
  - Zod Schemas for all form/input validation.
- **Styling**:
  - Use Tailwind utility classes.
  - Use `cn()` utility for class merging (e.g., `className={cn("base-class", className)}`).
- **Error Handling**:
  - Assume human error.
  - Implement confirmation dialogs for destructive actions.
  - Toggleable debug logs.

## 5. Critical Integration Points

- **Electron IPC**: Use `ipcMain.handle` in Main and `window.electron.ipcRenderer.invoke` in Renderer.
- **File System**: Access local FS via Main process handlers, exposed via Preload.
- **Navigation**: Use `<Link>` or `useNavigate` from `react-router-dom` within Renderer.
- **Assets**: Store in `src/renderer/src/assets` or `resources/` for static files.

## 6. Important Files

- `app/omnishop/electron.vite.config.ts`: Vite configuration for Main/Preload/Renderer.
- `app/omnishop/src/renderer/src/lib/utils.ts`: Common utilities (including `cn`).
- `PLAN.md`: Detailed architecture and roadmap.
