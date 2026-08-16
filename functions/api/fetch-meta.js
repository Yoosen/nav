// 服务端代理：调用 Microlink API 提取目标网站的元数据
// 返回 JSON: { title, description, image }
// Microlink 免费、无需密钥，比自行解析 <meta> 更准确（含 OG / 兜底逻辑）

import { getCorsHeaders, jsonResponse } from './_kvAdapter.js';

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(env);
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405, corsHeaders);
  }

  let target = url.searchParams.get('url');
  if (!target) {
    return jsonResponse({ error: 'url parameter required' }, 400, corsHeaders);
  }
  if (!/^https?:\/\//i.test(target)) {
    target = 'https://' + target;
  }

  let controller, timeout;
  try {
    controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 10000);

    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(target)}`;
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    if (!res.ok) {
      return jsonResponse({ error: `microlink status ${res.status}` }, 502, corsHeaders);
    }

    const data = await res.json();
    const result = data && data.status === 'success' ? data.data : null;

    if (!result) {
      return jsonResponse({ title: '', description: '', image: '' }, 200, corsHeaders);
    }

    const title = (result.title || (result.openGraph && result.openGraph.title) || '').toString().trim();
    const description = (result.description || (result.openGraph && result.openGraph.description) || '').toString().trim();
    let image = '';
    if (result.image && result.image.url) {
      image = result.image.url;
    } else if (result.openGraph && result.openGraph.image && result.openGraph.image.url) {
      image = result.openGraph.image.url;
    } else if (typeof result.image === 'string') {
      image = result.image;
    }

    return jsonResponse(
      { title, description, image },
      200,
      corsHeaders
    );
  } catch (err) {
    return jsonResponse({ error: 'fetch failed: ' + (err && err.message ? err.message : String(err)) }, 500, corsHeaders);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
