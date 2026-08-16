// 本地开发用：直接在 Node 中运行 functions/api/*.js（Pages Functions 风格），
// 用内存 KV 模拟 CLOUDNAV_KV，使本地 `npm run dev` 能登录后台。
// 仅用于开发，生产部署仍由 Cloudflare/EdgeOne Pages Functions 接管。
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_DIR = path.resolve(__dirname, 'functions/api');

// 极简内存 KV，满足 get/put/delete 接口
function createMemoryKV() {
  const store = new Map();
  const timers = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value, opts = {}) {
      store.set(key, value);
      if (opts.expirationTtl) {
        const t = setTimeout(() => store.delete(key), opts.expirationTtl * 1000);
        timers.set(key, t);
      }
    },
    async delete(key) {
      const t = timers.get(key);
      if (t) clearTimeout(t);
      timers.delete(key);
      store.delete(key);
    },
  };
}

// 整个 dev server 共享同一个内存 KV 实例（登录写入的 token 才能被后续请求读到）
const sharedKV = createMemoryKV();

export function localFunctionsPlugin({ env = {} } = {}) {
  const moduleCache = new Map();

  async function loadHandler(name) {
    if (moduleCache.has(name)) return moduleCache.get(name);
    const filePath = path.join(FUNCTIONS_DIR, `${name}.js`);
    let mod;
    try {
      mod = await import(`file://${filePath}?t=${Date.now()}`);
    } catch (e) {
      return null;
    }
    moduleCache.set(name, mod);
    return mod;
  }

  return {
    name: 'local-functions',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        // 去掉查询串，解析模块名：/api/storage -> storage, /api/link -> link
        const pathname = req.url.split('?')[0];
        const segments = pathname.replace(/^\/api\//, '').split('/');
        const name = segments[0];
        if (!name || name.startsWith('_')) return next();

        const mod = await loadHandler(name);
        if (!mod || typeof mod.onRequest !== 'function') {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `No handler for /api/${name}` }));
          return;
        }

        try {
          const body = await readBody(req);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: body ? body : undefined,
          });

          const kv = sharedKV;
          const context = {
            request,
            env: {
              ...env,
              CLOUDNAV_KV: kv,
              ALLOWED_ORIGIN: env.ALLOWED_ORIGIN || '*',
            },
          };

          const response = await mod.onRequest(context);
          const buf = Buffer.from(await response.arrayBuffer());
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(buf);
        } catch (e) {
          console.error(`[local-functions] /api/${name} error:`, e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'local function error', detail: String(e) }));
        }
      });
    },
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'HEAD') return resolve(null);
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8') || null));
    req.on('error', () => resolve(null));
  });
}
