const { MessageEmbed } = require('discord.js')
const { updateRank } = require('../database')

let rankedUsers 
updateRank().then(users => rankedUsers = users)

const timeout = 1000 * 60 * 60 // an hour
setTimeout(async () => {
    const dt = new Date()
    if(dt.getHours === 0 || dt.getHours === 12){
        rankedUsers = await updateRank()
    }
}, timeout);

module.exports = {
    name: 'leaderboard',
    execute: async ({ message, commandParams }) => {
        realTime = commandParams[0]? commandParams[0].toString().toLowerCase() : null

        if(realTime === 'realtime' || realTime === 'temporeal' || realTime === 'tempo') rankedUsers = await updateRank()

        let top10 = rankedUsers.filter((user, i) => i < 10)

        const embedResponse = new MessageEmbed()
            .setColor('DARK_RED')
            .setTimestamp()
            .setAuthor({ name: message.author.tag.toString(), iconURL: message.author.avatarURL() })
            .setTitle('Leaderboard')
            .setDescription('Top 10 scores de todos os tempos')
            .setFooter({ text: 'Quiz leadboard', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
            
        top10.forEach(user => {
            embedResponse.addField(`${user.username}`, `Totaliza **${user.score}** pontos`)
        })

        await message.channel.send({ embeds: [embedResponse] })
    }
}