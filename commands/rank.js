const { SlashCommandBuilder } = require('@discordjs/builders')
const { MessageEmbed } = require('discord.js')
const { ParticipantDB, updateRank } = require('../database')

let rankedUsers = []
updateRank().then(updatedRank => rankedUsers = updatedRank)
async function updateRankedUsers() {
    rankedUsers = await updateRank()
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Mostra a pontuação total dos jogadores')
        .addStringOption(option =>
            option.setName('jogo')
                .setDescription('O nome do jogo da Player\'s Bank a ser conferido. Se omitido, mostrará a soma de todos os jogos'))
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário a ser conferido. Se omitido mostrará os top100 usuários com maior pontuação')),

    updateRankedUsers,
    execute: async ({ interaction : message }) => {
        const requiredUser = message.options.getUser('usuário')
        const gameName = message.options.getString('jogo')?? 'all'

        let top100 = rankedUsers.filter((user, i) => i < 100)

        const embedResponse = new MessageEmbed()
            .setColor('DARK_RED')
            .setTimestamp()
            .setAuthor({ name: message.user.tag.toString(), iconURL: message.user.avatarURL() })

        if (!requiredUser && gameName === 'all') {
            embedResponse
                .setTitle('Leaderboard geral')
                .setDescription('Top 100 de todos os jogos')
                .setFooter({ text: 'Leaderboard geral', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

            top100.forEach((user, i) => {

                embedResponse.addField(`${i+1}º ${user.username}`, `Totaliza **${user.score}** pontos`)
            })
        }
        else if (!requiredUser && gameName !== 'all') {
            embedResponse
                .setTitle('Leaderboard ' + gameName)
                .setDescription('Top 100 do ' + gameName)
                .setFooter({ text: `leaderboard ${gameName}`, iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })

            rankedUsers.forEach((user, i) => {
                embedResponse.addField(`${i+1}º ${user.username}`, `Totaliza **${user.score}** pontos`)
            })
        }
        else if (requiredUser && gameName === 'all') {

            const userInfIndex = rankedUsers.findIndex(user => user.userId === requiredUser.id)
            const userInf = rankedUsers[userInfIndex]
            if (!userInf) return message.reply('Este usuário nunca participou de um Game do servidor')

            embedResponse
                .setFooter({ text: 'Rank geral info', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
                .addField(`Pontuação total de ${requiredUser.username}: `, `**${userInfIndex + 1}º** pos, **${userInf.score.toString()}** pontos`)
                .setThumbnail(`${requiredUser.avatarURL()}`)
        }
        else if (requiredUser && gameName !== 'all') {

            const userInfIndex = rankedUsers.findIndex(user => user.userId === requiredUser.id)
            const userInf = rankedUsers[userInfIndex]
            if (!userInf) return message.reply('Este usuário nunca participou de um ' + gameName)

            embedResponse
                .setFooter({ text: `Rank ${gameName} info`, iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
                .addField(`Pontuação total de ${requiredUser.username}: `, `**${userInfIndex + 1}º** pos, **${userInf.score.toString()}** pontos`)
                .setThumbnail(`${requiredUser.avatarURL()}`)
        }

        message.reply('Aqui está')
        await message.channel.send({ embeds: [embedResponse] })
    }
}