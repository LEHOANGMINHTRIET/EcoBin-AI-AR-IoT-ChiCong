let port, writer;
let score = 0, level = 1, timeLeft = 45;
let gameInterval;
let localStream = null, isCamOn = true;

let netModel = null; 
let thoiGianChoQuet = false;
let isGameRunning = false;

// BẢN ĐỒ ÁNH XẠ: Biến từ khóa nhận diện của AI quốc tế thành Emoji trò chơi của bạn
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
    1: { tenVatPham: ["bottle", "cup"], loiMởĐầu: "Màn một, tập sự phân loại. ", diemCanQua: 20 },
    2: { tenVatPham: ["apple", "banana", "orange", "sandwich"], loiMởĐầu: "Màn hai, nông trại hữu cơ. ", diemCanQua: 40 },
    3: { tenVatPham: ["book", "cell phone"], loiMởĐầu: "Màn ba, thu gom chất thải rắn. ", diemCanQua: 60 },
    4: { tenVatPham: ["bottle", "cup", "book"], loiMởĐầu: "Màn bốn tăng tốc, phân loại nhanh cứu lấy môi trường. ", diemCanQua: 80 },
    5: { tenVatPham: ["banana", "apple", "bottle"], loiMởĐầu: "Màn năm thử thách đại sứ kiên trì. ", diemCanQua: 100 },
    6: { tenVatPham: ["bottle", "cup", "apple", "banana", "orange", "sandwich", "book", "cell phone"], loiMởĐầu: "Màn chung kết xanh, tổng vệ sinh dâng tặng Lâm Đồng. ", diemCanQua: 120 }
};

