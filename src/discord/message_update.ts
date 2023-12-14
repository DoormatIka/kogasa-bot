import { Message, Client } from "discord.js";
import { PartialMessage } from "discord.js";
import { setChatbuffer, findReplied, findChatBufferMessagewithRealMessage, findRepliedBufferMessagewithRealMessage } from "../helpers/buffer/buffer";

import helpers from "../helpers/helpers";
import {ChatBuffer} from "../helpers/types";

export async function messageUpdate(client: Client, partial_new_msg: Message<boolean> | PartialMessage, chat_buffer: ChatBuffer) {
	const complete_msg = await helpers.completePartialMessage(client, partial_new_msg.channelId, partial_new_msg.id);
	if (!complete_msg)
		return;
	
	const chat_buffer_queue = setChatbuffer(chat_buffer, complete_msg.channelId);
	const replied_message = await findReplied(client, complete_msg);
	const replied_message_id = replied_message ? replied_message.id : "";
	const chat_buffer_message = findChatBufferMessagewithRealMessage(chat_buffer_queue, complete_msg);
	const replied_buffer_message = findRepliedBufferMessagewithRealMessage(chat_buffer_queue, replied_message_id);

  if (chat_buffer_message) {
    chat_buffer_message.edits.push(`${chat_buffer_message.content}`)
		chat_buffer_message.content = complete_msg.content;
  }
  if (replied_buffer_message) {
		replied_buffer_message.content = complete_msg.content;
  }
}