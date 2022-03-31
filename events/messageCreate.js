const fs = require('fs')

module.exports = {

    name: 'messageCreate',
    once: false,
    listen: async (client, message) => {
        const prefix = '!'
        if(!message.content.startsWith(prefix)) return
        if(message.author.bot) return

        //command handling
        const commandWithoutPrefix = message.content.slice(1)
        const commandName = commandWithoutPrefix.split(' ')[0]
        const commandParams = commandWithoutPrefix.split(' ').splice(1)

        let command
        try{
            command = require(`../commands/${commandName}`)
            command.execute({client, message, commandParams})
        } catch(err){
            console.log(err)
            message.channel.send('Comando inexistente!')
        }
    }

}