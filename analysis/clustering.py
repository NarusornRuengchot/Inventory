"""
K-Means Clustering Script for Product Stock Data
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



# 1. โหลดข้อมูล (ดึงจาก API ก่อน ถ้าเชื่อมต่อไม่ได้จะใช้ Fallback dataset)
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
    print(f"[*] โหลดข้อมูลจากไฟล์สำรอง: {LOCAL_DATA_PATH} ...")
    with open(LOCAL_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"[✓] โหลดข้อมูลสำเร็จ ({len(data)} รายการ)")

df = pd.DataFrame(data)

# จัดรูปแบบชื่อสินค้าและราคา
if 'name' not in df.columns and 'brand' in df.columns and 'model' in df.columns:
    df['name'] = df['brand'] + ' ' + df['model']

if 'price' not in df.columns and 'selling_price' in df.columns:
    df['price'] = df['selling_price'].astype(float)

if 'mileage' in df.columns:
    df['mileage'] = df['mileage'].fillna(0).astype(int)

# 2. ทำ Data Preprocessing + Standardization (ตามสไลด์หน้า 8)
features = df[['price']]
scaler = StandardScaler()
scaled = scaler.fit_transform(features)

# 3. รัน K-Means Clustering (กำหนด k = 3 ตามผลการวิเคราะห์ Elbow Method)
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
raw_clusters = kmeans.fit_predict(scaled)
df['raw_cluster'] = raw_clusters

# จัดลำดับ Cluster ให้ 0 = ถูกสุด, 1 = ปานกลาง, 2 = แพงสุด เสมอ เพื่อความเข้าใจง่าย
cluster_means = df.groupby('raw_cluster')['price'].mean().sort_values().index
cluster_map = {old: new for new, old in enumerate(cluster_means)}
df['cluster'] = df['raw_cluster'].map(cluster_map)

# กำหนดชื่อหมวดหมู่และคำอธิบาย (Cluster Profiles)
cluster_meta = {
    0: {
        'title': 'Cluster 0: Budget (รถราคาประหยัด / Eco Car)',
        'color': '#10b981', # Green
        'profile': 'รถราคาเข้าถึงง่าย ซื้อง่ายขายคล่อง เหมาะกับผู้เริ่มต้นทำงาน'
    },
    1: {
        'title': 'Cluster 1: Mid-Range (รถยอดนิยม / รถครอบครัว)',
        'color': '#f59e0b', # Orange
        'profile': 'รถ C-Segment, SUV, กระบะ ใช้งานอเนกประสงค์ สภาพดีเยี่ยม'
    },
    2: {
        'title': 'Cluster 2: Premium / Collector (รถยุโรปหรู / รถสะสม)',
        'color': '#ef4444', # Red
        'profile': 'รถระดับบน พรีเมียม สมรรถนะสูง หรือรถหายากราคาพิเศษ'
    }
}

df['cluster_name'] = df['cluster'].map(lambda c: cluster_meta[c]['title'])
df['profile'] = df['cluster'].map(lambda c: cluster_meta[c]['profile'])

# 4. แสดงผลตารางสินค้าที่จัดกลุ่มแล้ว
print("\n" + "="*80)
print("                   ผลการจัดกลุ่มสินค้าด้วย K-MEANS CLUSTERING (k=3)")
print("="*80)
display_cols = ['name', 'price', 'cluster', 'cluster_name']
if 'mileage' in df.columns:
    display_cols.insert(2, 'mileage')

df_sorted = df.sort_values(by=['cluster', 'price']).reset_index(drop=True)
for c in range(3):
    sub = df_sorted[df_sorted['cluster'] == c]
    print(f"\n>>> {cluster_meta[c]['title']} (จำนวน: {len(sub)} คัน)")
    print(f"    ลักษณะ: {cluster_meta[c]['profile']}")
    print("-" * 80)
    for _, row in sub.iterrows():
        mileage_str = f" | ไมล์: {row['mileage']:,} กม." if 'mileage' in row else ""
        print(f"  • {row['name']:<42} | ราคา: {row['price']:>12,.2f} บาท{mileage_str}")

# 5. ตารางสรุปเชิงสถิติ (Cluster Characteristics Table สำหรับนำไปใส่สไลด์ตามหน้า 10)
print("\n" + "="*80)
print("             ตารางสรุปคุณลักษณะของแต่ละกลุ่ม (Cluster Characteristics)")
print("="*80)

summary_rows = []
for c in range(3):
    sub = df[df['cluster'] == c]
    if len(sub) > 0:
        summary_rows.append({
            'Cluster': c,
            'ชื่อกลุ่ม': cluster_meta[c]['title'],
            'จำนวนสินค้า': len(sub),
            'ราคาต่ำสุด (บาท)': f"{sub['price'].min():,.2f}",
            'ราคาเฉลี่ย (บาท)': f"{sub['price'].mean():,.2f}",
            'ราคาสูงสุด (บาท)': f"{sub['price'].max():,.2f}",
            'ลักษณะกลุ่มสินค้า': cluster_meta[c]['profile']
        })

summary_df = pd.DataFrame(summary_rows)
print(summary_df.to_string(index=False))


# 6. บันทึกผลลัพธ์เป็นไฟล์ CSV และ JSON เพื่อนำไปใช้งานต่อได้ง่าย
csv_path = os.path.join(os.path.dirname(__file__), "clustered_cars.csv")
df_sorted.to_csv(csv_path, index=False, encoding='utf-8-sig')
print(f"\n[✓] ส่งออกผลลัพธ์ CSV เรียบร้อยที่: {csv_path}")

# 7. วาดกราฟแสดงผลลัพธ์ (Scatter Plot ตามสไลด์หน้า 10)
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# กำหนดชื่อสำหรับกราฟ (ภาษาอังกฤษเพื่อป้องกันปัญหาฟอนต์ภาษาไทยใน matplotlib)
chart_labels = {
    0: 'Cluster 0: Budget / Economy',
    1: 'Cluster 1: Mid-Range / Family',
    2: 'Cluster 2: Premium / Collector'
}

# กราฟที่ 1: การกระจายตัวของราคาตาม Cluster (1D Distribution)
for c in range(3):
    sub = df[df['cluster'] == c]
    ax1.scatter(sub['price'], [c]*len(sub), color=cluster_meta[c]['color'], s=150, alpha=0.85, edgecolors='black', label=chart_labels[c])

ax1.set_title('Product Grouping by Price (1D K-Means Clustering)', fontsize=13, fontweight='bold')
ax1.set_xlabel('Selling Price (THB)', fontsize=11)
ax1.set_yticks([0, 1, 2])
ax1.set_yticklabels(['Budget', 'Mid-Range', 'Premium'], fontsize=11)
ax1.grid(True, linestyle='--', alpha=0.5)
ax1.legend(loc='lower right', fontsize=9)

# กราฟที่ 2: ราคาขาย เทียบกับ เลขไมล์ (2D Scatter Plot - Price vs Mileage)
for c in range(3):
    sub = df[df['cluster'] == c]
    ax2.scatter(sub['mileage'], sub['price'], color=cluster_meta[c]['color'], s=140, alpha=0.85, edgecolors='black', label=chart_labels[c])

ax2.set_title('Used Car Market: Price vs. Mileage (2D View)', fontsize=13, fontweight='bold')
from matplotlib.ticker import FuncFormatter

# จัดรูปแบบตัวเลขบนแกนให้อ่านง่าย มีคอมม่าคั่น
def format_currency(x, pos):
    if x >= 1e6:
        return f'{x*1e-6:.1f}M'
    elif x >= 1e3:
        return f'{x*1e-3:.0f}k'
    return f'{x:.0f}'

def format_km(x, pos):
    return f'{x*1e-3:.0f}k km' if x >= 1e3 else f'{x:.0f} km'

ax1.xaxis.set_major_formatter(FuncFormatter(format_currency))
ax2.xaxis.set_major_formatter(FuncFormatter(format_km))
ax2.yaxis.set_major_formatter(FuncFormatter(format_currency))



plt.tight_layout()
graph_path = os.path.join(os.path.dirname(__file__), "cluster_results.png")
plt.savefig(graph_path, dpi=300)
print(f"[✓] บันทึกภาพกราฟแสดงผลเรียบร้อยที่: {graph_path}")

print("\n" + "="*80)
print("รันเสร็จสมบูรณ์! พร้อมแสดงกราฟผลลัพธ์...")
print("="*80)

plt.show()
