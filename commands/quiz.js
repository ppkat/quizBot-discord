const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js')
const { ParticipantDB } = require('../database')
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

        let questionNumber = commandParams.length === 0 ? 20 : Number(commandParams[0])
        let timeForAnswers = commandParams.length < 2 ? 30 * 1000 : Number(commandParams[1]) * 1000
        let timeForStart = commandParams.length < 3 ? 40 * 1000 : Number(commandParams[2]) * 1000
        let difficultyType = commandParams.length < 4 ? 'ascending' : commandParams[3].toString().toLowerCase()
        if (!questionNumber) questionNumber = 20
        if(!timeForAnswers) timeForAnswers = 30 * 1000
        if(!timeForStart) timeForStart = 40 * 1000
        if(difficultyType !== 'facil' && difficultyType !== 'fácil' && difficultyType !== 'medio' && difficultyType !== 'médio' 
        && difficultyType !== 'dificil' && difficultyType !== 'difícil') difficultyType = 'ascending'
        if(difficultyType === 'crescente') difficultyType = 'ascending'

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
                    { name: 'Dificuldade', value: `${difficultyType === 'ascending' ? 'crescente' : difficultyType}`, inline: true },
                    { name: 'Pessoas inscritas', value: localRegisteredUsers.length + ' pessoas' },
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

                    localMessagEmbedResponse.embeds[0].fields[4].value = String(localRegisteredUsers.length)
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

            let difficulty = difficultyType === 'ascending' ? 'facil' : difficultyType
            let questionsNoSendeds = questions.filter(question => question.difficulty === difficulty)
            let index = 0
            while (index < questionNumber) {
                index++;

                function choseQuestion() {

                    if (difficultyType === 'ascending' && index > questionNumber / 3) {
                        difficulty = index <= questionNumber * 2 / 3 ? 'medio' : 'dificil'
                        questionsNoSendeds = []
                    }
                    if (questionsNoSendeds.length === 0) questionsNoSendeds = questions.filter(question => question.difficulty === difficulty)
                    if (questionsNoSendeds.length === 0) questionsNoSendeds = [...questions] //if the category have not questions on this difficulty

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
                    if (answerTimeLeft === 30 * 1000) localMessagEmbedResponse.channel.send('https://www.shareicon.net/data/2015/09/20/643693_30_512x512.png')
                    else if (answerTimeLeft === 20 * 1000) localMessagEmbedResponse.channel.send('https://www.hit4hit.org/img/icon/256/20-seconds-timer.png')
                    else if (answerTimeLeft === 10 * 1000) localMessagEmbedResponse.channel.send(
                        'http://developer.mobilecaddy.net/wp-content/themes/mc-dev/assets/img/icons/stopwatch_10b.png')
                    else if (answerTimeLeft === 5 * 1000) localMessagEmbedResponse.channel.send('https://cdn2.iconfinder.com/data/icons/ux-and-ui-coral-vol-1/256/5-second-test-512.png')
                }, 100)

                async function usersAnswersHandle() { //round

                    const filter = m => localRegisteredUsers.find(participant => participant.id === m.author.id)
                    await message.channel.awaitMessages({ filter, max: 1, time: answerTimeLeft, errors: ['time'] })
                        .then(async msg => {

                            msg = msg.first()
                            const formatedCorrectAnswers = question.answers.map(answer => answer.toString().toLowerCase().split(' ').join(''))
                            const formatedUserAnswer = msg.content.toLowerCase().split(' ').join('')
                            const almostCorrectAnswers = formatedCorrectAnswers.map(answer => answer.length > 3 ? answer.slice(1, answer.length - 1) : answer)

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

                                if (scoredParticipants.length === localRegisteredUsers.length) answerTimeLeft = 1000

                            } else if (almostCorrectAnswers.some(answer => formatedUserAnswer.includes(answer))) {
                                msg.delete()
                                msg.channel.send({ content: `${msg.author} está próximo!!🤫` })
                                wrongAnswersCount++
                            }

                            else {
                                msg.react('❌')
                                wrongAnswersCount++;
                            }
                            await usersAnswersHandle()
                        })
                        .catch((error) => {

                            if (scoredParticipants.length === 0) {
                                localMessagEmbedResponse.channel.send(`Sem acertos nesta rodada! ${wrongAnswersCount} Respostas erradas`)
                                    .then(m => m.react('😔'))

                            } else if (scoredParticipants.length === localRegisteredUsers.length) localMessagEmbedResponse.channel.send(`**Todos acertaram!!**`)

                            else {
                                let scoredParticipantsNames = scoredParticipants.map(participant => participant.name)
                                let singularPlural = scoredParticipantsNames.length === 1 ? 'acertou!!' : 'acertaram!!'
                                localMessagEmbedResponse.channel.send(`✅ ${scoredParticipantsNames.map(item => `**${item}**`).join(', ')} ${singularPlural}`)
                            }
                            let singularPlural = question.answers.length > 1 ? 'As respostas corretas eram' : 'A resposta correta era'
                            localMessagEmbedResponse.channel.send(`${singularPlural} ${question.answers.map(item => `**${item}**`).join(', ')}`)
                        });
                }
                // console.log('chegou1 ', index)
                await usersAnswersHandle()
                clearInterval(decressAnswerTimeLeftId)
            }

            function choseWinners() {

                let scores = localRegisteredUsers.map(participant => participant.score)
                let concurrents = [...localRegisteredUsers]

                const winnerIndex = scores.findIndex(score => score === Math.max(...scores))
                const [winner] = concurrents.splice(winnerIndex, 1)
                scores.splice(winnerIndex, 1)
                const secondIndex = scores.findIndex(score => score === Math.max(...scores))
                const [second] = concurrents.splice(secondIndex, 1)
                scores.splice(secondIndex, 1)
                const thirdIndex = scores.findIndex(score => score === Math.max(...scores))
                const [third] = concurrents.splice(thirdIndex, 1)
                scores.splice(thirdIndex, 1)

                let descendingNoWinners = []
                concurrents.forEach(() => {
                    descendingNoWinners.push(concurrents.find(concurrent => concurrent.score === Math.max(...scores)))
                    scores.splice(scores.findIndex(score => score === Math.max(...scores)), 1)
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
                        .addField('1º Lugar', `${winner.tag}, com **${winner.score}** pontos`)
                        .setThumbnail(winner.iconURL)
                }

                if (second) embedResults.addField('2º Lugar', `${second.tag}, com **${second.score}** pontos`)
                if (third) embedResults.addField('3º Lugar', `${third.tag}, com **${third.score}** pontos`)

                if (descendingNoWinners.length !== 0) {

                    noWinnersScores = descendingNoWinners.map(nowinner => `**${nowinner.score}**`)
                    noWinnersTags = descendingNoWinners.map(nowinner => nowinner.tag)
                    noWinnersPlaces = descendingNoWinners.map((nowinner, index) => `${index + 4}º`)

                    noWinnersTextArray = []
                    for (i = 0; i < descendingNoWinners.length; i++) {
                        noWinnersTextArray.push(`${noWinnersPlaces[i]}: ${noWinnersTags[i]}, com ${noWinnersScores[i]} pts`)
                    }

                    noWinnersText = noWinnersTextArray.join('\n')
                    embedResults.addField('\u200b', noWinnersText)
                }

                await message.channel.send({ embeds: [embedResults] })
            }

            async function endQuiz() {
                await showResults()
                globalRegisteredUsers = globalRegisteredUsers.filter(participant => participant.channel !== message.channelId)
                activeChannels.splice(activeChannels.findIndex(channel => channel === message.channelId), 1)
                localMessagEmbedResponse.delete()

                async function storeOnDatabase() {

                    localRegisteredUsers.forEach(async participant => {

                        const [ParticipantDBInstance, isCreated] = await ParticipantDB.findOrCreate({
                            where: { userId: participant.id, },
                            defaults: {
                                username: participant.name,
                                userId: participant.id,
                                score: participant.score
                            }
                        })

                        if (!isCreated) {
                            ParticipantDBInstance.score += participant.score
                            ParticipantDBInstance.username = participant.name
                            ParticipantDBInstance.save()
                        }
                    })
                }
                storeOnDatabase()
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