let port, writer;
let score = 0, level = 1, timeLeft = 45;
let gameInterval, aiRecognitionInterval;
let localStream = null, isCamOn = true;

let netModel; // Nơi lưu trữ bộ não COCO-SSD
let thoiGianChoQuet = false;

// BẢN ĐỒ ÁNH XẠ: Biến từ khóa nhận diện của AI quốc tế thành Emoji trò chơi của bạn
const bieuTuongRac = {
    "bottle": "🍾",      // Chai nhựa, ly nhựa, chai thủy tinh
    "cup": "🥤",         // Ly nhựa, tách uống nước
    "apple": "🍎",       // Rác hữu cơ: Quả táo
    "banana": "🍌",      // Rác hữu cơ: Vỏ chuối
    "orange": "🍊",      // Rác hữu cơ: Quả cam
    "sandwich": "🥪",    // Thức ăn thừa
    "book": "📦",        // Hộp giấy, sách báo cũ
    "cell phone": "🛍️"   // Túi nilon/vật dụng vô cơ khác
};

// ĐỊNH NGHĨA KỊCH BẢN GAME ĐỐI CHIẾU VẬT THỂ THỰC TẾ
const kịchBản6Level = {
    1: { tenVatPham: ["bottle", "cup"], thongBao: "Màn 1: Hãy đưa CHAI NHỰA hoặc LY NHỰA trước camera để TÁI CHẾ!", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["apple", "banana", "orange", "sandwich"], thongBao: "Màn 2: Hãy đưa TRÁI CÂY / THỨC ĂN THỪA để ủ phân HỮU CƠ!", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["book", "cell phone"], thongBao: "Màn 3: Thu gom chất thải rắn còn lại vào Thùng VÔ CƠ!", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["bottle"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh CHAI NƯỚC NHỰA cứu lấy môi trường!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["banana", "apple"], thongBao: "Màn 5 Thử thách: Gom rác hữu cơ thực tế bón phân cho cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["cup", "book"], thongBao: "Màn CHUNG KẾT: Tổng vệ sinh phân loại rác dâng tặng Lâm Đồng!", thungMo: "3", diemCanQua: 120 }
};

// 🧠 TẢI THƯ VIỆN ĐÃ ĐƯỢC HUẤN LUYỆN SẴN CỦA GOOGLE
async function taiMoHinhAI() {
    try {
        netModel = await cocoSsd.load(); // Tải thẳng bộ mã nguồn nhận diện vật thể
        document.getElementById("mission").innerText = "Mô hình AI COCO-SSD đã sẵn sàng 100%! Bấm Bắt đầu ngay.";
        document.getElementById("btn-start").disabled = false;
        document.getElementById("ai-result").innerText = "📸 Đã kích hoạt mắt thần AI! Hãy bấm Bắt đầu.";
    } catch (e) {
        document.getElementById("ai-result").innerText = "❌ Lỗi kết nối máy chủ AI.";
    }
}

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Không tìm thấy camera.";
    }
}

function batTatCamera() {
    const video = document.getElementById("webcam");
    const btn = document.getElementById("btn-toggle-cam");
    if (isCamOn && localStream) {
        localStream.getTracks().forEach(track => track.stop());
        video.srcObject = null; isCamOn = false;
        btn.innerText = "📷 Bật Camera";
    } else {
        moWebcamMoi().then(() => { btn.innerText = "📷 Tắt Camera"; });
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
        alert("Chưa kết nối cổng Arduino. Hệ thống tự động kích hoạt tương tác AR trên Web!");
    }
}

function batDauGame() {
    score = 0; level = 1; timeLeft = 45; thoiGianChoQuet = false;
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

    // Chu kỳ quét vật thể liên tục từ camera mỗi 1 giây
    clearInterval(aiRecognitionInterval);
    aiRecognitionInterval = setInterval(quetVatTheThucTe, 1000); 
}

