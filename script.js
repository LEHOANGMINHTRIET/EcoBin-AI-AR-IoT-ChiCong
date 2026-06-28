let port, writer;
let score = 0, level = 1, timeLeft = 45;
let gameInterval;
let localStream = null, isCamOn = true;

let netModel = null; 
let thoiGianChoQuet = false;
let isGameRunning = false;

// BẢN ĐỒ ÁNH XẠ: Định nghĩa tên hiển thị Tiếng Việt cho rác rơi ảo
const thongTinRac = {
    "bottle": { emoji: "🍾", tenVN: "CHAI NHỰA" }, 
    "cup": { emoji: "🥤", tenVN: "LY NHỰA / CỐC GIẤY" },    
    "apple": { emoji: "🍎", tenVN: "RÁC TRÁI CÂY" },  
    "banana": { emoji: "🍌", tenVN: "VỎ CHUỐI HỮU CƠ" }, 
    "orange": { emoji: "🍊", tenVN: "VỎ CAM / QUÝT" }, 
    "sandwich": { emoji: "🥪", tenVN: "THỨC ĂN THỪA" },
    "book": { emoji: "📦", tenVN: "HỘP GIẤY / SÁCH" },   
    "cell phone": { emoji: "🛍️", tenVN: "TÚI NILON VÔ CƠ" }
};

const kịchBản6Level = {
    1: { tenVatPham: ["bottle", "cup"], thongBao: "Màn 1: Hãy đưa CHAI NHỰA hoặc LY NHỰA trước camera để TÁI CHẾ!", thungMo: "2", diemCanQua: 20 },
    2: { tenVatPham: ["apple", "banana", "orange", "sandwich"], thongBao: "Màn 2: Hãy đưa TRÁI CÂY hoặc THỨC ĂN THỪA để ủ phân HỮU CƠ!", thungMo: "1", diemCanQua: 40 },
    3: { tenVatPham: ["book", "cell phone"], thongBao: "Màn 3: Thu gom chất thải rắn còn lại vào Thùng VÔ CƠ!", thungMo: "3", diemCanQua: 60 },
    4: { tenVatPham: ["bottle"], thongBao: "Màn 4 Tăng tốc: Tìm thật nhanh CHAI NƯỚC NHỰA cứu lấy môi trường!", thungMo: "2", diemCanQua: 80 },
    5: { tenVatPham: ["banana", "apple"], thongBao: "Màn 5 Thử thách: Gom rác hữu cơ thực tế bón phân cho cây xanh!", thungMo: "1", diemCanQua: 100 },
    6: { tenVatPham: ["cup", "book"], thongBao: "Màn CHUNG KẾT: Tổng vệ sinh phân loại rác dâng tặng Lâm Đồng!", thungMo: "3", diemCanQua: 120 }
};

// 🔊 BỘ PHÁT ÂM THANH ĐIỆN TỬ CHUYÊN NGHIỆP (KHÔNG LO LỖI KHÔNG TẢI ĐƯỢC FILE)
function phatAmThanh(loai) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (loai === "dung") {
        // Tiếng Ting Ting vui tai
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Nốt D5
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // Nốt A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
    } else if (loai === "sai") {
        // Tiếng Buzzer trầm cảnh báo
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// 🗣️ TRỢ LÝ MC ẢO PHÁT GIỌNG NÓI TIẾNG VIỆT HƯỚNG DẪN MAN CHƠI
function mcDocHuongDan(vanBan) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Tắt giọng cũ trước khi nói giọng mới
        const loiNoi = new SpeechSynthesisUtterance(vanBan);
        loiNoi.lang = 'vi-VN';
        loiNoi.rate = 0.95; // Tốc độ nói vừa phải, truyền cảm
        loiNoi.pitch = 1.0; 
        window.speechSynthesis.speak(loiNoi);
    }
}

// 🧠 TẢI MÔ HÌNH AI TỪ GOOGLE
async function taiMoHinhAI() {
    try {
        netModel = await cocoSsd.load(); 
        document.getElementById("mission").style.background = "#e8f5e9";
        document.getElementById("mission").style.borderLeft = "6px solid #4caf50";
        document.getElementById("mission").style.color = "#2e7d32";
        document.getElementById("mission").innerText = "✅ Hệ thống AI COCO-SSD đã nạp xong bộ não! Hãy bấm Bắt đầu.";
        document.getElementById("btn-start").disabled = false;
        document.getElementById("ai-result").innerText = "📸 Đã kích hoạt mắt thần AI sẵn sàng phân loại!";
        
        // MC chào mừng khi mở trang xong
        mcDocHuongDan("Chào mừng hai bạn đến với mô hình phân loại rác thông minh trường trung học cơ sở Chí Công.");
    } catch (e) {
        document.getElementById("ai-result").innerText = "❌ Lỗi mạng nơ-ron AI.";
        document.getElementById("mission").innerText = "❌ Lỗi tải AI. Vui lòng kiểm tra kết nối Internet!";
    }
}

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Không kết nối được thiết bị video camera.";
    }
}

