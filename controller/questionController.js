import { updateText, translations, currentLang  } from '../services/localization.js';

const BASE_URL = config.BASE_URL;

//문제 생성
export async function generateQuestions(problemText = ocrResult) {
    const apiUrl = `${BASE_URL}/api/workbook/processText`;
    const questionGenerationDiv = document.getElementById('question-generation');

    console.log(localStorage.getItem('preferredLang'));

    // 로컬 스토리지에서 저장된 언어 값을 가져옴 (기본값은 'korean'으로 설정)
    const storedLanguage = localStorage.getItem("preferredLang") || "korean";

    // 언어 값을 API에서 요구하는 형식으로 변환 (필요하면 여기서 추가 매핑 가능)
    const languageMapping = {
        ko: "Korea",
        en: "English",
        lo: "Thai"
    };
    const apiLanguage = languageMapping[storedLanguage] || "korean";
    console.log('api에 들어간 언어 :', apiLanguage);

    showLoadingMessage();
    
    try {
        const response = await axios.post(
            apiUrl,
            { problemText: problemText} ,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    language: apiLanguage //수정해야됨
                }
            }
        );
        console.log('문제 생성 응답:', response.data);

        const result = response.data;
        //쿠키에 wb_id 저장
        const wb_id = result.message.wb_id;
        if (wb_id) {
            document.cookie = `wb_id=${wb_id}; path=/; max-age=3600`;
            console.log('wb_id 쿠키에 저장되었습니다:', wb_id);
        }
        displayGeneratedQuestions(result);
    } catch (error) {
        console.error('문제 생성 중 오류 발생:', error);
        questionGenerationDiv.innerHTML = 
        `<h2>문제 생성 실패</h2>
            <p>오류가 발생했습니다: ${error.response?.data?.message || error.message}</p>`
        ;
    }

    // 강제로 generate-section 표시
    const generateSection = document.getElementById('generate-section');
    if (generateSection) {
        generateSection.style.display = 'block';
    } else {
        console.error('generate-section을 찾을 수 없습니다.');
    }
}

export async function showLoadingMessage() {
    const questionGenerationDiv = document.getElementById('question-generation');
    questionGenerationDiv.innerHTML = `
        <div class="loading-message" >
            <h2 data-i18n="문제 생성 중...">문제 생성 중...</h2>
            <div class="spinner"></div>
            <p data-i18n="잠시만 기다려 주세요.">잠시만 기다려 주세요.</p>
        </div>
    `;
    updateText(); // 번역 적용
}

// 버튼 생성 함수 (pdf 저장 및 문제 재생성 버튼)
export function createButton(label, onClick, customStyle = '') {
    const button = document.createElement('button');
    button.setAttribute('data-i18n', label); // 번역 키 추가
    button.textContent = translations[currentLang][label] || label; // 번역된 텍스트 설정
    button.style = `
        padding: 10px 20px;
        margin: 0 10px;
        font-size: 16px;
        color: #fff;
        background-color: #486284;
        border: none;
        border-radius: 5px;
        font-family: 'Pretendard';
        cursor: pointer;
        ${customStyle}
    `;
    button.onclick = onClick;
    return button;
}

// HTML 요소 생성
function createDivElement(className, innerHTML = '') {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = innerHTML;
    return div;
}

// 문제 HTML 생성 (이미지 문제 + 텍스트 문제)
export function generateCombinedQuestionsHTML(questions) {
    return questions.map(q => {
        if (q.type === 'image') {
            return `<div class="question">
                    <p style="white-space: pre-wrap;">${q.question}</p> 
                    <img src="${q.imageUrl}" alt="문제 이미지" class="question-image">
                    </div>`;
        } else if (q.type === 'text') {
        return `<div class="question">
                    <p style="white-space: pre-wrap;">${q.question}</p> 
                </div>`;
        }
    }).join('');
}

// 답안 HTML 생성
export function generateAnswersHTML(answers) {
    return `
        <div class="answer-item">
            <p style="white-space: pre-wrap;">${answers}</p> 
        </div>
    `;
}

const imageCache = new Map();

function cacheImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function getImage(url) {
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url));
  }
  return cacheImage(url);
}

