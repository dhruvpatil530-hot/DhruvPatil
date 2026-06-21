import time
import urllib.request
import xml.etree.ElementTree as ET
import re
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache variables
feed_cache = None
cache_time = 0
CACHE_DURATION = 300 # Cache results for 5 minutes by default

def get_parsed_feed(force_refresh=False):
    global feed_cache, cache_time
    now = time.time()
    if feed_cache is not None and not force_refresh and (now - cache_time < CACHE_DURATION):
        return feed_cache, "cache"
    
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {}
    if '}' in root.tag:
        ns_url = root.tag.split('}')[0][1:]
        ns = {'atom': ns_url}
        
    entry_tag = 'atom:entry' if ns else 'entry'
    entries = root.findall(entry_tag, ns)
    
    parsed_updates = []
    
    for idx, entry in enumerate(entries):
        title_el = entry.find('atom:title', ns)
        updated_el = entry.find('atom:updated', ns)
        link_el = entry.find('atom:link', ns)
        content_el = entry.find('atom:content', ns)
        id_el = entry.find('atom:id', ns)
        
        date_str = title_el.text if title_el is not None else ""
        updated_str = updated_el.text if updated_el is not None else ""
        link_url = link_el.attrib.get('href') if link_el is not None else ""
        content_html = content_el.text if content_el is not None else ""
        entry_id = id_el.text if id_el is not None else f"entry-{idx}"
        
        # Clean entry_id to be a safe DOM ID
        safe_entry_id = re.sub(r'[^a-zA-Z0-9-]', '_', entry_id)
        
        soup = BeautifulSoup(content_html, 'html.parser')
        
        current_category = "General"
        current_elements = []
        item_counter = 0
        
        def save_current_item(category, elements):
            nonlocal item_counter
            if not elements:
                return
            
            # Reconstruct HTML
            item_html = "".join(str(e) for e in elements)
            
            # Clean up text content for tweet composer
            text_content = BeautifulSoup(item_html, 'html.parser').get_text().strip()
            text_content = re.sub(r'\s+', ' ', text_content)
            
            # Generate a unique ID for this specific update
            update_id = f"{safe_entry_id}-item-{item_counter}"
            item_counter += 1
            
            parsed_updates.append({
                'id': update_id,
                'date': date_str,
                'updated': updated_str,
                'link': link_url,
                'category': category,
                'content_html': item_html,
                'content_text': text_content
            })

        for child in soup.children:
            if child.name == 'h3':
                save_current_item(current_category, current_elements)
                current_category = child.get_text().strip()
                current_elements = []
            else:
                current_elements.append(child)
                
        save_current_item(current_category, current_elements)
        
    feed_cache = parsed_updates
    cache_time = now
    return feed_cache, "fresh"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def api_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, source = get_parsed_feed(force_refresh)
        return jsonify({
            'status': 'success',
            'source': source,
            'count': len(data),
            'data': data
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
