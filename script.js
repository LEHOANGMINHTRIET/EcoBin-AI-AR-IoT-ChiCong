let port, writer;
let score = 0, level = 1, timeLeft = 45;
let gameInterval;
let localStream = null, isCamOn = true;

let netModel = null; 
let thoiGianChoQuet = false;
let isGameRunning = false;
let vatPhamMucTieuHienTai = ""; // Lưu trữ từ khóa rác MC đang yêu cầu

const thongTinRac = {
    "bottle": { emoji: "🍾", tenVN: "CHAI NHỰA", thung: "2", đọc: "chai nhựa" }, 
    "cup": { emoji: "🥤", tenVN: "LY NHỰA / CỐC GIẤY", thung: "2", đọc: "ly nhựa hoặc cốc giấy" },    
    "apple": { emoji: "🍎", tenVN: "RÁC TRÁI CÂY TÁO", thung: "1", đọc: "quả táo hữu cơ" },  
    "banana": { emoji: "🍌", tenVN: "VỎ CHUỐI HỮU CƠ", thung: "1", đọc: "vỏ chuối hữu cơ" }, 
    "orange": { emoji: "🍊", tenVN: "VỎ CAM QUÝT", thung: "1", đọc: "vỏ cam quýt" }, 
    "sandwich": { emoji: "🥪", tenVN: "THỨC ĂN THỪA", thung: "1", đọc: "thức ăn thừa" },
    "book": { emoji: "📦", tenVN: "HỘP GIẤY / SÁCH", thung: "3", đọc: "hộp giấy hoặc sách cũ" },   
    "cell phone": { emoji: "🛍️", tenVN: "TÚI NILON VÔ CƠ", thung: "3", đọc: "túi nilon hoặc rác vô cơ" }
};

const kịchBản6Level = {
    1: { tenVatPham: ["bottle", "cup"], loiMởĐầu: "Màn 1, tập sự phân loại. ", diemCanQua: 20 },
    2: { tenVatPham: ["apple", "banana", "orange", "sandwich"], loiMởĐầu: "Màn 2, nông trại hữu cơ. ", diemCanQua: 40 },
    3: { tenVatPham: ["book", "cell phone"], loiMởĐầu: "Màn 3, thu gom chất thải rắn. ", diemCanQua: 60 },
    4: { tenVatPham: ["bottle", "cup", "book"], loiMởĐầu: "Màn 4 tăng tốc, phân loại nhanh cứu lấy môi trường. ", diemCanQua: 80 },
    5: { tenVatPham: ["banana", "apple", "bottle"], loiMởĐầu: "Màn 5 thử thách đại sứ kiên trì. ", diemCanQua: 100 },
    6: { tenVatPham: ["bottle", "cup", "apple", "banana", "orange", "sandwich", "book", "cell phone"], loiMởĐầu: "Màn chung kết xanh, tổng vệ sinh dâng tặng Lâm Đồng. ", diemCanQua: 120 }
};

// 🔊 BỘ TỔNG HỢP ÂM THANH ĐIỆN TỬ
function phatAmThanh(loai) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (loai === "dung") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (loai === "sai") {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(140, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.35);
    }
}

// 🗣️ TRỢ LÝ MC ẢO GIỌNG NỮ TIẾNG VIỆT ĐƯỢC ÉP CẤU HÌNH BẮT BUỘC
function mcDocHuongDan(vanBan) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const loiNoi = new SpeechSynthesisUtterance(vanBan);
        loiNoi.lang = 'vi-VN';
        loiNoi.rate = 0.92; // Tốc độ đọc diễn cảm chuyên nghiệp
        loiNoi.pitch = 1.1; // Chỉnh giọng cao thanh thoát (chuẩn nữ)

        // Khớp tìm gói giọng nữ Tiếng Việt của hệ điều hành
        const cacGiongDoc = window.speechSynthesis.getVoices();
        const giongVietNu = cacGiongDoc.find(v => v.lang.includes('vi-VN') && (v.name.toLowerCase().includes('nu') || v.name.toLowerCase().includes('anhi') || v.name.toLowerCase().includes('zira')));
        if (giongVietNu) {
            loiNoi.voice = giongVietNu;
        }
        window.speechSynthesis.speak(loiNoi);
    }
}

// Hàm đảm bảo nạp thư viện giọng nói ngay khi mở trình duyệt
window.speechSynthesis.onvoiceschanged = () => {};

