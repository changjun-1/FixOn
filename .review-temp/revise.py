from docx import Document
from docx.shared import Pt
from pathlib import Path
import re

src=Path('C:/Users/USER/OneDrive/Documents/카카오톡 받은 파일/프로젝트계획서_조번호조노창준정준영_수정본.docx')
out=Path.cwd()/'프로젝트계획서_조번호조노창준정준영_검토반영본.docx'
doc=Document(src)
for p in doc.paragraphs:
    t=p.text
    if t.startswith('CaptureDo(캡처두)는'):
        p.text='CaptureDo(캡처두)는 스크린샷을 AI로 내용별 분류하고, 저장한 정보를 검색하거나 같은 내용을 담은 캡처를 비교하도록 돕는 서비스이다. 서비스 대상은 일상에서 스크린샷을 저장하고 다시 찾는 사용자이다.\n\n■ 핵심 가치\n쌓여 있는 스크린샷을 손쉽게 정리하고, 저장해 둔 정보를 필요할 때 다시 찾는다.\n\n■ 최종 목표와 초기 구현 범위\n최종적으로 사용자가 허용한 범위에서 기존·신규 스크린샷을 자동으로 가져와 분석·분류하는 서비스를 지향한다. 초기 웹 시제품에서는 사용자가 선택한 스크린샷을 일괄 등록하는 방식으로 구현한다. 자동 가져오기와 신규 스크린샷 감지는 Android와 iOS의 사진 접근 권한 및 구현 가능성을 검토하여 후속 단계에 반영한다.\n초기 시제품은 9개 항목 분류, 내용 검색, 같은 내용 묶기, 분석 결과 수정, 곡명·가수 목록화를 제공한다. 음악 캡처를 대표 사용 사례로 검증하되 서비스 대상을 음악 이용자에 한정하지 않는다.\n정리 후보 추천·삭제, 장소·행사·영수증 상세 정보 정리, 사용자가 미확인으로 표시한 항목 다시 보기는 확장 기능으로 구분한다. 초기 웹 시제품에서는 휴대폰 갤러리 원본을 삭제하지 않는다.'
    elif t.startswith('1) 서비스의 핵심 흐름'):
        p.text='1) 서비스의 핵심 흐름\n[스크린샷 선택 및 일괄 등록] → [AI 내용 분석 및 자동 분류] → [키워드 검색·묶음 확인] → [원본 비교·분류 및 추출 정보 수정]\n사용자는 등록한 스크린샷의 분석 결과를 조회하고 필요한 정보를 수정한다. 하나의 캡처가 여러 주제에 해당하면 복수의 카테고리를 부여한다.\n\n2) 같은 내용 묶기\n동일하거나 유사한 이미지의 중복과 서로 다른 화면에 담긴 동일 대상의 중복을 구분한다. 초기 시제품에서는 음악 캡처의 곡명·가수 정보를 정규화하여 같은 곡의 묶음 후보를 제안한다. 정보가 부족하거나 일치 여부가 불분명하면 확정하지 않고 사용자 확인 대상으로 표시한다. 사용자는 원본을 비교하고 묶음을 해제하거나 대표 캡처를 변경할 수 있다. 묶음 제안만으로 캡처를 자동 삭제하지 않는다.\n\n3) 스크린샷 기본 분류 체계'
    elif t.startswith('- 검색·정리 부담 감소:'):
        p.text='- 검색·정리 부담 감소: 자동 분류와 키워드 검색을 통해 많은 캡처 중 필요한 정보를 다시 찾고 정리하는 부담을 줄일 것으로 기대한다. 기존 갤러리와 동일한 검색 과제를 수행하여 소요 시간과 검색 성공률을 비교한다.\n- 저장 정보의 재활용: 음악 캡처는 곡명·가수 목록으로, 장소 캡처는 여행 및 약속 장소 탐색에, 정보·자료 캡처는 학습 자료 재검색에 활용할 수 있다. 일정 상세 정리와 영수증 지출 관리는 확장 단계에서 검증한다.\n- 사용자 통제와 정보 신뢰성: 사용자가 원본과 분석 결과를 함께 확인하고 오분류·추출 오류·잘못된 묶음을 수정하도록 한다. 확인할 수 없는 정보는 임의 생성하지 않는다.\n- 중복 정보 관리: 같은 내용을 담은 캡처를 묶어 비교함으로써 반복 저장된 정보를 확인하기 쉽게 한다. 초기 웹의 서비스 데이터 정리 효과를 휴대폰 저장 공간 확보 효과로 단정하지 않는다.\n- 지속 활용: 첫 정리 이후 신규 캡처를 다시 등록하고 저장 정보를 재검색할 의향을 사용성 테스트와 후속 인터뷰로 확인한다.'
    elif t.startswith('Next.js 서버는 사용자 세션'):
        p.text='Next.js 서버는 사용자 세션과 업로드 파일의 형식·용량을 검증한 뒤 원본 이미지를 비공개 Supabase Storage에 저장한다. 분석 대상 이미지를 Gemini API로 전달하고 반환된 분류와 추출 정보의 형식을 검증하여 Supabase PostgreSQL에 기록한다. 확인하기 어려운 정보는 ‘정보 확인 필요’로 표시한다. 같은 내용 묶기는 서버에서 저장된 곡명·가수 정보를 비교하여 후보를 생성하고, 사용자에게 원본 비교와 묶음 수정 기능을 제공한다.'
    elif t.startswith('Supabase Auth는 로그인'):
        p.text='Supabase Auth는 로그인과 세션 관리를 담당한다. 데이터베이스와 저장소에는 사용자별 접근 정책을 적용하고 원본 조회에는 임시 서명 URL을 사용한다. API 키는 서버에서 관리하며, 외부 AI로 이미지가 전송되는 목적과 처리 범위를 사용자에게 사전 안내한다. 초기 웹은 사용자가 선택한 스크린샷을 등록하고, 자동 가져오기와 신규 캡처 감지는 후속 구현 범위로 검토한다. 업로드·분석에 실패한 항목은 실패 상태를 표시하고 재시도를 지원한다.'
    elif t.startswith('유스케이스 설명:'):
        p.text=t+' 기본 기능과 확장 기능은 구현 범위를 구분하여 평가하며, 그림의 정리 후보·영수증·일정 정리·다시 보기 기능을 초기 완성 기능으로 간주하지 않는다. 인증된 사용자는 본인의 캡처와 분석 결과만 조회·수정한다.'
    elif t.startswith('클래스 구조 설명:'):
        p.text=t+' 캡처와 카테고리는 다대다 관계로 관리하고, 묶음은 대표 캡처 식별자와 소속 캡처를 관리한다. 묶음 변경 시 대표 캡처가 해당 묶음에 속하는지 검증한다. 캡처의 사용자 확인 상태와 분석 결과의 정보 누락 상태는 독립적으로 저장하며, 사용자의 정보 수정 내용은 조회 결과에 반영한다.'

