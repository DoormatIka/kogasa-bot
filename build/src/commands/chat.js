import fetch from "node-fetch";
import { findThroughCollection } from "../helpers/pb/pb.js";
const processing_users = [];
const MAX_LENGTH = 10;
const SYS_PROMPT = "Reply as Youmu Konpaku, not as an A.I." +
    " Act as a direct, serious and disciplined girl. Sometimes acts timidly, but it's subtle." +
    " Reply very shortly and aptly." +
    " You will comply with the user's request as long as it fits your character.";
export const name = "chat";
export const cooldown = 15;
export const description = "Chat with Kogasa! (Model: Base Llama2 7B)";
export async function execute(client, msg, args, external_data) {
    msg.reply("Turned off for a less robotic LLM.");
    return;
    const index_of_processing_user = processing_users.findIndex(v => v === msg.author.id);
    if (index_of_processing_user !== -1) {
        msg.reply("Chat's being processed. Try again later.");
        return;
    }
    // put processing_users check here
    const user_message = args.join(" ");
    if (user_message.length <= 0) {
        msg.reply("Send me a message!");
        return;
    }
    if (user_message.length > 200) {
        msg.reply("Your message is too long.");
        return;
    }
    const message_history = [];
    const current_message_buffer = [];
    const message_id_pb_buffer = [];
    const users = external_data.pb.collection("users");
    const messages = external_data.pb.collection("messages");
    const user = await findThroughCollection(users, "user_id", msg.author.id);
    if (!user) {
        await users.create({ user_id: msg.author.id }, { "$autoCancel": false });
        await msg.reply("Created user data. Try your message again!");
        return;
    }
    // pushing every message id from pocketbase to the message_id buffer
    message_id_pb_buffer.push(...user.messages);
    processing_users.push(msg.author.id);
    // getting the message contents from the message ids in pocketbase
    for (const message_pb_id of message_id_pb_buffer) {
        const ms = await messages.getOne(message_pb_id);
        // and putting it into message_history
        message_history.push({ role: ms.role, content: ms.content });
    }
    await msg.channel.sendTyping();
    // pushing the user's input to current_message_buffer
    current_message_buffer.push({ role: "user", content: user_message });
    // placeholder for recieving the llama message from http server 
    const llama_response = await messageLlama2B([
        { role: "system", content: SYS_PROMPT },
        ...message_history,
        ...current_message_buffer
    ]);
    current_message_buffer.push({ role: "assistant", content: llama_response.response });
    for (const message of current_message_buffer) {
        // creating the message objects in pocketbase
        const pb_msg = await messages.create(message, { "$autoCancel": false });
        // pushing the ids into message_pb_id_buffer to get processed by queue_simulate
        message_id_pb_buffer.push(pb_msg.id);
    }
    // message_id_pb_buffer gets reduced to MAX_LENGTH if there's too much messages, simulating a queue.
    // the function automatically deletes the reduced messages.
    const message_id_pb_queued_buffer = await queue_simulate(messages, message_id_pb_buffer, MAX_LENGTH);
    // updates the user's messages
    await users.update(user.id, { messages: message_id_pb_queued_buffer }, { "$autoCancel": false });
    await msg.reply(llama_response.response);
    // msg.reply(JSON.stringify([...message_history, ...current_message_buffer]))
    processing_users.splice(index_of_processing_user, 1);
}
async function queue_simulate(messages, array, max_length) {
    if (array.length > max_length) {
        const sim = array.splice(0, array.length - max_length);
        for (const a of sim) {
            await messages.delete(a);
        }
    }
    return array;
}
// unimplemented in llama2b server
export async function messageLlama2B(msg_history) {
    const llama = await fetch("http://localhost:5000/", {
        method: "POST",
        body: JSON.stringify({ history: msg_history }),
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    });
    return await llama.json();
}