// 🧠 KHỞI ĐỘNG AI LÕI TRANG WEB
async function taiMoHinhAI() {
    try {
        netModel = await cocoSsd.load(); 
        document.getElementById("mission").style.background = "#e8f5e9";
        document.getElementById("mission").style.borderLeft = "6px solid #4caf50";
        document.getElementById("mission").style.color = "#2e7d32";
        document.getElementById("mission").innerText = "✅ Bộ não AI đã nạp xong 100%! Hãy bấm nút Bắt đầu.";
        document.getElementById("btn-start").disabled = false;
        document.getElementById("ai-result").innerText = "📸 Đã kích hoạt mắt thần AI sẵn sàng!";
        
        mcDocHuongDan("Hệ thống đã sẵn sàng. Hãy bấm nút bắt đầu thử thách phân loại rác.");
    } catch (e) {
        document.getElementById("mission").innerText = "❌ Lỗi kết nối máy chủ AI. Vui lòng tải lại trang!";
    }
}

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Thiết bị thiếu quyền truy cập Camera.";
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        alert("Chạy chế độ mô phỏng AR tương tác!");
    }
}

// TẠO LỆNH NGẪU NHIÊN CHO MỖI PHÂN ĐOẠN MÀN CHƠI
function taoLenhYeuCauNgauNhien() {
    let mangVatPhamCuaLevel = kịchBản6Level[level].tenVatPham;
    // Chọn ngẫu nhiên 1 vật phẩm trong danh sách cho phép của màn đó
    vatPhamMucTieuHienTai = mangVatPhamCuaLevel[Math.floor(Math.random() * mangVatPhamCuaLevel.length)];
    
    let thongBaoChu = `YÊU CẦU: Hãy tìm và đưa [${thongTinRac[vatPhamMucTieuHienTai].tenVN}] trước Camera!`;
    let loiDocMc = `Hãy tìm và đưa ${thongTinRac[vatPhamMucTieuHienTai].đọc} trước camera`;

    document.getElementById("mission").innerText = thongBaoChu;
    mcDocHuongDan(loiDocMc);
}

function batDauGame() {
    score = 0; level = 1; timeLeft = 45; thoiGianChoQuet = false; isGameRunning = true;
    document.getElementById("score").innerText = score;
    document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
    document.getElementById("btn-start").disabled = true;

    // MC đọc mở đầu màn 1 kèm lệnh yêu cầu đầu tiên
    mcDocHuongDan(kịchBản6Level[level].loiMởĐầu);
    setTimeout(taoLenhYeuCauNgauNhien, 1500);

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) ketThucGame(false);
    }, 1000);

    quetVatTheVongLapAnToan(); 
}

// 👁️ MẮT THẦN AI: TĂNG CAO ĐỘ NHẠY (0.45) VÀ ĐỒNG BỘ KHUNG THỰC REAL-TIME
async function quetVatTheVongLapAnToan() {
    if (timeLeft <= 0 || !isGameRunning || !isCamOn || !netModel) return;

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("ai-canvas");
    
    if (video.readyState === 4) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
            const predictions = await netModel.detect(video);
            
            // Tìm vật thể đầu tiên thuộc danh sách định nghĩa rác của chúng ta
            const vatTheHợpLệ = predictions.find(p => thongTinRac[p.class]);

            if (vatTheHợpLệ) {
                const tenGocVatThe = vatTheHợpLệ.class;
                const doChinhXac = vatTheHợpLệ.score;
                const [x, y, w, h] = vatTheHợpLệ.bbox;

                // Vẽ khung Bounding Box sắc nét ôm sát vật phẩm thực tế
                ctx.strokeStyle = "#00e676";
                ctx.lineWidth = 5;
                ctx.strokeRect(x, y, w, h);

                ctx.fillStyle = "#00e676";
                ctx.font = "bold 16px Arial";
                ctx.fillText(`${thongTinRac[tenGocVatThe].tenVN} (${(doChinhXac*100).toFixed(0)}%)`, x + 5, y + 22);

                // Độ nhạy cực cao (giữ ngưỡng 0.45 để giơ lên nhận ngay lập tức)
                if (doChinhXac > 0.45 && !thoiGianChoQuet) {
                    thoiGianChoQuet = true;
                    // MC hướng dẫn thời gian thực khi quét thấy rác
                    mcDocHuongDan(`Phát hiện thấy ${thongTinRac[tenGocVatThe].đọc}. Đang xử lý phân loại.`);
                    document.getElementById("ai-result").innerText = `🔍 AI ĐANG QUÉT: ${thongTinRac[tenGocVatThe].tenVN}`;
                    
                    banRacVaoTrongGame(tenGocVatThe);
                }
            } else {
                document.getElementById("ai-result").innerText = "📸 Hãy đưa vật phẩm vào vùng quét trung tâm của Camera...";
            }
        } catch (err) {
            console.log("Đang tải dữ liệu...");
        }
    }

    // Vòng quét siêu tốc 50ms giúp phản hồi tức thì
    setTimeout(quetVatTheVongLapAnToan, 50);
}

