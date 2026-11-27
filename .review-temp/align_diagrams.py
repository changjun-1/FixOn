from pathlib import Path
from docx import Document
from zipfile import ZipFile
import hashlib

root=Path.cwd()
original=Path('C:/Users/USER/OneDrive/Documents/카카오톡 받은 파일/프로젝트계획서_조번호조노창준정준영_수정본.docx')
previous=root/'프로젝트계획서_조번호조노창준정준영_검토반영본.docx'
output=root/'프로젝트계획서_조번호조노창준정준영_기존설계반영본.docx'
doc=Document(previous)
src=Document(original)
for p in doc.paragraphs:
    if p.text.startswith('유스케이스 설명:') or p.text.startswith('클래스 구조 설명:'):
        prefix=p.text.split(':',1)[0]+':'
        p.text=next(q.text for q in src.paragraphs if q.text.startswith(prefix))
    elif p.text.startswith('1) 서비스의 핵심 흐름'):
        p.text='1) 서비스의 핵심 흐름\n[스크린샷 선택 및 일괄 등록] → [AI 내용 분석 및 자동 분류] → [키워드 검색·묶음 확인] → [원본 비교·분류 및 추출 정보 수정]\n사용자는 등록한 스크린샷의 분석 결과를 조회하고 필요한 정보를 수정할 수 있다.\n\n2) 같은 내용 묶음 확인\n같은 내용을 담은 것으로 분류된 캡처 묶음을 확인하고 원본 이미지를 비교한다. 음악 캡처는 곡명·가수 목록과 관련 원본을 함께 확인하는 대표 사용 사례로 활용한다. 도식의 ‘묶음 해제·대표 캡처 선택’은 사용자가 원본 비교 후 수행하는 선택 기능으로 설명하며, 별도의 기능이나 데이터 구조를 추가하지 않는다.\n\n3) 스크린샷 기본 분류 체계'
    elif p.text.startswith('Next.js 서버는 사용자 세션'):
        p.text='Next.js 서버는 사용자 세션과 업로드 파일의 형식·용량을 검증한 뒤 원본 이미지를 비공개 Supabase Storage에 저장한다. 분석 대상 이미지를 Gemini API로 전달하고 반환된 분류와 추출 정보의 형식을 검증하여 Supabase PostgreSQL에 기록한다. 확인하기 어려운 정보는 ‘정보 확인 필요’로 표시한다. 저장된 캡처와 분석 결과를 바탕으로 검색, 같은 내용 묶음 확인 및 원본 비교 화면을 제공한다.'
doc.save(output)
with ZipFile(original) as a, ZipFile(output) as b:
    images=[n for n in a.namelist() if n.startswith('word/media/')]
    assert all(a.read(n)==b.read(n) for n in images)
    assert b.testzip() is None
for prefix in ('유스케이스 설명:', '클래스 구조 설명:'):
    assert next(p.text for p in doc.paragraphs if p.text.startswith(prefix))==next(p.text for p in src.paragraphs if p.text.startswith(prefix))
print('Verified original diagram images and design descriptions preserved; DOCX archive valid.')
print(output.name)
