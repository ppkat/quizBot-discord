const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js')

let messageEmbedsResponses = []
let globalRegisteredUsers = []
let activeChannels = []

class Participant {
    constructor(name, id, score, tag, iconURL, channel) {
        this.name = name
        this.id = id
        this.score = score
        this.tag = tag
        this.iconURL = iconURL
        this.channel = channel
    }

}

module.exports = {

    name: 'quiz',
    execute: async ({ client, message, commandParams }) => {
        if (activeChannels.find(channel => message.channelId === channel)) return message.reply('Já há um game rolando neste canal')
        activeChannels.push(message.channelId)

        const questionNumber = commandParams.length === 0 ? 20 : Number(commandParams[0])
        const timeForAnswers = commandParams.length < 2 ? 60 * 1000 : Number(commandParams[1]) * 1000
        let timeForStart = commandParams.length < 3 ? 60 * 1000 : Number(commandParams[2]) * 1000
        let localRegisteredUsers = []

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
                    { name: 'Pessoas inscritas', value: localRegisteredUsers.length + ' pessoas', inline: true }
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

        const localMessagEmbedResponse = await message.channel.send({ embeds: [embedResponse()], components: [button()] }).then(msg => msg)
        messageEmbedsResponses.push(localMessagEmbedResponse)

        async function quizStart() {

            localRegisteredUsers = globalRegisteredUsers.filter(participant => participant.channel === message.channelId)
            if (localRegisteredUsers.length === 0) return await endQuiz()

            const [firstPoints, secondPoints, thirdPoints, forthPoints, restPoints] = [50, 30, 20, 10, 5]
            let questions = [ //it will be the API response
                { asking: 'Qual é o nome da irmã da Vi', answer: 'Jinx' },
                { asking: 'Quantos campeões possuiam o lol em sua fase alpha', answer: '17' },
                { asking: 'Quanto tempo a spike demora para explodir no valorant', answer: '45 segundos' },
                { asking: 'Quanto tempo leva para desarmar a spike sem kit de desarme no CS:GO', answer: '10 segundos' }
            ]

            let index = 0
            while (index < questionNumber) {
                index++;

                const question = questions[Math.floor(Math.random() * questions.length)]
                const questionEmbed = new MessageEmbed()
                    //.setAuthor({ name: `Player's Bank Quiz`, iconURL: `https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024` })
                    .setTitle('❓❓' + question.asking + '❓❓')
                    .setColor('DARK_RED')
                //.setTimestamp()
                //.setFooter({ text: 'Game Quiz', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

                await message.channel.send({ embeds: [questionEmbed] })

                let wrongAnswersCount = 0
                let answerTimeLeft = timeForAnswers
                let scoredParticipants = []

                const decressAnswerTimeLeftId = setInterval(() => {
                    answerTimeLeft -= 10
                }, 10)

                async function usersAnswersHandle() { //round

                    const filter = m => localRegisteredUsers.find(participant => participant.id === m.author.id)
                    await message.channel.awaitMessages({ filter, max: 1, time: answerTimeLeft, errors: ['time'] })
                        .then(async msg => {

                            msg = msg.first()
                            const formatedCorrectAnswer = question.answer.toLowerCase().split(' ').join('')
                            const formatedUserAnswer = msg.content.toLowerCase().split(' ').join('')

                            if (formatedUserAnswer === formatedCorrectAnswer) {
                                msg.delete()

                                const correctAnswerUser = localRegisteredUsers.find(participant => participant.id === msg.author.id)
                                if (scoredParticipants.some(participant => participant.id === correctAnswerUser.id))
                                    return msg.author.send({ content: 'Sem trapacear' })
                                scoredParticipants.push(correctAnswerUser)

                                const addScore = scoredParticipants.length === 1 ? firstPoints
                                    : scoredParticipants.length === 2 ? secondPoints
                                        : scoredParticipants.length === 3 ? thirdPoints
                                            : scoredParticipants.length === 4 ? forthPoints
                                                : restPoints

                                correctAnswerUser.score += addScore
                                msg.channel.send(`${msg.author} ganhou ${addScore} pontos`)

                                await usersAnswersHandle()
                            } else {
                                msg.react('❌')
                                wrongAnswersCount++;
                                await usersAnswersHandle()
                            }
                        })
                        .catch(() => {

                            if (scoredParticipants.length === 0) {
                                localMessagEmbedResponse.channel.send(`Sem acertos nesta rodada! ${wrongAnswersCount} Respostas erradas`)
                                    .then(m => m.react('😔'))
                            } else {
                                let scoredParticipantsNames = scoredParticipants.map(participant => participant.name)
                                let singularPlural = scoredParticipantsNames.length === 1 ? 'acertou!!' : 'acertaram!!'
                                localMessagEmbedResponse.channel.send(`✅ ${scoredParticipantsNames.join(', ')} ${singularPlural}`)
                            }
                        });
                }
                // console.log('chegou1 ', index)
                await usersAnswersHandle()
                clearInterval(decressAnswerTimeLeftId)
            }

            function choseWinners() {

                let scores = localRegisteredUsers.map(participant => participant.score)

                let winnerIndex = scores.findIndex(score => score === Math.max(...scores))
                scores.splice(winnerIndex, 1)
                let secondIndex = scores.findIndex(score => score === Math.max(...scores))
                scores.splice(secondIndex, 1)
                let thirdIndex = scores.findIndex(score => score === Math.max(...scores))
                scores.splice(thirdIndex, 1)

                let winner = localRegisteredUsers[winnerIndex]
                let second = localRegisteredUsers[secondIndex]
                let third = localRegisteredUsers[thirdIndex]

                return { winner, second, third }
            }

            async function showResults() {
                const { winner, second, third } = choseWinners()

                const embedResults = new MessageEmbed()
                    .setColor('DARK_RED')
                    .setTimestamp()
                    .setTitle('Nenhum participante')
                    .setFooter({ text: 'Game Quiz', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

                if (winner) {
                    embedResults
                        .setTitle(winner.name + ' é o vencedor!! 🥳')
                        .addField('1º Lugar', `${winner.tag}, com ${winner.score} pontos`)
                        .setThumbnail(winner.iconURL)
                }

                if (second) embedResults.addField('2º Lugar', `${second.tag}, com ${second.score} pontos`)
                if (third) embedResults.addField('3º Lugar', `${third.tag}, com ${third.score} pontos`)

                await message.channel.send({ embeds: [embedResults] })
            }

            async function endQuiz() {
                await showResults()
                globalRegisteredUsers = globalRegisteredUsers.filter(participant => participant.channel !== message.channelId)
                activeChannels.splice(activeChannels.findIndex(channel => channel === message.channelId), 1)
                messageEmbedsResponses.splice(messageEmbedsResponses.findIndex(msg => msg.channelId === message.channelId), 1)
                localMessagEmbedResponse.delete()
            }
            await endQuiz()
        }

        const waitQuizStartId = setInterval(() => {

            timeForStart -= 1 * 1000;
            localMessagEmbedResponse.embeds[0].fields[2].value = (timeForStart / 1000).toString() === 1
                ? (timeForStart / 1000).toString() + ' segundo'
                : (timeForStart / 1000).toString() + ' segundos'
            localMessagEmbedResponse.edit({ embeds: [localMessagEmbedResponse.embeds[0]] })

            if (timeForStart <= 0) {
                clearInterval(waitQuizStartId)
                quizStart()
            }
        }, 1000)
    },

    updateGlobalRegisteredUsers: function (interaction) {

        if (!globalRegisteredUsers.find(user => user.id === interaction.member.id)) {

            const inscribedParticipant = new Participant(interaction.member.user.username, interaction.member.id, 0, interaction.member.toString(),
                interaction.member.user.avatarURL(), interaction.channelId)
            globalRegisteredUsers.push(inscribedParticipant)

            let thisChannelEmbedResponse = messageEmbedsResponses.find(msg => msg.channelId === interaction.channelId)
            let thisChannelRegisteredUsers = globalRegisteredUsers.filter(participant => participant.channel === interaction.channelId)

            thisChannelEmbedResponse.embeds[0].fields[3].value = String(thisChannelRegisteredUsers.length)
            thisChannelEmbedResponse.edit({ embeds: [thisChannelEmbedResponse.embeds[0]] })

            interaction.reply({ content: 'Você foi inscrito no quiz! Boa sorte!', ephemeral: true })
        } else {
            interaction.reply({ content: 'Você já está inscrito em um quiz', ephemeral: true })
        }
    },
}