// 🎮 ĐỒ HỌA GAME RƠI MỚI CHUYỂN ĐỘNG THEO QUỸ ĐẠO MƯỢT MÀ VÀO THÙNG
function banRacVaoTrongGame(loaiRac) {
    const gameDisplay = document.getElementById("gameDisplay");
    const racAo = document.createElement("div");
    racAo.className = "falling-trash";
    
    // Đồ họa hiển thị chữ tiếng Việt đi kèm hình rác rơi cực rõ ràng
    racAo.innerHTML = `<span class="emoji">${thongTinRac[loaiRac].emoji}</span><span>${thongTinRac[loaiRac].tenVN}</span>`;
    
    const viTriXNgauNhien = Math.floor(Math.random() * 40) + 20; 
    racAo.style.left = `${viTriXNgauNhien}%`;
    racAo.style.top = `-70px`;
    gameDisplay.appendChild(racAo);

    const thungMucTieu = thongTinRac[loaiRac].thung;
    const thungElement = document.getElementById(`g-bin-${thungMucTieu}`);

    // Hiệu ứng vật lý rơi tịnh tiến mượt mà
    setTimeout(() => {
        const layToaDoXThung = thungElement.offsetLeft + (thungElement.clientWidth / 2) - 65;
        racAo.style.left = `${layToaDoXThung}px`;
        racAo.style.top = `${gameDisplay.clientHeight - 155}px`;
        racAo.style.transform = "scale(0.5) rotate(180deg)";
        racAo.style.opacity = "0.4";
    }, 100);

    setTimeout(() => {
        racAo.remove();
        thungElement.classList.add("bin-bounce");
        setTimeout(() => thungElement.classList.remove("bin-bounce"), 250);

        xuLyLogicGame(loaiRac, thungMucTieu);
        
        // Trì hoãn 2 giây khóa quét để người xem thưởng thức trọn vẹn hiệu ứng rác rơi
        setTimeout(() => { thoiGianChoQuet = false; }, 2000); 
    }, 2000);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];

    // KIỂM TRA ĐỐI CHIẾU: Phải trùng khớp 100% với vật phẩm MC đang ra lệnh ngẫu nhiên
    if (loaiRac === vatPhamMucTieuHienTai) {
        score += 10;
        document.getElementById("score").innerText = score;
        document.getElementById("ai-result").innerText = `✨ CHÍNH XÁC XUẤT SẮC! +10 Điểm.`;
        
        document.getElementById("co2-val").innerText = score * 1.5;
        if(score >= 40) document.getElementById("eco-rank").innerText = "Hiệp sĩ bảo vệ rừng";

        phatAmThanh("dung"); // Kích hoạt âm thanh Ting Ting
        mcDocHuongDan("Bạn đã làm rất tốt, cộng 10 điểm.");

        if (writer) {
            await writer.write(new TextEncoder().encode(thungMucTieu));
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                timeLeft = 45; // ⏱️ HỒI LẠI ĐẦY ĐỦ 45 GIÂY CHO CẤP ĐỘ MỚI
                document.getElementById("timer").innerText = timeLeft;
                document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
                
                mcDocHuongDan(`Chúc mừng hai bạn vượt cấp thành công. Tiến vào ${kịchBản6Level[level].loiMởĐầu}`);
                alert(`🎉 Tuyệt vời! Bạn đã vượt qua màn. Tiến vào CẤP ĐỘ ${level}!`);
                
                setTimeout(taoLenhYeuCauNgauNhien, 3500);
            } else {
                ketThucGame(true);
            }
        } else {
            // Nếu chưa đủ điểm qua màn, MC lập tức ra thêm một lệnh ngẫu nhiên mới
            setTimeout(taoLenhYeuCauNgauNhien, 1500);
        }
    } else {
        phatAmThanh("sai"); // Âm thanh Buzzer báo lỗi
        mcDocHuongDan("Sai rồi. Vật phẩm này không đúng yêu cầu của màn chơi.");
        document.getElementById("ai-result").innerText = "❌ KHÔNG KHỚP YÊU CẦU! Hãy kiểm tra kỹ lệnh yêu cầu của MC.";
        
        // Cho phép đổi lệnh mới nếu làm sai để người chơi không bị kẹt
        setTimeout(taoLenhYeuCauNgauNhien, 2000);
    }
}

function ketThucGame(isChienThang) {
    isGameRunning = false;
    clearInterval(gameInterval);
    const canvas = document.getElementById("ai-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    document.getElementById("btn-start").disabled = false;
    if (isChienThang) {
        mcDocHuongDan("Chúc mừng hai bạn đã hoàn thành xuất sắc tất cả các cấp độ chơi và bảo vệ hành tinh xanh.");
        alert("🏆 CHIẾN THẮNG TUYỆT ĐỐI! Chúc mừng các nhà khoa học trẻ của trường Chí Công!");
    } else {
        mcDocHuongDan("Rất tiếc, đã hết thời gian thử thách. Hãy thử lại từ đầu.");
        alert("⏰ HẾT GIỜ! Đừng nản chí, hãy bấm Bắt đầu để thử thách lại nhé.");
    }
}

window.onload = function() {
    moWebcamMoi().then(() => {
        taiMoHinhAI();
    });
};
