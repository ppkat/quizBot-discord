const { Client, Intents } = require("discord.js");
const fs = require("fs");
require("./commands/rank"); //load the rankedUsers
require("dotenv").config();

//create client instance
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});

//event handling
const eventFiles = fs
  .readdirSync("./events")
  .filter((file) => file.endsWith(".js"));

eventFiles.forEach((file) => {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.listen(client, ...args));
  } else {
    client.on(event.name, (...args) => event.listen(client, ...args));
  }
});

//start log
client.once("ready", (c) => {
  console.log(`Bot online!! id: ${c.user.id}`);
  const fs = require('fs')

  const commands = []
  const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

  for (file of commandFiles) {
    const command = require(`./commands/${file}`)
    commands.push(command.data.toJSON())
  }

  client.application.commands.set(commands);
});

client.login(process.env.BOT_TOKEN);