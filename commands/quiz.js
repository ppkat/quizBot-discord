const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js')

let messageEmbedResponse
let registeredUsers = []

class Participant {
    constructor(name, id, score, tag, iconURL) {
        this.name = name
        this.id = id
        this.score = score
        this.tag = tag
        this.iconURL = iconURL
    }

}

module.exports = {

    name: 'quiz',
    execute: async ({ client, message, commandParams }) => {
        const questionNumber = commandParams.length === 0 ? 20 : Number(commandParams[0])
        const timeForAnswers = commandParams.length < 2 ? 60 * 1000 : Number(commandParams[1]) * 1000
        let timeForStart = commandParams.length < 3 ? 60 * 1000 : Number(commandParams[2]) * 1000

        const embedResponse = () => {

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
                    { name: 'Pessoas inscritas', value: registeredUsers.length + ' pessoas', inline: true }
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

        messageEmbedResponse = await message.channel.send({ embeds: [embedResponse()], components: [button()] }).then(msg => msg)

        async function quizStart() {

            const pointsPerHit = 5
            let questions = [ //it will be the API response
                { asking: 'Qual é o nome da irmã da Vi?', answer: 'Jinx' },
                { asking: 'Quantos campeões possuiam o lol em sua fase alpha?', answer: '17' },
                { asking: 'Quanto tempo a spike demora para explodir no valorant?', answer: '45 segundos' },
                { asking: 'Quanto tempo leva para desarmar a spike sem kit de desarme no CS:GO', answer: '10 segundos' }
            ]

            for (i = 0; i < questionNumber; i++) {
                const question = questions[Math.floor(Math.random() * questions.length)]
                await message.channel.send(question.asking)

                let wrongAnswersCount = 0
                let answerTime = timeForAnswers
                const decressAnswerTimeId = setInterval(() => {
                    answerTime -= 10
                }, 10)

                async function usersAnswersHandle() {

                    const filter = m => registeredUsers.find(participant => participant.id === m.author.id) //if the user is participating
                    await message.channel.awaitMessages({ filter, max: 1, time: answerTime, errors: ['time'] })
                        .then(async msg => {

                            msg = msg.first()
                            const formatedCorrectAnswer = question.answer.toLowerCase().split(' ').join('')
                            const formatedUserAnswer = msg.content.toLowerCase().split(' ').join('')

                            if (formatedUserAnswer === formatedCorrectAnswer) {
                                const correctAnswerUser = registeredUsers.find(participant => participant.id === msg.author.id)
                                correctAnswerUser.score += pointsPerHit

                                msg.react('✅')
                                msg.reply(`${msg.author} ganhou ${pointsPerHit} pontos`)

                                clearInterval(decressAnswerTimeId)
                            } else {
                                msg.react('❌')
                                wrongAnswersCount++;
                                await usersAnswersHandle()
                            }
                        })
                        .catch(collected => {
                            messageEmbedResponse.channel.send(`Sem acertos nesta rodada! ${wrongAnswersCount} Respostas erradas`).then(m => m.react('😔'))
                        });
                }
                await usersAnswersHandle()
            }
            await showResults()
            registeredUsers = []
        }

        function choseWinners(){

            let scores = registeredUsers.map(participant => participant.score)
            
            let winnerIndex = scores.findIndex(score => score === Math.max(scores))
            scores.splice(winnerIndex, 1)
            let secondIndex = scores.findIndex(score => score === Math.max(scores))
            scores.splice(secondIndex, 1)
            let thirdIndex = scores.findIndex(score => score === Math.max(scores))
            scores.splice(thirdIndex, 1)

            let winner = registeredUsers[winnerIndex]
            let second = registeredUsers[secondIndex]
            let third = registeredUsers[thirdIndex]

            return {winner, second, third}
        }

        async function showResults() {
            const {winner, second, third} = choseWinners()

            const embedResults = new MessageEmbed()
                .setColor('DARK_RED')
                .setTimestamp()
                .setTitle('Nenhum participante')
                .setFooter({ text: 'Game Quiz', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

            if(winner){
                embedResults
                    .setTitle(winner.name + ' é o vencedor!! 🥳')
                    .addField('1º Lugar', `${winner.tag}, com ${winner.score} pontos`)
                    .setThumbnail(winner.iconURL)
            }

            if(second){
                embedResults
                    .addField('2º Lugar', `${second.tag}, com ${second.score} pontos`)
            }

            if(third){
                embedResults
                    .addField('3º Lugar', `${third.tag}, com ${third.score} pontos`)
            }

            await message.channel.send({ embeds: [embedResults] })
            messageEmbedResponse.delete()
        }

        const intervalID = setInterval(() => {

            timeForStart -= 1 * 1000;
            messageEmbedResponse.embeds[0].fields[2].value = (timeForStart / 1000).toString() === 1
                ? (timeForStart / 1000).toString() + ' segundo'
                : (timeForStart / 1000).toString() + ' segundos'
            messageEmbedResponse.edit({ embeds: [messageEmbedResponse.embeds[0]] })

            if (timeForStart <= 0) {
                clearInterval(intervalID)
                quizStart()
            }
        }, 1000)
    },

    updateRegisteredUsers: function (interaction) {

        if (!registeredUsers.find(user => user.id === interaction.member.id)) {

            const inscribedParticipant = new Participant(interaction.member.user.username, interaction.member.id, 0, interaction.member.toString(),
            interaction.member.user.avatarURL())
            registeredUsers.push(inscribedParticipant)

            messageEmbedResponse.embeds[0].fields[3].value = String(registeredUsers.length)
            messageEmbedResponse.edit({ embeds: [messageEmbedResponse.embeds[0]] })

            interaction.reply({ content: 'Você foi inscrito no quiz! Boa sorte!', ephemeral: true })
        } else {
            interaction.reply({ content: 'Você já está inscrito', ephemeral: true })
        }
    },
}