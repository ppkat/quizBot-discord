const { registeredUsers } = require('../commands/quiz')
const quiz = require('../commands/quiz')

module.exports = {
    name: 'interactionCreate',
    once: false,
    listen: async (client, interaction) => {
        if (!interaction.isButton()) return

        if (interaction.customId === 'entrar') {
            quiz.updateGlobalRegisteredUsers(interaction)
        }
    }
}