module.exports = {
    name: 'ping',
    execute : async ({ client, message }) => {
        const pingMessage = await message.channel.send('Ping')
        pingMessage.edit(`Pong! Ping é ${pingMessage.createdTimestamp - message.createdTimestamp} ms. O ping da API é ${client.ws.ping}`)
    }
}