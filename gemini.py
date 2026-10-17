import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def get_explanation(question_text: str, correct_answer: str, selected_answer: str) -> str:
    if not GEMINI_API_KEY:
        return "Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 설정해주세요."

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""다음 퀴즈 문제에 대한 해설을 한국어로 작성해주세요.

문제: {question_text}

선택한 답(오답): {selected_answer}
정답: {correct_answer}

다음 내용을 포함해서 설명해주세요:
1. 선택한 답이 틀린 이유
2. 관련된 핵심 개념 설명

최대한 간결하게 설명해주세요."""

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
    )
    return response.text
