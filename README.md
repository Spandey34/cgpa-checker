# CGPA Verifier

A full-stack web application to detect CGPA discrepancies between self-reported (Google Form) values and institutional records. Flags rows exceeding a configurable threshold (δ) and exports a colour-coded Excel file.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | Clerk |
| Backend | Node.js + Express (ESM) |
| Database | MongoDB + Mongoose |
| Excel I/O | SheetJS (xlsx) |
| File Upload | express-fileupload + react-dropzone |
| Deployment | Render (backend as Web Service, frontend as Static Site) |

---

## Project Structure

```
cgpa-checker/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Upload.jsx       ← main verification flow
│   │   │   ├── History.jsx      ← searchable history list
│   │   │   ├── HistoryDetail.jsx
│   │   │   ├── Students.jsx     ← ground truth DB management
│   │   │   ├── SignInPage.jsx
│   │   │   └── SignUpPage.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx       ← sidebar layout
│   │   └── lib/
│   │       └── api.js           ← axios instance
│   └── .env.example
├── server/                  # Express backend
│   ├── models/
│   │   ├── Student.js           ← ground truth CGPA records
│   │   └── History.js           ← upload history (TTL: 1 year)
│   ├── routes/
│   │   ├── upload.js            ← core processing logic
│   │   ├── students.js          ← CRUD + bulk import
│   │   ├── history.js           ← history CRUD + download
│   │   └── webhook.js           ← Clerk webhook
│   ├── middleware/
│   │   └── auth.js              ← Clerk JWT verification
│   └── .env.example
└── render.yaml              ← Render deployment config
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (free tier works)
- Clerk account (free tier works)

### 1. Clone & Install

```bash
git clone <your-repo>
cd cgpa-checker
npm run install:all
```

### 2. Server Environment

Copy `server/.env.example` → `server/.env` and fill in:

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/cgpa-checker
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:5173
```

### 3. Client Environment

Copy `client/.env.example` → `client/.env` and fill in:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:5000/api
```

### 4. Run Dev Servers

```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend
npm run dev:client
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

---

## Clerk Setup

1. Create a Clerk application at https://dashboard.clerk.com
2. In **API Keys**, copy the Publishable Key and Secret Key
3. In **Webhooks**, add endpoint: `https://your-backend.onrender.com/api/webhook/clerk`  
   Select event: `user.created`, `user.deleted`
4. Copy the webhook signing secret

---

## Deploying to Render

1. Push code to GitHub
2. Go to https://dashboard.render.com → **New** → **Blueprint**
3. Connect repo — Render reads `render.yaml` automatically
4. Set all environment variables in each service's dashboard:

**Backend (`cgpa-checker-api`) env vars:**
- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `CLIENT_URL` (your frontend URL, e.g. `https://cgpa-checker-client.onrender.com`)

**Frontend (`cgpa-checker-client`) env vars:**
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_URL` (your backend URL + `/api`, e.g. `https://cgpa-checker-api.onrender.com/api`)

5. Deploy — both services build automatically

> ⚠️ Free tier on Render spins down after inactivity. Upgrade to Starter ($7/mo) for always-on.

---

## Excel File Format

### Input (Google Form responses)

Your sheet must have at minimum:

| Registration Number | CGPA |
|---|---|
| 21BCE1234 | 8.75 |
| 21BCE5678 | 9.10 |

Accepted column name variants (case-insensitive):
- Reg: `Registration Number`, `Reg No`, `Roll No`, `RegNo`
- CGPA: `CGPA`, `GPA`, `Entered CGPA`, `Self CGPA`

Extra columns are preserved in the output.

### Output (Downloaded Excel)

Same as input + three new columns:

| ... | Actual CGPA | Difference | Status |
|---|---|---|---|
| ... | 8.70 | 0.0500 | **FLAGGED** |
| ... | 9.08 | 0.0200 | OK |
| ... | — | N/A | NOT IN DATABASE |

- 🔴 Rows where `|Entered − Actual| > δ` are highlighted red
- 🟠 Rows not found in DB are also highlighted

### Ground Truth DB Import

Upload an Excel to the Student DB page with:

| Registration Number | CGPA | Name | Branch | Batch |
|---|---|---|---|---|
| 21BCE1234 | 8.70 | Alice | CSE | 2021 |

Upsert-based — re-uploading updates existing records safely.

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/upload/process` | Process form response sheet |
| GET | `/api/history` | List user's history |
| GET | `/api/history/:id` | Get single history entry |
| GET | `/api/history/:id/download` | Download verified Excel |
| DELETE | `/api/history/:id` | Delete history entry |
| GET | `/api/students` | List students (paginated) |
| POST | `/api/students/bulk-import` | Import students from Excel |
| DELETE | `/api/students/:id` | Delete a student |
| GET | `/api/students/stats` | Count total students |
| POST | `/api/webhook/clerk` | Clerk webhook handler |

All routes except webhook require `Authorization: Bearer <clerk-session-token>`.

---

## Data Retention

History entries are automatically deleted after **1 year** via MongoDB TTL index on `expiresAt`.