// 문제 및 답안 표시
export async function displayGeneratedQuestions(response) {
    console.log('displayGeneratedQuestions 함수 시작', JSON.stringify(response, null, 2));

    const questionGenerationDiv = document.getElementById('question-generation');
    if (!questionGenerationDiv) {
        console.error('question-generation 요소를 찾을 수 없습니다.');
        return;
    }

    questionGenerationDiv.innerHTML = '<h2 data-i18n="생성된 문제">생성된 문제</h2>';
    updateText(); // 번역 함수 호출

    if (response?.message) {
        const { question: questionText = '', answer: answerText = '', imageQuestions = [], textQuestions = '' } = response.message;

        // 이미지 캐싱 처리
        const imagePromises = imageQuestions.map(q => getImage(q.imageUrl));

        try {
            await Promise.all(imagePromises);
            console.log('모든 이미지 캐싱이 완료되었습니다.');

            // 이미지 문제와 텍스트 문제를 합침
            const combinedQuestions = [
                ...imageQuestions.map(q => ({ type: 'image', question: q.question, imageUrl: q.imageUrl })),
                ...(textQuestions ? [{ type: 'text', question: textQuestions }] : [])
            ];

            //문제 생성 탭 html
            const questionsHTML = generateCombinedQuestionsHTML(combinedQuestions);
            const answersHTML = generateAnswersHTML(answerText);

            const contentDiv = createDivElement('question-content', `
                <div class="questions">${questionsHTML}</div>
                <div class="answers">${answersHTML}</div>
            `);

            questionGenerationDiv.appendChild(contentDiv);
            console.log('문제 및 답변 HTML 생성 완료');

            // 버튼 컨테이너 및 버튼 생성
            const buttonContainer = createDivElement('button-container');
            buttonContainer.style.textAlign = 'center';
            buttonContainer.style.marginTop = '20px';

            // PDF 저장 버튼
            const savePDFButton = createButton('PDF로 저장', () => { 
                const wb_id = getCookie('wb_id');
                saveToPdf(wb_id);
                alert(translations[currentLang]['PDF 파일이 성공적으로 저장되었습니다. 보관함에서 확인해 보세요!'] || 'PDF 파일이 성공적으로 저장되었습니다. 보관함에서 확인해 보세요!');
            });

            // 문제 재생성 버튼
            const regenerateButton = createButton('문제 재생성', regenerateQuestions);

            buttonContainer.appendChild(savePDFButton);
            buttonContainer.appendChild(regenerateButton);
            questionGenerationDiv.appendChild(buttonContainer);

        } catch (error) {
            console.error('이미지 로딩 중 오류 발생:', error);
            questionGenerationDiv.innerHTML += '<p>이미지 로딩 중 오류가 발생했습니다.</p>';
        }
    } else {
        questionGenerationDiv.innerHTML += '<p>유효하지 않은 응답입니다.</p>';
    }

    console.log('displayGeneratedQuestions 함수 종료');
}

