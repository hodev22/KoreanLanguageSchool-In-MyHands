import { displayOCRResult } from '../view/Ocr/ocrView.js';
import { activateTab } from './tabController.js';
import { processPDF, handleImageFile } from '../controller/ocrController.js'; // 파일 처리 유틸리티
import { generateQuestions } from './questionController.js'; // 문제 생성 함수 가져오기
import { loadTranslations, translations, currentLang  } from '../services/localization.js';

const BASE_URL = config.BASE_URL;

export async function completeUpload() {
    const files = document.getElementById('file-upload').files;
    if (files.length === 0) {
        alert('업로드할 파일을 선택해 주세요.');
        return;
    }

    displayOCRResult("OCR 처리 중... 조금만 기다려 주세요!");

    const ocrResult = await processFiles(files); // 파일 처리 함수 호출

    // OCR 결과 표시
    document.getElementById('ocr-result').textContent = ocrResult || 'OCR 결과가 없습니다.'; // 결과가 없을 경우 메시지 표시
    activateTab(document.querySelector('.tab[onclick*="convert"]'), 'convert');

    // 문제 생성 버튼 추가
    addGenerateButton(ocrResult); // 문제 생성 버튼 추가 함수 호출
}

// 파일 처리 함수
async function processFiles(files) {
    let ocrResult = ''; // 이전 결과 초기화

    for (let file of files) {
        ocrResult += await processFile(file); // 파일 처리
    }

    return ocrResult; // 최종 결과 반환
}

// 개별 파일 처리 함수(이미지, pdf 파일 처리)
async function processFile(file) {
    if (file.type === 'application/pdf') {
        return await processPDF(file); // PDF 파일 처리
    } else if (file.type.startsWith('image/')) {
        return await handleImageFile(file); // 이미지 파일 처리
    } else {
        alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
        return ''; // 지원하지 않는 파일 형식일 경우 빈 문자열 반환
    }
}

// 문제 생성 버튼 추가 함수
function addGenerateButton(ocrResult) {
    let existingButton = document.getElementById('generate-button');
    if (!existingButton) {
        const generateButton = document.createElement('button');
        generateButton.id = 'generate-button'; // 버튼 ID 추가
        generateButton.setAttribute('data-i18n', '문제 생성'); // 번역 키 추가
        generateButton.textContent = translations[currentLang]['문제 생성'] || '문제 생성'; // 번역된 텍스트 설정
        generateButton.onclick = function() {
            // 문제 생성 탭으로 이동
            activateTab(document.querySelector('.tab[onclick*="generate"]'), 'generate');
            // 로컬 스토리지에서 저장된 언어 값을 가져옴 (기본값은 'korean'으로 설정)
            const storedLanguage = localStorage.getItem("preferredLang") || "korean";
            // 언어 값을 API에서 요구하는 형식으로 변환 (필요하면 여기서 추가 매핑 가능)
            const languageMapping = {
                ko: "korean",
                eng: "english",
                lo: "thai"
            };
            const apiLanguage = languageMapping[storedLanguage] || "korean";
            console.log(localStorage.getItem('preferredLang'));
            generateQuestions(ocrResult); // 문제 생성 함수 호출
        };

        // ocr-result-box 바깥에 버튼 추가
        const resultBox = document.getElementById('ocr-result-box'); // ocr-result-box 요소 선택
        resultBox.parentNode.appendChild(generateButton); // 버튼을 박스 바깥으로 이동
    }
}

export function displayUploadedFiles() {
    const input = document.getElementById('file-upload');
    const output = document.getElementById('uploaded-files');
    output.innerHTML = '';

    if (input && output) {
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const fileItem = document.createElement('div');
            fileItem.textContent = file.name;
            output.appendChild(fileItem);
        }
        output.style.display = 'block';
    } else {
        console.error('Input or output element not found.');
    }
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
    loadTranslations(); // JSON 파일 로드 및 언어 설정
    //updateHeaderImage(); // 언어에 맞는 이미지 설정
});

// 언어 변경 시 이미지 업데이트
document.querySelectorAll(".translate-btn").forEach((button) => {
    button.addEventListener("click", () => {
        const lang = button.dataset.lang;
        // setLanguage(lang); // 언어 변경
        //updateHeaderImage(); // 언어 변경 시 이미지 업데이트
    });
});