# ResumeIQ

ResumeIQ is a student project that compares a resume with a target job description and helps the user prepare for an interview. It includes a React frontend and a Java Spring Boot backend.

## Current features

- Upload a resume PDF and extract its selectable text.
- Compare the resume with a job description and show keyword overlap.
- Request an AI role-fit assessment, including strengths, gaps, and improvement suggestions (Groq).
- Generate interview practice questions and evaluate submitted answers (Gemini).
- Save quiz attempts in a local H2 database and review quiz history and progress.

The keyword match percentage is a text-overlap measure. The AI role-fit score is an assessment against the job description; neither predicts whether a person will be hired. Scanned PDFs that contain only page images may need OCR and might not extract correctly.

## Tech stack

- Java 21, Spring Boot, Maven
- React, Vite, JavaScript
- H2 database with Spring Data JPA
- Groq API for resume assessment
- Gemini API for interview questions and answer evaluation

## Run locally

You need Java 21, Node.js with npm, and API keys for the AI features. Open two PowerShell terminals from the repository folder.

### 1. Start the backend

```powershell
cd .\resume-iq-backend
$env:GROQ_API_KEY = "your-groq-api-key"
$env:GOOGLE_API_KEY = "your-gemini-api-key"
.\mvnw.cmd spring-boot:run
```

Keep this terminal open while using the app. The keys are only set for that PowerShell session; set them again in a new terminal. Never commit real keys or paste them into source files.

The backend listens at `http://localhost:8080`. Its H2 database is stored under `resume-iq-backend/data/` and is ignored by Git.

### 2. Start the frontend

In a second PowerShell terminal:

```powershell
cd .\resume-iq-frontend
npm.cmd install
npm.cmd run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

## Main API routes

- `GET /api/health` — backend health check
- `POST /api/resumes/analyze` — analyze a resume against a job description
- `POST /api/resumes/quiz` — generate interview questions
- `POST /api/resumes/quiz/evaluate` — evaluate quiz answers
- `GET /api/quiz-history` and `POST /api/quiz-history` — retrieve and save quiz history

The frontend currently calls the backend at `http://localhost:8080`; this setup is for local development.

## Privacy and security

Resume text is sent to Groq for role-fit feedback, and quiz prompts and answers are sent to Gemini. Quiz history is stored in the local H2 database. This version does not have account login or production-grade access controls, so use sample data for demonstrations and do not deploy it publicly without adding security, privacy controls, and a production database configuration.