function batTatCamera() {
    const video = document.getElementById("webcam");
    const btn = document.getElementById("btn-toggle-cam");
    const canvas = document.getElementById("ai-canvas");
    if (isCamOn && localStream) {
        localStream.getTracks().forEach(track => track.stop());
        video.srcObject = null; isCamOn = false;
        btn.innerText = "📷 Bật Camera";
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa khung vẽ
    } else {
        moWebcamMoi().then(() => { btn.innerText = "📷 Tắt Camera"; });
    }
}

async function ketNoiArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        writer = port.writable.getWriter();
        document.getElementById("status").innerText = "Đã kết nối IoT Arduino ✔";
        document.getElementById("status").style.color = "#2e7d32";
    } catch (error) {
        alert("Chưa phát hiện thiết bị IoT thực tế. Chạy chế độ mô phỏng AR tương tác!");
    }
}

function batDauGame() {
    score = 0; level = 1; timeLeft = 45; thoiGianChoQuet = false; isGameRunning = true;
    document.getElementById("score").innerText = score;
    document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
    document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
    document.getElementById("btn-start").disabled = true;

    // Phát giọng nói MC màn 1
    mcDocHuongDan(kịchBản6Level[level].thongBao);

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) ketThucGame(false);
    }, 1000);

    quetVatTheVongLapAnToan(); 
}

// 👁️ MẮT THẦN AI QUÉT VÀ VẼ KHUNG ĐỐI TƯỢNG ĐỘNG (DYNAMIC BOUNDING BOX)
async function quetVatTheVongLapAnToan() {
    if (timeLeft <= 0 || !isGameRunning || !isCamOn || !netModel) return;

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("ai-canvas");
    
    if (video.readyState === 4) {
        // Khớp kích thước canvas bằng với khung hình video hiển thị thật
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa khung cũ

        try {
            const predictions = await netModel.detect(video);
            
            if (predictions.length > 0) {
                const vatThe = predictions[0];
                const tenGocVatThe = vatThe.class;
                const doChinhXac = vatThe.score;
                const [x, y, w, h] = vatThe.bbox; // Lấy tọa độ thật của vật thể trong khung hình

                // 🟩 VẼ KHUNG CHỮ NHẬT XANH ÔM KHÍT VẬT THỂ REAL-TIME
                ctx.strokeStyle = "#4caf50";
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, w, h);

                // Vẽ nhãn tên tiếng Anh nhỏ đè lên góc hộp
                ctx.fillStyle = "#4caf50";
                ctx.font = "bold 16px Arial";
                ctx.fillText(`${tenGocVatThe} (${(doChinhXac*100).toFixed(0)}%)`, x + 5, y + 20);

                // Xử lý logic khi đưa rác hợp lệ vào tầm ngắm
                if (doChinhXac > 0.60 && thongTinRac[tenGocVatThe] && !thoiGianChoQuet) {
                    thoiGianChoQuet = true; 
                    document.getElementById("ai-result").innerText = `🔍 AI PHÁT HIỆN: ${thongTinRac[tenGocVatThe].tenVN}`;
                    banRacVaoTrongGame(tenGocVatThe);
                }
            } else {
                document.getElementById("ai-result").innerText = "📸 Hãy giơ sản phẩm rác thực tế vào chính giữa Camera...";
            }
        } catch (err) {
            console.log("Đang tải dữ liệu khung hình...");
        }
    }

    // Tốc độ phản hồi cực cao: Quét liên tục sau 60 mili-giây (Instant response!)
    setTimeout(quetVatTheVongLapAnToan, 60);
}

