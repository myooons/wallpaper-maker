/**
 * Monthly Wallpaper Maker - Core Logic
 * 1. 기기 해상도 자동 감지
 * 2. 이미지 센터 크롭 및 배경 처리
 * 3. 시간대 기반 국가 판별 및 공휴일 API 연동
 * 4. 가독성을 위한 자동 색상 반전 (Brightness Detection)
 */

const canvas = document.getElementById('wallpaperCanvas');
const ctx = canvas.getContext('2d');

// 1. 초기 해상도 설정 (사용자 기기 기준)
const setDefaultResolution = () => {
    // 레티나 디스플레이 등을 고려해 devicePixelRatio를 곱해 고해상도로 설정합니다.
    const dpr = window.devicePixelRatio || 1;
    document.getElementById('widthInput').value = Math.round(window.screen.width * dpr);
    document.getElementById('heightInput').value = Math.round(window.screen.height * dpr);
};

setDefaultResolution();

// 2. 국가 코드 판별 및 공휴일 데이터 가져오기 (비동기)
async function getHolidayDates(year, month) {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let countryCode = 'KR'; // 기본값

        if (timezone.includes('Seoul')) countryCode = 'KR';
        else if (timezone.includes('Tokyo')) countryCode = 'JP';
        else if (timezone.includes('America')) countryCode = 'US';
        else if (timezone.includes('Paris')) countryCode = 'FR';

        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const allHolidays = await response.json();
        
        // 현재 달(month)에 해당하는 공휴일 날짜만 추출
        return allHolidays
            .filter(h => {
                const hDate = new Date(h.date);
                return hDate.getMonth() === month;
            })
            .map(h => new Date(h.date).getDate());
    } catch (error) {
        console.error("공휴일 정보를 가져오는 데 실패했습니다. 기본 일요일만 표시합니다.", error);
        return [];
    }
}

// 3. 이미지 로드 프로미스
const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

// 4. 배경색 밝기 계산 알고리즘
// 밝기 Y 공식: $$Y = 0.299R + 0.587G + 0.114B$$
function getContrastColor(w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    let r = 0, g = 0, b = 0;

    // 전체 이미지의 평균 밝기를 샘플링 (성능을 위해 100픽셀마다 체크)
    for (let i = 0; i < data.length; i += 400) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }
    const count = data.length / 400;
    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;

    const brightness = (avgR * 299 + avgG * 587 + avgB * 114) / 1000;
    return brightness > 150 ? '#333333' : '#FFFFFF'; // 밝으면 어두운 글자, 어두우면 흰 글자
}

// 5. 달력 그리기 메인 함수
function drawCalendarGrid(w, h, holidays, mainColor) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pointColor = '#FF3B30'; // 일요일 및 공휴일 빨간색

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 제목 그리기 (예: April 2026)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    ctx.font = `bold ${w * 0.08}px sans-serif`;
    ctx.fillStyle = mainColor;
    ctx.fillText(monthNames[month], w * 0.5, h * 0.63);
    
    ctx.font = `300 ${w * 0.05}px sans-serif`;
    ctx.fillText(year.toString(), w * 0.5, h * 0.69);

    // 요일 헤더 (Sun ~ Sat)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const colWidth = w * 0.11;
    const startX = w / 2 - (colWidth * 3);
    const startY = h * 0.76;
    
    ctx.font = `bold ${w * 0.03}px sans-serif`;
    daysOfWeek.forEach((day, i) => {
        ctx.fillStyle = (i === 0) ? pointColor : mainColor;
        ctx.fillText(day, startX + (i * colWidth), startY);
    });

    // 날짜 그리드
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const rowHeight = h * 0.045;
    
    ctx.font = `${w * 0.035}px sans-serif`;
    
    let curDay = 1;
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            if ((row === 0 && col < firstDay) || curDay > lastDate) continue;

            const x = startX + (col * colWidth);
            const y = startY + rowHeight + (row * rowHeight) + (w * 0.02);
            
            // 일요일이거나 공휴일 목록에 있으면 빨간색
            const isRedDay = (col === 0 || holidays.includes(curDay));
            ctx.fillStyle = isRedDay ? pointColor : mainColor;
            
            ctx.fillText(curDay.toString(), x, y);
            curDay++;
        }
    }
}

// 6. 실행 이벤트 리스너
document.getElementById('generateBtn').addEventListener('click', async () => {
    const width = parseInt(document.getElementById('widthInput').value);
    const height = parseInt(document.getElementById('heightInput').value);
    
    canvas.width = width;
    canvas.height = height;

    // 공휴일 데이터 가져오기
    const now = new Date();
    const holidays = await getHolidayDates(now.getFullYear(), now.getMonth());

    const fileInput = document.getElementById('imageInput');
    
    if (fileInput.files && fileInput.files[0]) {
        // 이미지가 있는 경우
        const img = await loadImage(URL.createObjectURL(fileInput.files[0]));
        
        // Center Crop 로직
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let sx, sy, sw, sh;

        if (imgRatio > canvasRatio) {
            sh = img.height;
            sw = sh * canvasRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = sw / canvasRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
    } else {
        // 이미지가 없는 경우 랜덤 단색 배경
        ctx.fillStyle = `hsl(${Math.random() * 360}, 40%, 80%)`;
        ctx.fillRect(0, 0, width, height);
    }

    // 대비 색상 계산 및 달력 그리기
    const mainColor = getContrastColor(width, height);
    drawCalendarGrid(width, height, holidays, mainColor);
    
    // 결과 출력 및 다운로드 링크 활성화
    document.getElementById('resultArea').style.display = 'block';
    const dataURL = canvas.toDataURL('image/png');
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = dataURL;
    downloadBtn.download = `wallpaper_${now.getFullYear()}_${now.getMonth() + 1}.png`;
});
