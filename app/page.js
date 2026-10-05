"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// ค่าเริ่มต้นของฟอร์ม
const emptyForm = { sku: '', name: '', price: '', stock: '', unit: '' };

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // id ของแถวที่กำลังแก้ไข
  const [editForm, setEditForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ดึงรายการสินค้าทั้งหมดจาก Supabase
  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setProducts(data);
    setLoading(false);
  }

  // โหลดข้อมูลครั้งแรกเมื่อเปิดหน้า
  useEffect(() => {
    fetchProducts();
  }, []);

  // เพิ่มสินค้าใหม่
  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.from('products').insert([
      {
        sku: form.sku.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        stock: parseInt(form.stock, 10),
        unit: form.unit.trim(),
      },
    ]);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(emptyForm);
    fetchProducts();
  }

  // เริ่มแก้ไขแถว (inline)
  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({
      sku: p.sku ?? '',
      name: p.name ?? '',
      price: p.price,
      stock: p.stock,
      unit: p.unit ?? '',
    });
  }

  // บันทึกการแก้ไข
  async function handleSave(id) {
    setError('');
    const { error } = await supabase
      .from('products')
      .update({
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        price: Number(editForm.price),
        stock: parseInt(editForm.stock, 10),
        unit: editForm.unit.trim(),
      })
      .eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    fetchProducts();
  }

  // ลบสินค้า (ถามยืนยันก่อน)
  async function handleDelete(id, name) {
    if (!confirm(`ลบสินค้า "${name}" ใช่หรือไม่?`)) return;
    setError('');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    fetchProducts();
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {error && <p className="error">เกิดข้อผิดพลาด: {error}</p>}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <form className="card" onSubmit={handleAdd} style={formStyle}>
        <input
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          required
        />
        <input
          placeholder="ชื่อสินค้า"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="ราคา"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          type="number"
          min="0"
          placeholder="คงเหลือ"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          required
        />
        <input
          placeholder="หน่วย (เช่น ชิ้น)"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          required
        />
        <button type="submit">เพิ่มสินค้า</button>
      </form>

      {/* ตารางสินค้า */}
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6}>ยังไม่มีสินค้า</td>
              </tr>
            )}
            {products.map((p) =>
              editingId === p.id ? (
                // แถวโหมดแก้ไข
                <tr key={p.id}>
                  <td>
                    <input
                      style={cellInput}
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    />
                  </td>
                  <td style={actionCell}>
                    <button onClick={() => handleSave(p.id)}>บันทึก</button>
                    <button style={grayBtn} onClick={() => setEditingId(null)}>
                      ยกเลิก
                    </button>
                  </td>
                </tr>
              ) : (
                // แถวโหมดปกติ
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{Number(p.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td>{p.stock}</td>
                  <td>{p.unit}</td>
                  <td style={actionCell}>
                    <button onClick={() => startEdit(p)}>แก้ไข</button>
                    <button style={redBtn} onClick={() => handleDelete(p.id, p.name)}>
                      ลบ
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- inline styles ----------
const formStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
};
const cellInput = { width: '100%', minWidth: 70 };
const actionCell = { display: 'flex', gap: 6 };
const grayBtn = { background: '#6b7280' };
const redBtn = { background: '#dc2626' };
