import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import fs from 'fs'
import path from 'path'

function getRequestBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default defineConfig({
  plugins: [
    react(),
    (cesium as any)(),
    {
      name: 'cesium-sandcastle-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = url.pathname;

            res.setHeader('Content-Type', 'application/json');

            try {
              if (pathname === '/api/examples') {
                const examplesDir = path.resolve(__dirname, 'src/examples');
                if (!fs.existsSync(examplesDir)) {
                  fs.mkdirSync(examplesDir, { recursive: true });
                }
                const folders = fs.readdirSync(examplesDir).filter(f => {
                  const stat = fs.statSync(path.join(examplesDir, f));
                  return stat.isDirectory();
                });

                const list = folders.map(folder => {
                  const codePath = path.join(examplesDir, folder, 'index.tsx');
                  const notesPath = path.join(examplesDir, folder, 'notes.md');
                  const code = fs.existsSync(codePath) ? fs.readFileSync(codePath, 'utf8') : '';
                  const notes = fs.existsSync(notesPath) ? fs.readFileSync(notesPath, 'utf8') : '';
                  return { name: folder, code, notes };
                });

                res.end(JSON.stringify(list));
                return;
              }

              if (pathname === '/api/save' && req.method === 'POST') {
                const bodyStr = await getRequestBody(req);
                const { name, code, notes } = JSON.parse(bodyStr);
                if (!name) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Name is required' }));
                  return;
                }

                const exampleDir = path.resolve(__dirname, 'src/examples', name);
                if (!fs.existsSync(exampleDir)) {
                  fs.mkdirSync(exampleDir, { recursive: true });
                }

                if (code !== undefined) {
                  fs.writeFileSync(path.join(exampleDir, 'index.tsx'), code, 'utf8');
                }
                if (notes !== undefined) {
                  fs.writeFileSync(path.join(exampleDir, 'notes.md'), notes, 'utf8');
                }

                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (pathname === '/api/create' && req.method === 'POST') {
                const bodyStr = await getRequestBody(req);
                const { name } = JSON.parse(bodyStr);
                if (!name) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Name is required' }));
                  return;
                }

                const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
                const exampleDir = path.resolve(__dirname, 'src/examples', sanitizedName);
                if (fs.existsSync(exampleDir)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: `Example "${sanitizedName}" already exists.` }));
                  return;
                }

                fs.mkdirSync(exampleDir, { recursive: true });

                const defaultCode = `import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

export default function ${sanitizedName}() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Use default access token or let user inject it
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: undefined,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      timeline: false,
      animation: false,
    });

    // Fly to Beijing
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(116.3974, 39.9093, 20000.0),
    });

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    />
  );
}
`;

                const defaultNotes = `# ${sanitizedName}

学习笔记：
- 这是一个新创建的 Cesium Sandcastle 示例。
- 在此处记录您的学习心得、关键 API 或参数配置。
`;

                fs.writeFileSync(path.join(exampleDir, 'index.tsx'), defaultCode, 'utf8');
                fs.writeFileSync(path.join(exampleDir, 'notes.md'), defaultNotes, 'utf8');

                res.end(JSON.stringify({ success: true, name: sanitizedName }));
                return;
              }

              if (pathname === '/api/cesium-types') {
                const typesPath = path.resolve(__dirname, 'node_modules/cesium/Source/Cesium.d.ts');
                if (fs.existsSync(typesPath)) {
                  res.setHeader('Content-Type', 'text/plain');
                  const stream = fs.createReadStream(typesPath);
                  stream.pipe(res);
                  return;
                } else {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Cesium types not found' }));
                  return;
                }
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
          next();
        });
      }
    }
  ]
})
