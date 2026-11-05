
from sqlalchemy import text
from backend.database import engine

try:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    print("Database connection successful!")
    print("AI Planner database is ready.")

except Exception as e:
    print("Database connection failed:", e)
