    // 5) สำเร็จ
    const billTotal = rows.reduce((s, r) => s + r.total_price, 0);

    // ส่งแจ้งเตือน Telegram (ไม่ใช้ await และมี try/catch ข้างใน
    // ต่อให้ส่งไม่สำเร็จ การขายและข้อความ "ขายสำเร็จ" ก็ยังทำงานปกติ)
    const soldLines = cart.map((item) => {
      const f = fresh.find((p) => p.id === item.id);
      return {
        name: f.name,
        qty: item.quantity,
        total: Number(f.price) * item.quantity,
        remaining: f.stock - item.quantity, // สต๊อกหลังตัด
      };
    });
    notifyTelegram(buildTelegramMessages(soldLines, billTotal));

    setMessage({
      type: 'success',
      text: `ขายสำเร็จ ${rows.length} รายการ รวม ${formatMoney(billTotal)} บาท`,
    });
