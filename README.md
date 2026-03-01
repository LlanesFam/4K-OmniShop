# 4K-OmniShop
**Author:** Mika 

## Overview
This is a standalone desktop application distributed via an installer, focused on store management. The core architectural focus is an "Offline-First" approach, guaranteeing that the Point-of-Sale (POS) and management features remain fully functional regardless of internet connectivity.

## Tech Stack
### 1. Core & Environment
* **Runtime & Wrapper:** Node.js runtime , packaged with Electron to allow native desktop capabilities like isolated webviews and local file system access.
* **Packager:** Electron-Builder is used to generate the final exe standalone installer.

### 2. Frontend Architecture
* **Framework:** React framework , built with Vite for optimized production builds.
* **Language:** TypeScript is highly recommended to catch errors early.

### 3. State Management & Data Fetching
* **Global State:** Zustand is utilized for managing POS cart states and UI toggles.
* **Routing:** React Router DOM using HashRouter, as it works well with Electron's local file URLs.

### 4. Database, Backend & Authentication
* **Primary Database:** Firebase Cloud Firestore is used because it handles offline-first caching automatically.
* **Authentication:** Firebase Authentication handles JWT token management, Google SSO, and Email/Password logins.
* **CMS:** Sanity.io manages Help & Support articles, FAQs, and tutorials without requiring code changes.
* **Media Management:** Cloudinary uploads, stores, compresses, and resizes images on the fly.

### 5. UI & Styling
* **Styling & UI:** Tailwind CSS  paired with shadcn/ui for customizable base components.
* **Forms & Validation:** React Hook Form for performant form management  and Zod for schema validation.
* **Icons:** Lucide React.

## Coding Practices & File Structure
* **File Limits:** Files should ideally contain less than 100 to 300 lines of code, with a soft cap of roughly 750 lines maximum.
* **Paradigm:** The project follows Object-Oriented Programming (OOP) principles and Functional Programming.
* **Naming Conventions:**
    * Folders use `kebab-case` to prevent case-sensitivity bugs across different operating systems.
    * React Components use `PascalCase`.
    * Utilities and Hooks use `camelCase`.
    * Constants use `UPPER_SNAKE_CASE`.
* **Documentation:** Structured JSDoc comments are required above complex functions, React components, hooks, or shared utilities to ensure rich tooltip hints in IDEs.
* **Security & Validation:** Inputs must be sanitized, restricting code objects, tags, and emojis. Debug logs should be toggleable.

## Authentication & Roles
* **Admin Role:** Admins have full access to the app, including CRUD operations on all tables and the ability to approve, reject, or delete pending users.
* **User Role:** Users have limited access, can perform CRUD operations on their own account and shop, and can switch between Dashboard Mode and POS Mode.
* **Registration Flow:** User registration requires Admin approval. Users must provide a valid email, which receives a verification code. Upon admin approval, users receive an email with their credentials. Google SSO bypasses the email verification step but still requires admin approval.

## Layout & Offline Strategies
* **Dashboard vs. POS:** The Dashboard features a sidebar with a collapsible group divider. The POS interface is touch-screen friendly (Tablet Kiosk Mode) and supports keyboard shortcuts.
* **Social Webviews:** Facebook Messenger and Gmail are embedded using secure Electron `<webview>` tags. These use persistent partitions (e.g., `persist:messenger`) to save cookies locally.
* **Offline Image Handling:**
    * **Write Flow:** If offline, image uploads are intercepted and saved to the local device. A temporary local URL is generated and saved to the local Firestore cache. Once online, a background sync pushes the upload to Cloudinary.
    * **Read Flow:** A Service Worker intercepts failed network requests and serves cached thumbnails to the UI while offline.