// 🔊 BỘ TỔNG HỢP ÂM THANH ĐIỆN TỬ (TỰ ĐỘNG PHÁT TIẾNG TING TING VÀ BUZZER)
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
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.25);
    } else if (loai === "sai") {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(140, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// 🗣️ HÀM MC GIỌNG NỮ AI "CHỊ GOOGLE CHUẨN HD" - CHẠY TRỰC TIẾP TỪ ĐÁM MÂY (KHÔNG CẦN ĐĂNG KÝ)
function mcDocHuongDan(vanBan) {
    // Ép trình duyệt hủy bộ đọc mặc định cũ nếu có để không bị đè âm thanh
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    try {
        // Chuẩn hóa văn bản: Mã hóa các ký tự tiếng Việt (như dấu, khoảng trắng) để gửi lên đám mây Google
        const vanBanMaHoa = encodeURIComponent(vanBan);
        
        // Đường dẫn kết nối trực tiếp đến cổng âm thanh Cloud TTS công cộng của Google Dịch
        const linkAmThanhGoogle = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${vanBanMaHoa}`;
        
        // Tạo một đối tượng Audio ngầm để tải và phát file âm thanh chất lượng cao
        const audioMc = new Audio(linkAmThanhGoogle);
        
        // Tăng cường tốc độ tải và phát lập tức
        audioMc.play().catch(e => {
            console.log("Trình duyệt chặn tự động phát, đợi tương tác người dùng.");
            // Nếu trình duyệt chặn phát tự động, ta lưu vào bộ nhớ để phát khi bấm nút chơi
            window.amThanhDuPhong = audioMc;
        });

        console.log("🎯 Đang phát giọng đọc Cloud AI (Chị Google): " + vanBan);

    } catch (error) {
        console.log("Cổng Google Cloud bận, dùng phương án dự phòng cơ bản.");
        // Nếu mất mạng hoặc lỗi, tự động lùi về bộ đọc mặc định của máy để game không bị đứng
        const loiNoi = new SpeechSynthesisUtterance(vanBan);
        loiNoi.lang = 'vi-VN';
        window.speechSynthesis.speak(loiNoi);
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
        document.getElementById("ai-result").innerText = "📸 Mắt thần AI đã sẵn sàng hoạt động!";
        
        mcDocHuongDan("Chào mừng hai bạn đến với hệ thống phân loại rác thông minh trường trung học cơ sở Chí Công. Hãy bấm nút bắt đầu thử thách.");
    } catch (e) {
        document.getElementById("ai-result").innerText = "❌ Lỗi kết nối mạng nơ-ron AI.";
        document.getElementById("mission").innerText = "❌ Lỗi tải AI. Vui lòng kiểm tra lại kết nối mạng!";
    }
}

async function moWebcamMoi() {
    const video = document.getElementById("webcam");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = localStream;
        isCamOn = true;
    } catch (err) {
        document.getElementById("ai-result").innerText = "❌ Trình duyệt chặn quyền truy cập Camera.";
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
        alert("Chưa kết nối cổng Arduino thực tế. Bạn vẫn có thể chơi giả lập AR tương tác!");
    }
}

// HÀM HIỂU LỆNH NHIỆM VỤ NGẪU NHIÊN THEO THỜI GIAN THỰC
function taoLenhYeuCauNgauNhien() {
    if (!isGameRunning) return;
    let mangVatPhamCuaLevel = kịchBản6Level[level].tenVatPham;
    // Chọn ngẫu nhiên một vật phẩm nhiệm vụ trong danh sách cho phép của màn đó
    vatPhamMucTieuHienTai = mangVatPhamCuaLevel[Math.floor(Math.random() * mangVatPhamCuaLevel.length)];
    
    let thongBaoChu = `YÊU CẦU: Hãy tìm và đưa [${thongTinRac[vatPhamMucTieuHienTai].tenVN}] trước Camera để phân loại!`;
    let loiDocMc = `Hãy tìm và đưa ${thongTinRac[vatPhamMucTieuHienTai].đọc} trước camera để phân loại`;

    document.getElementById("mission").innerText = thongBaoChu;
    mcDocHuongDan(loiDocMc);
}

function batDauGame() {
    score = 0; level = 1; timeLeft = 45; thoiGianChoQuet = false; isGameRunning = true;
    document.getElementById("score").innerText = score;
    document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
    document.getElementById("btn-start").disabled = true;

    // MC giới thiệu tên màn chơi và ra lệnh ngẫu nhiên đầu tiên
    mcDocHuongDan(kịchBản6Level[level].loiMởĐầu);
    setTimeout(taoLenhYeuCauNgauNhien, 2000);

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").innerText = timeLeft;
        if (timeLeft <= 0) ketThucGame(false);
    }, 1000);

    // Kích hoạt luồng quét tuần tự thông minh chống treo CPU
    quetVatTheVongLapAnToan(); 
}

// 👁️ MẮT THẦN AI: SIÊU NHẠY (0.45), ĐỒNG BỘ DỰNG KHUNG VÀ VĂN BẢN KHÔNG BỊ NGƯỢC REAL-TIME
async function quetVatTheVongLapAnToan() {
    if (timeLeft <= 0 || !isGameRunning || !isCamOn || !netModel) return;

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("ai-canvas");
    
    if (video.readyState === 4) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Xóa khung cũ

        try {
            const predictions = await netModel.detect(video);
            
            // Tìm vật thể đầu tiên có độ chính xác cao nhất
            const vatTheHợpLệ = predictions.find(p => thongTinRac[p.class]);

            if (vatTheHợpLệ) {
                const tenGocVatThe = vatTheHợpLệ.class;
                const doChinhXac = vatTheHợpLệ.score;
                const [x, y, w, h] = vatTheHợpLệ.bbox;

                // 🟩 VẼ KHUNG CHỮ NHẬT XANH ÔM KHÍT CHUẨN XÁC VẬT THỂ REAL-TIME
                ctx.strokeStyle = "#00e676";
                ctx.lineWidth = 5;
                ctx.strokeRect(x, y, w, h);

                // ✏️ XỬ LÝ VĂN BẢN KHÔNG BỊ NGƯỢC: Lật lại ngữ cảnh vẽ để viết chữ đúng chiều
                ctx.save(); // Lưu trạng thái gương
                ctx.scale(-1, 1); // Lật gương trục X
                ctx.fillStyle = "#00e676";
                ctx.font = "bold 16px Arial";
                // Tọa độ viết chữ phải lật ngược lại so với vị trí Bounding Box
                const longChutienViet = `${thongTinRac[tenGocVatThe].tenVN} (${(doChinhXac*100).toFixed(0)}%)`;
                ctx.fillText(longChutienViet, -(x + w - 5), y + 22);
                ctx.restore(); // Khôi phục trạng thái

                // Ngưỡng 0.45 cực kỳ nhạy, nhận diện vật phẩm ngay lập tức khi giơ lên
                if (doChinhXac > 0.45 && !thoiGianChoQuet) {
                    thoiGianChoQuet = true;
                    // Chú thích bằng giọng nói thời gian thực khi quét thấy rác
                    mcDocHuongDan(`Phát hiện thấy ${thongTinRac[tenGocVatThe].đọc}. Đang tiến hành xử lý phân loại.`);
                    document.getElementById("ai-result").innerText = `🔍 AI ĐANG QUÉT: ${thongTinRac[tenGocVatThe].tenVN}`;
                    
                    banRacVaoTrongGame(tenGocVatThe);
                }
            } else {
                document.getElementById("ai-result").innerText = "📸 Hãy giơ vật phẩm trước camera để mắt thần AI thực hiện quét phân loại...";
            }
        } catch (err) {
            console.log("Đang đồng bộ luồng ảnh...");
        }
    }

    // Tần suất quét 50ms giúp phản hồi tức thì
    setTimeout(quetVatTheVongLapAnToan, 50);
}

// 🎮 ĐỒ HỌA GAME RƠI SỐNG ĐỘNG (FALLING CARDS) KÈM NHÃN CHỮ TIẾNG VIỆT
function banRacVaoTrongGame(loaiRac) {
    const gameDisplay = document.getElementById("gameDisplay");
    const racAo = document.createElement("div");
    racAo.className = "falling-trash";
    
    // Tạo thẻ div hiển thị cả Emoji và chữ nhãn Tiếng Việt rõ ràng
    racAo.innerHTML = `<span class="emoji">${thongTinRac[loaiRac].emoji}</span> <span>${thongTinRac[loaiRac].tenVN}</span>`;
    
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
        
        // Mở khóa quét an toàn sau 2 giây để mắt thần AI tiếp tục nhận diện lượt sau
        setTimeout(() => { thoiGianChoQuet = false; }, 2000); 
    }, 2000);
}

async function xuLyLogicGame(loaiRac, thungMucTieu) {
    let levelHienTai = kịchBản6Level[level];

    // KIỂM TRA ĐỐI CHIẾU: Rác giơ lên phải trùng khớp với lệnh ngẫu nhiên từ MC
    if (loaiRac === vatPhamMucTieuHienTai) {
        score += 10;
        document.getElementById("score").innerText = score;
        document.getElementById("ai-result").innerText = `✨ CHÍNH XÁC YÊU CẦU! +10 Điểm thành tích xanh.`;
        
        document.getElementById("co2-val").innerText = score * 1.5;
        if(score >= 40) document.getElementById("eco-rank").innerText = "Hiệp sĩ bảo vệ hành tinh xanh";

        phatAmThanh("dung"); // Âm thanh Ting Ting chiến thắng
        mcDocHuongDan("Bạn đã làm rất tốt, cộng mười điểm.");

        if (writer) {
            await writer.write(new TextEncoder().encode(thungMucTieu)); // Truyền lệnh qua IoT Arduino Serial
        }

        if (score >= levelHienTai.diemCanQua) {
            if (level < 6) {
                level++;
                timeLeft = 45; // ⏱️ HỒI LẠI ĐẦY ĐỦ 45 GIÂY CHO CẤP ĐỘ MỚI
                document.getElementById("timer").innerText = timeLeft;
                document.getElementById("current-level").innerText = `MÀN CHƠI: ${level}`;
                
                // Cảnh báo vượt cấp và MC virtuel phát âm nói hướng dẫn màn chơi mới
                mcDocHuongDan(`Tuyệt vời. Bạn đã vượt cấp thành công. Tiến vào ${kịchBản6Level[level].loiMởĐầu}`);
                alert(`🎉 Xuất sắc! Mắt thần xác nhận bạn đã hoàn thành mục tiêu. Tiến vào CẤP ĐỘ ${level}!`);
                
                // MC ra lệnh ngẫu nhiên đầu tiên của màn chơi mới
                setTimeout(taoLenhYeuCauNgauNhien, 3500);
            } else {
                ketThucGame(true);
            }
        } else {
            // Nếu chưa đủ điểm qua màn, MC lập tức đổi sang một lệnh ngẫu nhiên tiếp theo
            setTimeout(taoLenhYeuCauNgauNhien, 1500);
        }
    } else {
        phatAmThanh("sai"); // Âm thanh Buzzer cảnh báo lỗi
        mcDocHuongDan("Rất tiếc. Sản phẩm thực tế này không trùng khớp với hiệu lệnh nhiệm vụ.");
        document.getElementById("ai-result").innerText = "❌ SAI HIỆU LỆNH! Vui lòng đọc kỹ yêu cầu của MC.";
        
        // Đổi lệnh mới nếu làm sai để người chơi không bị kẹt màn hình
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
        mcDocHuongDan("🏆 CHIẾN THẮNG TUYỆT ĐỐI! Chúc mừng các bạn đã hoàn thành xuất sắc tất cả các cấp độ chơi.");
        alert("🏆 CHIẾN THẮNG TUYỆT ĐỐI! Chúc mừng các nhà khoa học trẻ của trường Chí Công!");
    } else {
        mcDocHuongDan("⏰ Hết thời gian. Đừng nản chí, hãy sắp xếp lại rác và thử thách lại nhé.");
        alert("⏰ HẾT GIỜ! Bạn hãy sắp xếp lại các món rác thực tế và bấm Bắt đầu để thử thách lại nhé nhé.");
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
