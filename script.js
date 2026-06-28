let port;
let writer;
let score = 0;
let level = 1;
let timeLeft = 45;
let gameInterval;
let aiSimulationInterval;
let localStream = null;
let isCamOn = true;

// Khai báo các Emoji đại diện cho rác để hiển thị rác ảo rơi trên màn hình
const hinhAnhRacAo = {
    "chai_nhua": "🍾", "vo_lon": "🥫", 
    "la_cay": "🍃", "vo_chuoi": "🍌", 
    "tui_nilon": "🛍️", "hop_xop": "📦",
    "rac_doc_hai": "🔋"
};

const kịchBản6Level = {
    1: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 1: Thu gom RÁC TÁI CHẾ (Chai nhựa / Vỏ lon nhôm)", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["la_cay", "vo_chuoi"], thongBao: "Màn 2: Thu gom RÁC HỮU CƠ (Lá cây / Vỏ trái cây)", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["tui_nilon", "hop_xop"], thongBao: "Màn 3: Thu gom RÁC VÔ CƠ (Túi nilon / Hộp xốp)", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["chai_nhua", "vo_lon"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh 2 món RÁC TÁI CHẾ!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["la_cay"], thongBao: "Màn 5 Thử thách: Tìm đúng LÁ CÂY để bón phân cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["tui_nilon"], thongBao: "Màn CHUNG KẾT: Dọn sạch túi nilon để giải cứu Lâm Đồng!", thungMo: "3", diemCanQua: 120 }
};

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
        document.getElementById("btn-toggle-cam").innerText = "📷 Tắt Camera";
        document.getElementById("ai-result").innerText = "📸 Camera sẵn sàng! Bấm Bắt đầu chơi.";
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Không tìm thấy Webcam.";
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
        document.getElementById("ai-result").innerText = "🔒 Camera đã tắt.";
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
        alert("Không kết nối được phần cứng. Bạn vẫn chơi test giả lập AR bằng camera bình thường!");
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
    aiSimulationInterval = setInterval(quetAnhBangAI, 3000); // 3 giây quét 1 lần cho hai bạn kịp nhìn hiệu ứng rác rơi
}

function quetAnhBangAI() {
    if (timeLeft <= 0) return;
    const danhSachGiaLap = ["chai_nhua", "la_cay", "tui_nilon", "vo_chuoi", "hop_xop", "vo_lon"];
    const ketQuaAI = danhSachGiaLap[Math.floor(Math.random() * danhSachGiaLap.length)];
    
    let tenTiengViet = ketQuaAI.replace("_", " ").toUpperCase();
    document.getElementById("ai-result").innerText = `🔍 AI PHÁT HIỆN VẬT PHẨM: ${tenTiengViet}`;

    // Tạo hiệu ứng Rác thực tế đi vào game ảo
    taoHieuUngRacAoRoi(ketQuaAI);
}

// 🎮 HÀM CỐT LÕI: TẠO VẬT PHẨM ẢO XUẤT HIỆN TRÊN CAMERA VÀ RƠI XUỐNG THÙNG RÁC
function taoHieuUngRacAoRoi(loaiRac) {
    const gameZone = document.getElementById("game-zone");
    const itemAo = document.createElement("div");
    
    itemAo.className = "virtual-trash";
    itemAo.innerText = hinhAnhRacAo[loaiRac] || "🗑️";
    
    // Xuất hiện ngẫu nhiên ở phần trên của khung quét (vị trí tay hai bạn hay giơ rác lên)
    itemAo.style.top = "20%";
    itemAo.style.left = `${Math.floor(Math.random() * 60) + 20}%`; 
    gameZone.appendChild(itemAo);

    // Xác định rác này đúng logic thì thuộc về thùng số mấy
    let thungMucTieu = "3"; // Mặc định vô cơ
    if (["la_cay", "vo_chuoi"].includes(loaiRac)) thungMucTieu = "1";
    if (["chai_nhua", "vo_lon"].includes(loaiRac)) thungMucTieu = "2";

    // Lấy vị trí tọa độ của chiếc thùng rác mục tiêu dưới đáy để rác rơi trúng vào đó
    const thungElement = document.getElementById(`v-bin-${thungMucTieu}`);
    
    // Sau 200 miligiây, kích hoạt lệnh cho rác ảo tự động bay thẳng xuống trúng thùng rác đó
    setTimeout(() => {
        itemAo.style.top = "85%";
        itemAo.style.left = `${thungElement.offsetLeft + 40}px`;
        itemAo.style.transform = "scale(0.3) rotate(360deg)"; // Hiệu ứng thu nhỏ và xoay khi lọt vào thùng
        itemAo.style.opacity = "0";
    }, 200);

    // Khi rác đã lọt vào thùng (sau 1 giây), tiến hành tính điểm và ra lệnh phần cứng
    setTimeout(() => {
        itemAo.remove(); // Xóa rác ảo khỏi màn hình
        
        // Kích hoạt nháy sáng thùng rác ảo mục tiêu để chứng minh đã nhận được rác
        thungElement.classList.add("bin-active");
        setTimeout(() => thungElement.classList.remove("bin-active"), 400);

        // Gọi bộ lọc xử lý logic để tính điểm, tăng màn hoặc mở nắp thùng thật qua Arduino
        xuLyLogicGame(loaiRac, thungMucTieu);
    }, 1200);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];
    let alertBox = document.getElementById("game-alert");
    alertBox.className = "alert-box"; 

    // Nếu rác quét được nằm trong danh sách yêu cầu của Màn chơi hiện tại
    if (levelHienTai.tenVatPham.includes(loaiRac)) {
        score += 10;
        document.getElementById("score").innerText = score;
        
        if (writer) {
            alertBox.innerText = `✨ Đúng rác! +10 Điểm. Đã mở nắp thùng thật số ${thungMucTieu}!`;
            await writer.write(new TextEncoder().encode(levelHienTai.thungMo));
        } else {
            alertBox.innerText = `✨ [GIẢ LẬP AR] Nhập thùng ${thungMucTieu} thành công! +10đ`;
        }
        alertBox.classList.add("alert-success");

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
        alertBox.innerText = "❌ Sai loại rác yêu cầu của màn này rồi!";
        alertBox.classList.add("alert-wrong");
    }
}

function ketThucGame(isChienThang) {
    clearInterval(gameInterval);
    clearInterval(aiSimulationInterval);
    document.getElementById("btn-start").disabled = false;
    if (isChienThang) {
        alert("🏆 TUYỆT VỜI! HAI BẠN ĐÃ HOÀN THÀNH XUẤT SẮC GAME THỰC TẾ ẢO AR VÀ PHÂN LOẠI RÁC THÀNH CÔNG!");
    } else {
        alert("⏰ Hết giờ! Hãy chuẩn bị lại rác mẫu để thử thách lại nhé.");
    }
}

window.onload = function() {
    moWebcamMoi();
};
