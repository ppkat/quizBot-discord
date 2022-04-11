const { MessageEmbed } = require('discord.js')
const { ParticipantDB } = require('../database')

module.exports = {
    name: 'rank',
    execute: async ({ message, commandParams }) => {
        const requiredUserId = commandParams.length === 1? commandParams[0].slice(2, -1) : message.author.id
        
        const userInf = await ParticipantDB.findOne({ where: { userId: requiredUserId } })
        if (!userInf) return message.reply('Este usuário nunca participou de um Game Quiz')

        const embedResponse = new MessageEmbed()
            .setColor('DARK_RED')
            .setTimestamp()
            .setAuthor({ name: message.author.tag.toString(), iconURL: message.author.avatarURL() })
            .setFooter({ text: 'Quiz info', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
            .addField(`Pontuação total de ${userInf.username}: `, '**' + userInf.score.toString() + '**' + ' pontos')

        await message.channel.send({ embeds: [embedResponse] })
    }
}