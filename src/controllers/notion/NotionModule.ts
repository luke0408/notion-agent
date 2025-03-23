import { Module } from "@nestjs/common";

import { MyChatController } from "./NotionController";

@Module({
  controllers: [MyChatController],
})
export class ChatModule {}
