import { Agentica } from "@agentica/core";
import {
  AgenticaRpcService,
  IAgenticaRpcListener,
  IAgenticaRpcService,
} from "@agentica/rpc";
import { WebSocketRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { HttpLlm, OpenApi } from "@samchon/openapi";
import OpenAI from "openai";
import { WebSocketAcceptor } from "tgrid";
import typia from "typia";

import { MyConfiguration } from "../../MyConfiguration";
import { MyGlobal } from "../../MyGlobal";

@Controller("chat")
export class MyChatController {
  @WebSocketRoute()
  public async start(
    @WebSocketRoute.Acceptor()
    acceptor: WebSocketAcceptor<
      undefined,
      IAgenticaRpcService<"chatgpt">,
      IAgenticaRpcListener
    >,
  ): Promise<void> {
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({ apiKey: MyGlobal.env.OPENAI_API_KEY }),
        model: "gpt-4o-mini",
      },
      controllers: [
        {
          protocol: "http",
          name: "bbs",
          application: HttpLlm.application({
            model: "chatgpt",
            document: OpenApi.convert(
              await fetch(
                `http://localhost:${MyConfiguration.API_PORT()}/editor/swagger.json`,
              ).then((r) => r.json()),
            ),
          }),
          connection: {
            host: `http://localhost:${MyConfiguration.API_PORT()}`,
          },
        },
      ],
    });
    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });
    await acceptor.accept(service);
  }
}
