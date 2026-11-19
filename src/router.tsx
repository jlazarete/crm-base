import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/start-client-core";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // O nonce do CSP só existe no servidor; no cliente chega pela meta tag.
  const nonce = (getGlobalStartContext() as { cspNonce?: string } | undefined)?.cspNonce;
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });
};
