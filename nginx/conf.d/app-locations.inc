# بدنه‌ی مشترک هر دو دامنه.
# پسوند .inc عمدی است: nginx فقط *.conf را خودکار include می‌کند، پس این فایل
# تنها جایی بارگذاری می‌شود که خودمان include کرده باشیم (داخل بلوک‌های server).
    client_max_body_size 50M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 256;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # ^~ prevents the regex below from intercepting these backend paths
    location ^~ /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 90;
    }

    location ^~ /static/ {
        proxy_pass http://backend:8000/static/;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400";
    }

    location ^~ /media/ {
        alias /app/media/;
        add_header Cache-Control "public, max-age=86400";
    }

    # React SPA — پاسخ این بلوک همیشه index.html است و نباید کش شود،
    # وگرنه مرورگر بعد از هر دیپلوی روی باندل قدیمی می‌ماند.
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires -1;
    }

    # نام این فایل‌ها هش دارد، پس کش طولانی امن است.
    # webp/avif حتماً باید در این فهرست باشند وگرنه به بلوک no-cache
    # می‌افتند و هر بازدید دوباره دانلود می‌شوند.
    # Cache frontend static assets (only reached for non-/api/, non-/static/, non-/media/ paths)
    location ~* \.(js|css|png|jpg|jpeg|gif|webp|avif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend:80;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
