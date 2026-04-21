const canvas = document.getElementById('wallpaperCanvas');
const ctx = canvas.getContext('2d');

// 1. 초기 해상도 설정 (사용자 기기 대응)
const dpr = window.devicePixelRatio || 1;
const setRes = () => {
    document.getElementById('widthInput').value = Math.round(window.screen.width * dpr);
    document.getElementById('heightInput').value = Math.round(window.screen.height * dpr);
};
setRes();

// 2. 공휴일 데이터 API
async function getHolidayDates(year, month) {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const cc = tz.includes('Seoul') ? 'KR' : 'US';
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`);
        const data = await res.json();
        return data.filter(h => new Date(h.date).getMonth() === month).map(h => new Date(h.date).getDate());
    } catch (e) { return []; }
}

// 3. 스마트 그리드 탐색 (여백 찾기)
function findBestSpot(w, h) {
    const rows = 3, cols = 3;
    const sectors = [];
    // 가장자리 너무 끝에 붙지 않도록 안쪽 구역만 탐색
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const sx = (w / cols) * c;
            const sy = (h / rows) * r;
            const sw = w / cols;
            const sh = h / rows;
            
            const data = ctx.getImageData(sx + 20, sy + 20, sw - 40, sh - 40).data;
            let variance = 0, sum = 0, sqSum = 0;
            for (let i = 0; i < data.length; i += 100) {
                sum += data[i];
                sqSum += data[i] * data[i];
            }
            const n = data.length / 100;
            variance = (sqSum / n) - (Math.pow(sum / n, 2));
            sectors.push({ x: sx + sw/2, y: sy + sh/2, v: variance });
        }
    }
    sectors.sort((a, b) => a.v - b.v);
    return sectors[0]; // 가장 깨끗한 구역 반환
}

// 4. 달력 그리기 로직 (핵심: 겹침 방지 간격 계산)
function drawCalendar(w, h, holidays, spot) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pointColor = '#FF3B30';

    // 배경 밝기 확인하여 글자색 결정
    const p = ctx.getImageData(spot.x, spot.y, 1, 1).data;
    const brightness = (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000;
    const mainColor = brightness > 140 ? '#1d1d1f' : '#ffffff';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 전체 달력 크기 기준 (화면 너비의 80%를 넘지 않게)
    const calWidth = w * 0.7;
    const colW = calWidth / 7;
    const rowH = h * 0.055; // 행 간격을 넉넉하게!

    // 시작 Y 좌표 설정 (해당 구역의 중앙에서 위로 보정)
    let currentY = spot.y - (rowH * 3);

    // [1] 월(Month) 표시
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    ctx.font = `bold ${w * 0.08}px 'Pretendard'`;
    ctx.fillStyle = mainColor;
    ctx.fillText(monthNames[month], spot.x, currentY);
    
    // [2] 연도(Year) - 월 제목 아래로 넉넉히 띄움
    currentY += (h * 0.06);
    ctx.font = `300 ${w * 0.04}px 'Pretendard'`;
    ctx.fillText(year.toString(), spot.x, currentY);

    // [3] 요일 헤더 - 연도 아래로 띄움
    currentY += (h * 0.08);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    ctx.font = `bold ${w * 0.035}px 'Pretendard'`;
    days.forEach((day, i) => {
        ctx.fillStyle = (i === 0) ? pointColor : mainColor;
        ctx.fillText(day, (spot.x - calWidth/2) + (i * colW) + colW/2, currentY);
    });

    // [4] 날짜 그리드 - 요일 아래로 띄움
    currentY += (h * 0.05);
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    ctx.font = `500 ${w * 0.045}px 'Pretendard'`;
    let d = 1;
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            if ((r === 0 && c < firstDay) || d > lastDate) continue;
            const x = (spot.x - calWidth/2) + (c * colW) + colW/2;
            const y = currentY + (r * rowH);
            
            ctx.fillStyle = (c === 0 || holidays.includes(d)) ? pointColor : mainColor;
            ctx.fillText(d.toString(), x, y);
            d++;
        }
    }
}

// 5. 버튼 클릭 이벤트
document.getElementById('generateBtn').addEventListener('click', async () => {
    const w = parseInt(document.getElementById('widthInput').value);
    const h = parseInt(document.getElementById('heightInput').value);
    canvas.width = w;
    canvas.height = h;

    // 캔버스 초기화
    ctx.clearRect(0, 0, w, h);

    const holidays = await getHolidayDates(new Date().getFullYear(), new Date().getMonth());
    const file = document.getElementById('imageInput').files[0];

    if (file) {
        const img = await new Promise(res => {
            const i = new Image();
            i.onload = () => res(i);
            i.src = URL.createObjectURL(file);
        });
        // Center Crop
        const iR = img.width / img.height;
        const cR = w / h;
        let sx, sy, sw, sh;
        if (iR > cR) { sh = img.height; sw = sh * cR; sx = (img.width - sw) / 2; sy = 0; }
        else { sw = img.width; sh = sw / cR; sx = 0; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    } else {
        ctx.fillStyle = "#e0e0d1";
        ctx.fillRect(0, 0, w, h);
    }

    const bestSpot = findBestSpot(w, h);
    drawCalendar(w, h, holidays, bestSpot);

    document.getElementById("resultArea").style.display = "block";
    document.getElementById("downloadBtn").href = canvas.toDataURL();
});
