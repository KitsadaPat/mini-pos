"use client";

import { useState, useEffect } from 'react';
// หมายเหตุ: ไฟล์อยู่ลึกกว่า app/page.js หนึ่งชั้น จึงต้องใช้ ../../
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  // ดึงรายการสินค้า
  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (error) setMessage({ type: 'error', text: error.message });
    else setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // สินค้าที่เลือก และยอดรวมอัตโนมัติ (ราคา x จำนวน)
  const selected = products.find((p) => p.id === productId);
  const qty = parseInt(quantity, 10) || 0;
  const total = selected ? Number(selected.price) * qty : 0;

  async function handleSell(e) {
    e.preventDefault();
    setMessage(null);

    if (!selected) {
      setMessage({ type: 'error', text: 'กรุณาเลือกสินค้า' });
      return;
    }
    if (qty <= 0) {
      setMessage({ type: 'error', text: 'จำนวนต้องมากกว่า 0' });
      return;
    }

    setSubmitting(true);

    // 1) ดึง stock ล่าสุดจากฐานข้อมูลก่อน (กันข้อมูลในหน้าจอเก่า)
    const { data: fresh, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', selected.id)
      .single();
    if (fetchErr) {
      setMessage({ type: 'error', text: fetchErr.message });
      setSubmitting(false);
      return;
    }

    // 2) ตรวจสอบว่า stock เพียงพอหรือไม่
    if (fresh.stock < qty) {
      setMessage({
        type: 'error',
        text: `สินค้าไม่พอ (คงเหลือ ${fresh.stock} ${fresh.unit ?? ''})`,
      });
      setSubmitting(false);
      fetchProducts();
      return;
    }

    // 3) ตัด stock (เช็ค stock เดิมซ้ำใน where เพื่อกันขายซ้อนกัน)
    const { data: updated, error: updateErr } = await supabase
      .from('products')
      .update({ stock: fresh.stock - qty })
      .eq('id', fresh.id)
      .eq('stock', fresh.stock)
      .select();
    if (updateErr || !updated || updated.length === 0) {
      setMessage({
        type: 'error',
        text: updateErr ? updateErr.message : 'สต็อกเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง',
      });
      setSubmitting(false);
      fetchProducts();
      return;
    }

    // 4) บันทึกรายการขายลงตาราง sales
    const { error: insertErr } = await supabase.from('sales').insert([
      {
        product_id: fresh.id,
        product_name: fresh.name,
        quantity: qty,
        total_price: Number(fresh.price) * qty,
        sold_at: new Date().toISOString(),
      },
    ]);
    if (insertErr) {
      // บันทึกขายไม่สำเร็จ -> คืน stock
      await supabase.from('products').update({ stock: fresh.stock }).eq('id', fresh.id);
      setMessage({ type: 'error', text: `บันทึกการขายไม่สำเร็จ: ${insertErr.message}` });
      setSubmitting(false);
      fetchProducts();
      return;
    }

    // 5) สำเร็จ -> แจ้งผลและรีเซ็ตฟอร์ม
    setMessage({
      type: 'success',
      text: `ขายสำเร็จ: ${fresh.name} x ${qty} = ${formatMoney(Number(fresh.price) * qty)} บาท`,
    });
    setProductId('');
    setQuantity('');
    setSubmitting(false);
    fetchProducts();
  }

  if (loading) return <p>กำลังโหลด...</p>;

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {message && (
        <p className={message.type === 'success' ? 'success' : 'error'}>{message.text}</p>
      )}

      <form className="card" onSubmit={handleSell} style={formStyle}>
        {/* Dropdown เลือกสินค้า */}
        <label style={labelStyle}>
          สินค้า
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">-- เลือกสินค้า --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {formatMoney(Number(p.price))} บาท (เหลือ {p.stock} {p.unit})
              </option>
            ))}
          </select>
        </label>

        {/* จำนวนที่จะขาย */}
        <label style={labelStyle}>
          จำนวน
          <input
            type="number"
            min="1"
            step="1"
            placeholder="จำนวน"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        {/* ยอดรวม */}
        <div style={totalStyle}>
          ยอดรวม: <strong>{formatMoney(total)}</strong> บาท
        </div>

        <button type="submit" disabled={submitting || !selected || qty <= 0}>
          {submitting ? 'กำลังบันทึก...' : 'ขาย'}
        </button>
      </form>
    </div>
  );
}

// จัดรูปแบบตัวเลขเงิน
function formatMoney(n) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- inline styles ----------
const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 480,
};
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 600 };
const totalStyle = { fontSize: '1.2rem' };
