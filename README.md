# AI PLANNER – Intelligent Personal Planning and Decision-Making Agent

An academic AI Mini-Capstone project demonstrating genuine Artificial Intelligence concepts, explainable multi-factor decision algorithms, constraint-satisfaction scheduling, adaptive drift rescheduling, natural language understanding, and multimodal voice interaction.

---

## 1. Project Overview & Problem Statement

Conventional task managers operate as passive, dumb digital to-do lists. They require users to manually order items, fail to account for cognitive work capacity, lack understanding of task dependencies, and offer zero causal explanation for what a user should tackle next.

**AI Planner** transforms personal planning into an active, intelligent partner. Built with a luxurious **Dark Red and Warm Beige** visual identity, it combines:
- **Transparent Mathematical Prioritization**: Eliminates opaque "black-box" LLM scoring in favor of an explainable weighted multi-factor decision model.
- **Constraint-Based Daily Timetable Scheduling**: Uses greedy interval scheduling to guarantee non-overlapping work blocks, mandatory cognitive rest breaks, and lunch windows within customizable working hours.
- **Adaptive Drift Rescheduling**: Dynamically detects schedule delays, urgent task arrivals, or missed milestones and reorganizes future blocks while strictly preserving finished milestones.
- **Multimodal AI Interaction**: Unified central intelligence engine powering both an **AI Chatbot** and a hands-free **AI Voice Assistant** activated by the wake phrase **"Hey Planner"**.
- **100% Zero-Cost Operation**: Runs entirely locally using free, open-source software (FastAPI, SQLite, React, Tailwind CSS, Ollama with Llama 3.2, and local STT/TTS).

---

## 2. System Architecture

Both the conversational chatbot and the voice assistant interface with a unified, centralized planning engine:

```
                      +---------------------------------------+
                      |       USER INTERACTION LAYER          |
                      |  Text Input  |  Voice: "Hey Planner"  |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |         SPEECH PIPELINE (VOICE)       |
                      |  Wake Word Detection -> STT Engine    |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |      NATURAL LANGUAGE UNDERSTANDING   |
                      |   Intent Recognition & Entity Parser  |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |      CENTRAL AI PLANNING ENGINE       |
                      |   Multi-Factor Priority Engine        |
                      |   Greedy Interval Scheduler           |
                      |   Adaptive Rescheduler                |
                      |   Ollama Llama 3.2 + Local Fallback   |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |      PERSISTENT STORAGE (SQLITE)      |
                      |  Tasks, Timetables, Preferences,      |
                      |  History, Reminders, Conversations    |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |        RESPONSE & SPEECH OUTPUT       |
                      |  Structured JSON / Speech Synthesis   |
                      +---------------------------------------+
```

---

## 3. Core AI Concepts & Algorithms

### 3.1 Explainable Multi-Factor Priority Algorithm

Unlike naive apps that rely on LLM hallucinations for prioritization, AI Planner implements an explainable, normalized mathematical scoring formula:

$$\text{Priority Score} = (\text{Importance} \times 0.35) + (\text{Urgency} \times 0.30) + (\text{Deadline Proximity} \times 0.20) + (\text{Time Pressure} \times 0.15)$$

#### Metric Definitions:
1. **Importance ($I \in [0, 100]$)**:
   - High: 100.0 | Medium: 60.0 | Low: 25.0
2. **Urgency ($U \in [0, 100]$)**:
   - Derived from remaining hours until due date:
     - Overdue: 100.0 (with penalty scaling)
     - $\le 6\text{h}$: 95.0
     - $\le 24\text{h}$: 85.0
     - $\le 48\text{h}$: 70.0
     - $\le 7\text{d}$: 45.0
     - $> 7\text{d}$: 20.0
     - No deadline: 30.0 baseline
3. **Deadline Proximity ($D \in [0, 100]$)**:
   - Exponential decay modeling urgency acceleration as deadlines near:
     $$D = 100 \times \exp\left(-\frac{\max(0, \Delta t_{\text{hours}})}{72}\right)$$
4. **Time Pressure ($P \in [0, 100]$)**:
   - Evaluates the ratio between required work duration and remaining available buffer:
     $$P = \min\left(100, \frac{\text{Estimated Duration (hours)}}{\max(0.1, \Delta t_{\text{hours}})} \times 100\right)$$

#### Dependency Awareness & Explainability:
- If Task $B$ depends on Task $A$, Task $B$ cannot be scheduled or recommended until $A$ is completed.
- For every task, the engine provides an exact human-readable causal rationale explaining the weighted factors.

---

### 3.2 Constraint-Satisfaction Daily Timetable Scheduler

The timetable generator implements a **Greedy Interval Scheduling** algorithm subject to domain constraints:
1. **Capacity Bounds**: Respects user working hours (e.g., 09:00 to 18:00).
2. **Mandatory Rest**: Automatically schedules 15-minute breaks after 90 minutes of continuous focus work.
3. **Nutrition Window**: Protects user lunch periods (e.g., 13:00 to 14:00).
4. **Non-Overlapping Blocks**: Guarantees zero time-slot collisions.
5. **Burnout Prevention**: Excess tasks that cannot fit inside the working day are deferred and reported transparently.

---

### 3.3 Adaptive Drift Rescheduling

When life intervenes (a task runs late, an urgent assignment arrives, or a deadline changes), the adaptive rescheduler:
1. Locks completed blocks in place (immutability of history).
2. Computes the causal drift and minimal displacement vector for remaining blocks.
3. Shifts incomplete tasks smoothly into remaining available windows.
4. Outputs an explicit change diff explaining each shift.

