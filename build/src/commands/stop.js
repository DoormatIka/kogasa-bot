export const name = "stop";
export const cooldown = 5;
export const description = "You can only use this when you are my creator.";
export async function execute(client, msg) {
    if (msg.author.id === "509683395224141827") {
        msg.reply("My work here is done.");
        process.exit();
    }
}