# L’Oréal Routine Builder — v2

A lightweight demo you can host on **GitHub Pages** with an API proxy on **Cloudflare Workers** to keep your OpenAI key off the client.

## Repo structure

```
/img/loreal-logo.png
/cloudflare/worker.js
/data/products.json
index.html
styles.css
script.js
secrets.js
```

## Quick start (GitHub Pages)

1. **Create a new repo** and push this folder.
2. In GitHub: **Settings → Pages → Deploy from branch**, choose `main` and `/ (root)` or `/docs` if you move files accordingly.
3. Your site will be at `https://<user>.github.io/<repo>/`.

> The Cloudflare Worker URL is already configured in `secrets.js` at: `https://aged-frost-e49c.peter-513.workers.dev`

## API Configuration

The OpenAI API key is already set up in the deployed Cloudflare Worker. The worker endpoint is configured in `secrets.js`:

```javascript
export const WORKER_URL = 'https://aged-frost-e49c.peter-513.workers.dev';
```

### Worker API

- **POST** to the worker URL with body:
  ```json
  { "messages": [{ "role": "user", "content": "..." }] }
  ```
- Returns **OpenAI chat** response:
  ```json
  { "choices": [ { "message": { "role": "assistant", "content": "..." } } ] }
  ```

## Features

- Tabbed UI: Chat • Browse • My Routine
- Product filter (category/concern/text)
- Routine builder (AM/PM) with localStorage persistence
- Assistant can add items via hints like `[ADD id=sk-spf50]`
- Export routine as `routine.json`

## Customization

- Replace `/data/products.json` with a larger catalog (keep `id`, `name`, `category`, `steps`).
- Update colors in `styles.css` (look for CSS variables in `:root`).
- Update the Cloudflare Worker URL in `secrets.js` if you deploy your own worker.

## Notes

- This is a demo and not medical advice.
- The OpenAI API key is securely stored in the Cloudflare Worker (not exposed on the client).
