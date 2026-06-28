let port;
let writer;
let score = 0;
let level = 1;
let timeLeft = 45;
let gameInterval;
let aiSimulationInterval;
let localStream = null;
let isCamOn = true;

// --- HỆ THỐNG ĐỒ HỌA GAME CANVAS 2D ---
let canvas, ctx;
let activeTrashItems = []; // Danh sách các vật phẩm rác đang bay trong game
let shockwaveActive = false; // Hiệu ứng nổ điểm
let shockwaveX = 0, shockwaveY = 0;

const bieuTuongRac = {
    "chai_nhua": "🍾", "vo_lon": "🥫", 
    "la_cay": "🍃", "vo_chuoi": "🍌", 
    "tui_nilon": "🛍️", "hop_xop": "📦"
};

const kịchBản6Level = {
    1: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 1: Thu gom RÁC TÁI CHẾ (Chai nhựa / Vỏ lon)", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["la_cay", "vo_chuoi"], thongBao: "Màn 2: Thu gom RÁC HỮU CƠ (Lá cây / Vỏ trái cây)", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["tui_nilon", "hop_xop"], thongBao: "Màn 3: Thu gom RÁC VÔ CƠ (Túi nilon / Hộp xốp)", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh 2 món RÁC TÁI CHẾ!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["la_cay"], thongBao: "Màn 5 Thử thách: Tìm đúng LÁ CÂY để bón phân cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["tui_nilon"], thongBao: "Màn CHUNG KẾT: Dọn sạch túi nilon cứu môi trường!", thungMo: "3", diemCanQua: 120 }
};

// Khởi tạo đồ họa game ngay khi mở trang web
function khoiTaoCanvasGame() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    
    // Tự động căn chỉnh kích thước Canvas theo khung bao ngoài
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    // Chạy vòng lặp vẽ đồ họa game liên tục (60 khung hình/giây)
    requestAnimationFrame(vongLapVeGame);
}

function vongLapVeGame() {
    if (!canvas || !ctx) return;
    
    // 1. Xóa nền vẽ lại cảnh nền thiên nhiên
    ctx.fillStyle = "#e0f2f1"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ thảm cỏ xanh phía dưới đáy nơi đặt 3 thùng rác
    ctx.fillStyle = "#81c784";
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // 2. Vẽ 3 chiếc Thùng Rác Ảo xinh xắn trong game
    veThungRacTrongGame("HỮU CƠ", "#558b2f", canvas.width * 0.15, canvas.height - 110, 90, 100);
    veThungRacTrongGame("TÁI CHẾ", "#1565c0", canvas.width * 0.45, canvas.height - 110, 90, 100);
    veThungRacTrongGame("VÔ CƠ", "#37474f", canvas.width * 0.75, canvas.height - 110, 90, 100);

    // 3. Cập nhật vị trí và vẽ các vật phẩm rác đang rơi
    activeTrashItems.forEach((item, index) => {
        item.y += item.speedY; // Rác tự động rơi xuống đáy
        item.x += (item.targetX - item.x) * 0.05; // Rác tự động hút về phía thùng rác chuẩn

        // Vẽ biểu tượng rác (Emoji bự)
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.icon, item.x, item.y);

        // Kiểm tra xem rác đã rơi trúng vào thùng chưa
        if (item.y >= canvas.height - 120) {
            // Tạo hiệu ứng vụ nổ điểm tại vị trí thùng rác đó
            shockwaveActive = true;
            shockwaveX = item.x;
            shockwaveY = item.y;
            setTimeout(() => { shockwaveActive = false; }, 300);
            
            // Xóa rác này khỏi danh sách đang rơi
            activeTrashItems.splice(index, 1);
        }
    });

    // 4. Vẽ hiệu ứng nổ điểm nếu có rác vừa lọt vào thùng
    if (shockwaveActive) {
        ctx.beginPath();
        ctx.arc(shockwaveX, shockwaveY, 30, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    requestAnimationFrame(vongLapVeGame);
}

function veThungRacTrongGame(ten, mau, x, y, rông, cao) {
    ctx.fillStyle = mau;
    ctx.fillRect(x, y, rông, cao);
    
    // Nắp thùng rác
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 5, y - 10, rông + 10, 10);
    
    // Nhãn chữ tên thùng rác
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(ten, x + rông/2, y + cao/2 + 5);
}

