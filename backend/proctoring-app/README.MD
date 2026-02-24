# Proctoring System

| Steps           | Commands                             |
| --------------- | ------------------------------------ |
| Install uv venv | `pip install uv`                     |
| create venv     | `uv venv`                            |
| Activate venv   | `source .venv/Scripts/activate`      | In Terminal: .venv\Scripts\Activate.ps1
| Install deps    | `uv pip install -r requirements.txt` |
| Run the app     | `uvicorn app.main:app --reload`      |
| Deactivate venv | `deactivate`                         |
