import json

with open('analysis/data/my_products.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    item['id'] = item.get('car_id')
    item['name'] = f"{item.get('brand', '')} {item.get('model', '')}".strip()
    item['price'] = float(item.get('selling_price', 0))
    item['stock'] = 1 if item.get('status') == 'Available' else 0

with open('analysis/data/my_products.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('my_products.json updated successfully with id, name, price, stock!')
