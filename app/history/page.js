"use client";

import { useState, useEffect } from 'react';
// หมายเหตุ: ไฟล์อยู่ลึกกว่า app/page.js หนึ่งชั้น จึงต้องใช้ ../../
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ดึงประวัติการขายทั้งหมด เรียงจากล่าสุดไปเก่าสุด
  async function fetchSales() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });
    if (error) setError(error.message);
    else setSales(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchSales();
  }, []);

  // ยอดขายรวมทั้งหมด (sum ของ total_price)
  const grandTotal = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {error && <p className="error">เกิดข้อผิดพลาด: {error}</p>}

      {/* ยอดขายรวมด้านบนตาราง */}
      <div className="card" style={summaryStyle}>
        <span>ยอดขายรวมทั้งหมด</span>
        <strong style={totalStyle}>{formatMoney(grandTotal)} บาท</strong>
        <span style={countStyle}>({sales.length} รายการ)</span>
      </div>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={4}>ยังไม่มีประวัติการขาย</td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDateTime(s.sold_at)}</td>
                <td>{s.product_name}</td>
                <td>{s.quantity}</td>
                <td>{formatMoney(Number(s.total_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// จัดรูปแบบตัวเลขเงิน
function formatMoney(n) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// จัดรูปแบบวันเวลา (ภาษาไทย)
function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ---------- inline styles ----------
const summaryStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
};
const totalStyle = { fontSize: '1.5rem', color: '#16a34a' };
const countStyle = { color: '#6b7280' };
