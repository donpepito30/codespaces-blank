import { onRequestGet as __api_search_js_onRequestGet } from "/workspaces/codespaces-blank/functions/api/search.js"

export const routes = [
    {
      routePath: "/api/search",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_search_js_onRequestGet],
    },
  ]