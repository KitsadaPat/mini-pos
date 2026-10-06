// API route ฝั่ง Server: รับข้อความจากหน้าขาย แล้วส่งต่อไป Telegram
// ใช้ชื่อตัวแปรที่ไม่มี NEXT_PUBLIC_ เพื่อไม่ให้ token หลุดไปฝั่งเบราว์เซอร์
// (fallback ไป NEXT_PUBLIC_ เผื่อคุณตั้งไว้แล้ว แต่แนะนำให้เปลี่ยนชื่อ)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

export async function POST(request) {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return Response.json({ ok: false, error: 'missing telegram env' }, { status: 500 });
    }

    const { messages } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ ok: false, error: 'no messages' }, { status: 400 });
    }

    // ส่งทีละข้อความตามลำดับ (ข้อความขายใหม่ก่อน แล้วค่อยเตือนสต๊อก)
    for (const text of messages) {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: 'HTML',
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        return Response.json({ ok: false, error: detail }, { status: 502 });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
