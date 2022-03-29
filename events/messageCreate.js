const fs = require('fs')

module.exports = {

    name: 'messageCreate',
    once: false,
    listen: async (client, message) => {
        const prefix = '!'
        if(!message.content.startsWith(prefix)) return
        if(!message.author.bot) return

        //command handling
        const commandFiles = fs.readdirSync('../commands').filter(file => file.endsWith('.js'))

        commandFiles.forEach(file => {
            
            const command = require(file)
            await command.execute(client, message)

        })

    }

}