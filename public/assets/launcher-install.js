// Keep the launcher pointed at whichever deployment users downloaded it from.
(() => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "celestial-installer";
  button.setAttribute("aria-label", "Install Celestial launcher");
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/></svg><span>Install launcher</span>';
  document.body.append(button);

  button.addEventListener("click", () => {
    const destination = new URL("/", window.location.origin).href;
    const safeUrl = destination.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    const html = [
      '<!doctype html><html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>Celestial Launcher</title><meta name="theme-color" content="#101b29">',
      '<style>*{box-sizing:border-box}body{min-height:100vh;margin:0;padding:24px;display:grid;place-items:center;font-family:system-ui,-apple-system,sans-serif;color:#edf8ff;background:radial-gradient(circle at 52% 0%,#375671,#142238 44%,#0a101b 100%)}main{width:min(430px,100%);padding:32px;border:1px solid #51647b;border-radius:24px;background:#101c2de8;box-shadow:0 24px 90px #0008}.emblem{width:56px;height:56px;border-radius:17px;display:grid;place-items:center;background:#a7dff51c;border:1px solid #a7dff54c;color:#c4f3ff;font-size:29px}h1{font-size:36px;letter-spacing:-.06em;line-height:1.1;margin:24px 0 10px}p{color:#a9b9c9;font-size:14px;line-height:1.6}a{display:block;margin-top:24px;padding:14px 18px;border-radius:12px;text-align:center;background:linear-gradient(110deg,#b8ecf7,#8ebeff);color:#142238;font-weight:750;text-decoration:none}a:focus-visible{outline:2px solid white;outline-offset:3px}small{display:block;margin-top:20px;color:#8094a8;overflow-wrap:anywhere}</style></head>',
      '<body><main><div class="emblem" aria-hidden="true">✦</div>',
      '<h1>Back to the stars.</h1><p>Your Celestial workspace is one click away. Open it directly for reliable logins and browser features.</p>',
      '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">Launch Celestial ↗</a>',
      '<small>Connected to ' + safeUrl + '. Download a new launcher if this address changes.</small>',
      '</main></body></html>'
    ].join("");
    const objectUrl = URL.createObjectURL(new Blob([html], {type:"text/html;charset=utf-8"}));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "Celestial-Launcher.html";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  });
})();