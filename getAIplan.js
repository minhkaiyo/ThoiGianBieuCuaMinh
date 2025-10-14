// File: /api/getAIPlan.js

export default async function handler(request, response) {
    // Chỉ cho phép phương thức POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return response.status(500).json({ error: 'API key không được cấu hình trên máy chủ.' });
    }

    try {
        const { userMessage, appData, previousAttemptFailed } = request.body;

        if (!userMessage || !appData) {
            return response.status(400).json({ error: 'Thiếu userMessage hoặc appData trong yêu cầu.' });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

        let retryInstruction = previousAttemptFailed ? "Lưu ý: Đề xuất trước đó của bạn không được người dùng chấp nhận. Vui lòng thử một cách tiếp cận hoàn toàn khác." : "";

        const prompt = `
            Bạn là một trợ lý học tập AI cho ứng dụng "Excellence Planner". Dựa vào dữ liệu hiện tại của người dùng và yêu cầu của họ, hãy tạo ra một kế hoạch cập nhật.
            **Nhiệm vụ:**
            Phân tích yêu cầu của người dùng và CHỈ trả về một đối tượng JSON chứa các trường cần thay đổi trong cấu trúc \`appData\`. KHÔNG trả về bất cứ thứ gì khác ngoài khối mã JSON. JSON của bạn phải hợp lệ.
            **Dữ liệu hiện tại của người dùng:**
            ${JSON.stringify(appData)}
            **Yêu cầu của người dùng:**
            "${userMessage}"
            ${retryInstruction}
            **JSON kết quả:**
        `;

        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error('Google API Error:', errorBody);
            throw new Error(`Lỗi từ Google API: ${geminiResponse.statusText}`);
        }

        const data = await geminiResponse.json();

        if (!data.candidates || !data.candidates[0].content.parts[0].text) {
            throw new Error('Phản hồi từ AI không hợp lệ.');
        }

        const aiResponseText = data.candidates[0].content.parts[0].text;

        // Trả về kết quả JSON cho trình duyệt
        return response.status(200).json(JSON.parse(aiResponseText));

    } catch (error) {
        console.error("Lỗi trong serverless function:", error);
        return response.status(500).json({ error: "Trợ lý AI đang gặp sự cố. Chi tiết: " + error.message });
    }
}