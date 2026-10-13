# IT Incident Management & SLA Monitoring SaaS Platform

A full-stack Incident Management and Service Level Agreement (SLA) Monitoring application built using **FastAPI, React Vite, and MySQL**.

The platform enables organizations to report technical incidents, assign them to support engineers, track resolution progress, monitor SLA deadlines, manage escalations, and analyze incident and team performance.

## 1. Project Overview

The IT Incident Management & SLA Monitoring SaaS Platform provides a centralized system for handling technical incidents throughout their lifecycle.

### Key Objectives

- Manage incidents from creation to closure.
- Provide role-based authentication and authorization.
- Assign incidents to support agents and teams.
- Configure SLA policies based on incident priority.
- Monitor first-response and resolution deadlines.
- Track SLA breaches and escalation events.
- Maintain incident comments, status history, and audit logs.
- Provide dashboards and analytics using database data.
- Support notifications and real-time incident updates.

## 2. Technology Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- MySQL
- JWT authentication
- Password hashing
- Pytest

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- React Toastify

### Integrations

- SMTP email notifications
- WebSockets for real-time updates
- Cloudinary or AWS S3 for incident attachments

### Development Tools

- Visual Studio Code
- MySQL Workbench
- Postman
- Swagger UI
- Git and GitHub

## 3. User Roles

The application supports four user roles.

| Role | Responsibilities |
|---|---|
| Admin | Manage users, teams, priorities, categories, and SLA policies |
| Manager | Monitor incidents, SLA compliance, escalations, and team performance |
| Support Agent | Investigate assigned incidents, add notes, update status, and resolve issues |
| Reporter | Create incidents, upload attachments, track progress, and confirm resolution |

Role-based access control restricts users to the operations permitted for their roles.

## 4. Core Features

### Authentication and Authorization

- User registration and login.
- Secure password hashing.
- JWT access tokens.
- Protected frontend routes.
- Backend role-based access control.
- Current-user information through the authentication API.

### Incident Management

- Create and view incidents.
- Assign and reassign incidents.
- Update incident status.
- Add comments and investigation notes.
- Upload supporting attachments.
- Search and filter incidents.
- Maintain status and assignment history.
- Track resolution information.

### SLA Monitoring

- Configure first-response targets.
- Configure resolution targets.
- Monitor SLA deadlines.
- Identify breached SLAs.
- Calculate SLA compliance metrics.
- Record escalation events and notification history.

Example SLA targets:

| Priority | First Response | Resolution |
|---|---:|---:|
| Critical | 5 minutes | 1 hour |
| High | 15 minutes | 4 hours |
| Medium | 1 hour | 24 hours |
| Low | 4 hours | 72 hours |

These are example targets. Actual values should be configurable through the application's SLA policy management functionality.

### Notifications and Real-Time Updates

- In-app notifications.
- Read and unread notification tracking.
- Email notifications for supported incident events.
- WebSocket updates for supported incident changes.

### Reports and Analytics

- Total open incidents.
- Resolved incidents.
- Critical incidents.
- Breached SLAs.
- SLA compliance percentage.
- Average first-response time.
- Average resolution time.
- Incidents grouped by priority and category.
- Agent performance reports.
- Daily or weekly incident trends.

Dashboard statistics and analytics should be retrieved from backend APIs and database queries rather than hardcoded values.

## 5. Project Structure

The following is a suggested structure. Keep your actual file names and folders consistent with your implementation.

```text
incident-management-saas/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── dependencies.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── main.py
│   ├── tests/
│   ├── migrations/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── postman/
│   └── incident-management.postman_collection.json
│
├── screenshots/
│   ├── admin-dashboard.png
│   ├── incident-board.png
│   ├── incident-timeline.png
│   └── sla-monitoring.png
│
└── README.md
```

## 6. Prerequisites

Install the following before running the project:

- Python 3.11 or another Python version supported by your dependencies.
- Node.js and npm.
- MySQL Server.
- Git.
- Postman (optional, for API testing).

Check your installations:

```bash
python --version
node --version
npm --version
git --version
```

## 7. Backend Setup

### Step 1: Navigate to the backend

```bash
cd backend
```

### Step 2: Create a virtual environment

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

macOS or Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

If the project does not yet have a `requirements.txt`, create one containing the dependencies actually used by your application, such as FastAPI, Uvicorn, SQLAlchemy, PyMySQL, Pydantic, email validation, JWT and password-hashing libraries, and Pytest.

### Step 4: Configure environment variables

