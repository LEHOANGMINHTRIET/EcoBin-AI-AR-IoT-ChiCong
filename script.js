let port, writer;
let score = 0, level = 1, timeLeft = 45;
let gameInterval;
let localStream = null, isCamOn = true;

let netModel = null; 
let thoiGianChoQuet = false;
let isGameRunning = false;
let vatPhamMucTieuHienTai = ""; // Lưu trữ từ khóa rác MC đang yêu cầu ngẫu nhiên

// THƯ VIỆN DỮ LIỆU RÁC CHUẨN HÓA
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

// CẤU TRÚC KỊCH BẢN 6 CẤP ĐỘ KHÓ
const kịchBản6Level = {
    1: { tenVatPham: ["bottle", "cup"], loiMởĐầu: "Màn một, tập sự phân loại. ", diemCanQua: 20 },
    2: { tenVatPham: ["apple", "banana", "orange", "sandwich"], loiMởĐầu: "Màn hai, nông trại hữu cơ. ", diemCanQua: 40 },
    3: { tenVatPham: ["book", "cell phone"], loiMởĐầu: "Màn ba, thu gom chất thải rắn. ", diemCanQua: 60 },
    4: { tenVatPham: ["bottle", "cup", "book"], loiMởĐầu: "Màn bốn tăng tốc, phân loại nhanh cứu lấy môi trường. ", diemCanQua: 80 },
    5: { tenVatPham: ["banana", "apple", "bottle"], loiMởĐầu: "Màn năm thử thách đại sứ kiên trì. ", diemCanQua: 100 },
    6: { tenVatPham: ["bottle", "cup", "apple", "banana", "orange", "sandwich", "book", "cell phone"], loiMởĐầu: "Màn chung kết xanh, tổng vệ sinh dâng tặng Lâm Đồng. ", diemCanQua: 120 }
};

// 🔊 BỘ TỔNG HỢP ÂM THANH ĐIỆN TỬ TỰ ĐỘNG (KHÔNG LO LỖI FILE CHẬM)
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

// 🗣️ TRỢ LÝ MC ẢO GIỌNG NỮ TIẾNG VIỆT - PHIÊN BẢN NÂNG CẤP PHÒNG THU (RÕ CHỮ 100%)
function mcDocHuongDan(vanBan) {
    if (!('speechSynthesis' in window)) return;

    // Xóa sạch các câu lệnh cũ đang xếp hàng để tránh bị vấp chữ
    window.speechSynthesis.cancel();

    const phatGiongChuanCaoCap = () => {
        const loiNoi = new SpeechSynthesisUtterance(vanBan);
        
        loiNoi.lang = 'vi-VN';
        loiNoi.rate = 0.95; // Tốc độ vàng giúp phát âm tiếng Việt tròn vành rõ chữ
        loiNoi.pitch = 1.0;  // Giữ tông giọng tự nhiên, không bị chói

        const danhSachGiong = window.speechSynthesis.getVoices();
        
        // 🌟 CHIẾN THUẬT SĂN GIỌNG CAO CẤP: Ưu tiên tìm giọng AI Online/Natural trước
        let giongDocToiUu = danhSachGiong.find(v => 
            v.lang.toLowerCase().replace('_', '-').includes('vi-vn') && 
            (v.name.toLowerCase().includes('online') || 
             v.name.toLowerCase().includes('natural') || 
             v.name.toLowerCase().includes('neural') || 
             v.name.toLowerCase().includes('le'))
        );

        // Nếu máy không có giọng Online, mới dùng giọng Tiếng Việt tiêu chuẩn làm phương án dự phòng
        if (!giongDocToiUu) {
            giongDocToiUu = danhSachGiong.find(v => 
                v.lang.toLowerCase().replace('_', '-').includes('vi-vn') || 
                v.name.toLowerCase().includes('vietnam')
            );
        }

        // Khóa chặt giọng đọc cao cấp vừa tìm được
        if (giongDocToiUu) {
            loiNoi.voice = giongDocToiUu;
            loiNoi.lang = giongDocToiUu.lang;
            console.log("🎯 AI đã chọn giọng đọc chất lượng cao: " + giongDocToiUu.name);
        }

        window.speechSynthesis.speak(loiNoi);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = phatGiongChuanCaoCap;
    } else {
        phatGiongChuanCaoCap();
    }
}