---

### 3.4 Natural Language Entity Extraction & Intake

Users can input unstructured requests such as:
> *"Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM."*

The natural language intake:
- Decomposes compound requests into individual tasks.
- Extracts titles, deadlines, durations, and categories.
- Detects missing information and formulates specific clarification prompts.
- Displays an interactive **Preview Modal** before saving, guaranteeing user confirmation.

---

## 4. Empirical Evaluation & Benchmarking

In testing against common baseline approaches under bounded capacity (300 minutes available focus time), AI Planner demonstrated superior decision-making:

| Metric | FIFO Strategy | Earliest Deadline First (EDF) | AI Planner (Weighted Model) |
| :--- | :---: | :---: | :---: |
| **High-Importance Task Completion** | 50% (1/2) | 50% (1/2) | **100% (2/2)** |
| **Urgent Crisis Prevention** | Poor (vulnerable to queue order) | Medium (trapped by trivial short deadlines) | **Optimal (balanced urgency + value)** |
| **Scheduling Conflicts** | Present | Present | **0 (Zero Conflicts)** |
| **Dependency Violations** | Common | Frequent | **0 (Topologically Sorted)** |

---

## 5. Technology Stack & Zero-Cost Architecture

- **Frontend**:
  - React 19 + Vite 6
  - Tailwind CSS 3 (Dark Red & Warm Beige Theme)
  - React Router 7
  - Lucide React (Glossy Classic Icons)
  - Recharts (Interactive Analytics)
- **Backend**:
  - Python 3 + FastAPI
  - SQLAlchemy 2.0 ORM
  - Pydantic v2 validation
  - Uvicorn ASGI server
- **Database**:
  - SQLite (`data/ai_planner.db`) with persistent relational schemas
- **AI Engine**:
  - Ollama integration with `llama3.2` local model
  - Robust deterministic local rule/NLP fallback engine for 100% uptime
- **Voice Technology**:
  - Web Speech Recognition API with wake-word detector ("Hey Planner")
  - Web Speech Synthesis API + backend speech payload formatting

---

## 6. Premium UI/UX Design System

The application features a bespoke **Dark Red and Warm Beige** aesthetic:

| Visual Element | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary Background** | `#F2E8D8` | Warm Beige page canvas |
| **Secondary Background** | `#FAF5EC` | Light Cream soft contrast |
| **Card Surfaces** | `#FFF9F0` | Soft Ivory polished cards |
| **Primary Accent** | `#701C2C` | Deep Wine Red buttons & headers |
| **Secondary Accent** | `#8B2635` | Burgundy badges & active pills |
| **Dark Surfaces** | `#3D111B` | Deep Maroon sidebar & dialog bars |
| **Primary Text** | `#302626` | Dark Charcoal for high readability |
| **Secondary Text** | `#806D65` | Muted Brown for metadata |
| **Highlight Accent** | `#C5A059` | Subtle Antique Gold glows & stars |

---

## 7. Setup & Installation Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.15)
- Node.js 18+ & npm 10+
- Optional: [Ollama](https://ollama.ai) installed locally with `llama3.2` (`ollama run llama3.2`)

---

### Step 1: Clone & Configure Backend

```powershell
# Navigate into repository
cd C:\Users\Rithwik Papolu\Documents\AI-Planner

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install backend dependencies (if not already installed)
pip install -r requirements.txt

# Seed initial academic capstone data into SQLite
python -m backend.seed_data
```

---

### Step 2: Configure & Start Frontend

```powershell
# In a separate terminal, navigate to frontend directory
cd frontend

# Install npm dependencies (if not already installed)
npm install

# Start Vite React development server
npm run dev
```

The frontend will be accessible at: **`http://localhost:3000`**

---

### Step 3: Run FastAPI Backend Gateway

```powershell
# From the project root with .venv activated:
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- API Base URL: **`http://127.0.0.1:8000`**
- Interactive Swagger UI Documentation: **`http://127.0.0.1:8000/docs`**

---

## 8. Running Automated Tests

Run the comprehensive Pytest verification suite:

```powershell
.\.venv\Scripts\python -m pytest tests/ -v
```

All 18 tests will execute and pass:
- `test_priority_engine.py`: Verifies normalization, urgency brackets, decay curve, time pressure, and dependency holds.
- `test_scheduler.py`: Verifies greedy non-overlapping allocations, lunch insertions, and adaptive rescheduling.
- `test_nlp_and_agent.py`: Verifies wake-word detection, relative time parsing, duration extraction, and compound request decomposition.
- `test_api_endpoints.py`: Verifies end-to-end FastAPI CRUD, status transitions, chat, voice, and analytics.
- `test_algorithm_evaluation.py`: Runs the empirical benchmark comparing the Weighted Algorithm against FIFO and EDF.

---

## 9. Academic Mini-Capstone Verification Checklist

- [x] Demonstrates genuine AI concepts beyond simple prompt wrappers.
- [x] Transparent, explainable mathematical priority scoring with complete factor breakdown.
- [x] Conflict-free constraint-based daily interval scheduling.
- [x] Real-time adaptive schedule repair for task overruns and delays.
- [x] Multimodal voice assistant with real "Hey Planner" wake-phrase activation.
- [x] Natural language compound task intake with preview and missing-info clarification.
- [x] Persistent SQLite database with 7 relational models and foreign key enforcement.
- [x] Zero-cost open-source operation with local model integration and offline heuristics.
- [x] Premium Dark Red & Warm Beige UI with glossy classic icons.
- [x] Full Pytest automated test coverage and comparative empirical benchmark.
