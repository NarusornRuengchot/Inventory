"""
Group K-Means Aggregator - รวมข้อมูลสินค้าจากสมาชิกทุกคนในกลุ่ม
Course: Internet Programming - Kasetsart University Sriracha
────────────────────────────────────────────────────────────────
วิธีใช้:
  1. ใส่ API URL ของเพื่อนทุกคนในตัวแปร GROUP_MEMBERS ด้านล่าง
  2. รัน:  python group-aggregator/aggregator.py
  3. ผลลัพธ์จะบันทึกเป็น group_products.json + group_clustered.csv + กราฟ
"""

import os
import sys
import json
import requests
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# ตั้งค่าให้ Terminal รองรับ UTF-8 ภาษาไทยบน Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# ─────────────────────────────────────────────────────────────────────────────
# ★★★ ใส่ API ของสมาชิกในกลุ่มตรงนี้ ★★★
# ─────────────────────────────────────────────────────────────────────────────
GROUP_MEMBERS = [
    {
        "name": "BM",
        "api_url": "http://119.59.102.161:3024/api/products",
    },
    {
        "name": "Boat",                     
        "api_url": "http://119.59.102.161:3047/api/products",  
    {
        "name": "Oun",                  
        "api_url": "http://119.59.102.161:3049/api/products",  
    },
    {
        "name": "Ohm",                     
        "api_url": "http://119.59.102.161:3059/api/products", 
    },
    {
        "name": "Arnat",                  
        "api_url": "http://119.59.102.161:3051/api/products", 
    },
]
# ─────────────────────────────────────────────────────────────────────────────

OUTPUT_DIR = os.path.dirname(__file__)


# ============================================================================
# STEP 1: ดึงข้อมูลจาก API ของสมาชิกทุกคน
# ============================================================================
def fetch_all_members():
    """ดึงข้อมูลสินค้าจาก API ของสมาชิกทุกคนในกลุ่ม"""
    all_products = []
    success_count = 0
    fail_count = 0

    print("=" * 80)
    print("  STEP 1: ดึงข้อมูลจาก API ของสมาชิกทุกคน")
    print("=" * 80)

    for member in GROUP_MEMBERS:
        name = member["name"]
        url = member["api_url"]

        # ข้ามสมาชิกที่ยังไม่ได้ใส่ URL
        if "ใส่_IP" in url or "PORT" in url:
            print(f"  ⏭  [{name}] → ยังไม่ได้ใส่ URL (ข้าม)")
            fail_count += 1
            continue

        try:
            print(f"  🔄 [{name}] กำลังดึงข้อมูลจาก {url} ...")
            res = requests.get(url, timeout=5)
            res.raise_for_status()
            raw = res.json()

            # รองรับทั้ง response แบบ Array ตรงๆ และแบบ { items: [...] }
            if isinstance(raw, list):
                products = raw
            elif isinstance(raw, dict) and "items" in raw:
                products = raw["items"]
            elif isinstance(raw, dict) and "data" in raw:
                products = raw["data"]
            else:
                products = []

            # Normalize ข้อมูลให้อยู่ในรูปแบบเดียวกัน (id, name, price, stock)
            normalized = []
            for p in products:
                item = {
                    "id": p.get("id", p.get("car_id", p.get("product_id", None))),
                    "name": p.get("name", "Unknown"),
                    "price": float(p.get("price", p.get("selling_price", 0))),
                    "stock": int(p.get("stock", p.get("quantity", 0))),
                    "source": name,  # ระบุว่ามาจากสมาชิกคนไหน
                }
                normalized.append(item)

            all_products.extend(normalized)
            success_count += 1
            print(f"  ✅ [{name}] ดึงข้อมูลสำเร็จ → {len(normalized)} รายการ")

        except requests.exceptions.ConnectionError:
            print(f"  ❌ [{name}] เชื่อมต่อไม่ได้ (server อาจปิดอยู่)")
            fail_count += 1
        except requests.exceptions.Timeout:
            print(f"  ❌ [{name}] หมดเวลาเชื่อมต่อ (timeout)")
            fail_count += 1
        except Exception as e:
            print(f"  ❌ [{name}] Error: {e}")
            fail_count += 1

    print("-" * 80)
    print(f"  สรุป: สำเร็จ {success_count}/{len(GROUP_MEMBERS)} คน "
          f"| ล้มเหลว/ข้าม {fail_count} คน "
          f"| รวมสินค้า {len(all_products)} รายการ")
    print("=" * 80)

    return all_products


# ============================================================================
# STEP 2: บันทึกข้อมูลรวม
# ============================================================================
def save_combined_data(all_products):
    """บันทึกข้อมูลรวมเป็น JSON"""
    output_path = os.path.join(OUTPUT_DIR, "group_products.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)
    print(f"\n[✓] บันทึกข้อมูลรวมที่: {output_path}")
    return output_path


# ============================================================================
# STEP 3: K-Means Clustering ข้อมูลกลุ่ม
# ============================================================================
def run_group_clustering(all_products, n_clusters=3):
    """ทำ K-Means Clustering กับข้อมูลรวมของกลุ่ม"""
    print("\n" + "=" * 80)
    print("  STEP 3: K-Means Clustering (ข้อมูลรวมทั้งกลุ่ม)")
    print("=" * 80)

    df = pd.DataFrame(all_products)

    if len(df) < n_clusters:
        print(f"[!] ข้อมูลไม่เพียงพอ ({len(df)} รายการ) ต้องมีอย่างน้อย {n_clusters} รายการ")
        return None

    # Standardization
    features = df[['price']].copy()
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    # K-Means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    raw_clusters = kmeans.fit_predict(scaled)
    df['raw_cluster'] = raw_clusters

    # จัดลำดับ Cluster ให้ 0=ถูก, 1=กลาง, 2=แพง
    cluster_means = df.groupby('raw_cluster')['price'].mean().sort_values().index
    cluster_map = {old: new for new, old in enumerate(cluster_means)}
    df['cluster'] = df['raw_cluster'].map(cluster_map)

    # Cluster metadata
    cluster_meta = {
        0: {'title': 'Cluster 0: Budget (สินค้าราคาประหยัด)',   'color': '#10b981'},
        1: {'title': 'Cluster 1: Mid-Range (สินค้าราคากลาง)',   'color': '#f59e0b'},
        2: {'title': 'Cluster 2: Premium (สินค้าราคาสูง)',      'color': '#ef4444'},
    }

    df['cluster_name'] = df['cluster'].map(lambda c: cluster_meta[c]['title'])

    # แสดงผลในตาราง
    df_sorted = df.sort_values(by=['cluster', 'price']).reset_index(drop=True)

    for c in range(n_clusters):
        sub = df_sorted[df_sorted['cluster'] == c]
        print(f"\n>>> {cluster_meta[c]['title']} (จำนวน: {len(sub)} รายการ)")
        print("-" * 80)
        for _, row in sub.iterrows():
            print(f"  • {row['name']:<42} | ราคา: {row['price']:>12,.2f} | จาก: {row['source']}")

    # ตารางสรุป
    print("\n" + "=" * 80)
    print("  ตารางสรุป Cluster Characteristics (ข้อมูลรวมทั้งกลุ่ม)")
    print("=" * 80)

    for c in range(n_clusters):
        sub = df[df['cluster'] == c]
        if len(sub) > 0:
            print(f"\n  {cluster_meta[c]['title']}")
            print(f"    จำนวน: {len(sub)} | "
                  f"ราคาต่ำสุด: {sub['price'].min():,.2f} | "
                  f"เฉลี่ย: {sub['price'].mean():,.2f} | "
                  f"สูงสุด: {sub['price'].max():,.2f}")

            # แสดงแหล่งที่มา
            sources = sub['source'].value_counts()
            source_str = ", ".join([f"{src}: {cnt}" for src, cnt in sources.items()])
            print(f"    สมาชิก: {source_str}")

    # บันทึก CSV
    csv_path = os.path.join(OUTPUT_DIR, "group_clustered.csv")
    df_sorted.to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"\n[✓] บันทึก CSV ที่: {csv_path}")

    return df, cluster_meta


# ============================================================================
# STEP 4: วาดกราฟผลลัพธ์ของกลุ่ม
# ============================================================================
def plot_group_results(df, cluster_meta, n_clusters=3):
    """วาดกราฟ Scatter Plot แสดงผล Clustering ของกลุ่ม"""
    print("\n" + "=" * 80)
    print("  STEP 4: วาดกราฟผลลัพธ์ (Group Clustering)")
    print("=" * 80)

    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 7))

    chart_labels = {
        0: 'Cluster 0: Budget',
        1: 'Cluster 1: Mid-Range',
        2: 'Cluster 2: Premium'
    }

    # กราฟ 1: Price Distribution (1D with Log Scale & Centroids)
    ax1.set_xscale('log')
    import numpy as np
    np.random.seed(42)

    for c in range(n_clusters):
        sub = df[df['cluster'] == c]
        # Jitter Y เล็กน้อยเพื่อให้จุดที่ราคาใกล้กันไม่ทับกันจนมิด
        jitter = np.random.uniform(-0.12, 0.12, size=len(sub)) if len(sub) > 1 else [0]
        ax1.scatter(sub['price'], [c + j for j in jitter],
                    color=cluster_meta[c]['color'], s=120, alpha=0.75,
                    edgecolors='black', label=f"{chart_labels.get(c, f'Cluster {c}')} ({len(sub)} รายการ)")

        # วาดตำแหน่งจุดศูนย์กลาง Centroid (μ)
        if len(sub) > 0:
            mean_p = sub['price'].mean()
            ax1.scatter([mean_p], [c], color='yellow', s=260, marker='*', edgecolors='black', zorder=10)
            fmt_mean = f"{mean_p/1e6:.2f}M" if mean_p >= 1e6 else f"{mean_p:,.0f}฿"
            ax1.annotate(f"μ={fmt_mean}", (mean_p, c + 0.22),
                         fontsize=9, fontweight='bold', ha='center',
                         bbox=dict(boxstyle='round,pad=0.25', facecolor='white', edgecolor=cluster_meta[c]['color'], alpha=0.9))

    ax1.set_title('Group Product Clustering by Price (1D K-Means with Centroids ⭐)',
                  fontsize=13, fontweight='bold')
    ax1.set_xlabel('Price (THB) — Log Scale (ขยายช่วงให้เห็นชัด)', fontsize=11)
    ax1.set_yticks(range(n_clusters))
    ax1.set_yticklabels([chart_labels.get(i, f'Cluster {i}') for i in range(n_clusters)], fontsize=11)
    ax1.grid(True, linestyle='--', alpha=0.5, which='both')
    ax1.legend(loc='lower right', fontsize=9)

    # กราฟ 2: Product Count per Source per Cluster (Stacked Bar)
    sources = df['source'].unique()
    x = range(n_clusters)
    bottom = [0] * n_clusters
    colors = plt.cm.Set2.colors

    for i, src in enumerate(sources):
        counts = []
        for c in range(n_clusters):
            count = len(df[(df['cluster'] == c) & (df['source'] == src)])
            counts.append(count)
        ax2.bar(x, counts, bottom=bottom, label=src,
                color=colors[i % len(colors)], edgecolor='black', alpha=0.85)
        bottom = [b + c for b, c in zip(bottom, counts)]

    ax2.set_title('Product Count by Member & Cluster (Group Overview)',
                  fontsize=13, fontweight='bold')
    ax2.set_xlabel('Cluster', fontsize=11)
    ax2.set_ylabel('Number of Products', fontsize=11)
    ax2.set_xticks(range(n_clusters))
    ax2.set_xticklabels(['Budget', 'Mid-Range', 'Premium'], fontsize=11)
    ax2.legend(loc='upper right', fontsize=8, title='สมาชิก')
    ax2.grid(True, linestyle='--', alpha=0.4, axis='y')

    # Format ตัวเลขบนแกน Log Scale
    from matplotlib.ticker import FuncFormatter, LogLocator

    def format_currency(x, pos):
        if x >= 1e6:
            return f'{x * 1e-6:.1f}M'
        elif x >= 1e3:
            return f'{x * 1e-3:.0f}k'
        return f'{x:.0f}฿'

    ax1.xaxis.set_major_locator(LogLocator(base=10.0, numticks=10))
    ax1.xaxis.set_major_formatter(FuncFormatter(format_currency))

    plt.tight_layout()
    graph_path = os.path.join(OUTPUT_DIR, "group_cluster_results.png")
    plt.savefig(graph_path, dpi=300)
    print(f"[✓] บันทึกกราฟที่: {graph_path}")

    try:
        if matplotlib.get_backend().lower() != 'agg':
            plt.show()
    except Exception:
        pass


# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    print("\n" + "★" * 80)
    print("  GROUP K-MEANS AGGREGATOR")
    print("  Internet Programming - Kasetsart University Sriracha")
    print("★" * 80 + "\n")

    # Step 1: ดึงข้อมูลทุกคน
    all_products = fetch_all_members()

    if len(all_products) == 0:
        print("\n[!] ไม่มีข้อมูลสินค้า ไม่สามารถทำ Clustering ได้")
        print("    → ตรวจสอบว่าใส่ URL ของสมาชิกถูกต้องและ server ทุกคนเปิดอยู่")
        sys.exit(1)

    # Step 2: บันทึกข้อมูลรวม
    save_combined_data(all_products)

    # Step 3: K-Means Clustering
    result = run_group_clustering(all_products, n_clusters=3)

    if result is None:
        sys.exit(1)

    df, cluster_meta = result

    # Step 4: วาดกราฟ
    plot_group_results(df, cluster_meta, n_clusters=3)

    print("\n" + "=" * 80)
    print("  ✅ รันเสร็จสมบูรณ์!")
    print("=" * 80)
