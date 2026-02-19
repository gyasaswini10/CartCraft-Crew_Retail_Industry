import json
import random
import time
import urllib.request
import urllib.parse

# Categories and search terms to ensure diverse real data
categories_map = {
    "dairy": ["milk", "cheese", "butter", "yogurt", "cream"],
    "staples": ["rice", "wheat flour", "sugar", "salt", "cooking oil"],
    "baby-products": ["diapers", "baby food", "baby wipes"],
    "self-care": ["shampoo", "soap", "toothpaste", "face wash", "body lotion"],
    "fruits-vegetables": ["apple", "banana", "potato", "tomato", "onion"],
    "snacks": ["chocolate", "chips", "biscuits", "cookies"],
    "beverages": ["tea", "coffee", "juice", "soda"]
}

products = []
product_id = 1
seen_barcodes = set()

def fetch_products(keyword, category_name, limit=3):
    # Sort by popularity (unique_scans_n) to get products with better data/images
    url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={urllib.parse.quote(keyword)}&search_simple=1&action=process&json=1&page_size={limit}&fields=code,product_name,image_url,brands,quantity,nutriscore_grade&sort_by=unique_scans_n"
    try:
        print(f"Fetching {keyword}...")
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'FreshMart-Dataset-Generator/1.0 (internal-dev-test)'}
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data.get('products', [])
    except Exception as e:
        print(f"Error fetching {keyword}: {e}")
        return []

print("Starting OpenFoodFacts Fetch...")

for category, keywords in categories_map.items():
    for keyword in keywords:
        items = fetch_products(keyword, category, limit=5)
        
        for item in items:
            # Skip if no image or no name
            if not item.get('image_url') or not item.get('product_name'):
                continue
            
            # Skip duplicates
            if item.get('code') in seen_barcodes:
                continue
            
            seen_barcodes.add(item.get('code'))
            
            # Normalize Brand
            brand = item.get('brands', '').split(',')[0]
            if not brand:
                brand = "Generic"
                
            # Randomize Price based on category (OFF doesn't provide price)
            price = round(random.uniform(2.0, 20.0), 2)
            if category in ["baby-products", "self-care"]:
                price = round(random.uniform(5.0, 50.0), 2)
                
            # Create Product Object
            product = {
                "id": product_id,
                "title": item.get('product_name'),
                "description": f"{item.get('product_name')} ({item.get('quantity', 'Standard Pack')}). Trusted quality from {brand}.",
                "category": category,
                "price": price,
                "discountPercentage": round(random.uniform(5, 15), 2),
                "rating": round(random.uniform(3.0, 5.0), 2),
                "stock": random.randint(10, 150),
                "tags": [category, keyword],
                "brand": brand,
                "sku": f"{category[:3].upper()}-{keyword[:3].upper()}-{product_id:03d}",
                "weight": random.randint(1, 5),
                "dimensions": {
                     "width": round(random.uniform(5, 15), 2),
                     "height": round(random.uniform(5, 20), 2),
                     "depth": round(random.uniform(5, 10), 2)
                },
                "warrantyInformation": "No warranty",
                "shippingInformation": "Standard Shipping",
                "availabilityStatus": "In Stock",
                "reviews": [],
                "returnPolicy": "30 days return policy",
                "minimumOrderQuantity": 1,
                "meta": {
                    "createdAt": "2026-01-01T00:00:00.000Z",
                    "updatedAt": "2026-01-01T00:00:00.000Z",
                    "barcode": item.get('code')
                },
                "images": [item.get('image_url')],
                "thumbnail": item.get('image_url')
            }
            
            products.append(product)
            product_id += 1
        
        # Be polite to the API
        time.sleep(1)

dataset = {"products": products}

with open("c:/Users/Admin/Desktop/freshmart/freshmart/client/public/images/Dataset.json", "w", encoding='utf-8') as f:
    json.dump(dataset, f, indent=4)

print(f"Generated {len(products)} real products in Dataset.json")
