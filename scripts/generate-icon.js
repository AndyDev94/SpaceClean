const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      offscreen: true
    }
  });

  const svgContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 512px;
            height: 512px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          .container {
            width: 512px;
            height: 512px;
            background: #090d16;
            border-radius: 110px;
            border: 14px solid rgba(59, 130, 246, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
          }
          svg {
            width: 320px;
            height: 320px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer Drive Body -->
            <rect
              x="3"
              y="2"
              width="18"
              height="20"
              rx="3"
              stroke="#3b82f6"
              stroke-width="1.8"
              fill="#3b82f6"
              fill-opacity="0.12"
            />
            <!-- Magnetic Disk Platter -->
            <circle
              cx="12"
              cy="9"
              r="4.5"
              stroke="#60a5fa"
              stroke-width="1.6"
            />
            <circle
              cx="12"
              cy="9"
              r="1.5"
              fill="#3b82f6"
            />
            <!-- Actuator arm line -->
            <path
              d="M12 9L15 13"
              stroke="#60a5fa"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <!-- Activity Status LED & Connector notches -->
            <circle
              cx="6.5"
              cy="17.5"
              r="1.1"
              fill="#10b981"
            />
            <line
              x1="10"
              y1="17.5"
              x2="17.5"
              y2="17.5"
              stroke="#3b82f6"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </div>
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(svgContent)}`);
  
  // Wait 300ms for rendering
  await new Promise(r => setTimeout(r, 300));

  const image = await win.webContents.capturePage();
  const pngBuffer = image.toPNG();

  fs.mkdirSync(path.join(__dirname, '../build'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, '../public'), { recursive: true });

  fs.writeFileSync(path.join(__dirname, '../build/icon.png'), pngBuffer);
  fs.writeFileSync(path.join(__dirname, '../public/icon.png'), pngBuffer);
  fs.writeFileSync(path.join(__dirname, '../public/favicon.png'), pngBuffer);

  console.log('Successfully generated clean vector icon for build/icon.png and public/icon.png');
  app.exit(0);
});
