let port;
let writer;
let score = 0;
let level = 1;
let timeLeft = 45;
let gameInterval;
let aiSimulationInterval;
let localStream = null;
let isCamOn = true;

const bieuTuongRac = {
    "chai_nhua": "🍾", 
    "vo_lon": "🥫", 
    "la_cay": "🍃", 
    "vo_chuoi": "🍌", 
    "tui_nilon": "🛍️", 
    "hop_xop": "📦"
};

const kịchBản6Level = {
    1: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 1: Thu gom RÁC TÁI CHẾ (Chai nhựa / Vỏ lon nhôm)", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["la_cay", "vo_chuoi"], thongBao: "Màn 2: Thu gom RÁC HỮU CƠ (Lá cây / Vỏ trái cây)", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["tui_nilon", "hop_xop"], thongBao: "Màn 3: Thu gom RÁC VÔ CƠ (Túi nilon / Hộp xốp)", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh 2 món RÁC TÁI CHẾ!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["la_cay"], thongBao: "Màn 5 Thử thách: Tìm đúng LÁ CÂY để bón phân cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["tui_nilon"], thongBao: "Màn CHUNG KẾT: Dọn sạch túi nilon dâng tặng Lâm Đồng!", thungMo: "3", diemCanQua: 120 }
};

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
        document.getElementById("btn-toggle-cam").innerText = "📷 Tắt Camera";
        document.getElementById("ai-result").innerText = "📸 AI sẵn sàng! Hãy đưa rác thật trước camera.";
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Không tìm thấy thiết bị Camera kết nối.";
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
        document.getElementById("ai-result").innerText = "🔒 Camera tắt.";
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
        alert("Chưa phát hiện cổng Arduino vật lý. Bạn vẫn chơi giả lập tương tác trên web bình thường!");
    }
}

function batDauGame() {
    score = 0;
    level = 1;
    timeLeft = 45;
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
    aiSimulationInterval = setInterval(nhanDienKiemTraCamera, 3000); 
}

function nhanDienKiemTraCamera() {
    if (timeLeft <= 0) return;
    const danhSachGiaLapAI = ["chai_nhua", "la_cay", "tui_nilon", "vo_chuoi", "hop_xop", "vo_lon"];
    const nhanKetQua = danhSachGiaLapAI[Math.floor(Math.random() * danhSachGiaLapAI.length)];
    
    let chuHienThi = nhanKetQua.replace("_", " ").toUpperCase();
    document.getElementById("ai-result").innerText = `🔍 AI PHÁT HIỆN: ${chuHienThi}`;

    banRacVaoTrongGame(nhanKetQua);
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

    let thungMucTieu = "3"; 
    if (["la_cay", "vo_chuoi"].includes(loaiRac)) thungMucTieu = "1"; 
    if (["chai_nhua", "vo_lon"].includes(loaiRac)) thungMucTieu = "2"; 

    const thungElement = document.getElementById(`g-bin-${thungMucTieu}`);

    setTimeout(() => {
        // Căn chỉnh chuẩn xác tọa độ rơi để rác chui lọt vào lòng thùng rác hoạ hình
        const layToaDoXThung = thungElement.offsetLeft + (thungElement.clientWidth / 2) - 25;
        racAo.style.left = `${layToaDoXThung}px`;
        racAo.style.top = `${gameDisplay.clientHeight - 145}px`;
        racAo.style.transform = "scale(0.3) rotate(360deg)";
        racAo.style.opacity = "0.3";
    }, 100);

    setTimeout(() => {
        racAo.remove();
        
        // Tạo hiệu ứng thùng nhún nhảy khi hứng được rác cực vui nhộn
        thungElement.classList.add("bin-bounce");
        setTimeout(() => thungElement.classList.remove("bin-bounce"), 200);

        xuLyLogicGame(loaiRac, thungMucTieu);
    }, 1200);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];

    if (levelHienTai.tenVatPham.includes(loaiRac)) {
        score += 10;
        document.getElementById("score").innerText = score;
        document.getElementById("ai-result").innerText = `✨ CHÍNH XÁC! +10 điểm vào trò chơi.`;
        
        if (writer) {
            await writer.write(new TextEncoder().encode(levelHienTai.thungMo));
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
                document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
                alert(`🎉 Tuyệt vời! Vượt cấp thành công. Chào mừng hai bạn đến với CẤP ĐỘ ${level}!`);
            } else {
                ketThucGame(true);
            }
        }
    } else {
        document.getElementById("ai-result").innerText = "❌ THẤT BẠI! Món rác này không nằm trong yêu cầu phân loại của cấp độ hiện tại.";
    }
}

function ketThucGame(isChienThang) {
    clearInterval(gameInterval);
    clearInterval(aiSimulationInterval);
    document.getElementById("btn-start").disabled = false;
    if (isChienThang) {
        alert("🏆 CHIẾN THẮNG XUẤT SẮC! Hai bạn đã hoàn thành trọn vẹn toàn bộ trò chơi!");
    } else {
        alert("⏰ HẾT GIỜ! Hãy bấm Bắt đầu để thử thách lại nhé.");
    }
}

window.onload = function() {
    moWebcamMoi();
};
