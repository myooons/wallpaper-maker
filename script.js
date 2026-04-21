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

// 달력 그리기 (단순화된 버전)
function drawCalendar(w, h) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // 가독성을 위한 텍스트 색상 판단 (샘플링)
    const pixel = ctx.getImageData(w/2, h/2, 1, 1).data;
    const brightness = (pixel[0] * 299 + pixel[1] * 587 + pixel[2] * 114) / 1000;
    ctx.fillStyle = brightness > 125 ? 'black' : 'white';
    
    ctx.textAlign = 'center';
    ctx.font = `bold ${w * 0.05}px Arial`;
    ctx.fillText(`${year}.${month + 1}`, w / 2, h * 0.2);
    
    // 날짜 로직 (생략: 여기에 반복문을 돌려 날짜를 그리게 됩니다)
    // 공휴일 API 연결 시 일요일과 함께 빨간색 조건 추가
}