// 🧠 TẢI MÔ HÌNH NÃO BỘ AI COCO-SSD
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
        document.getElementById("mission").innerText = "❌ Lỗi kết nối mạng AI. Vui lòng tải lại trang!";
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

// 🎲 HÀM PHÁT HIỆU LỆNH NHIỆM VỤ NGẪU NHIÊN THEO THỜI GIAN THỰC
function taoLenhYeuCauNgauNhien() {
    if (!isGameRunning) return;
    let mangVatPhamCuaLevel = kịchBản6Level[level].tenVatPham;
    
    // Xáo trộn ngẫu nhiên đề bài yêu cầu tìm vật phẩm rác
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

    // MC giới thiệu tên màn chơi trước khi ra lệnh ngẫu nhiên
    mcDocHuongDan(kịchBản6Level[level].loiMởĐầu);
    setTimeout(taoLenhYeuCauNgauNhien, 2000);

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) ketThucGame(false);
    }, 1000);

    quetVatTheVongLapAnToan(); 
}

// 👁️ MẮT THẦN AI: SIÊU NHẠY (0.45) VÀ ĐỒNG BỘ ĐỘNG KHUNG THỰC REAL-TIME
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
            
            // Tìm kiếm nhanh xem có vật thể nào thuộc danh sách rác quy định lọt vào camera không
            const vatTheHợpLệ = predictions.find(p => thongTinRac[p.class]);

            if (vatTheHợpLệ) {
                const tenGocVatThe = vatTheHợpLệ.class;
                const doChinhXac = vatTheHợpLệ.score;
                const [x, y, w, h] = vatTheHợpLệ.bbox;

                // 🟩 Vẽ khung Bounding Box ôm khít chuẩn xác vật phẩm thực tế
                ctx.strokeStyle = "#00e676";
                ctx.lineWidth = 5;
                ctx.strokeRect(x, y, w, h);

                ctx.fillStyle = "#00e676";
                ctx.font = "bold 16px Arial";
                ctx.fillText(`${thongTinRac[tenGocVatThe].tenVN} (${(doChinhXac*100).toFixed(0)}%)`, x + 5, y + 22);

                // Ngưỡng 0.45 cực kỳ nhạy, nhận diện vật phẩm ngay lập tức khi giơ lên
                if (doChinhXac > 0.45 && !thoiGianChoQuet) {
                    thoiGianChoQuet = true;
                    mcDocHuongDan(`Phát hiện thấy ${thongTinRac[tenGocVatThe].đọc}. Đang tiến hành phân loại.`);
                    document.getElementById("ai-result").innerText = `🔍 AI ĐANG QUÉT: ${thongTinRac[tenGocVatThe].tenVN}`;
                    
                    banRacVaoTrongGame(tenGocVatThe);
                }
            } else {
                document.getElementById("ai-result").innerText = "📸 Hãy đưa vật phẩm vào tâm Camera để mắt thần AI thực hiện quét...";
            }
        } catch (err) {
            console.log("Đang xử lý dữ liệu...");
        }
    }

    // Tần suất quét 50ms giúp bắt chuyển động mượt mà không độ trễ
    setTimeout(quetVatTheVongLapAnToan, 50);
}

