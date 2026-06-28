let port;
let writer;
let score = 0;
let level = 1;
let timeLeft = 45;
let gameInterval;
let aiSimulationInterval;

// Định nghĩa cấu trúc yêu cầu của cả 6 Cấp độ
const kịchBản6Level = {
    1: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 1: Thu gom RÁC TÁI CHẾ (Chai nhựa / Vỏ lon nhôm)", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["la_cay", "vo_chuoi"], thongBao: "Màn 2: Thu gom RÁC HỮU CƠ (Lá cây / Vỏ trái cây)", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["tui_nilon", "hop_xop"], thongBao: "Màn 3: Thu gom RÁC VÔ CƠ (Túi nilon / Hộp xốp)", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh 2 món RÁC TÁI CHẾ!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["la_cay"], thongBao: "Màn 5 Thử thách: Tìm đúng LÁ CÂY để bón phân cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["tui_nilon"], thongBao: "Màn CHUNG KẾT: Dọn sạch túi nilon để giải cứu Lâm Đồng!", thungMo: "3", diemCanQua: 120 }
};

// 1. KẾT NỐI MẠCH ARDUINO QUA WEB SERIAL API
async function ketNoiArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        writer = port.writable.getWriter();
        
        document.getElementById("status").innerText = "Trạng thái: Đã kết nối Thùng Rác thành công! ✔";
        document.getElementById("status").style.color = "#2e7d32";
        document.getElementById("btn-start").disabled = false; // Mở khóa nút chơi game
        
        moWebcamMoi();
    } catch (error) {
        alert("Không thể kết nối cổng COM phần cứng. Hãy thử lại!");
        console.error(error);
    }
}

// 2. KHỞI ĐỘNG WEBCAM TRÊN GIAO DIỆN GAME
async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        alert("Không tìm thấy Webcam trên máy tính của bạn!");
    }
}

// 3. KHỞI ĐỘNG TRẬN ĐẤU VÀ ĐỒNG HỒ ĐẾM NGƯỢC
function batDauGame() {
    // Đặt lại các thông số ban đầu
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

    // Bắt đầu vòng quét AI (Trong khi đợi linh kiện, hệ thống sẽ tự động giả lập bốc rác ngẫu nhiên)
    clearInterval(aiSimulationInterval);
    aiSimulationInterval = setInterval(quetAnhBangAI, 2500);
}

// 4. HÀM QUÉT AI (Hiện tại giả lập ngẫu nhiên, có thiết bị thật giơ lên sẽ khớp lệnh)
function quetAnhBangAI() {
    if (timeLeft <= 0) return;

    const danhSachGiaLap = ["chai_nhua", "la_cay", "tui_nilon", "vo_chuoi", "hop_xop", "rac_doc_hai"];
    const ketQuaAI = danhSachGiaLap[Math.floor(Math.random() * danhSachGiaLap.length)];
    
    // Đổi tên hiển thị tiếng Việt trực quan trên giao diện
    let tenTiengViet = ketQuaAI.replace("_", " ").toUpperCase();
    document.getElementById("ai-result").innerText = `🔍 AI PHÁT HIỆN VẬT PHẨM: ${tenTiengViet}`;

    // Gửi vật phẩm vào bộ xử lý 6 cấp độ
    kiemTraPhanLoaiHợpLe(ketQuaAI);
}

// 5. BỘ XỬ LÝ LOGIC CHÍNH CHO 6 LEVEL VÀ RA LỆNH ARDUINO
async function kiemTraPhanLoaiHợpLe(vatPhamQuetDuoc) {
    if (!writer) return;

    let levelHienTai = kịchBản6Level[level];
    let alertBox = document.getElementById("game-alert");
    alertBox.className = ""; // Reset class css

    // Kiểm tra xem vật phẩm giơ lên có khớp với yêu cầu của Level hiện tại không
    if (levelHienTai.tenVatPham.includes(vatPhamQuetDuoc)) {
        // TÍNH ĐIỂM CHÍNH XÁC
        score += 10;
        document.getElementById("score").innerText = score;
        
        // HIỆN HIỆU ỨNG THÔNG BÁO CHÚC MỪNG TRÊN TRÌNH DUYỆT
        alertBox.innerText = " chính xác! +10 Điểm. Đang mở nắp thùng rác...";
        alertBox.classList.add("alert-success");

        // BẮN TÍN HIỆU XUỐNG ARDUINO QUA USB ĐỂ MỞ THÙNG
        await writer.write(new TextEncoder().encode(levelHienTai.thungMo));

        // KIỂM TRA ĐIỀU KIỆN LEVEL UP (CHUYỂN CẤP ĐỘ)
        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                document.getElementById("current-level").innerText = `CẤP ĐỘ: ${level}`;
                document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
                alert(`🎉 Xuất sắc! Bạn đã vượt qua cấp độ. Tiến vào CẤP ĐỘ ${level}!`);
            } else {
                // Nếu vượt qua màn 6 tức là thắng cuộc hoàn toàn
                ketThucGame(true);
            }
        }
    } else {
        // NGƯỜI CHƠI ĐƯA SAI LOẠI RÁC YÊU CẦU
        alertBox.innerText = "❌ Sai rồi! Vật phẩm này không thuộc nhóm rác đang yêu cầu.";
        alertBox.classList.add("alert-wrong");
    }
}

// 6. HÀM KẾT THÚC TRẬN ĐẤU
function ketThucGame(isChienThang) {
    clearInterval(gameInterval);
    clearInterval(aiSimulationInterval);
    document.getElementById("btn-start").disabled = false;
    
    if (isChienThang) {
        alert("🏆 CHÚC MỪNG! HAI BẠN ĐÃ CHIẾN THẮNG TRÒ CHƠI VÀ BẢO VỆ MÔI TRƯỜNG LÂM ĐỒNG THÀNH CÔNG!");
    } else {
        alert("⏰ Hết giờ! Hãy chuẩn bị lại các món rác thật chuẩn xác để thử thách lại nhé.");
    }
}