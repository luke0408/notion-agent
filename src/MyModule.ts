import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { BbsArticleModule } from "./controllers/bbs/BbsArticleModule";
import { ChatModule } from "./controllers/chat/ChatModule";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "client"),
      serveRoot: "/",
    }),
    BbsArticleModule,
    ChatModule,
  ],
})
export class MyModule {}
