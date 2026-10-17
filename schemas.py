from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List
from datetime import datetime


class ChoiceCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    choice_text: str = Field(min_length=1)
    is_correct: bool
    order_num: int = 0


class Choice(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    choice_text: str
    is_correct: bool
    order_num: int


class QuestionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question_text: str = Field(min_length=1)
    order_num: int = 0
    choices: List[ChoiceCreate] = Field(min_length=2)

    @model_validator(mode="after")
    def check_has_correct(self):
        if not any(c.is_correct for c in self.choices):
            raise ValueError("정답(is_correct: true)인 보기가 최소 1개 필요합니다.")
        return self


class Question(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    question_text: str
    order_num: int
    choices: List[Choice] = []


class QuizCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1)
    description: Optional[str] = None
    questions: List[QuestionCreate] = Field(min_length=1)


class QuizBulkCreate(BaseModel):
    quizzes: List[QuizCreate] = Field(min_length=1)


class QuizBulkResult(BaseModel):
    created: int
    ids: List[int]


class Quiz(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folder_id: int
    title: str
    description: Optional[str] = None
    created_at: datetime
    questions: List[Question] = []


class QuizSummary(BaseModel):
    id: int
    folder_id: int
    title: str
    description: Optional[str] = None
    created_at: datetime
    question_count: int = 0


class FolderCreate(BaseModel):
    name: str


class FolderInfo(BaseModel):
    id: int
    name: str
    created_at: datetime
    quiz_count: int = 0


class ExplainRequest(BaseModel):
    question_text: str
    correct_answer: str
    selected_answer: str


class ExplainResponse(BaseModel):
    explanation: str
