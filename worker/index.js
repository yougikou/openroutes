export default {
  async fetch(request, env) {
    // 允许跨域调用的域名 (你的 Web App 地址)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // 生产环境建议改为 "https://yougikou.github.io"
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname === "/exchange-token" && request.method === "POST") {
      try {
        const { code } = await request.json();

        // 使用 Cloudflare 注入的环境变量 (env.GITHUB_...)
        const params = {
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET, // 关键：从加密变量获取
          code: code,
        };

        const ghResponse = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(params),
        });

        const data = await ghResponse.json();
        return new Response(JSON.stringify(data), { headers: corsHeaders });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
