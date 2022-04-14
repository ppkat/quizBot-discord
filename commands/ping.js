const { SlashCommandBuilder } = require("@discordjs/builders")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Retorna o ping do bot'),

    execute: async ({ client, interaction: message }) => {
        await message.reply('Ping')
        message.fetchReply().then(msg => {
            message.editReply(`Pong! Ping é ${msg.createdTimestamp - message.createdTimestamp} ms. O ping da API é ${client.ws.ping}`)
        })
    }
}