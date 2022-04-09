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
        let dirtyCommandParams = commandWithoutPrefix.split(' ')
        let commandParams = dirtyCommandParams.filter(item => item !== '')
        const commandName = commandParams.splice(0,1)[0]

        let command
        try{
            command = require(`../commands/${commandName.toLowerCase()}`)
            command.execute({client, message, commandParams})
        } catch(err){
            console.log(err)
            message.channel.send('Comando inexistente!')
        }
    }

}