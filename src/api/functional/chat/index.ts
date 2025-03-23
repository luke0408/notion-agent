/**
 * @packageDocumentation
 * @module api.functional.chat
 * @nestia Generated by Nestia - https://github.com/samchon/nestia
 */
//================================================================
import type { IAgenticaRpcListener } from "@agentica/rpc/lib/IAgenticaRpcListener";
import type { IAgenticaRpcService } from "@agentica/rpc/lib/IAgenticaRpcService";
import type { IConnection } from "@nestia/fetcher";
import { WebSocketConnector } from "tgrid";
import type { Driver } from "tgrid";

/**
 * @controller NotionController.start
 * @path /chat
 * @nestia Generated by Nestia - https://github.com/samchon/nestia
 */
export async function start(
  connection: IConnection<start.Header>,
  provider: start.Provider,
): Promise<start.Output> {
  const connector: WebSocketConnector<
    start.Header,
    start.Provider,
    start.Listener
  > = new WebSocketConnector(connection.headers ?? ({} as any), provider);
  await connector.connect(
    `${connection.host.endsWith("/") ? connection.host.substring(0, connection.host.length - 1) : connection.host}${start.path()}`,
  );
  const driver: Driver<start.Listener> = connector.getDriver();
  return {
    connector,
    driver,
  };
}
export namespace start {
  export type Output = {
    connector: WebSocketConnector<Header, Provider, Listener>;
    driver: Driver<Listener>;
  };
  export type Header = undefined;
  export type Provider = IAgenticaRpcListener;
  export type Listener = IAgenticaRpcService<"chatgpt">;

  export const path = () => "/chat";
}
