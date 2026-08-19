"""Add CSS links to all HTML files."""
import os
import re

CSS_LINKS = '''    <link rel="stylesheet" href="css/theme.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/responsive.css">
    <link rel="stylesheet" href="css/pages.css">
'''

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for filename in html_files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already has CSS links
    if 'href="css/theme.css"' in content:
        print(f"✓ {filename} - Already has CSS")
        continue

    # Add CSS links before </head>
    if '</head>' in content:
        new_content = content.replace('</head>', CSS_LINKS + '</head>')
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ {filename} - Added CSS links")
    else:
        print(f"❌ {filename} - No </head> tag found")

print("\n🎉 Done! Restart your browser.")
