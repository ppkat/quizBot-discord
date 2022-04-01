const quiz = require('../commands/quiz')

module.exports = {
    name: 'interactionCreate',
    once: false,
    listen: async (client, interaction) => { 
        if(!interaction.isButton()) return

        if(interaction.customId === 'entrar'){
            console.log('entrou aqui')
            interaction.reply({ content: 'Você foi inscrito no quiz! Boa sorte!', ephemeral: true })

            quiz.registeredUsers.push(interaction.member.id)
            quiz.updateRegisteredUsers()
        }
    }
}