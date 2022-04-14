const { MessageEmbed } = require('discord.js')
const { ParticipantDB, updateRank } = require('../database')

let rankedUsers = []
updateRank().then(updatedRank => rankedUsers = updatedRank)
function updateRankedUsers() {
    rankedUsers = updateRank()
}

module.exports = {
    name: 'rank',
    updateRankedUsers,
    execute: async ({ message, commandParams }) => {
        const requiredUserId = commandParams.length === 0 ? null
            : commandParams[0].startsWith('<') ? commandParams[0].slice(2, -1)
                : commandParams.length === 2 ? commandParams[1].slice(2, -1)
                    : null
        const gameName = commandParams.length === 0 ? 'all' : !commandParams[0].startsWith('<') ? commandParams[0] : 'all'

        let top100 = rankedUsers.filter((user, i) => i < 100)

        const embedResponse = new MessageEmbed()
            .setColor('DARK_RED')
            .setTimestamp()
            .setAuthor({ name: message.author.tag.toString(), iconURL: message.author.avatarURL() })

        if (!requiredUserId && gameName === 'all') {
            embedResponse
                .setTitle('Leaderboard geral')
                .setDescription('Top 100 de todos os jogos')
                .setFooter({ text: 'Leaderboard geral', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

            top100.forEach(user => {
                embedResponse.addField(`${user.username}`, `Totaliza **${user.score}** pontos`)
            })
        }
        else if (!requiredUserId && gameName !== 'all') {
            embedResponse
                .setTitle('Leaderboard ' + gameName)
                .setDescription('Top 100 do ' + gameName)
                .setFooter({ text: `${gameName} leaderboard`, iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

            rankedUsers.forEach(user => {
                embedResponse.addField(`${user.username}`, `Totaliza **${user.score}** pontos`)
            })
        }
        else if (requiredUserId && gameName === 'all') {

            const userInf = rankedUsers.find(user => user.userId === requiredUserId)

            if (!userInf) return message.reply('Este usuário nunca participou de um Game do servidor')

            embedResponse
                .setFooter({ text: 'Rank geral info', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
                .addField(`Pontuação total de ${userInf.username}: `, '**' + userInf.score.toString() + '**' + ' pontos')
        }
        else if (requiredUserId && gameName !== 'all') {

            const userInf = rankedUsers.find(user => user.userId === requiredUserId)
            if (!userInf) return message.reply('Este usuário nunca participou de um ' + gameName)

            embedResponse
                .setFooter({ text: `Rank ${gameName} info`, iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
                .addField(`Pontuação total de ${userInf.username}: `, '**' + userInf.score.toString() + '**' + ' pontos')
        }

        await message.channel.send({ embeds: [embedResponse] })
    }
}