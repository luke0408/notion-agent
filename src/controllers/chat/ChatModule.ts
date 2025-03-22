import { Module } from "@nestjs/common";

import { MyChatController } from "./ChatController";

@Module({
  controllers: [MyChatController],
})
export class ChatModule {}