// 👁️ HÀM QUÉT VÀ PHÂN TÍCH VẬT THỂ THỰC TẾ
async function quetVatTheThucTe() {
    if (timeLeft <= 0 || !netModel || !isCamOn || thoiGianChoQuet) return;

    const video = document.getElementById("webcam");
    
    // AI tự quét bức ảnh và trả về danh sách các vật thể nó nhìn thấy
    const predictions = await netModel.detect(video);
    
    if (predictions.length > 0) {
        // Lấy vật thể đầu tiên có độ chính xác cao nhất
        const vatThe = predictions[0];
        const tenGocVatThe = vatThe.class; // ví dụ: "bottle", "cup", "apple"
        const doChinhXac = vatThe.score;

        // Nếu AI tin tưởng trên 65% và vật thể nằm trong danh sách rác game hỗ trợ
        if (doChinhXac > 0.65 && bieuTuongRac[tenGocVatThe]) {
            thoiGianChoQuet = true; // Khóa tạm thời tránh bắn liên tục
            
            let tenTiengViet = tenGocVatThe.toUpperCase();
            if(tenGocVatThe === "bottle") tenTiengViet = "CHAI NUOC / LY NHUA";
            if(tenGocVatThe === "cup") tenTiengViet = "LY CO / COC NHUA";
            if(tenGocVatThe === "apple" || tenGocVatThe === "banana") tenTiengViet = "RAC HUU CO TRAC CAY";

            document.getElementById("ai-result").innerText = `🔍 AI PHÁT HIỆN: ${tenTiengViet} (${(doChinhXac * 100).toFixed(0)}%)`;
            
            // Kích hoạt ném vật phẩm tương tác vào game
            banRacVaoTrongGame(tenGocVatThe);
        }
    } else {
        document.getElementById("ai-result").innerText = "📸 Đang chờ bạn đưa chai nhựa, vỏ lon hoặc trái cây vào trước camera...";
    }
}

function banRacVaoTrongGame(loaiRac) {
    const gameDisplay = document.getElementById("gameDisplay");
    const racAo = document.createElement("div");
    racAo.className = "falling-trash";
    racAo.innerText = bieuTuongRac[loaiRac] || "🗑️";
    
    const viTriXNgauNhien = Math.floor(Math.random() * 60) + 20; 
    racAo.style.left = `${viTriXNgauNhien}%`;
    racAo.style.top = `-50px`;
    gameDisplay.appendChild(racAo);

    // Phân loại thùng tự động dựa trên vật phẩm thực tế
    let thungMucTieu = "3"; 
    if (["apple", "banana", "orange", "sandwich"].includes(loaiRac)) thungMucTieu = "1"; // Hữu cơ
    if (["bottle", "cup"].includes(loaiRac)) thungMucTieu = "2"; // Tái chế

    const thungElement = document.getElementById(`g-bin-${thungMucTieu}`);

    setTimeout(() => {
        const layToaDoXThung = thungElement.offsetLeft + (thungElement.clientWidth / 2) - 25;
        racAo.style.left = `${layToaDoXThung}px`;
        racAo.style.top = `${gameDisplay.clientHeight - 145}px`;
        racAo.style.transform = "scale(0.3) rotate(360deg)";
        racAo.style.opacity = "0.3";
    }, 100);

    setTimeout(() => {
        racAo.remove();
        thungElement.classList.add("bin-bounce");
        setTimeout(() => thungElement.classList.remove("bin-bounce"), 200);

        xuLyLogicGame(loaiRac, thungMucTieu);
        
        setTimeout(() => { thoiGianChoQuet = false; }, 1200); // Mở khóa chờ lượt quét tiếp theo
    }, 1200);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];

    if (levelHienTai.tenVatPham.includes(loaiRac)) {
        score += 10;
        document.getElementById("score").innerText = score;
        document.getElementById("ai-result").innerText = `✨ CHÍNH XÁC! AI đã phân loại thành công vật thể này vào game.`;
        
        // Phát lệnh mở nắp thùng rác thật qua cổng Arduino Serial
        if (writer) {
            await writer.write(new TextEncoder().encode(levelHienTai.thungMo));
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
                document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
                alert(`🎉 Xuất sắc! Vượt qua thử thách AI. Lên CẤP ĐỘ ${level}!`);
            } else {
                ketThucGame(true);
            }
        }
    } else {
        document.getElementById("ai-result").innerText = "❌ SAI THÙNG RỒI! Hãy nhìn kỹ yêu cầu của cấp độ hiện tại.";
    }
}

function ketThucGame(isChienThang) {
    clearInterval(gameInterval);
    clearInterval(aiRecognitionInterval);
    document.getElementById("btn-start").disabled = false;
    if (isChienThang) {
        alert("🏆 TUYỆT VỜI! Mô hình tích hợp AI hoàn thành xuất sắc nhiệm vụ bảo vệ môi trường Lâm Đồng!");
    } else {
        alert("⏰ HẾT GIỜ! Bấm Bắt đầu để thử lại nhé.");
    }
}

window.onload = function() {
    moWebcamMoi().then(() => {
        taiMoHinhAI();
    });
};
