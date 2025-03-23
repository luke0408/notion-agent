import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { ChatModule } from "./controllers/notion/NotionModule";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "client"),
      serveRoot: "/",
    }),
    ChatModule,
  ],
})
export class MyModule {}
