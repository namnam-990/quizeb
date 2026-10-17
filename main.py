import sys
import io

if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import engine, get_db
import models
import schemas
import crud
from gemini import get_explanation

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Quiz App")

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/folder/{folder_id}")
async def folder_page(folder_id: int):
    return FileResponse("static/folder.html")


@app.get("/quiz/{quiz_id}")
async def quiz_page(quiz_id: int):
    return FileResponse("static/quiz.html")


@app.get("/admin")
async def admin_page():
    return FileResponse("static/admin.html")


# --- Folder API ---

@app.get("/api/folders")
def get_folders(db: Session = Depends(get_db)):
    return crud.get_folders(db)


@app.get("/api/folders/{folder_id}")
def get_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = crud.get_folder(db, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return folder


@app.post("/api/folders", status_code=201)
def create_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db)):
    return crud.create_folder(db, folder)


@app.delete("/api/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    result = crud.delete_folder(db, folder_id)
    if not result:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder deleted"}


# --- Quiz API ---

@app.get("/api/folders/{folder_id}/quizzes")
def get_quizzes(folder_id: int, db: Session = Depends(get_db)):
    return crud.get_quizzes_by_folder(db, folder_id)


@app.post("/api/folders/{folder_id}/quizzes", status_code=201)
def create_quiz(folder_id: int, quiz: schemas.QuizCreate, db: Session = Depends(get_db)):
    folder = crud.get_folder(db, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return crud.create_quiz(db, quiz, folder_id)


@app.post(
    "/api/folders/{folder_id}/quizzes/bulk",
    status_code=201,
    response_model=schemas.QuizBulkResult,
)
def create_quizzes_bulk(
    folder_id: int, data: schemas.QuizBulkCreate, db: Session = Depends(get_db)
):
    folder = crud.get_folder(db, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return crud.create_quizzes_bulk(db, data.quizzes, folder_id)


@app.get("/api/quizzes/{quiz_id}", response_model=schemas.Quiz)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = crud.get_quiz_with_questions(db, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@app.delete("/api/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    result = crud.delete_quiz(db, quiz_id)
    if not result:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"message": "Quiz deleted"}


# --- Gemini Explanation API ---

@app.post("/api/explain", response_model=schemas.ExplainResponse)
async def explain(request: schemas.ExplainRequest):
    try:
        explanation = get_explanation(
            request.question_text,
            request.correct_answer,
            request.selected_answer,
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
