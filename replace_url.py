import os
import glob

frontend_dir = r"D:\EXONYX\frontend\src\app"
files = glob.glob(frontend_dir + "/**/*.tsx", recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace single quoted literal
    content = content.replace("'http://127.0.0.1:8000", "(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '")
    # Replace backtick literal
    content = content.replace("`http://127.0.0.1:8000", "`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}")
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Replacement complete.")
