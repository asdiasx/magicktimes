# Magick Times

A planetary hours calculator. Given your location and a date, it shows which planet rules each of the 24 unequal hours of that day, divided into day hours (sunrise → sunset) and night hours (sunset → next sunrise).

**Live site:** [magicktimes.com.br](https://magicktimes.com.br/) (`magicktimes.com` and `www.` variants redirect here)

---

## How it works

Planetary hours divide the day into 12 equal day segments (sunrise to sunset) and 12 equal night segments (sunset to next sunrise). The ruling planet for each hour follows the Chaldean order starting from the planet of the day:

|Day|Planet|
|---|------|
|Sunday|Sun|
|Monday|Moon|
|Tuesday|Mars|
|Wednesday|Mercury|
|Thursday|Jupiter|
|Friday|Venus|
|Saturday|Saturn|

Sunrise and sunset times are fetched from the [sunrise-sunset.org API](https://sunrise-sunset.org/api). Location is resolved from browser geolocation via the [LocationIQ API](https://locationiq.com).

The row matching the current planetary hour is highlighted automatically. The app also switches to the correct tab (Day or Night) on load so the active hour is always visible.

---

## Development

### Prerequisites

- Node.js (for minification tooling)
- A browser with geolocation support
- A [LocationIQ](https://locationiq.com) API key (free tier available)

### API key setup

The LocationIQ key is hardcoded in [src/script.js](src/script.js). Since this is a client-side static site the key is always visible in source — **restrict it on the LocationIQ dashboard to your domain** to prevent abuse:

1. Log in to [locationiq.com](https://locationiq.com)
2. Go to **API Access Tokens**
3. Create a token with **Allowed HTTP Referrers** set to the site domains: `https://magicktimes.com.br/*` (main) and `https://www.magicktimes.com/*`. The LocationIQ dashboard may not allow editing referrers on an existing token, so to change domains, create a new token, swap it in `src/script.js`, deploy, then delete the old token.

### Running locally

Build first, then serve the `dist/` folder:

```bash
make build
npx serve dist
```

Geolocation requires either `localhost` or HTTPS — it will not work on plain `http://`.

---

## Build & Deploy

The `dist/` folder contains minified production assets.

### Build

```bash
make build    # minify → dist/
make clean    # remove dist/
```

Make is incremental: only files whose sources changed are rebuilt on subsequent runs.

|File|Tool|
|----|----|
|`src/script.js`|[terser](https://terser.org/)|
|`src/style.css`|[clean-css](https://github.com/clean-css/clean-css)|
|`index.html`|[html-minifier-terser](https://github.com/terser/html-minifier-terser)|
|`src/img/*`|copied as-is|

### Deploy

Copy `.env.example` to `.env` and fill in your server details:

```bash
cp .env.example .env
```

```bash
make deploy          # build + rsync dist/ to server (auto-backup before overwrite)
make rollback        # restore previous version from backup
make deploy-nginx    # push nginx/security-headers.conf to /etc/nginx/snippets/
```

After running `deploy-nginx`, include the snippet in your HTTPS `server {}` block **before** the `location /` block:

```nginx
server {
    root /var/www/yoursite/html;
    server_name yoursite.com www.yoursite.com;

    include snippets/magicktimes-security.conf;

    location / {
        try_files $uri $uri/ =404;
    }
    # ... ssl config
}
```

`DEPLOY_TARGET` can also be passed inline without a `.env`:

```bash
make deploy DEPLOY_TARGET=root@191.252.192.196:/var/www/magicktimes.com/html/
```

---

### Hosting

- **Server:** Locaweb VPS (Brazil, Debian 13). It was migrated from the old DigitalOcean droplet on 2026-11-20.
- **Files:** served by nginx from `/var/www/magicktimes.com/html`.
- **nginx vhosts:**
  - `magicktimes-br` serves the main domain `magicktimes.com.br`; `www` redirects to the apex.
  - `magicktimes` 301-redirects `magicktimes.com` and `www.magicktimes.com` to `https://magicktimes.com.br`.
- **TLS:** Let's Encrypt certificates via certbot (nginx plugin), renewed automatically.
- **DNS:** `magicktimes.com.br` at Registro.br; `magicktimes.com` at Umbler.
- **Server operations:** see `~/Documents/projetos-e-infra/infraestrutura/operacao.md`.

## Project structure

```text
magicktimes/
├── index.html          # app entry point
├── src/
│   ├── script.js       # all app logic
│   ├── style.css       # styles
│   └── img/            # planet SVG symbols + logo
├── nginx/
│   └── security-headers.conf   # nginx snippet (deploy with make deploy-nginx)
├── dist/               # minified build output (git-ignored)
├── .env                # deploy config — not committed (see .env.example)
├── .env.example        # template
├── Makefile
└── package.json        # dev dependencies (minifiers)
```

---

## Credits

- Developed by [Adriano Dias](mailto:adriano.rj.br@gmail.com)
- Sunrise/sunset data: [sunrise-sunset.org/api](https://sunrise-sunset.org/api)
- Reverse geocoding: [LocationIQ.com](https://locationiq.com)
- Logo art: [@matheusrocha.design](https://instagram.com/matheusrocha.design)
