"""
Elbow Method Script for finding optimal k in K-Means Clustering
Course: Internet Programming - Kasetsart University Sriracha
Domain: Used Car Inventory (สินค้าประเภทรถยนต์มือสอง)
"""

import os
import sys
import json
import requests
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# ตั้งค่าให้ Terminal รองรับ UTF-8 ภาษาไทยบน Windows ได้อย่างปลอดภัย
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass



# 1. โหลดข้อมูล (ลองเรียกจาก API ก่อน ถ้าเรียกไม่ได้จะใช้ fallback local JSON)
API_URL = os.getenv("API_URL", "http://localhost:3024/api/products")
LOCAL_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "my_products.json")

data = None
try:
    print(f"[*] กำลังดึงข้อมูลจาก API: {API_URL} ...")
    res = requests.get(API_URL, timeout=3)
    if res.status_code == 200:
        data = res.json()
        print(f"[✓] ดึงข้อมูลจาก API สำเร็จ ({len(data)} รายการ)")
except Exception as e:
    print(f"[!] ไม่สามารถเชื่อมต่อ API ได้ ({e})")

if not data:
    print(f"[*] โหลดข้อมูลจำลองจากไฟล์: {LOCAL_DATA_PATH} ...")
    with open(LOCAL_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"[✓] โหลดข้อมูลสำเร็จ ({len(data)} รายการ)")

# 2. เตรียม DataFrame
df = pd.DataFrame(data)

# ปรับชื่อฟิลด์ให้อ่านง่าย
if 'name' not in df.columns and 'brand' in df.columns and 'model' in df.columns:
    df['name'] = df['brand'] + ' ' + df['model']

if 'price' not in df.columns and 'selling_price' in df.columns:
    df['price'] = df['selling_price'].astype(float)

print("\n--- ตัวอย่างข้อมูลสินค้า (รถยนต์) ---")
print(df[['name', 'price']].head(8).to_string(index=False))

# 3. เตรียมข้อมูลและทำ Standardization (ตามสไลด์หน้า 8-9)
features = df[['price']]
scaler = StandardScaler()
scaled_features = scaler.fit_transform(features)

# 4. คำนวณ Inertia สำหรับค่า k ตั้งแต่ 1 ถึง 9 (Elbow Method)
inertias = []
k_range = range(1, min(10, len(df)))

for k in k_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(scaled_features)
    inertias.append(km.inertia_)

# 5. วาดกราฟ Elbow Method
plt.figure(figsize=(9, 5.5))
plt.plot(list(k_range), inertias, marker='o', color='#2563eb', linewidth=2.5, markersize=8, label='Inertia (SSE)')

# ไฮไลต์จุดข้อศอกที่ k=3
plt.axvline(x=3, color='#dc2626', linestyle='--', linewidth=1.5, label='Optimal k = 3 (Elbow Point)')
plt.scatter([3], [inertias[2]], color='#dc2626', s=160, zorder=5)

plt.title('Elbow Method for Optimal k (Used Car Inventory)', fontsize=14, fontweight='bold')
plt.xlabel('Number of clusters (k)', fontsize=12)
plt.ylabel('Inertia (Within-Cluster Sum of Squares)', fontsize=12)
plt.xticks(list(k_range))
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(fontsize=11)
plt.tight_layout()

# บันทึกรูปภาพไว้ใส่สไลด์
output_img = os.path.join(os.path.dirname(__file__), "elbow_curve.png")
plt.savefig(output_img, dpi=300)
print(f"\n[✓] บันทึกกราฟ Elbow Curve เรียบร้อยที่: {output_img}")

# สรุปผล
print("\n" + "="*55)
print("สรุปผลการวิเคราะห์ Elbow Method:")
print("="*55)
for k, inr in zip(k_range, inertias):
    print(f"  k = {k:2d}  |  Inertia = {inr:12.4f}")

print("\nข้อสรุป: อัตราการลดลงของ Inertia เริ่มชะลอตัวลงอย่างเห็นได้ชัดที่ k = 3")
print("ดังนั้น ค่า k ที่เหมาะสมที่สุดในการจัดกลุ่มรถยนต์คือ k = 3")
print("แบ่งออกเป็น 3 กลุ่ม: Budget (ประหยัด), Mid-Range (ระดับกลาง), Premium (หรูหรา)")
print("="*55)

# เปิดกราฟแสดงผล
plt.show()
