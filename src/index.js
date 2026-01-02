const express = require('express');

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Basic health endpoint used by load balancers and health checks
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Root route: simple landing page
app.get('/', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || 'not set';
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>teach-in-minutes</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:#f7f7f7;color:#111;padding:2rem}</style>
  </head>
  <body>
    <h1>teach-in-minutes</h1>
    <p>Service running. Port: ${process.env.PORT || 8080}</p>
    <p>Supabase project URL: <code>${supabaseUrl}</code></p>
    <p>Domain: teach-in-minutes.com</p>
    <hr/>
    <p>Deployed to Cloud Run — edit the repo and push to trigger a new build.</p>
  </body>
</html>`;
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.listen(port, () => {
  console.log(`teach-in-minutes listening on port ${port}`);
});
