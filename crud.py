from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas


def get_folders(db: Session):
    folders = db.query(models.Folder).order_by(models.Folder.created_at).all()
    result = []
    for folder in folders:
        quiz_count = (
            db.query(func.count(models.Quiz.id))
            .filter(models.Quiz.folder_id == folder.id)
            .scalar()
        )
        result.append(
            schemas.FolderInfo(
                id=folder.id,
                name=folder.name,
                created_at=folder.created_at,
                quiz_count=quiz_count,
            )
        )
    return result


def get_folder(db: Session, folder_id: int):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        return None
    quiz_count = (
        db.query(func.count(models.Quiz.id))
        .filter(models.Quiz.folder_id == folder_id)
        .scalar()
    )
    return schemas.FolderInfo(
        id=folder.id,
        name=folder.name,
        created_at=folder.created_at,
        quiz_count=quiz_count,
    )


def create_folder(db: Session, folder: schemas.FolderCreate):
    db_folder = models.Folder(name=folder.name)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder


def delete_folder(db: Session, folder_id: int):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if folder:
        db.delete(folder)
        db.commit()
    return folder


def get_quizzes_by_folder(db: Session, folder_id: int):
    quizzes = (
        db.query(models.Quiz)
        .filter(models.Quiz.folder_id == folder_id)
        .order_by(models.Quiz.created_at)
        .all()
    )
    result = []
    for quiz in quizzes:
        question_count = (
            db.query(func.count(models.Question.id))
            .filter(models.Question.quiz_id == quiz.id)
            .scalar()
        )
        result.append(
            schemas.QuizSummary(
                id=quiz.id,
                folder_id=quiz.folder_id,
                title=quiz.title,
                description=quiz.description,
                created_at=quiz.created_at,
                question_count=question_count,
            )
        )
    return result


def _add_quiz(db: Session, quiz: schemas.QuizCreate, folder_id: int):
    """퀴즈와 문제/보기를 세션에 추가만 하고 commit은 호출한 쪽에서 한다."""
    db_quiz = models.Quiz(
        folder_id=folder_id, title=quiz.title, description=quiz.description
    )
    db.add(db_quiz)
    db.flush()

    for i, q_data in enumerate(quiz.questions):
        db_question = models.Question(
            quiz_id=db_quiz.id,
            question_text=q_data.question_text,
            order_num=q_data.order_num if q_data.order_num else i,
        )
        db.add(db_question)
        db.flush()

        for j, c_data in enumerate(q_data.choices):
            db_choice = models.Choice(
                question_id=db_question.id,
                choice_text=c_data.choice_text,
                is_correct=c_data.is_correct,
                order_num=c_data.order_num if c_data.order_num else j,
            )
            db.add(db_choice)

    return db_quiz


def create_quiz(db: Session, quiz: schemas.QuizCreate, folder_id: int):
    db_quiz = _add_quiz(db, quiz, folder_id)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz


def create_quizzes_bulk(db: Session, quizzes: list[schemas.QuizCreate], folder_id: int):
    try:
        db_quizzes = [_add_quiz(db, quiz, folder_id) for quiz in quizzes]
        db.commit()
    except Exception:
        db.rollback()
        raise
    return schemas.QuizBulkResult(
        created=len(db_quizzes), ids=[q.id for q in db_quizzes]
    )


def get_quiz_with_questions(db: Session, quiz_id: int):
    return db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()


def delete_quiz(db: Session, quiz_id: int):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if quiz:
        db.delete(quiz)
        db.commit()
    return quiz
