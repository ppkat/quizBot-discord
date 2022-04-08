const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js')
const quiz = require('../quiz.json')

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
                .setDescription('Reaja para votar em uma ou mais categorias')
                .setFooter({ text: 'Game Quiz', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
                .addFields(
                    { name: 'Numero de questões', value: String(questionNumber), inline: true },
                    { name: 'Tempo das rodadas', value: String(timeForAnswers / 1000) + ' segundos', inline: true },
                    { name: 'Tempo para começar', value: String(timeForStart / 1000) + ' segundos', inline: true },
                    { name: 'Pessoas inscritas', value: localRegisteredUsers.length + ' pessoas', inline: true },
                )

            return embedResponse
        }

        const localMessagEmbedResponse = await message.channel.send({ embeds: [embedResponse()] }).then(msg => msg)
        localMessagEmbedResponse.react('<:valorant:961355782018957353>')
        localMessagEmbedResponse.react('<:csgo:961355723747508225>')
        localMessagEmbedResponse.react('<:JogosClassicos:961417061383434331>')
        localMessagEmbedResponse.react('<:Fortnite:961415475693252629>')
        localMessagEmbedResponse.react('<:Freefire:961415685920157716>')
        localMessagEmbedResponse.react('<:LeageOfLegends:961356872047280178>')

        async function getEmojInteraction() {

            function upadateRegisteredUsers(reaction, user) {
                if (user.bot) return
                if (!globalRegisteredUsers.find(participant => participant.id === user.id)) {

                    const inscribedParticipant = new Participant(user.username, user.id, 0, user.toString(), user.avatarURL(), reaction.message.channelId)
                    globalRegisteredUsers.push(inscribedParticipant)
                    localRegisteredUsers.push(inscribedParticipant)

                    localMessagEmbedResponse.embeds[0].fields[3].value = String(localRegisteredUsers.length)
                    localMessagEmbedResponse.edit({ embeds: [localMessagEmbedResponse.embeds[0]] })
                } else if (globalRegisteredUsers.find(participant => participant.channel !== reaction.message.channelId)) {
                    user.send('Você só pode se inscrever em um quiz de cada vez')
                    reaction.users.remove(user)
                }
            }

            const collector = localMessagEmbedResponse.createReactionCollector()
            collector.on('collect', (reaction, user) => upadateRegisteredUsers(reaction, user));

            collector.on('end', collected => {
                console.log(`após coletar ${collected.size} reações e a mensagem ser excluida, este evento é encerrado`)
            });
        }
        getEmojInteraction()

        async function quizStart() {
            if (localRegisteredUsers.length === 0) return await endQuiz()

            const [firstPoints, secondPoints, thirdPoints, forthPoints, restPoints] = [50, 30, 20, 10, 5]

            function choseCategory() {

                let reactionsCounts = localMessagEmbedResponse.reactions.cache.map(reaction => reaction.count)
                const categoryWinnerIndex = reactionsCounts.findIndex(item => item === Math.max(...reactionsCounts))
                const categoryWinnerNames = localMessagEmbedResponse.reactions.cache.map(reaction => reaction.emoji.name)
                const categoryWinnerName = categoryWinnerNames[categoryWinnerIndex]

                const categoryWinnerJSONIndex = quiz.findIndex(item => item.categoryName === categoryWinnerName)
                const categoryWinnerJSON = quiz[categoryWinnerJSONIndex]

                return categoryWinnerJSON.questions
            }
            const questions = choseCategory()

            let questionsNoSendeds = [...questions]
            let index = 0
            while (index < questionNumber) {
                index++;

                function choseQuestion() {

                    if(questionsNoSendeds.length === 0) questionsNoSendeds = [...questions]
                    const randomIndex = Math.floor(Math.random() * questionsNoSendeds.length)
                    let question = questionsNoSendeds[randomIndex]
                    questionsNoSendeds.splice(randomIndex, 1)

                    return question
                }

                let question = choseQuestion()

                const questionEmbed = new MessageEmbed()
                    .setTitle('❓❓' + question.question + '❓❓')
                    .setColor('DARK_RED')

                await message.channel.send({ embeds: [questionEmbed] })

                let wrongAnswersCount = 0
                let answerTimeLeft = timeForAnswers
                let scoredParticipants = []

                const decressAnswerTimeLeftId = setInterval(() => {
                    answerTimeLeft -= 100
                    if (answerTimeLeft === 30 * 1000) localMessagEmbedResponse.channel.send('https://tenor.com/view/timer-gif-20006092')
                    else if (answerTimeLeft === 20 * 1000) localMessagEmbedResponse.channel.send('https://media.tenor.com/images/a7342b5a85e2e4c7bb3463eddf4ccf63/tenor.gif')
                    else if (answerTimeLeft === 10 * 1000) localMessagEmbedResponse.channel.send('https://tenor.com/view/obrecht-wecc-countdown-gif-18708336')
                    else if (answerTimeLeft === 5 * 1000) localMessagEmbedResponse.channel.send('https://tenor.com/view/ujjval-gif-20607828')
                }, 100)

                async function usersAnswersHandle() { //round

                    const filter = m => localRegisteredUsers.find(participant => participant.id === m.author.id)
                    await message.channel.awaitMessages({ filter, max: 1, time: answerTimeLeft, errors: ['time'] })
                        .then(async msg => {

                            msg = msg.first()
                            const formatedCorrectAnswers = question.answers.map(answer => answer.toString().toLowerCase().split(' ').join(''))
                            const formatedUserAnswer = msg.content.toLowerCase().split(' ').join('')

                            if (formatedCorrectAnswers.some(answer => answer === formatedUserAnswer)) {
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

                            } else {
                                msg.react('❌')
                                wrongAnswersCount++;
                            }
                            await usersAnswersHandle()
                        })
                        .catch((error) => {

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
                scores.splice(winnerIndex, 1, -1)
                let secondIndex = scores.findIndex(score => score === Math.max(...scores))
                scores.splice(secondIndex, 1, -1)
                let thirdIndex = scores.findIndex(score => score === Math.max(...scores))
                scores.splice(thirdIndex, 1, -1)

                let winner = localRegisteredUsers[winnerIndex]
                let second = winnerIndex === secondIndex ? null : localRegisteredUsers[secondIndex]
                let third = secondIndex === thirdIndex ? null : localRegisteredUsers[thirdIndex]

                let noWinners = localRegisteredUsers.filter(participant => participant.id !== winner.id && participant.id !== second.id && participant.id !== third.id)
                let noWinnersScores = noWinners.map(nowinner => nowinner.score)
                let descendingNoWinners = []
                noWinners.forEach(() => {
                    descendingNoWinners.push(noWinners.findIndex(nowinner => nowinner.score === Math.max(...noWinnersScores)))
                    noWinnersScores.splice(noWinnersScores.findIndex(score => score === Math.max(...noWinnersScores)), 1)
                })

                return { winner, second, third, descendingNoWinners }
            }

            async function showResults() {
                const { winner, second, third, descendingNoWinners } = choseWinners()

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

                if (descendingNoWinners.length !== 0) {

                    noWinnersScores = descendingNoWinners.map(nowinner => nowinner.score)
                    noWinnersTags = descendingNoWinners.map(nowinner => nowinner.tag)
                    noWinnersPlaces = descendingNoWinners.map((nowinner, index) => index + 4)

                    noWinnersTextArray = []
                    for (i = 0; i < descendingNoWinners.length; i++) {
                        noWinnersTextArray.push(`${noWinnersPlaces[i]}: ${noWinnersTags[i]}, com ${noWinnersScores[i]} pts`)
                    }

                    noWinnersText = noWinnersTextArray.join('/n')
                    embedResults.addField('Restante', noWinnersText)
                }

                await message.channel.send({ embeds: [embedResults] })
            }

            async function endQuiz() {
                await showResults()
                globalRegisteredUsers = globalRegisteredUsers.filter(participant => participant.channel !== message.channelId)
                activeChannels.splice(activeChannels.findIndex(channel => channel === message.channelId), 1)
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
}