Create a `.env` file in the backend directory based on `.env.example`.

Example:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/incident_management

SECRET_KEY=replace_with_a_secure_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_EMAIL=your_email@example.com
SMTP_PASSWORD=your_email_password

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_REGION=

FRONTEND_URL=http://localhost:5173
```

Configure only the integrations used by your implementation. Do not commit real passwords, API keys, or secret keys to GitHub.

### Step 5: Create the MySQL database

Open MySQL Workbench or the MySQL command line and execute:

```sql
CREATE DATABASE incident_management;
```

Make sure the database name, username, password, and host match `DATABASE_URL`.

### Step 6: Initialize database tables

Use the project's existing SQLAlchemy initialization or migration process.

If Alembic is configured, use the appropriate migration commands, for example:

```bash
alembic upgrade head
```

If the project uses `Base.metadata.create_all()`, follow the database initialization implemented in `app/database.py`.

Avoid running both approaches indiscriminately; use the method configured for your project.

### Step 7: Create the initial Admin

Use the project's secure initial-Admin bootstrap procedure if available.

If registration is configured to allow only the first Admin, register that account before creating Manager, Support Agent, and Reporter accounts.

### Step 8: Start the backend server

From the backend directory:

```bash
uvicorn app.main:app --reload
```

The default backend address is:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

ReDoc documentation:

```text
http://127.0.0.1:8000/redoc
```

These URLs work when the FastAPI application is configured with the corresponding default settings.

## 8. Frontend Setup

### Step 1: Open a new terminal

Keep the backend server running in its existing terminal.

### Step 2: Navigate to the frontend

```bash
cd frontend
```

### Step 3: Install dependencies

```bash
npm install
```

### Step 4: Configure the API URL

Ensure the Axios instance uses the running backend URL. For example:

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;
```

Use your existing Axios configuration if it already supports authentication and the required API endpoints.

### Step 5: Start the frontend

```bash
npm run dev
```

Open the frontend URL printed by Vite, usually:

```text
http://localhost:5173
```

## 9. API Endpoints

The following endpoints describe the intended API surface. Refer to Swagger UI for the routes actually registered by the application.

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register the initial Admin, if configured |
| POST | `/auth/login` | Authenticate a user |
| GET | `/auth/me` | Retrieve current-user details |

### Incidents

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/incidents` | Create an incident |
| GET | `/incidents` | List incidents with supported filters |
| GET | `/incidents/{incident_id}` | Retrieve incident details |
| PATCH | `/incidents/{incident_id}/assign` | Assign or reassign an incident |
| PATCH | `/incidents/{incident_id}/status` | Update incident status |
| POST | `/incidents/{incident_id}/comments` | Add a comment |
| POST | `/incidents/{incident_id}/attachments` | Upload an attachment |
| GET | `/incidents/{incident_id}/timeline` | Retrieve incident history |

### SLA Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/sla/policies` | List SLA policies |
| POST | `/sla/policies` | Create an SLA policy |
| GET | `/sla/breaches` | Retrieve SLA breach records |

### Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/notifications` | Retrieve notifications |
| PATCH | `/notifications/{notification_id}/read` | Mark a notification as read |

### Analytics

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/analytics/overview` | Retrieve dashboard metrics |
| GET | `/analytics/agent-performance` | Retrieve agent performance |
| GET | `/analytics/by-priority` | Group incidents by priority |
| GET | `/analytics/by-category` | Group incidents by category |
| GET | `/analytics/trends` | Retrieve daily or weekly trends |

Authenticated endpoints require a valid JWT access token according to the backend's authorization configuration.

## 10. Incident Lifecycle

The intended incident lifecycle is:

```text
OPEN
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
PENDING
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

The exact permitted transitions depend on the backend's status-transition rules.

1. A Reporter creates an incident.
2. The incident receives a priority and applicable SLA policy.
3. An authorized user assigns it to a support agent or team.
4. The Support Agent investigates the issue and records updates.
5. The system tracks first-response and resolution deadlines.
6. Overdue incidents are identified for escalation according to the configured policy.
7. The Support Agent resolves the issue and records the resolution details.
8. The Reporter or an authorized user confirms closure according to the workflow.

Historical status changes and assignments should be retained rather than overwritten.

## 11. SLA Calculation and Monitoring

SLA policies define the allowed first-response and resolution durations for each incident priority.

The system should:

