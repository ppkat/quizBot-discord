const fs = require('fs')

module.exports = {

    name: 'messageCreate',
    once: false,
    listen: async (client, message) => {
        const prefix = '!'
        if(!message.content.startsWith(prefix)) return
        if(message.author.bot) return

        //command handling
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
        const commandName = message.content.slice(1) //remove prefix

        let command
        try{
            command = require(`../commands/${commandName}`)
            command.execute(client, message)
        } catch(err){
            console.log(err)
            message.channel.send('Comando não existe!')
        }
    }

}