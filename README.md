# AI PLANNER – Intelligent Personal Planning and Decision-Making Agent

An AI-powered personal planning application that helps users organize tasks, manage priorities, generate intelligent timetables, and interact through conversational AI and voice assistance.

AI Planner is an academic AI Mini-Capstone project demonstrating explainable decision-making, constraint-based scheduling, natural language processing, adaptive rescheduling, and multimodal voice interaction.

---

## 1. Project Overview

Traditional task management applications function as simple digital to-do lists. They require users to manually prioritize tasks, do not consider workload capacity, and provide limited assistance when schedules change.

**AI Planner** transforms traditional task management into an intelligent planning assistant.

### Key Features

- **Intelligent Task Prioritization:** Uses an explainable weighted mathematical model to calculate task priority.
- **AI Daily Timetable Generator:** Automatically generates structured daily schedules based on deadlines, task durations, and available working hours.
- **Adaptive Rescheduling:** Adjusts future tasks when delays occur while preserving completed activities.
- **AI Chatbot:** Allows users to interact with the planning engine using natural language.
- **AI Voice Assistant:** Supports hands-free interaction using the wake phrase "Hey Planner".
- **Natural Language Task Intake:** Converts user requests into structured tasks by identifying titles, deadlines, durations, and categories.
- **Task Management:** Supports creating, updating, completing, and organizing tasks.
- **Analytics and History:** Provides insights into planning activities and task progress.
- **Local Database:** Uses SQLite for persistent storage.
- **Premium Interface:** Features a Dark Red and Warm Beige design with glossy classic icons.

---

## 2. System Architecture

AI Planner follows a modular architecture consisting of a React frontend, FastAPI backend, centralized AI planning engine, voice processing components, and SQLite database.

### Architecture Flow

```text
             USER INTERACTION LAYER
          Text Input | Voice Assistant
                      |
                      v
              SPEECH PIPELINE
          Wake Word Detection / STT
                      |
                      v
          NATURAL LANGUAGE PROCESSING
           Intent Recognition & Parsing
                      |
                      v
             CENTRAL AI ENGINE
           Priority Decision Engine
           Timetable Scheduler
           Adaptive Rescheduler
           Ollama Llama 3.2
                      |
                      v
              DATABASE LAYER
             SQLite Persistence
          Tasks / Timetables / History
                      |
                      v
             RESPONSE GENERATION
            Structured JSON / TTS
```

---

## 3. Core AI Concepts and Algorithms

### 3.1 Explainable Multi-Factor Priority Algorithm

AI Planner uses a mathematical scoring model to determine the priority of tasks.

**Priority Score Formula:**

Priority Score = (Importance × 0.35) + (Urgency × 0.30) + (Deadline Proximity × 0.20) + (Time Pressure × 0.15)

**Metric Definitions:**

1. **Importance:** Represents the significance of a task.
   - High: 100
   - Medium: 60
   - Low: 25

2. **Urgency:** Calculated based on the remaining time until the deadline.
   - Overdue: 100
   - Within 6 hours: 95
   - Within 24 hours: 85
   - Within 48 hours: 70
   - Within 7 days: 45
   - More than 7 days: 20
   - No deadline: 30

3. **Deadline Proximity:** Uses an exponential decay function to increase priority as deadlines approach.

   D = 100 × exp(-max(0, Δt) / 72)

4. **Time Pressure:** Evaluates the relationship between estimated task duration and available time.

   P = min(100, (Estimated Duration / max(0.1, Remaining Hours)) × 100)

**Dependency Awareness:**

- Tasks depending on unfinished tasks are prevented from being scheduled or recommended prematurely.
- The system provides human-readable explanations for priority decisions.

### 3.2 Constraint-Based Daily Timetable Scheduler

The timetable generator uses a Greedy Interval Scheduling approach.

Its main constraints include:

1. Working-hour limits.
2. Mandatory 15-minute breaks after 90 minutes of continuous focus.
3. Protected lunch periods.
4. Non-overlapping task allocations.
5. Automatic deferral of tasks that cannot fit within available working hours.

### 3.3 Adaptive Drift Rescheduling

The adaptive rescheduling engine reorganizes incomplete tasks when unexpected changes occur.

Its operations include:

1. Preserving completed schedule blocks.
2. Detecting schedule delays and task changes.
3. Shifting incomplete tasks into available time slots.
4. Providing explanations of schedule modifications.

### 3.4 Natural Language Processing and Task Intake

Users can enter requests such as:

"Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM."

The NLP engine:

- Identifies individual tasks from compound requests.
- Extracts task titles, deadlines, durations, and categories.
- Detects missing information.
- Generates clarification prompts.
- Displays a preview before saving tasks.

---

## 4. Empirical Evaluation and Benchmarking

The project evaluates its weighted prioritization approach against FIFO and Earliest Deadline First (EDF) strategies under a bounded capacity of 300 minutes.

