from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
import datetime
import time

app = Flask(__name__)

# Simple in-memory cache
cache = {
    'data': None,
    'last_updated': 0,
    'expiry_seconds': 600  # 10 minutes cache
}

def clean_text(text):
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    
    with urllib.request.urlopen(req) as response:
        xml_content = response.read()
        
    root = ET.fromstring(xml_content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_updates = []
    
    for entry in entries:
        title = entry.find('atom:title', ns)
        title_text = title.text if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        updated_text = updated.text if updated is not None else ""
        
        link_elem = entry.find('atom:link', ns)
        link_href = link_elem.attrib.get('href', '') if link_elem is not None else 'https://cloud.google.com/bigquery/docs/release-notes'
        
        content = entry.find('atom:content', ns)
        if content is None or not content.text:
            continue
            
        content_html = content.text
        soup = BeautifulSoup(content_html, 'html.parser')
        
        h3_tags = soup.find_all('h3')
        entry_id = entry.find('atom:id', ns).text if entry.find('atom:id', ns) is not None else title_text
        
        if not h3_tags:
            # Entire content is one update
            text_content = clean_text(soup.get_text(separator=' '))
            parsed_updates.append({
                'id': entry_id,
                'date': title_text,
                'updated_raw': updated_text,
                'type': 'Update',
                'content_html': content_html,
                'content_text': text_content,
                'docs_url': link_href
            })
            continue
            
        for i, h3 in enumerate(h3_tags):
            update_type = h3.get_text().strip()
            
            # Gather siblings until the next h3
            sibling_elements = []
            for sibling in h3.next_siblings:
                if sibling.name == 'h3':
                    break
                # Filter out comments and whitespace strings if they have no text
                sibling_elements.append(str(sibling))
                
            sibling_html = "".join(sibling_elements).strip()
            
            # Parse text contents for searching and tweet drafting
            sub_soup = BeautifulSoup(sibling_html, 'html.parser')
            text_content = clean_text(sub_soup.get_text(separator=' '))
            
            unique_id = f"{entry_id}_{i}"
            
            # Build anchor link for specific entry date if possible
            anchor_link = link_href
            
            parsed_updates.append({
                'id': unique_id,
                'date': title_text,
                'updated_raw': updated_text,
                'type': update_type,
                'content_html': sibling_html,
                'content_text': text_content,
                'docs_url': anchor_link
            })
            
    return parsed_updates

def get_updates(force_refresh=False):
    now = time.time()
    if force_refresh or cache['data'] is None or (now - cache['last_updated']) > cache['expiry_seconds']:
        try:
            updates = fetch_and_parse_feed()
            cache['data'] = updates
            cache['last_updated'] = now
            return updates, None
        except Exception as e:
            # If fetch fails but we have cached data, fall back to cache
            if cache['data'] is not None:
                return cache['data'], f"Failed to refresh feed: {str(e)}. Using cached data."
            return [], f"Failed to fetch feed: {str(e)}"
    return cache['data'], None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def api_updates():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    updates, error = get_updates(force_refresh)
    return jsonify({
        'updates': updates,
        'error': error,
        'last_updated': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache['last_updated'])) if cache['last_updated'] else None
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