- Calculate the applicable deadlines when an incident is created.
- Track the first-response timestamp.
- Track the resolution timestamp.
- Determine whether response or resolution targets have been breached.
- Calculate SLA compliance from the relevant SLA records.
- Identify incidents approaching their deadlines.
- Escalate overdue incidents through a backend scheduler or worker.
- Record escalation events and notification attempts.

If the SLA policy supports pausing during `PENDING`, the backend must account for eligible paused time when calculating deadlines.

The backend should remain responsible for SLA calculations and breach detection. Frontend countdowns should display server-derived deadlines and states rather than independently deciding whether an SLA has been breached.

## 12. Testing

Run the project's Pytest suite from the backend directory:

```bash
pytest
```

For verbose output:

```bash
pytest -v
```

For coverage, if `pytest-cov` is installed:

```bash
pytest --cov=app --cov-report=term-missing
```

### Recommended Test Coverage

The assignment requires at least 12 meaningful test cases covering:

1. Successful authentication.
2. Invalid login credentials.
3. Role-based authorization.
4. Incident creation.
5. Incident assignment.
6. Invalid status transitions.
7. Unauthorized incident access.
8. SLA deadline calculation.
9. First-response tracking.
10. SLA breach detection and escalation.
11. Incident reopening.
12. Notification creation.
13. Analytics aggregation.
14. Attachment validation.
15. Historical status and assignment records.

Record the actual test results before submission. Do not report tests as passed unless they have been executed successfully.

## 13. Postman Collection

Create or export a Postman collection containing the implemented API endpoints.

Recommended collection folders:

```text
Incident Management API
├── Authentication
│   ├── Register Admin
│   ├── Login
│   └── Get Current User
├── Incidents
│   ├── Create Incident
│   ├── List Incidents
│   ├── Get Incident
│   ├── Assign Incident
│   ├── Update Status
│   └── Incident Timeline
├── SLA
│   ├── List Policies
│   └── List Breaches
├── Notifications
└── Analytics
    ├── Overview
    ├── Agent Performance
    ├── By Priority
    ├── By Category
    └── Trends
```

Save the exported collection under:

```text
postman/incident-management.postman_collection.json
```

Use Postman's environment variables for the API base URL and JWT token. Include only endpoints implemented and verified in the backend.

## 14. Screenshots

Save screenshots of the working application in the `screenshots/` directory.

Required screenshots:

| Filename | Expected Content |
|---|---|
| `admin-dashboard.png` | Dashboard KPI cards and analytics |
| `incident-board.png` | Incident list or Kanban board |
| `incident-timeline.png` | Incident history, comments, and status changes |
| `sla-monitoring.png` | SLA policies, deadlines, or breach monitoring |

Use actual application screens populated from backend and database data. Do not create screenshots with fabricated statistics or simulated incident records presented as real system data.

## 15. Security Considerations

- Store passwords using secure password hashing.
- Keep JWT signing keys and credentials in environment variables.
- Validate user permissions on the backend for every protected operation.
- Restrict access to incidents based on user roles and ownership or assignment rules.
- Validate uploaded files and their allowed sizes and types.
- Store attachment URLs and metadata in the database, not file contents.
- Keep audit logs for important actions.
- Avoid logging passwords, access tokens, or sensitive credentials.
- Use HTTPS and secure deployment settings in production.

## 16. Known Limitations and Verification

Before submission, verify which integrations and features are fully implemented and tested in the current repository.

In particular, confirm:

- Database migrations can recreate the schema.
- All frontend pages call the correct backend APIs.
- User and incident permissions are enforced server-side.
- SLA deadlines and breach calculations are correct.
- Background scheduling and escalation are active.
- SMTP and WebSocket integrations handle failures safely.
- Attachment uploads work with the configured storage provider.
- Automated tests pass.
- Screenshots and Postman collection are included.

Only describe features as completed when they are implemented and verified.

## 17. Future Enhancements

Potential improvements include:

- More advanced incident search and filtering.
- Configurable escalation rules.
- SLA pause accounting for pending incidents.
- Additional reporting and export functionality.
- Improved audit-log filtering.
- Production deployment with HTTPS and monitoring.
- Expanded automated test coverage.

## 18. Conclusion

The IT Incident Management & SLA Monitoring SaaS Platform is designed to centralize technical incident handling, improve collaboration between reporters and support teams, monitor SLA performance, and provide actionable analytics.

The project combines a FastAPI backend, relational database, React Vite frontend, role-based access control, and integrations for notifications, file storage, and real-time updates.

The final submission should include the working source code, database migrations, environment template, setup documentation, API collection, automated test results, and screenshots of the implemented application.