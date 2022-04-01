const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js')

let messageEmbedResponse
let registeredUsers = []

module.exports = {

    name: 'quiz',
    registeredUsers,
    execute: async ({ client, message, commandParams }) => {
        const questionNumber = commandParams.length === 0 ? 20 : Number(commandParams[0])
        const timeForAnswers = commandParams.length < 2 ? 60 * 1000 : Number(commandParams[1]) * 1000
        let timeForStart = commandParams.length < 3 ? 60 * 1000 : Number(commandParams[2]) * 1000

        let questions = [ //it will be the API response
            { asking: 'Qual é o nome da irmã da Vi?', answer: 'Jinx' },
            { asking: 'Quantos campeões possuiam o lol em sua fase alpha?', answer: '17' },
            { asking: 'Quanto tempo a spike demora para explodir no valorant?', answer: '45 segundos' },
            { asking: 'Quanto tempo leva para desarmar a spike sem kit de desarme no CS:GO', answer: '10 segundos' }
        ]

        const embedResponse = () => {

            console.log(registeredUsers)
            const embedResponse = new MessageEmbed()
                .setColor('DARK_RED')
                .setTimestamp()
                .setAuthor({ name: message.author.tag.toString(), iconURL: message.author.avatarURL() })
                .setTitle(message.author.username + ' Iniciou um game quiz')
                .setFooter({ text: 'Game Quiz', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
                .addFields(
                    { name: 'Numero de questões', value: String(questionNumber), inline: true },
                    { name: 'Tempo para responder', value: String(timeForAnswers / 1000) + ' segundos', inline: true },
                    { name: 'Tempo para começar', value: String(timeForStart / 1000) + ' segundos', inline: true },
                    { name: 'Pessoas inscritas', value: registeredUsers.length + ' pessoas', inline: true}
                )

            return embedResponse
        }

        const button = () => {

            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setStyle('SUCCESS')
                    .setCustomId('entrar')
                    .setLabel('entrar')
            )

            return row
        }

        await message.channel.send({ embeds: [embedResponse()], components: [button()] }).then(message => {
            let intervalID

            intervalID = setInterval(() => {

                timeForStart-= 1*1000;
                message.embeds[0].fields[2].value = (timeForStart / 1000).toString() + ' segundos'
                message.edit({ embeds: [message.embeds[0]] })

            }, 1000)

            if(timeForStart === 0) clearInterval(intervalID)
            messageEmbedResponse = message
        })
    },

    updateRegisteredUsers: function(usersCount) {

        messageEmbedResponse.embeds[0].fields[3].value = String(registeredUsers.length)
        messageEmbedResponse.edit({ embeds: [messageEmbedResponse.embeds[0]] })

    },

    quizStart: async () => {

        for (i = 0; i < questionNumber; i++) {
            const question = questions[Math.floor(Math.random() * questions.length)]
            await message.channel.send(question.asking)
            await message.channel.awaitMessages({ max: 1, time: timeForAnswers, errors: ['time'] })
                .then(message => {
                    console.log('mensagem recebida: ', message)
                    message = message.first()
                    if (message.content === question.answer) {
                        message.channel.send('acertou :)')
                    } else {
                        message.channel.send('errou :(')
                    }
                })
                .catch(collected => {
                    message.channel.send('Ninguéeeeeeeem acertou');
                });
        }

    }

}