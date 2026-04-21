const canvas = document.getElementById('wallpaperCanvas');
const ctx = canvas.getContext('2d');

// 1. 초기 해상도 설정
const dpr = window.devicePixelRatio || 1;
document.getElementById('widthInput').value = Math.round(window.screen.width * dpr);
document.getElementById('heightInput').value = Math.round(window.screen.height * dpr);

// 2. 공휴일 데이터 가져오기
async function getHolidayDates(year, month) {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const countryCode = timezone.includes('Seoul') ? 'KR' : 'US';
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        const data = await response.json();
        return data.filter(h => new Date(h.date).getMonth() === month).map(h => new Date(h.date).getDate());
    } catch (e) { return []; }
}

// 3. 스마트 전수 조사 알고리즘 (9개 구역 탐색)
function findBestSpot(w, h) {
    // 이미지를 3x3 그리드로 나눕니다.
    const sectors = [];
    const rows = 3;
    const cols = 3;
    const sectorW = w / cols;
    const sectorH = h / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * sectorW;
            const y = r * sectorH;
            const data = ctx.getImageData(x + 10, y + 10, sectorW - 20, sectorH - 20).data;
            
            // 색상 변화율(Variance) 계산: 낮을수록 빈 공간
            let rSum = 0, rSqSum = 0;
            const step = 40; // 성능을 위한 샘플링
            for (let i = 0; i < data.length; i += step) {
                rSum += data[i];
                rSqSum += data[i] * data[i];
            }
            const n = data.length / step;
            const variance = (rSqSum / n) - (Math.pow(rSum / n, 2));
            
            sectors.push({
                x: x + (sectorW / 2),
                y: y + (sectorH / 2),
                variance: variance,
                row: r,
                col: c
            });
        }
    }

    // 변화율이 가장 낮은 구역을 찾습니다.
    sectors.sort((a, b) => a.variance - b.variance);
    let best = sectors[0];

    // 만약 모든 구역이 너무 복잡하다면(임계값 1500 이상), 기본 위치인 하단 중앙으로 설정
    if (best.variance > 1500) {
        return { x: w / 2, y: h * 0.75, isSmallSpot: false };
    }

    return { x: best.x, y: best.y, isSmallSpot: true };
}

// 4. 달력 그리기 (위치 및 크기 자동 최적화)
function drawAdaptiveCalendar(w, h, holidays, spot) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pointColor = '#FF3B30';

    // 배경색에 따른 텍스트 색상 결정
    const bgPixel = ctx.getImageData(spot.x, spot.y, 1, 1).data;
    const brightness = (bgPixel[0] * 299 + bgPixel[1] * 587 + bgPixel[2] * 114) / 1000;
    const mainColor = brightness > 150 ? '#1d1d1f' : '#ffffff';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 크기 결정 로직: 구역이 좁으면 작게 그리되, 최소 크기 미만이면 그냥 크게 그리기
    let scale = spot.isSmallSpot ? 0.7 : 1.0; 
    const baseW = w * scale;
    
    // 제목 및 연도
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    ctx.fillStyle = mainColor;
    ctx.font = `bold ${baseW * 0.08}px 'Pretendard'`;
    ctx.fillText(monthNames[month], spot.x, spot.y - (h * 0.08));
    
    ctx.font = `300 ${baseW * 0.045}px 'Pretendard'`;
    ctx.fillText(year.toString(), spot.x, spot.y - (h * 0.03));

    // 요일
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const colW = baseW * 0.11;
    const startX = spot.x - (colW * 3);
    const startY = spot.y + (h * 0.03);

    ctx.font = `bold ${baseW * 0.032}px 'Pretendard'`;
    days.forEach((d, i) => {
        ctx.fillStyle = i === 0 ? pointColor : mainColor;
        ctx.fillText(d, startX + (i * colW), startY);
    });

    // 날짜
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const rowH = h * 0.04 * scale;
    ctx.font = `500 ${baseW * 0.04}px 'Pretendard'`;

    let d = 1;
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            if ((r === 0 && c < firstDay) || d > lastDate) continue;
            const x = startX + (c * colW);
            const y = startY + (rowH * 1.8) + (r * rowH);
            ctx.fillStyle = (c === 0 || holidays.includes(d)) ? pointColor : mainColor;
            ctx.fillText(d.toString(), x, y);
            d++;
        }
    }
}

// 5. 버튼 이벤트
document.getElementById('generateBtn').addEventListener('click', async () => {
    const w = parseInt(document.getElementById('widthInput').value);
    const h = parseInt(document.getElementById('heightInput').value);
    canvas.width = w;
    canvas.height = h;

    const holidays = await getHolidayDates(new Date().getFullYear(), new Date().getMonth());
    const file = document.getElementById('imageInput').files[0];

    // 배경 그리기
    if (file) {
        const img = await new Promise(res => {
            const i = new Image();
            i.onload = () => res(i);
            i.src = URL.createObjectURL(file);
        });
        const iR = img.width / img.height;
        const cR = w / h;
        let sx, sy, sw, sh;
        if (iR > cR) { sh = img.height; sw = sh * cR; sx = (img.width - sw) / 2; sy = 0; }
        else { sw = img.width; sh = sw / cR; sx = 0; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    } else {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 30%, 80%)`;
        ctx.fillRect(0, 0, w, h);
    }

    // 6. 위치 찾기 및 그리기
    const bestSpot = findBestSpot(w, h);
    drawAdaptiveCalendar(w, h, holidays, bestSpot);

    document.getElementById('resultArea').style.display = 'block';
    const dataURL = canvas.toDataURL('image/png');
    document.getElementById('downloadBtn').href = dataURL;
    document.getElementById('downloadBtn').download = `wallpaper_${Date.now()}.png`;
});
