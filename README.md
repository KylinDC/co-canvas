# Co-Canvas

Co-Canvas is a real-time collaborative whiteboard application built with React, Cloudflare Workers, and tldraw. It allows users to create rooms, invite others, and draw together in real-time. You can try it online: [Co-Canvas](https://co-canvas.121314.best/)

## 🛠 Tech Stack

### Frontend
-   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Whiteboard Engine**: [tldraw](https://tldraw.com/)
-   **State Management**: [TanStack Query](https://tanstack.com/query/latest)
-   **Routing**: [React Router](https://reactrouter.com/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/)

### Backend
-   **Platform**: [Cloudflare Workers](https://workers.cloudflare.com/)
-   **Framework**: [Hono](https://hono.dev/)
-   **Real-time**: Cloudflare [Durable Objects](https://developers.cloudflare.com/durable-objects/) (WebSockets)
-   **Database**: Cloudflare [D1](https://developers.cloudflare.com/d1/) (SQLite)
-   **Storage**: Cloudflare [R2](https://developers.cloudflare.com/r2/) (Object Storage)
-   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)

### Tools
-   **Linting/Formatting**: [Biome](https://biomejs.dev/) and [ESLint](https://eslint.org/)
-   **Testing**: [Vitest](https://vitest.dev/)
-   **Deployment**: [GitHub Actions](https://github.com/features/actions) and [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## 🏗 Architecture

### Overall Architecture
The application follows a serverless architecture deployed on Cloudflare's edge network.

1.  **Client**: A Single Page Application (SPA) served via Cloudflare Assets. It communicates with the backend via HTTP APIs and WebSockets.
2.  **Cloudflare Worker**: A Cloudflare Worker handling HTTP requests using Hono. It manages room creation, listing, and joining logic.
3.  **Real-time Server**: Specific rooms are handled by **Durable Objects**. Each room connects to a unique Durable Object instance that manages the WebSocket connections and synchronizes the tldraw document state.
4.  **Data Persistence**:
    -   **Room Metadata** (ID, name, host, status) is stored in **D1** (SQL database).
    -   **Canvas Data** (snapshots) is stored in **R2** (Object Storage) by the Durable Object for long-term persistence.

### Worker Architecture
-   **`worker/index.ts`**: Entry point exporting the Worker and Durable Object classes.
-   **`worker/route.ts`**: Main Hono app setup.
-   **`worker/routes/room.routes.ts`**: REST API endpoints for room management (`/api/rooms`). Handles request validation and delegates business logic to the service layer.
-   **`worker/services/room.service.ts`**: Contains business logic for room operations (create, join, leave, close).
-   **`worker/repositories/room.repository.ts`**: Handles database interactions using Drizzle ORM.
-   **`worker/room-do.ts`**: The `RoomDO` Durable Object class.
    -   Handles WebSocket connections (`/api/rooms/:roomId/connect`).
    -   Uses `@tldraw/sync-core` to manage conflict resolution and broadcasting.
    -   Periodically saves snapshots to R2.

## 🔄 User Flow

1.  **Onboarding (`/`)**:
    -   User lands on the home page.
    -   Enters a display name.
    -   A unique User ID is generated and stored locally.

2.  **Lobby (`/rooms`)**:
    -   User sees a dashboard of their rooms.
    -   **Create Room**: User can create a new room, becoming the host.
    -   **Join Room**: User can enter an existing room they belong to.

3.  **Room (`/rooms/:roomId`)**:
    -   **Connect**: The client establishes a WebSocket connection to the room's Durable Object.
    -   **Collaborate**: Users can draw, move shapes, and see others' cursors in real-time.
    -   **Host Actions**: The host can "Close Room", making it read-only for everyone.
    -   **Member Actions**: Members can "Leave Room" to remove it from their list.

## 🏃‍♂️ Getting Started

### Prerequisites
-   [Node.js](https://nodejs.org/) (Latest LTS recommended)
-   [pnpm](https://pnpm.io/) (Package manager)
-   [Cloudflare Account](https://dash.cloudflare.com/) (for deployment)

### Environment Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd co-canvas
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Setup Local Database**:
    Initialize the local D1 database for development.
    ```bash
    pnpm run db:migrate:local
    ```

### Running Locally

Start the development server. This runs Vite with the Cloudflare Worker adapter, allowing you to test both frontend and backend locally.

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📂 Project Structure

```
co-canvas/
├── src/                # Frontend source code
│   ├── components/     # React components
│   ├── lib/            # Utilities and API clients
│   ├── pages/          # Page components (Home, Lobby, Room)
│   └── main.tsx        # Entry point
├── worker/             # Backend source code
│   ├── db/             # Drizzle ORM schemas
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic services
│   ├── repositories/   # Database access layer
│   ├── room-do.ts      # Durable Object implementation
│   └── index.ts        # Worker entry point
├── drizzle/            # Database migrations
├── public/             # Static assets
├── wrangler.jsonc      # Cloudflare Workers configuration
└── package.json        # Project dependencies and scripts
```

### Deployment (Optional)

#### Configuration
Before deploying, ensure your `wrangler.jsonc` is configured correctly, specifically the `routes` section if you are using a custom domain.

```jsonc
// wrangler.jsonc
"routes": [
  {
    "pattern": "your-domain.com",
    "custom_domain": true
  }
]
```

#### Option 1: Local Deployment
You can deploy directly from your local machine using Wrangler.

1.  **Login to Cloudflare**:
    ```bash
    pnpm dlx wrangler login
    ```

2.  **Apply Migrations (Production)**:
    Run the migrations against your remote D1 database.
    ```bash
    pnpm run db:migrate:prod
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory and add your Tldraw license key. This is required to deploy online. You can refer to the [Tldraw documentation](https://tldraw.com/docs/overview/getting-started#license) for more information.
    ```env
    VITE_TLDRAW_LICENSE_KEY=your_license_key_here
    ```

4.  **Deploy**:
    Build and deploy the application to Cloudflare Workers.
    ```bash
    pnpm run deploy
    ```

#### Option 2: CI/CD Pipeline (GitHub Actions)
This project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys changes pushed to the `main` branch.

**Prerequisites:**
1.  Go to your GitHub repository settings -> **Secrets and variables** -> **Actions**.
2.  Add the following **Repository secrets**:
    -   `CLOUDFLARE_API_TOKEN`: Your Cloudflare API Token with Workers permissions.
    -   `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID.
    -   `VITE_TLDRAW_LICENSE_KEY`: Your Tldraw license key.

Once set up, every push to `main` will trigger the deployment pipeline, which includes:
-   Linting (Biome & ESLint)
-   Type Checking
-   Unit Tests (Frontend & Worker)
-   Security Audit
-   Deployment to Cloudflare Workers

## 🧪 Testing

-   **Run Unit Tests**:
    ```bash
    pnpm run test
    ```
-   **Run Worker Tests**:
    ```bash
    pnpm run test:worker
    ```
-   **Run All Tests**:
    ```bash
    pnpm run test:all
    ```
