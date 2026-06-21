import urllib.request
import xml.etree.ElementTree as ET

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
try:
    print("Fetching feed...")
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    print(f"Fetched {len(xml_data)} bytes.")
    
    # Parse XML
    root = ET.fromstring(xml_data)
    print("Root tag:", root.tag)
    
    # Namespaces are usually present in Atom feeds
    ns = {}
    if '}' in root.tag:
        ns_url = root.tag.split('}')[0][1:]
        ns = {'atom': ns_url}
        print("Namespace detected:", ns_url)
    
    # Print some feed details
    title_el = root.find('atom:title', ns) if ns else root.find('title')
    title = title_el.text if title_el is not None else "No Title"
    print("Feed Title:", title)
    
    # Find entries
    entry_tag = 'atom:entry' if ns else 'entry'
    entries = root.findall(entry_tag, ns)
    print(f"Total entries found: {len(entries)}")
    
    if entries:
        for idx in range(min(3, len(entries))):
            sample = entries[idx]
            print(f"\n--- Entry {idx} Structure ---")
            title_el = sample.find('atom:title', ns)
            updated_el = sample.find('atom:updated', ns)
            link_el = sample.find('atom:link', ns)
            content_el = sample.find('atom:content', ns)
            
            print("Title:", title_el.text if title_el is not None else "N/A")
            print("Updated:", updated_el.text if updated_el is not None else "N/A")
            print("Link:", link_el.attrib.get('href') if link_el is not None else "N/A")
            print("Content HTML:")
            print(content_el.text if content_el is not None else "N/A")
            print("-" * 40)
            
except Exception as e:
    print("Error:", e)
