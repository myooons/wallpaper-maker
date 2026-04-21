const canvas = document.getElementById('wallpaperCanvas');
const ctx = canvas.getContext('2d');

// 1. 초기 해상도 설정
document.getElementById('widthInput').value = window.screen.width * window.devicePixelRatio;
document.getElementById('heightInput').value = window.screen.height * window.devicePixelRatio;

document.getElementById('generateBtn').addEventListener('click', async () => {
    const width = parseInt(document.getElementById('widthInput').value);
    const height = parseInt(document.getElementById('heightInput').value);
    canvas.width = width;
    canvas.height = height;

    const file = document.getElementById('imageInput').files[0];
    
    if (file) {
        const img = await loadImage(URL.createObjectURL(file));
        drawBackground(img, width, height);
    } else {
        drawRandomSolid(width, height);
    }

    drawCalendar(width, height);
    
    document.getElementById('resultArea').style.display = 'block';
    const dataURL = canvas.toDataURL('image/png');
    document.getElementById('downloadBtn').href = dataURL;
    document.getElementById('downloadBtn').download = 'wallpaper.png';
});

// 이미지 로드 프로미스
function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
}

// 배경 그리기 (Center Crop)
function drawBackground(img, w, h) {
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
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
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

// 랜덤 단색 배경
function drawRandomSolid(w, h) {
    const color = `hsl(${Math.random() * 360}, 50%, 70%)`;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
}

function drawCalendar(w, h) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0부터 시작 (4월은 3)
    
    // 1. 가독성을 위한 색상 결정 (배경 밝기 기준)
    const pixel = ctx.getImageData(w / 2, h * 0.8, 1, 1).data;
    const brightness = (pixel[0] * 299 + pixel[1] * 587 + pixel[2] * 114) / 1000;
    const mainColor = brightness > 125 ? '#333333' : '#FFFFFF';
    const pointColor = '#FF3B30'; // 일요일/공휴일용 빨간색
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 2. 상단 제목 (예: April 2026)
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    ctx.font = `bold ${w * 0.07}px sans-serif`;
    ctx.fillStyle = mainColor;
    ctx.fillText(`${monthNames[month]}`, w * 0.35, h * 0.65);
    ctx.fillText(`${year}`, w * 0.65, h * 0.65);

    // 3. 요일 헤더 (Sun ~ Sat)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const colWidth = w * 0.12; // 열 간격
    const startX = w / 2 - (colWidth * 3); // 시작 X 좌표 (중앙 정렬)
    const startY = h * 0.72; // 요일 시작 Y 좌표
    
    ctx.font = `bold ${w * 0.035}px sans-serif`;
    daysOfWeek.forEach((day, i) => {
        ctx.fillStyle = (i === 0) ? pointColor : mainColor; // 일요일은 빨간색
        ctx.fillText(day, startX + (i * colWidth), startY);
    });

    // 4. 날짜 그리드 그리기
    const firstDay = new Date(year, month, 1).getDay(); // 1일의 요일 (0:일 ~ 6:토)
    const lastDate = new Date(year, month + 1, 0).getDate(); // 이번 달 마지막 날짜
    const rowHeight = h * 0.05; // 행 간격
    
    ctx.font = `${w * 0.035}px sans-serif`;
    
    let curDay = 1;
    for (let row = 0; row < 6; row++) { // 최대 6행
        for (let col = 0; col < 7; col++) {
            // 첫 줄 시작 요일 체크 및 마지막 날짜 체크
            if ((row === 0 && col < firstDay) || curDay > lastDate) continue;

            const x = startX + (col * colWidth);
            const y = startY + rowHeight + (row * rowHeight);
            
            // 색상 지정 (일요일은 빨간색)
            ctx.fillStyle = (col === 0) ? pointColor : mainColor;
            
            // 공휴일 로직 추가 시 여기에 조건문 삽입 (예: if(holidayList.includes(curDay)) ...)
            
            ctx.fillText(curDay.toString(), x, y);
            curDay++;
        }
    }
}
