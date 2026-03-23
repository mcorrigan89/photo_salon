import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { type ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { contract } from "@photo-salon/contract";
import { getServerUrl } from "./config";

const getClientLink = createIsomorphicFn()
  .client(() => {
    const serverUrl = getServerUrl();
    return new RPCLink({
      url: `${serverUrl}/rpc`,
      fetch: (request, init) => {
        return globalThis.fetch(request, { ...init, credentials: "include" });
      },
      plugins: [
        new BatchLinkPlugin({
          groups: [{ condition: () => true, context: {} }],
        }),
      ],
    });
  })
  .server(() => {
    const serverUrl = process.env.API_URL ?? getServerUrl();
    return new RPCLink({
      url: `${serverUrl}/rpc`,
      headers: () => getRequestHeaders(),
      fetch: (request, init) => {
        return globalThis.fetch(request, { ...init, credentials: "include" });
      },
      plugins: [
        new BatchLinkPlugin({
          groups: [{ condition: () => true, context: {} }],
        }),
      ],
    });
  });

const link = getClientLink();
const client: ContractRouterClient<typeof contract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