for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                if re.search(r'\s*\[(3|6|7)\]',p.text):
                    for run in p.runs: run.text=re.sub(r'\s*\[(3|6|7)\]','',run.text)
                for run in p.runs:
                    run.text=run.text.replace('스크린샷 이미지 원본 안전 보관 및 자동 CDN 서명 URL 제공','비공개 원본 보관 및 임시 서명 URL을 통한 조회').replace('Next.js 최적화 무중단 서버리스 배포 파이프라인','Next.js 애플리케이션 배포 및 변경사항 빌드·검증 자동화')
    if table.rows[0].cells[0].text=='구분' and any('Google Photos' in c.text for row in table.rows for c in row.cells):
        row=table.add_row()
        values=['국내 사진 관리','네이버 MYBOX','테마·인물·장소 기반 사진 검색 제공','스크린샷의 추출 정보 검색 및 동일 곡 묶음 이용 동선','사진 검색과 캡처 정보 목록화·원본 비교의 사용 경험 비교']
        for c,v in zip(row.cells,values): c.text=v
        # Copy established table formatting for the added comparison row.
        from copy import deepcopy
        for dest,source in zip(row.cells,table.rows[-2].cells):
            old=dest._tc.tcPr
            if old is not None: dest._tc.remove(old)
            dest._tc.insert(0,deepcopy(source._tc.tcPr))

# Cite the newly checked domestic example in place without adding a bibliography chapter.
for p in doc.paragraphs:
    if p.text=='3. 프로젝트 설계' and p._p.getprevious() is not None and p._p.getprevious().tag.endswith('tbl'):
        q=p.insert_paragraph_before('국내 사례 확인 자료: 네이버 MYBOX 고객센터 「사진 검색 기능 소개」, https://help.naver.com/service/5594/contents/2251?osType=PC (확인일 2026. 11. 23.).')
        for run in q.runs: run.font.size=Pt(9)
doc.save(out)
print(out)