//쿠키에 저장된 wb_id 불러오는 함수
function getCookie(wb_id) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${wb_id}=`);
    if (parts.length === 2) {
        const result = parts.pop().split(';').shift();
        console.log('Cookie result:', result);
        return result;
    }
    console.log('Cookie not found');
    return null;
}

// PDF 생성 함수( 문제집 + 답안지 각각 생성 )
export function saveToPdf(wb_id) {
    const questionElement = document.querySelector('.questions');
    const answerElement = document.querySelector('.answers');

    if (!questionElement || !answerElement) {
        console.error('PDF 저장 대상 요소를 찾을 수 없습니다.');
        return;
    }

    // pdf 공통 옵션 설정
    const commonOpt = {
        margin: 8,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            onclone: (documentClone) => {
                const images = documentClone.querySelectorAll('.img');
                images.forEach(img => {
                    img.onerror = () => {
                        console.warn(`이미지 로드 실패: ${img.src}`);
                        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/ebM1PAAAAAASUVORK5CYII=';
                    };
                });
                // 긴 텍스트 분할 설정
                const questionsAndAnswers = documentClone.querySelectorAll('.questions, .answers');
                questionsAndAnswers.forEach(el => {
                    el.style.overflow = 'hidden';
                    el.style.wordBreak = 'break-word';
                    el.style.pageBreakInside = 'avoid';
                    el.style.pageBreakBefore = 'auto';
                });
            }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], after: '.page-break' } // 페이지 넘침을 처리하는 옵션
    };

    function addPageBreaks(element) {
        const maxHeight = 1600;
        let currentHeight = 0;

        // 각 질문/답변 요소를 순회하며 페이지 넘침 처리
        element.querySelectorAll('.question, .answer').forEach(item => {
            const itemHeight = item.offsetHeight;

            if (currentHeight + itemHeight > maxHeight) {
                const pageBreak = document.createElement('div');
                pageBreak.classList.add('page-break');
                item.parentNode.insertBefore(pageBreak, item);
                currentHeight = 0;
            }

            currentHeight += itemHeight;
        });
    }

    //이미지 문제 두개씩 출력하는 함수
    function addPageBreaksForImageQuestions(element) {
        let imageQuestionCount = 0;
        const imageQuestions = Array.from(element.querySelectorAll('.question img')).map(img => img.parentElement);
    
        // 이미지 기반 문제 두 개마다 페이지 나누기 추가
        imageQuestions.forEach((item, index) => {
          if (index % 2 === 0 && index !== 0) {
            const pageBreak = document.createElement('div');
            pageBreak.classList.add('page-break');
            item.parentNode.insertBefore(pageBreak, item);
          }
        });
      }
    

    // PDF 생성 함수
    function generatePDF() {
        
        // 이미지 문제 두 개씩 페이지 구분 처리
        addPageBreaksForImageQuestions(questionElement);

        // 페이지 넘침 처리
        addPageBreaks(questionElement);
        addPageBreaks(answerElement);

        // 문제집 PDF 생성
        const questionOpt = {
            ...commonOpt,
            filename: `문제집_문제_${wb_id}.pdf`,
        };
        const questionPromise = html2pdf().set(questionOpt).from(questionElement).toPdf().output('blob');

        // 정답지 PDF 생성
        const answerOpt = {
            ...commonOpt,
            filename: `문제집_답안_${wb_id}.pdf`,
        };
        const answerPromise = html2pdf().set(answerOpt).from(answerElement).toPdf().output('blob');

        Promise.all([questionPromise, answerPromise])
            .then(async ([questionBlob, answerBlob]) => {
                console.log(`문제집_문제_${wb_id}.pdf 생성 완료`);
                console.log(`문제집_답안_${wb_id}.pdf 생성 완료`);

                // Blob을 File 객체로 변환
                const questionFile = new File([questionBlob], `문제집_문제_${wb_id}.pdf`, { type: 'application/pdf' });
                const answerFile = new File([answerBlob], `문제집_답안_${wb_id}.pdf`, { type: 'application/pdf' });

                // PDF 서버로 업로드
                await uploadQuestion(wb_id, questionFile);
                await uploadAnswer(wb_id, answerFile);

            })
            .catch(error => {
                console.error('PDF 생성 중 오류 발생:', error);
            });
    }
    generatePDF();
}

// 문제집 PDF 서버로 업로드하는 함수
export async function uploadQuestion(wb_id, file) {
    try {
        // FormData 생성
        const formData = new FormData();
        formData.append('wb_id', wb_id);
        formData.append('file', file);

        const response = await axios.post(`${BASE_URL}/api/workbook/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log(`문제집_문제_${wb_id}.pdf 업로드 완료`, response.data);
    } catch (error) {
        console.error(`문제집_문제_${wb_id}.pdf 업로드 실패:`, error);
    }
}

// 답안지 PDF 서버로 업로드하는 함수
export async function uploadAnswer(wb_id, file) {
    try {
        // FormData 생성
        const formData = new FormData();
        formData.append('wb_id', wb_id);
        formData.append('file', file);

        const response = await axios.post(`${BASE_URL}/api/workbook/answer/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log(`문제집_답안_${wb_id}.pdf 업로드 완료`, response.data);
    } catch (error) {
        console.error(`문제집_답안_${wb_id}.pdf 업로드 실패:`, error);
    }
}


// 문제 재생성 함수 
export async function regenerateQuestions() {
    const apiUrl = `${BASE_URL}/api/workbook/retext`;
    const questionGenerationDiv = document.getElementById('question-generation');
    
    try {
        questionGenerationDiv.style.display = 'block';
        showLoadingMessage();

        // 문제 재생성 api 호출
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 응답 확인 및 처리
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('서버 응답:', JSON.stringify(data, null, 2));
        handleRegenerationResponse(data, questionGenerationDiv);
    } catch (error) {
        console.error('문제 재생성 중 오류 발생:', error);
        handleRegenerationError(error, questionGenerationDiv);
    }
}

    //응답 처리 함수
    function handleRegenerationResponse(response, targetElement) {
        console.log('전체 응답:', response);
        if (response && response.message) {
            console.log('문제 재생성 응답:', response.message);
            displayGeneratedQuestions(response);
        } else {
            console.error('유효하지 않은 응답 구조:', response);
            targetElement.innerHTML = '<p data-i18n="문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.">문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.</p>';
            alert(translations[currentLang]['문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.'] || '문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.'); //번역 적용
        }
    }    

    //오류 처리 함수
    function handleRegenerationError(error, targetElement) {
        console.error('문제 재생성 API 호출 중 오류 발생:', error);
        targetElement.innerHTML = `<p data-i18n="문제 재생성 중 오류가 발생했습니다">문제 재생성 중 오류가 발생했습니다: ${error.message}</p>`;
        alert(translations[currentLang]['문제 재생성 중 오류가 발생했습니다'] || '문제 재생성 중 오류가 발생했습니다'); //번역 적용
    }