// 🎮 ĐỒ HỌA GAME: RÁC RƠI TO, CHẬM, CÓ KÈM THEO NHÃN CHỮ TIẾNG VIỆT RÕ RÀNG
function banRacVaoTrongGame(loaiRac) {
    const gameDisplay = document.getElementById("gameDisplay");
    const racAo = document.createElement("div");
    racAo.className = "falling-trash";
    
    // Thêm cả Emoji lẫn chữ nhãn Tiếng Việt vào khối rác rơi
    racAo.innerHTML = `<span class="emoji">${thongTinRac[loaiRac].emoji}</span> <span>${thongTinRac[loaiRac].tenVN}</span>`;
    
    const viTriXNgauNhien = Math.floor(Math.random() * 45) + 15; 
    racAo.style.left = `${viTriXNgauNhien}%`;
    racAo.style.top = `-60px`;
    gameDisplay.appendChild(racAo);

    let thungMucTieu = "3"; 
    if (["apple", "banana", "orange", "sandwich"].includes(loaiRac)) thungMucTieu = "1"; 
    if (["bottle", "cup"].includes(loaiRac)) thungMucTieu = "2"; 

    const thungElement = document.getElementById(`g-bin-${thungMucTieu}`);

    // Cho rác rơi chậm rãi trong 2.2 giây để người xem nhìn rõ tên rác
    setTimeout(() => {
        const layToaDoXThung = thungElement.offsetLeft + (thungElement.clientWidth / 2) - 60;
        racAo.style.left = `${layToaDoXThung}px`;
        racAo.style.top = `${gameDisplay.clientHeight - 155}px`;
        racAo.style.transform = "scale(0.4) rotate(180deg)";
        racAo.style.opacity = "0.4";
    }, 150);

    setTimeout(() => {
        racAo.remove();
        thungElement.classList.add("bin-bounce");
        setTimeout(() => thungElement.classList.remove("bin-bounce"), 250);

        xuLyLogicGame(loaiRac, thungMucTieu);
        
        setTimeout(() => { thoiGianChoQuet = false; }, 1500); 
    }, 2200);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];

    if (levelHienTai.tenVatPham.includes(loaiRac)) {
        score += 10;
        document.getElementById("score").innerText = score;
        document.getElementById("ai-result").innerText = `✨ CHÍNH XÁC! +10 Điểm thành tích xanh.`;
        
        // Cập nhật bảng thống kê phụ cho giao diện sinh động
        document.getElementById("co2-val").innerText = score * 1.5;
        if(score >= 40) document.getElementById("eco-rank").innerText = "Hiệp sĩ xanh";

        phatAmThanh("dung"); // Phát tiếng Ting Ting!
        
        if (writer) {
            await writer.write(new TextEncoder().encode(levelHienTai.thungMo));
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                timeLeft = 45; // ⏱️ HỒI LẠI ĐẦY ĐỦ 45 GIÂY CHO CẤP ĐỘ MỚI
                document.getElementById("timer").innerText = timeLeft;
                document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
                document.getElementById("mission").innerText = kịchBản6Level[level].thongBao;
                
                // MC ảo phát âm nói thông báo màn chơi mới
                mcDocHuongDan("Chúc mừng bạn đã vượt qua màn chơi. " + kịchBản6Level[level].thongBao);
                alert(`🎉 Tuyệt vời! AI xác nhận hoàn thành mục tiêu. Tiến vào CẤP ĐỘ ${level}!`);
            } else {
                ketThucGame(true);
            }
        }
    } else {
        phatAmThanh("sai"); // Phát tiếng Buzzer cảnh báo!
        document.getElementById("ai-result").innerText = "❌ SAI THÙNG RỒI! Hãy đọc kỹ yêu cầu nhiệm vụ của MC.";
    }
}

function ketThucGame(isChienThang) {
    isGameRunning = false;
    clearInterval(gameInterval);
    const canvas = document.getElementById("ai-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa khung vẽ khi dừng game
    
    document.getElementById("btn-start").disabled = false;
    if (isChienThang) {
        mcDocHuongDan("Chúc mừng hai bạn đã hoàn thành xuất sắc thử thách phân loại rác.");
        alert("🏆 CHIẾN THẮNG XUẤT SẮC! Hệ thống AI Mắt thần đã hoàn thành xuất sắc nhiệm vụ bảo vệ Lâm Đồng!");
    } else {
        mcDocHuongDan("Đã hết thời gian quy định, vui lòng thử lại.");
        alert("⏰ HẾT GIỜ THỬ THÁCH! Hãy bấm Bắt đầu để dọn dẹp lại nhé.");
    }
}

window.onload = function() {
    moWebcamMoi().then(() => {
        taiMoHinhAI();
    });
};
