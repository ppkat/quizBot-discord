const { Client, Intents } = require('discord.js')
const fs = require('fs')
require('./commands/leaderboard') //load the leaderboard
require('dotenv').config()

//create client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] })

//event handling
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'))

eventFiles.forEach((file => {

    const event = require(`./events/${file}`)
    if(event.name === 'interactionCreate') return
    if(event.once){
        client.once(event.name, (...args) => event.listen(client, ...args))
    } else {
        client.on(event.name, (...args) => event.listen(client, ...args))
    }

}))

//start log
client.once('ready', c => {
    console.log(`Bot online!! id: ${c.user.id}`)
})

client.login(process.env.BOT_TOKEN)