// 🎮 ĐỒ HỌA GAME CARD RƠI XOAY THEO QUỸ ĐẠO VÀO THÙNG RÁC MÔ PHỎNG
function banRacVaoTrongGame(loaiRac) {
    const gameDisplay = document.getElementById("gameDisplay");
    const racAo = document.createElement("div");
    racAo.className = "falling-trash";
    
    // Tạo cấu trúc thẻ rác sinh động gồm Emoji và Nhãn Tiếng Việt đi kèm
    racAo.innerHTML = `<span class="emoji">${thongTinRac[loaiRac].emoji}</span><span>${thongTinRac[loaiRac].tenVN}</span>`;
    
    const viTriXNgauNhien = Math.floor(Math.random() * 40) + 20; 
    racAo.style.left = `${viTriXNgauNhien}%`;
    racAo.style.top = `-70px`;
    gameDisplay.appendChild(racAo);

    const thungMucTieu = thongTinRac[loaiRac].thung;
    const thungElement = document.getElementById(`g-bin-${thungMucTieu}`);

    // Kích hoạt hiệu ứng vật lý rơi tịnh tiến mượt mà
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
        
        // Khóa camera quét trong 2 giây để người xem nhìn rõ quy trình rác ảo rơi vào thùng
        setTimeout(() => { thoiGianChoQuet = false; }, 2000); 
    }, 2000);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];

    // KIỂM TRA ĐỐI CHIẾU: Rác giơ lên phải trùng khớp hoàn toàn với lệnh ngẫu nhiên từ MC
    if (loaiRac === vatPhamMucTieuHienTai) {
        score += 10;
        document.getElementById("score").innerText = score;
        document.getElementById("ai-result").innerText = `✨ CHÍNH XÁC XUẤT SẮC! +10 Điểm.`;
        
        document.getElementById("co2-val").innerText = score * 1.5;
        if(score >= 40) document.getElementById("eco-rank").innerText = "Hiệp sĩ bảo vệ rừng Lâm Đồng";

        phatAmThanh("dung"); // Kích hoạt âm thanh Ting Ting chiến thắng
        mcDocHuongDan("Chính xác, cộng mười điểm.");

        if (writer) {
            await writer.write(new TextEncoder().encode(thungMucTieu)); // Truyền lệnh kích hoạt servo phần cứng
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                timeLeft = 45; // ⏱️ HỒI LẠI ĐỦ 45 GIÂY CHO CẤP ĐỘ MỚI
                document.getElementById("timer").innerText = timeLeft;
                document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
                
                mcDocHuongDan(`Chúc mừng bạn vượt cấp thành công. Tiến vào ${kịchBản6Level[level].loiMởĐầu}`);
                alert(`🎉 Tuyệt vời! Bạn đã vượt qua màn chơi. Tiến vào CẤP ĐỘ ${level}!`);
                
                setTimeout(taoLenhYeuCauNgauNhien, 3500);
            } else {
                ketThucGame(true);
            }
        } else {
            // Nếu chưa đủ điểm qua màn, lập tức đổi lệnh ngẫu nhiên tiếp theo
            setTimeout(taoLenhYeuCauNgauNhien, 1500);
        }
    } else {
        phatAmThanh("sai"); // Kích hoạt âm thanh còi hú báo sai rác
        mcDocHuongDan("Sai rồi. Vật phẩm này không đúng yêu cầu của màn chơi.");
        document.getElementById("ai-result").innerText = "❌ SAI HIỆU LỆNH YÊU CẦU! Vui lòng làm lại!";
        
        // Đổi lệnh mới nếu người chơi làm sai để không bị kẹt màn hình
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
        mcDocHuongDan("Chúc mừng các bạn đã hoàn thành xuất sắc tất cả các cấp độ chơi và bảo vệ hành tinh xanh.");
        alert("🏆 CHIẾN THẮNG TUYỆT ĐỐI! Hệ thống phân loại AI đã hoàn thành xuất sắc thử thách!");
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

// Đoạn mã mồi giúp trình duyệt nạp sẵn bộ nhớ đệm Tiếng Việt ngay khi mở trang
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
}