| Evaluation Metric | FIFO | EDF | AI Planner |
|---|---|---|---|
| High-Importance Task Completion | 50% | 50% | 100% |
| Urgent Crisis Prevention | Poor | Medium | Optimal |
| Scheduling Conflicts | Present | Present | Zero |
| Dependency Violations | Common | Frequent | Zero |

The evaluation demonstrates the potential advantages of combining task importance, urgency, deadline proximity, and time pressure in a unified decision-making model.

---

## 5. Technology Stack

### Frontend
- React 19
- Vite 6
- Tailwind CSS 3
- React Router 7
- Lucide React
- Recharts

### Backend
- Python
- FastAPI
- SQLAlchemy 2.0
- Pydantic v2
- Uvicorn

### Database
- SQLite
- Persistent relational storage

### AI Engine
- Ollama
- Llama 3.2
- Local rule-based NLP and fallback processing

### Voice Technology
- Web Speech Recognition API
- Web Speech Synthesis API
- Wake phrase detection: "Hey Planner"

---

## 6. Premium UI/UX Design System

The application follows a Dark Red and Warm Beige visual theme.

| Visual Element | Hex Code |
|---|---|
| Primary Background | `#F2E8D8` |
| Secondary Background | `#FAF5EC` |
| Card Surfaces | `#FFF9F0` |
| Primary Accent | `#701C2C` |
| Secondary Accent | `#8B2635` |
| Dark Surfaces | `#3D111B` |
| Primary Text | `#302626` |
| Secondary Text | `#806D65` |
| Highlight Accent | `#C5A059` |

The interface uses polished cards, glossy classic icons, elegant typography, and a consistent layout to provide a modern planning experience.

---

## 7. Installation and Setup Guide

### Prerequisites

Install the following software:

- Python 3.10 or newer
- Node.js 18 or newer
- npm
- Git
- Optional: Ollama with the Llama 3.2 model

### Step 1: Clone the Repository

```bash
git clone https://github.com/Rithwik-Papolu/AI_PLANNER.git
```

Navigate into the project directory:

```bash
cd AI_PLANNER
```

### Step 2: Configure the Backend

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Initialize the database and seed initial data:

```bash
python -m backend.seed_data
```

### Step 3: Configure the AI Model

Install Ollama and download the Llama 3.2 model:

```bash
ollama pull llama3.2
```

Run the model:

```bash
ollama run llama3.2
```

Ollama must be running locally for local LLM-powered functionality.

### Step 4: Configure the Frontend

Open another terminal:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Frontend URL:

`http://localhost:3000`

### Step 5: Start the Backend

From the project root, activate the virtual environment and execute:

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API URL:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

---

## 8. Running Automated Tests

AI Planner includes automated tests for its core functionalities.

Run the test suite using:

```bash
python -m pytest tests/ -v
```

The test modules cover:

- `test_priority_engine.py` – Priority calculations and dependency handling.
- `test_scheduler.py` – Timetable generation and adaptive rescheduling.
- `test_nlp_and_agent.py` – Natural language parsing and AI agent functionality.
- `test_api_endpoints.py` – Backend API operations.
- `test_algorithm_evaluation.py` – Comparative algorithm evaluation.
- `test_voice_assistant.py` – Voice assistant functionality.

The original project verification reported 18 tests.

---

## 9. Project Structure

```text
AI_PLANNER/
│
├── backend/
│   ├── ai_engine/
│   ├── planning/
│   ├── routes/
│   ├── voice/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   └── schemas.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── data/
├── tests/
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── run.bat
└── run_app.bat
```

---

## 10. Academic Mini-Capstone Verification Checklist

- [x] Demonstrates AI concepts beyond basic prompt-based interactions.
- [x] Implements explainable mathematical task prioritization.
- [x] Provides constraint-based daily timetable scheduling.
- [x] Supports adaptive schedule rescheduling.
- [x] Includes an AI chatbot.
- [x] Includes a voice assistant with "Hey Planner" wake phrase support.
- [x] Supports natural language task intake.
- [x] Uses persistent SQLite storage.
- [x] Integrates a locally running LLM through Ollama.
- [x] Features a Dark Red and Warm Beige user interface.
- [x] Includes automated tests and comparative algorithm evaluation.

---

## 11. Future Enhancements

Potential improvements include:

- Cloud synchronization across multiple devices.
- Mobile application support.
- Advanced voice interaction and multilingual support.
- Improved predictive task recommendations.
- Calendar integration.
- Personalized productivity analytics.
- More advanced AI-driven scheduling strategies.

---

## 12. Conclusion

AI Planner demonstrates how Artificial Intelligence, mathematical decision-making, natural language processing, and intelligent scheduling can be combined to create a practical personal planning assistant.

By integrating explainable task prioritization, automated timetable generation, adaptive rescheduling, conversational AI, and voice interaction, the project aims to make everyday task management more efficient, organized, and intelligent.

**AI PLANNER – Plan Smarter. Work Better. Achieve More.**

---

**GitHub Repository:** https://github.com/Rithwik-Papolu/AI_PLANNER