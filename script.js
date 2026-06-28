let port;
let writer;
let score = 0;
let level = 1;
let timeLeft = 45;
let gameInterval;
let aiSimulationInterval;
let localStream = null; // Biến lưu trữ luồng camera để tắt/mở
let isCamOn = true;

// Định nghĩa cấu trúc yêu cầu của cả 6 Cấp độ
const kịchBản6Level = {
    1: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 1: Thu gom RÁC TÁI CHẾ (Chai nhựa / Vỏ lon nhôm)", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["la_cay", "vo_chuoi"], thongBao: "Màn 2: Thu gom RÁC HỮU CƠ (Lá cây / Vỏ trái cây)", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["tui_nilon", "hop_xop"], thongBao: "Màn 3: Thu gom RÁC VÔ CƠ (Túi nilon / Hộp xốp)", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh 2 món RÁC TÁI CHẾ!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["la_cay"], thongBao: "Màn 5 Thử thách: Tìm đúng LÁ CÂY để bón phân cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["tui_nilon"], thongBao: "Màn CHUNG KẾT: Dọn sạch túi nilon để giải cứu Lâm Đồng!", thungMo: "3", diemCanQua: 120 }
};

// 1. HÀM MỞ WEBCAM KHI VÀO TRANG WEB
async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
        document.getElementById("btn-toggle-cam").innerText = "📷 Tắt Camera";
        document.getElementById("btn-toggle-cam").style.background = "#616161";
        document.getElementById("ai-result").innerText = "📸 Camera đã bật! Có thể bấm Bắt đầu chơi thử ngay.";
    } catch (err) {
        console.error("Lỗi mở camera: ", err);
        document.getElementById("ai-result").innerText = "❌ Không tìm thấy Webcam.";
    }
}

// 2. HÀM CHỦ ĐỘNG BẬT / TẮT CAMERA THEO YÊU CẦU
function batTatCamera() {
    const video = document.getElementById("webcam");
    const btn = document.getElementById("btn-toggle-cam");

    if (isCamOn && localStream) {
        // Tắt tất cả các luồng của camera
        let tracks = localStream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
        isCamOn = false;
        btn.innerText = "📷 Bật Camera";
        btn.style.background = "#4caf50";
        document.getElementById("ai-result").innerText = "🔒 Camera đã tạm tắt.";
    } else {
        // Bật lại camera
        moWebcamMoi();
    }
}

// 3. KẾT NỐI MẠCH ARDUINO (NẾU CÓ)
async function ketNoiArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        writer = port.writable.getWriter();
        
        document.getElementById("status").innerText = "Trạng thái: Đã kết nối Thùng Rác thành công! ✔";
        document.getElementById("status").style.color = "#2e7d32";
        document.getElementById("mission").innerText = "Phần cứng đã sẵn sàng! Bấm Bắt đầu thử thách ngay.";
    } catch (error) {
        alert("Không thể kết nối cổng COM phần cứng. Bạn vẫn có thể chơi thử nghiệm bằng Camera!");
        console.error(error);
    }
}

// 4. KHỞI ĐỘNG TRẬN ĐẤU (Bấm chơi được luôn dù chưa có Arduino)
function batDauGame() {
    score = 0;
    level = 1;
    timeLeft = 45;
    
    document.getElementById("score").innerText = score;
    document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
    document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
    document.getElementById("btn-start").disabled = true;

    // Chạy đồng hồ đếm ngược
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) {
            ketThucGame(false);
        }
    }, 1000);

    // Chạy vòng quét giả lập AI nhận diện vật phẩm từ camera
    clearInterval(aiSimulationInterval);
    aiSimulationInterval = setInterval(quetAnhBangAI, 2500);
}

// 5. VÒNG LẶP QUÉT AI GIẢ LẬP ĐỂ TEST ĐIỂM SỐ VÀ LEVEL
function quetAnhBangAI() {
    if (timeLeft <= 0) return;

    // Danh sách rác mẫu để AI tự bốc quét ngẫu nhiên trước ống kính
    const danhSachGiaLap = ["chai_nhua", "la_cay", "tui_nilon", "vo_chuoi", "hop_xop", "rac_doc_hai"];
    const ketQuaAI = danhSachGiaLap[Math.floor(Math.random() * danhSachGiaLap.length)];
    
    let tenTiengViet = ketQuaAI.replace("_", " ").toUpperCase();
    document.getElementById("ai-result").innerText = `🔍 AI PHÁT HIỆN VẬT PHẨM: ${tenTiengViet}`;

    kiemTraPhanLoaiHợpLe(ketQuaAI);
}

// 6. BỘ XỬ LÝ LOGIC CHÍNH CHO 6 LEVEL 
async function kiemTraPhanLoaiHợpLe(vatPhamQuetDuoc) {
    let levelHienTai = kịchBản6Level[level];
    let alertBox = document.getElementById("game-alert");
    alertBox.className = ""; 

    if (levelHienTai.tenVatPham.includes(vatPhamQuetDuoc)) {
        score += 10;
        document.getElementById("score").innerText = score;
        
        // Thêm chữ thông báo cho hai bạn biết hệ thống đang test giả lập mượt mà
        if (writer) {
            alertBox.innerText = "✨ Chính xác! +10 Điểm. Đang lệnh mở nắp thùng vật lý...";
            await writer.write(new TextEncoder().encode(levelHienTai.thungMo));
        } else {
            alertBox.innerText = "✨ [TEST GIẢ LẬP] Chính xác! +10 Điểm. (Thùng rác ảo đã mở)";
        }
        alertBox.classList.add("alert-success");

        // KIỂM TRA ĐIỀU KIỆN CHUYỂN LEVEL (1 ĐẾN 6)
        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
                document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
                alert(`🎉 Xuất sắc! Bạn đã vượt qua cấp độ. Tiến vào CẤP ĐỘ ${level}!`);
            } else {
                ketThucGame(true);
            }
        }
    } else {
        alertBox.innerText = "❌ Sai rồi! Vật phẩm này không thuộc nhóm rác đang yêu cầu.";
        alertBox.classList.add("alert-wrong");
    }
}

// 7. HÀM KẾT THÚC TRẬN ĐẤU
function ketThucGame(isChienThang) {
    clearInterval(gameInterval);
    clearInterval(aiSimulationInterval);
    document.getElementById("btn-start").disabled = false; // Mở lại nút để chơi tiếp ván mới
    
    if (isChienThang) {
        alert("🏆 CHÚC MỪNG! BẠN ĐÃ VƯỢT QUA CẢ 6 CẤP ĐỘ VÀ BẢO VỆ MÔI TRƯỜNG THÀNH CÔNG!");
    } else {
        alert("⏰ Hết giờ! Hãy chuẩn bị lại các món rác thật chuẩn xác để thử thách lại nhé.");
    }
}

// TỰ ĐỘNG BẬT CAMERA VÀ MỞ KHÓA NÚT CHƠI KHI VỪA VÀO TRANG WEB
window.onload = function() {
    moWebcamMoi();
    document.getElementById("btn-start").disabled = false; // Bật nút Bắt đầu lên ngay lập tức!
    document.getElementById("mission").innerText = "Hệ thống giả lập đã sẵn sàng! Bấm Bắt đầu thử thách để test 6 Level.";
};