// KHI AI QUÉT ĐƯỢC RÁC THẬT, BẮN MỘT MÓN RÁC ẢO VÀO TRONG CANVAS GAME
function thongBaoAiBanRacVaoGame(loaiRac) {
    let iconQuetDuoc = bieuTuongRac[loaiRac] || "🗑️";
    
    // Xác định thùng rác mục tiêu trong game để rác tự động hút về đó
    let toaDoXThung = canvas.width * 0.75 + 45; // Mặc định thùng vô cơ
    let thungSo = "3";
    if (["la_cay", "vo_chuoi"].includes(loaiRac)) { toaDoXThung = canvas.width * 0.15 + 45; thungSo = "1"; }
    if (["chai_nhua", "vo_lon"].includes(loaiRac)) { toaDoXThung = canvas.width * 0.45 + 45; thungSo = "2"; }

    // Thêm vật phẩm rác mới xuất hiện từ trên đỉnh khung game rơi xuống
    activeTrashItems.push({
        icon: iconQuetDuoc,
        x: Math.random() * (canvas.width - 100) + 50, // Vị trí ngang ngẫu nhiên trên trời game
        y: 30, // Xuất hiện từ trên trời game
        targetX: toaDoXThung,
        speedY: 4 // Tốc độ rơi xuống
    });

    // Xử lý tính điểm logic game
    xuLyLogicGame(loaiRac, thungSo);
}

// --- LOGIC HỆ THỐNG GAME & CAMERA ---

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
        document.getElementById("btn-toggle-cam").innerText = "📷 Tắt Camera";
        document.getElementById("ai-result").innerText = "📸 Camera sẵn sàng! Hãy chuẩn bị rác mẫu.";
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Không tìm thấy Webcam phần cứng.";
    }
}

function batTatCamera() {
    const video = document.getElementById("webcam");
    const btn = document.getElementById("btn-toggle-cam");
    if (isCamOn && localStream) {
        localStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        isCamOn = false;
        btn.innerText = "📷 Bật Camera";
        document.getElementById("ai-result").innerText = "🔒 Camera đã tạm đóng.";
    } else {
        moWebcamMoi();
    }
}

async function ketNoiArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        writer = port.writable.getWriter();
        document.getElementById("status").innerText = "Đã kết nối Arduino ✔";
        document.getElementById("status").style.color = "#2e7d32";
    } catch (error) {
        alert("Không phát hiện mạch Arduino. Bạn vẫn chơi giả lập tương tác trên web bình thường!");
    }
}

function batDauGame() {
    score = 0;
    level = 1;
    timeLeft = 45;
    activeTrashItems = [];
    document.getElementById("score").innerText = score;
    document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
    document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
    document.getElementById("btn-start").disabled = true;

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) ketThucGame(false);
    }, 1000);

    clearInterval(aiSimulationInterval);
    aiSimulationInterval = setInterval(quetAnhBangAI, 3000); // 3 giây AI quét 1 món rác thực tế
}

function quetAnhBangAI() {
    if (timeLeft <= 0) return;
    const danhSachGiaLap = ["chai_nhua", "la_cay", "tui_nilon", "vo_chuoi", "hop_xop", "vo_lon"];
    const ketQuaAI = danhSachGiaLap[Math.floor(Math.random() * danhSachGiaLap.length)];
    
    let tenTiengViet = ketQuaAI.replace("_", " ").toUpperCase();
    document.getElementById("ai-result").innerText = `🔍 AI THỰC TẾ PHÁT HIỆN: ${tenTiengViet}`;

    // Kích hoạt ném rác thực tế từ camera bay vào trong Khung Game Đồ Họa 2D
    thongBaoAiBanRacVaoGame(ketQuaAI);
}

async function xuLyLogicGame(loaiRac, thungSo) {
    let levelHienTai = kịchBản6Level[level];

    if (levelHienTai.tenVatPham.includes(loaiRac)) {
        score += 10;
        document.getElementById("score").innerText = score;
        
        if (writer) {
            document.getElementById("ai-result").innerText = `✨ ĐÚNG RÁC! +10đ. Lệnh mở nắp thùng vật lý số ${thungSo}...`;
            await writer.write(new TextEncoder().encode(levelHienTai.thungMo));
        } else {
            document.getElementById("ai-result").innerText = `✨ [GAME AR] Rác thật đã chạy vào Thùng Game Ảo số ${thungSo}! +10đ`;
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
                document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
                alert(`🎉 CHÚC MƯỜNG! Hai bạn vượt cấp thành công. Tiến vào CẤP ĐỘ ${level}!`);
            } else {
                ketThucGame(true);
            }
        }
    } else {
        document.getElementById("ai-result").innerText = "❌ SAI RÁC! Món rác thật này không thuộc yêu cầu nhiệm vụ của cấp độ hiện tại.";
    }
}

function ketThucGame(isChienThang) {
    clearInterval(gameInterval);
    clearInterval(aiSimulationInterval);
    document.getElementById("btn-start").disabled = false;
    if (isChienThang) {
        alert("🏆 TUYỆT VỜI! HAI BẠN ĐÃ HOÀN THÀNH XUẤT SẮC GAME PHÂN LOẠI RÁC 2D KẾT HỢP AI!");
    } else {
        alert("⏰ Hết giờ! Hãy sắp xếp lại các món rác thật chuẩn để thử thách lại nhé.");
    }
}

// Tự khởi động webcam và vẽ thế giới game ngay khi trang web vừa tải xong
window.onload = function() {
    moWebcamMoi();
    khoiTaoCanvasGame();
};
